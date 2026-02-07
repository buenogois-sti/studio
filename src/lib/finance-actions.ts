'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { FinancialTitle, Process, FinancialEvent, Staff, StaffCredit, TimelineEvent } from './types';
import { FieldValue } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase/firestore';
import { addMonths, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import { v4 as uuidv4 } from 'uuid';

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
  batch.set(eventRef, { processId, type, eventDate: new Date(eventDate), description, totalValue });

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
      dueDate: addMonths(new Date(firstDueDate), i),
      status: 'PENDENTE',
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
    return { success: true };
  } catch (error: any) {
    throw new Error("Erro ao salvar transações financeiras.");
  }
}

export async function updateFinancialTitleStatus(titleId: string, status: 'PAGO' | 'PENDENTE' | 'ATRASADO') {
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    try {
        const titleRef = firestoreAdmin.collection('financial_titles').doc(titleId);
        const titleDoc = await titleRef.get();
        const titleData = titleDoc.data() as FinancialTitle | undefined;
        if (!titleDoc.exists || !titleData) throw new Error('Título não encontrado.');

        const batch = firestoreAdmin.batch();
        batch.update(titleRef, { 
            status, 
            paymentDate: status === 'PAGO' ? FieldValue.serverTimestamp() : FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp()
        });

        if (titleData.financialEventId) {
            const staffSnap = await firestoreAdmin.collection('staff').get();
            for (const s of staffSnap.docs) {
                const creds = await s.ref.collection('credits')
                    .where('financialEventId', '==', titleData.financialEventId)
                    .get();
                creds.docs.forEach(c => batch.update(c.ref, { 
                    status: status === 'PAGO' ? 'DISPONIVEL' : 'RETIDO',
                    unlockedAt: status === 'PAGO' ? FieldValue.serverTimestamp() : FieldValue.delete()
                }));
            }
        }

        await batch.commit();
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
    dueDate: new Date(),
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

  return { success: true };
}

export async function createFinancialTitle(data: Partial<FinancialTitle>) {
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    try {
        let clientId = data.clientId;
        if (data.processId && !clientId) {
          const p = await firestoreAdmin.collection('processes').doc(data.processId).get();
          clientId = p.data()?.clientId;
        }
        await firestoreAdmin.collection('financial_titles').add({ ...data, clientId, updatedAt: FieldValue.serverTimestamp() });
        return { success: true };
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function deleteStaffCredit(staffId: string, creditId: string) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  try {
    await firestoreAdmin.collection(`staff/${staffId}/credits`).doc(creditId).delete();
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateStaffCredit(staffId: string, creditId: string, data: Partial<StaffCredit>) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  try {
    await firestoreAdmin.collection(`staff/${staffId}/credits`).doc(creditId).update(data);
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
  return { success: true };
}

export async function requestCreditUnlock(staffId: string, creditId: string, reason: string) {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  try {
    const ref = firestoreAdmin.collection(`staff/${staffId}/credits`).doc(creditId);
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

    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function launchPayroll() {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  const staffSnap = await firestoreAdmin.collection('staff').get();
  let count = 0;

  const currentMonth = format(new Date(), 'MMMM/yyyy', { locale: ptBR });

  for (const s of staffSnap.docs) {
    const data = s.data() as Staff;
    if (data.remuneration?.type === 'FIXO_MENSAL' && data.remuneration.fixedMonthlyValue) {
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

  return { success: true, count };
}