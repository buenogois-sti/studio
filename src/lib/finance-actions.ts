
'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { FinancialTitle, Process, FinancialEvent, Staff, StaffCredit, TimelineEvent } from './types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { addMonths, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';

interface CreateEventData {
  processId: string;
  type: 'ACORDO' | 'SENTENCA' | 'EXECUCAO' | 'CONTRATO' | 'CUSTAS' | 'PERICIA' | 'DESLOCAMENTO' | 'ADICIONAL';
  eventDate: Date;
  description: string;
  totalValue: number;
  installments: number;
  firstDueDate: Date;
}

const eventTypeToOriginMap: Record<CreateEventData['type'], FinancialTitle['origin']> = {
  'ACORDO': 'ACORDO',
  'SENTENCA': 'SENTENCA',
  'EXECUCAO': 'SENTENCA',
  'CONTRATO': 'HONORARIOS_CONTRATUAIS',
  'CUSTAS': 'CUSTAS_PROCESSUAIS',
  'PERICIA': 'PERICIA',
  'DESLOCAMENTO': 'DESLOCAMENTO',
  'ADICIONAL': 'ADICIONAL',
};

export async function createFinancialEventAndTitles(data: CreateEventData) {
  if (!firestoreAdmin) throw new Error("Banco de dados inacessível.");
  const { processId, type, eventDate, description, totalValue, installments, firstDueDate } = data;

  const processDoc = await firestoreAdmin.collection('processes').doc(processId).get();
  if (!processDoc.exists) throw new Error("Processo não encontrado.");
  const processData = processDoc.data() as Process;

  const batch = firestoreAdmin.batch();
  const eventRef = firestoreAdmin.collection('financial_events').doc();
  
  let lawyerPercentage = 30; // Default commission for the firm
  let clientPercentage = 70; // Default payout for client

  if (processData.leadLawyerId) {
    const staffDoc = await firestoreAdmin.collection('staff').doc(processData.leadLawyerId).get();
    const rem = (staffDoc.data() as Staff | undefined)?.remuneration;
    if (rem?.lawyerPercentage) {
      // If the lawyer gets X%, the firm gets 30% and the client gets 100 - X - 30?
      // No, usually firm takes 30%, lawyer takes e.g. 5% of TOTAL or 15% of firm's cut.
      // Let's assume lawyer's cut is distinct from the 30% firm takes if it's participation.
    }
  }

  batch.set(eventRef, { processId, type, eventDate: new Date(eventDate), description, totalValue, lawyerPercentage, clientPercentage });

  const instVal = totalValue / (installments || 1);
  const origin = eventTypeToOriginMap[type];

  for (let i = 0; i < installments; i++) {
    const titleRef = firestoreAdmin.collection('financial_titles').doc();
    batch.set(titleRef, {
      financialEventId: eventRef.id,
      processId,
      clientId: processData.clientId,
      description: installments > 1 ? `${description} (${i + 1}/${installments})` : description,
      type: 'RECEITA',
      origin,
      value: instVal,
      dueDate: Timestamp.fromDate(addMonths(new Date(firstDueDate), i)),
      status: 'PENDENTE',
      installmentIndex: i + 1,
      totalInstallments: installments,
      recurrenceId: eventRef.id
    });
  }

  if (processData.leadLawyerId && ['ACORDO', 'SENTENCA', 'EXECUCAO', 'CONTRATO'].includes(type)) {
    const staffDoc = await firestoreAdmin.collection('staff').doc(processData.leadLawyerId).get();
    const rem = (staffDoc.data() as Staff | undefined)?.remuneration;
    if (rem && (rem.type === 'SUCUMBENCIA' || rem.type === 'QUOTA_LITIS') && rem.lawyerPercentage) {
      const lawyerVal = (totalValue * 0.3) * (rem.lawyerPercentage / 100);
      if (lawyerVal > 0) {
        batch.set(firestoreAdmin.collection(`staff/${processData.leadLawyerId}/credits`).doc(), {
          type: 'HONORARIOS',
          processId,
          description: `Participação: ${description}`,
          value: lawyerVal,
          status: 'RETIDO',
          date: Timestamp.now(),
          financialEventId: eventRef.id
        });
      }
    }
  }

  try {
    await batch.commit();
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard/repasses');
    return { success: true };
  } catch (error: any) {
    throw new Error("Erro ao salvar transações financeiras.");
  }
}

export async function updateFinancialTitleStatus(titleId: string, status: 'PAGO' | 'PENDENTE' | 'ATRASADO' | 'CANCELADO') {
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    try {
        const titleRef = firestoreAdmin.collection('financial_titles').doc(titleId);
        const titleDoc = await titleRef.get();
        const titleData = titleDoc.data() as FinancialTitle | undefined;
        if (!titleDoc.exists || !titleData) throw new Error('Título não encontrado.');

        const batch = firestoreAdmin.batch();
        const now = FieldValue.serverTimestamp();

        batch.update(titleRef, { 
            status, 
            paymentDate: status === 'PAGO' ? now : FieldValue.delete(),
            updatedAt: now
        });

        // Integração Complexa: Acordos, Recebimentos e COMISSÕES
        if (status === 'PAGO' && titleData.type === 'RECEITA') {
            
            // 0. Geração Automática de COMISSÃO (Estagiários/Funcionários)
            if (titleData.processId) {
                const procDoc = await firestoreAdmin.collection('processes').doc(titleData.processId).get();
                const procData = procDoc.data() as Process | undefined;
                
                if (procData?.commissionStaffId) {
                    const staffDoc = await firestoreAdmin.collection('staff').doc(procData.commissionStaffId).get();
                    const staffData = staffDoc.data() as Staff | undefined;
                    const rem = staffData?.remuneration;

                    if (rem) {
                        let commissionValue = 0;
                        let shouldLaunch = false;

                        if (rem.commissionPercentage) {
                            commissionValue = (titleData.value * rem.commissionPercentage) / 100;
                            shouldLaunch = true;
                        } else if (rem.commissionFixedValue) {
                            // Se for fixo, lançamos apenas na PREIMEIRA parcela para não duplicar
                            const isFirstInstallment = !titleData.installmentIndex || titleData.installmentIndex === 1;
                            if (isFirstInstallment) {
                                commissionValue = rem.commissionFixedValue;
                                shouldLaunch = true;
                            }
                        }

                        if (shouldLaunch && commissionValue > 0) {
                            batch.set(firestoreAdmin.collection('staff').doc(procData.commissionStaffId).collection('credits').doc(), {
                                type: 'PRODUCAO',
                                description: `Comissão: ${titleData.description}${titleData.installmentIndex ? ` (${titleData.installmentIndex}/${titleData.totalInstallments})` : ''}`,
                                value: commissionValue,
                                status: 'DISPONIVEL',
                                date: now,
                                processId: titleData.processId,
                                financialTitleId: titleId,
                                monthKey: format(new Date(), 'yyyy-MM')
                            });
                        }
                    }
                }
            }

            // 1. Desbloqueio de Créditos do Advogado (Carteira do Colaborador)
            if (titleData.financialEventId && ['ACORDO', 'SENTENCA', 'ALVARA', 'TRANSFERENCIAS_JUDICIAIS'].includes(titleData.origin)) {
                const staffSnap = await firestoreAdmin.collection('staff').get();
                for (const s of staffSnap.docs) {
                    const creds = await s.ref.collection('credits')
                        .where('financialEventId', '==', titleData.financialEventId)
                        .get();
                    
                    creds.docs.forEach(c => {
                        const cData = c.data();
                        // Se houver parcelas, talvez desbloquear apenas o proporcional? 
                        // Por simplicidade, se o título da parcela X/Y for pago, desbloqueamos o crédito vinculado
                        batch.update(c.ref, { 
                            status: 'DISPONIVEL',
                            unlockedAt: now,
                            notes: `Desbloqueado pelo recebimento de "${titleData.description}"`
                        });
                    });
                }

                // 2. Lançamento Automático de Repasse ao Cliente (Fluxo de Saída)
                // Se o recebimento foi de um acordo/sentença, o cliente ganha a parte dele (ex: 70%)
                const eventDoc = await firestoreAdmin.collection('financial_events').doc(titleData.financialEventId).get();
                if (eventDoc.exists) {
                    const eventData = eventDoc.data() as FinancialEvent;
                    const clientPercentage = eventData.clientPercentage || 70;
                    const clientPayoutValue = (titleData.value * clientPercentage) / 100;

                    if (clientPayoutValue > 0) {
                        const payoutTitleRef = firestoreAdmin.collection('financial_titles').doc();
                        batch.set(payoutTitleRef, {
                            description: `Repasse p/ Cliente: ${titleData.description.replace('(Receita)', '(Saída)')}`,
                            type: 'DESPESA',
                            origin: 'REPASSE_CLIENTE',
                            value: clientPayoutValue,
                            dueDate: now, // Agendado para agora pois já recebemos o bruto
                            status: 'PENDENTE',
                            financialEventId: titleData.financialEventId,
                            processId: titleData.processId || null,
                            clientId: titleData.clientId || null,
                            notes: `Provisionado automaticamente pelo recebimento da Parcela ID: ${titleId}`,
                            createdAt: now,
                            updatedAt: now
                        });
                    }
                }
            }
        }

        await batch.commit();
        revalidatePath('/dashboard/financeiro');
        revalidatePath('/dashboard/repasses');
        return { success: true };
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function updateFinancialTitle(id: string, data: any) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  try {
    const titleRef = firestoreAdmin.collection('financial_titles').doc(id);
    const { recurring, months = 1, ...baseData } = data;
    
    const payload = { ...baseData };
    if (baseData.dueDate) {
      payload.dueDate = Timestamp.fromDate(new Date(baseData.dueDate));
    }
    if (baseData.competenceDate) {
      payload.competenceDate = Timestamp.fromDate(new Date(baseData.competenceDate));
    }

    // Se ligou recorrência agora e não tinha antes
    if (recurring && months > 1 && !baseData.recurrenceId) {
      const batch = firestoreAdmin.batch();
      const recurrenceId = uuidv4();
      
      // Update the current one
      batch.update(titleRef, {
        ...payload,
        recurrenceId,
        installmentIndex: 1,
        totalInstallments: months,
        description: `${payload.description} (1/${months})`,
        updatedAt: FieldValue.serverTimestamp()
      });

      // Create the rest
      const initialDueDate = new Date(baseData.dueDate);
      const initialCompetenceDate = baseData.competenceDate ? new Date(baseData.competenceDate) : null;

      for (let i = 1; i < months; i++) {
        const nextRef = firestoreAdmin.collection('financial_titles').doc();
        const nextDueDate = addMonths(initialDueDate, i);
        const nextPayload = {
          ...payload,
          description: `${payload.description} (${i + 1}/${months})`,
          dueDate: Timestamp.fromDate(nextDueDate),
          installmentIndex: i + 1,
          totalInstallments: months,
          recurrenceId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
        if (initialCompetenceDate) {
          nextPayload.competenceDate = Timestamp.fromDate(addMonths(initialCompetenceDate, i));
        }
        batch.set(nextRef, nextPayload);
      }
      await batch.commit();
    } else {
      await titleRef.update({
        ...payload,
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    revalidatePath('/dashboard/financeiro');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateFinancialTitleSeries(recurrenceId: string, data: any) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  try {
    const batch = firestoreAdmin.batch();
    const titles = await firestoreAdmin.collection('financial_titles')
      .where('recurrenceId', '==', recurrenceId)
      .get();
    
    const { value, description, origin, type, category, subcategory } = data;
    const payload: any = {};
    if (value !== undefined) payload.value = value;
    if (description !== undefined) payload.description = description;
    if (origin !== undefined) payload.origin = origin;
    if (type !== undefined) payload.type = type;
    if (category !== undefined) payload.category = category;
    if (subcategory !== undefined) payload.subcategory = subcategory;
    
    payload.updatedAt = FieldValue.serverTimestamp();

    titles.docs.forEach(doc => {
      // For description, we keep the index if present
      const currentData = doc.data();
      let finalDescription = description;
      if (description && currentData.installmentIndex && currentData.totalInstallments) {
        finalDescription = `${description} (${currentData.installmentIndex}/${currentData.totalInstallments})`;
      }
      
      batch.update(doc.ref, {
        ...payload,
        description: finalDescription || currentData.description
      });
    });

    await batch.commit();
    revalidatePath('/dashboard/financeiro');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteFinancialTitle(id: string) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  try {
    await firestoreAdmin.collection('financial_titles').doc(id).delete();
    revalidatePath('/dashboard/financeiro');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function anticipateFinancialTitles(recurrenceId: string) {
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    try {
        const batch = firestoreAdmin.batch();
        const titles = await firestoreAdmin.collection('financial_titles')
            .where('recurrenceId', '==', recurrenceId)
            .where('status', '==', 'PENDENTE')
            .get();
        
        const now = FieldValue.serverTimestamp();

        titles.docs.forEach(doc => {
            batch.update(doc.ref, { 
                status: 'PAGO', 
                paymentDate: now,
                updatedAt: now,
                notes: FieldValue.arrayUnion(`Antecipação em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`)
            });
        });

        await batch.commit();
        revalidatePath('/dashboard/financeiro');
        revalidatePath('/dashboard/repasses');
        return { success: true, count: titles.size };
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function deleteFinancialTitleSeries(groupId: string) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  try {
    const batch = firestoreAdmin.batch();
    
    // Check both potential grouping fields
    const titlesByRecurrence = await firestoreAdmin.collection('financial_titles')
      .where('recurrenceId', '==', groupId)
      .get();
    
    const titlesByEvent = await firestoreAdmin.collection('financial_titles')
      .where('financialEventId', '==', groupId)
      .get();
    
    titlesByRecurrence.docs.forEach(doc => batch.delete(doc.ref));
    titlesByEvent.docs.forEach(doc => {
      // Avoid double delete if both fields point to same ID
      if (!titlesByRecurrence.docs.find(d => d.id === doc.id)) {
        batch.delete(doc.ref);
      }
    });

    await batch.commit();
    revalidatePath('/dashboard/financeiro');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function processRepasse(staffId: string, creditIds: string[], totalValue: number) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado.");

  const batch = firestoreAdmin.batch();
  const staffRef = firestoreAdmin.collection('staff').doc(staffId);
  const staffDoc = await staffRef.get();
  const staffData = staffDoc.data() as Staff;

  creditIds.forEach(id => {
    batch.update(staffRef.collection('credits').doc(id), { 
      status: 'PAGO', 
      paymentDate: FieldValue.serverTimestamp(),
      paidBy: session.user.name 
    });
  });

  batch.set(firestoreAdmin.collection('financial_titles').doc(), {
    description: `Repasse: ${staffData.firstName} ${staffData.lastName}`,
    type: 'DESPESA',
    origin: 'HONORARIOS_PAGOS',
    value: totalValue,
    dueDate: Timestamp.now(),
    paymentDate: Timestamp.now(),
    status: 'PAGO',
    paidToStaffId: staffId
  });

  await batch.commit();
  await createNotification({
    userId: staffId,
    title: "Pagamento Efetuado",
    description: `Créditos liquidados no valor de ${totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    type: 'finance',
    href: '/dashboard/repasses'
  });

  revalidatePath('/dashboard/financeiro');
  revalidatePath('/dashboard/repasses');
  return { success: true };
}

export async function createFinancialTitle(data: any) {
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    try {
        const batch = firestoreAdmin.batch();
        const { recurring, months = 1, ...baseData } = data;
        
        let resolvedClientId = baseData.clientId || null;
        if (baseData.processId && !resolvedClientId) {
          const p = await firestoreAdmin.collection('processes').doc(baseData.processId).get();
          resolvedClientId = p.data()?.clientId || null;
        }

        const initialDueDate = new Date(baseData.dueDate);
        const count = recurring ? Math.min(Math.max(months, 1), 24) : 1;
        const recurrenceId = recurring ? uuidv4() : null;

        for (let i = 0; i < count; i++) {
            const titleRef = firestoreAdmin.collection('financial_titles').doc();
            const currentDueDate = addMonths(initialDueDate, i);
            
            const description = recurring && count > 1 
                ? `${baseData.description} (${i + 1}/${count})` 
                : baseData.description;

            const payload: any = {
                description: description || 'Lançamento sem descrição',
                type: baseData.type || 'RECEITA',
                origin: baseData.origin || 'OUTRAS_DESPESAS',
                value: baseData.value || 0,
                status: baseData.status || 'PENDENTE',
                dueDate: Timestamp.fromDate(currentDueDate),
                paymentMethod: baseData.paymentMethod || null,
                beneficiaryName: baseData.beneficiaryName || null,
                beneficiaryDocument: baseData.beneficiaryDocument || null,
                pixKey: baseData.pixKey || null,
                notes: baseData.notes || null,
                bankAccountId: baseData.bankAccountId || null,
                category: baseData.category || null,
                subcategory: baseData.subcategory || null,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                installmentIndex: i + 1,
                totalInstallments: count,
                recurrenceId: recurrenceId
            };

            if (baseData.competenceDate) {
              payload.competenceDate = Timestamp.fromDate(addMonths(new Date(baseData.competenceDate), i));
            }

            if (baseData.processId) payload.processId = baseData.processId;
            if (resolvedClientId) payload.clientId = resolvedClientId;

            if (baseData.status === 'PAGO') {
              payload.paymentDate = FieldValue.serverTimestamp();
            }

            batch.set(titleRef, payload);
        }

        await batch.commit();
        revalidatePath('/dashboard/financeiro');
        return { success: true };
    } catch (error: any) {
        console.error('[createFinancialTitle] Error:', error);
        throw new Error(error.message);
    }
}

export async function deleteStaffCredit(staffId: string, creditId: string) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  try {
    await firestoreAdmin.collection(`staff/${staffId}/credits`).doc(creditId).delete();
    revalidatePath('/dashboard/repasses');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateStaffCredit(staffId: string, creditId: string, data: Partial<StaffCredit>) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  try {
    await firestoreAdmin.collection(`staff/${staffId}/credits`).doc(creditId).update(data);
    revalidatePath('/dashboard/repasses');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function addManualStaffCredit(staffId: string, data: Partial<StaffCredit>) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  try {
    await firestoreAdmin.collection(`staff/${staffId}/credits`).add({
      ...data,
      status: data.status || 'DISPONIVEL',
      date: Timestamp.now(),
    });
    revalidatePath('/dashboard/repasses');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateCreditForecast(staffId: string, creditIds: string[], forecastDate: string) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  const batch = firestoreAdmin.batch();
  const [year, month, day] = forecastDate.split('-').map(Number);
  const forecastTimestamp = Timestamp.fromDate(new Date(year, month - 1, day));

  creditIds.forEach(id => {
    const ref = firestoreAdmin!.collection(`staff/${staffId}/credits`).doc(id);
    batch.update(ref, { paymentForecast: forecastTimestamp });
  });

  await batch.commit();
  revalidatePath('/dashboard/repasses');
  return { success: true };
}

export async function requestCreditUnlock(staffId: string, creditId: string, reason: string) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  try {
    const ref = firestoreAdmin.collection('staff').doc(staffId).collection('credits').doc(creditId);
    await ref.update({ 
      unlockRequested: true,
      unlockReason: reason,
      unlockRequestedAt: FieldValue.serverTimestamp()
    });
    
    const financialUsersSnap = await firestoreAdmin.collection('users').where('role', 'in', ['admin', 'financial']).get();
    for (const userDoc of financialUsersSnap.docs) {
      await createNotification({
        userId: userDoc.id,
        title: "Solicitação de Desbloqueio",
        description: `Um colaborador solicitou a liberação de um crédito retido.`,
        type: 'finance',
        href: '/dashboard/repasses'
      });
    }
    
    revalidatePath('/dashboard/repasses');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function processLatePaymentRoutine(titleId: string) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado.");

  try {
    const titleRef = firestoreAdmin.collection('financial_titles').doc(titleId);
    const titleSnap = await titleRef.get();
    const titleData = titleSnap.data() as FinancialTitle;

    if (!titleData.processId) return { success: false, error: "Título sem processo vinculado." };

    const processRef = firestoreAdmin.collection('processes').doc(titleData.processId);
    
    const dueDate = titleData.dueDate instanceof Timestamp ? titleData.dueDate.toDate() : new Date(titleData.dueDate as any);
    
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'system',
      description: `ALERTA DE INADIMPLÊNCIA: Parcela "${titleData.description}" vencida em ${format(dueDate, 'dd/MM/yy')}. Rotina de cobrança iniciada.`,
      date: Timestamp.now() as any,
      authorName: session.user.name || 'Sistema'
    };

    await processRef.update({
      timeline: FieldValue.arrayUnion(timelineEvent),
      updatedAt: FieldValue.serverTimestamp()
    });

    revalidatePath('/dashboard/financeiro');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function checkPendingPayrollForToday() {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  const staffSnap = await firestoreAdmin.collection('staff').get();
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonthKey = format(today, 'MMMM/yyyy', { locale: ptBR });

  const pending: { id: string, name: string, value: number, type: string }[] = [];

  for (const s of staffSnap.docs) {
    const data = s.data() as Staff;
    const paymentDay = data.remuneration?.paymentDay || 5; // Default to 5th if not set
    
    // Check if it's the professional's day
    if (paymentDay === currentDay) {
      // Check if already launched for this month
      const creditsSnap = await s.ref.collection('credits')
        .where('type', '==', 'SALARIO')
        .where('description', '>=', `Pro-labore Mensal - ${currentMonthKey}`)
        .limit(1)
        .get();

      if (creditsSnap.empty && data.remuneration?.fixedMonthlyValue) {
        pending.push({
          id: s.id,
          name: `${data.firstName} ${data.lastName}`,
          value: data.remuneration.fixedMonthlyValue,
          type: 'SALARIO'
        });
      }
    }
  }

  return pending;
}

export async function launchPayroll(staffIds?: string[]) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  const staffSnap = staffIds 
    ? await Promise.all(staffIds.map(id => firestoreAdmin!.collection('staff').doc(id).get()))
    : (await firestoreAdmin.collection('staff').get()).docs;

  let count = 0;
  const currentMonth = format(new Date(), 'MMMM/yyyy', { locale: ptBR });

  for (const s of staffSnap) {
    if (!s.exists) continue;
    const data = s.data() as Staff;
    
    // Verification to avoid double launch even in targeted launch
    const alreadyExists = await s.ref.collection('credits')
        .where('type', '==', 'SALARIO')
        .where('description', '==', `Pro-labore Mensal - ${currentMonth}`)
        .limit(1)
        .get();

    if (alreadyExists.empty && data.remuneration?.fixedMonthlyValue) {
      await s.ref.collection('credits').add({
        type: 'SALARIO',
        description: `Pro-labore Mensal - ${currentMonth}`,
        value: data.remuneration.fixedMonthlyValue,
        status: 'DISPONIVEL',
        date: Timestamp.now()
      });
      count++;
    }
  }

  revalidatePath('/dashboard/repasses');
  return { success: true, count };
}
