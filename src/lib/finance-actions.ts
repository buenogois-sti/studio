'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { FinancialTitle, Process, FinancialEvent, Staff, StaffCredit } from './types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { addMonths, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';

interface CreateEventData {
  processId: string;
  type: 'ACORDO' | 'SENTENCA' | 'EXECUCAO' | 'CONTRATO';
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
};

export async function createFinancialEventAndTitles(data: CreateEventData) {
  if (!firestoreAdmin) {
    throw new Error("A conexão com o servidor de dados falhou.");
  }
  const { processId, type, eventDate, description, totalValue, installments, firstDueDate } = data;

  if (installments < 1) {
    throw new Error("O número de parcelas deve ser pelo menos 1.");
  }

  const batch = firestoreAdmin.batch();

  const processDoc = await firestoreAdmin.collection('processes').doc(processId).get();
  if (!processDoc.exists) {
    throw new Error("Processo associado não encontrado.");
  }
  const processData = processDoc.data() as Process;
  const leadLawyerId = processData.leadLawyerId;

  const eventRef = firestoreAdmin.collection('financial_events').doc();
  const newEvent: Omit<FinancialEvent, 'id'> = {
    processId,
    type,
    eventDate: new Date(eventDate),
    description,
    totalValue,
  };
  batch.set(eventRef, newEvent);

  const installmentValue = totalValue / installments;
  const origin = eventTypeToOriginMap[type];

  for (let i = 0; i < installments; i++) {
    const titleRef = firestoreAdmin.collection('financial_titles').doc();
    const titleDescription = installments > 1 ? `${description} - Parcela ${i + 1}/${installments}` : description;
    const dueDate = addMonths(new Date(firstDueDate), i);

    const newTitle: Omit<FinancialTitle, 'id'> = {
      financialEventId: eventRef.id,
      processId: processId,
      clientId: processData.clientId,
      description: titleDescription,
      type: 'RECEITA',
      origin: origin,
      value: installmentValue,
      dueDate: dueDate,
      status: 'PENDENTE',
    };
    batch.set(titleRef, newTitle);
  }

  // REGRA DE NEGÓCIO DE REPASSE (HONORÁRIOS SOBRE HONORÁRIOS)
  if (leadLawyerId) {
    const lawyerDoc = await firestoreAdmin.collection('staff').doc(leadLawyerId).get();
    if (lawyerDoc.exists) {
      const lawyerData = lawyerDoc.data() as Staff;
      const rem = lawyerData.remuneration;

      if (rem) {
        let lawyerValue = 0;
        
        // O escritório cobra 30% do cliente (padrão Bueno Gois)
        const officeFeeTotal = totalValue * 0.3;

        if ((rem.type === 'SUCUMBENCIA' || rem.type === 'QUOTA_LITIS') && rem.lawyerPercentage) {
          // O advogado recebe X% dos 30% do escritório
          lawyerValue = officeFeeTotal * (rem.lawyerPercentage / 100);
        }

        if (lawyerValue > 0) {
          const creditRef = firestoreAdmin.collection(`staff/${leadLawyerId}/credits`).doc();
          const newCredit: Omit<StaffCredit, 'id'> = {
            type: 'HONORARIOS',
            processId,
            description: `Part. Honorários (${rem.type}): ${description}`,
            value: lawyerValue,
            status: 'RETIDO', // Fica retido até o título ser pago
            date: Timestamp.now(),
            financialEventId: eventRef.id
          };
          batch.set(creditRef, newCredit);
        }
      }
    }
  }

  try {
    await batch.commit();
    return { success: true, message: `Evento financeiro e ${installments} título(s) criados com sucesso!` };
  } catch (error: any) {
    console.error("Error committing financial event batch:", error);
    throw new Error(error.message || 'Falha ao salvar o evento e os títulos financeiros.');
  }
}

export async function createFinancialTitle(data: Partial<Omit<FinancialTitle, 'id' | 'paymentDate'>> & { processId?: string }): Promise<{ success: boolean; message: string }> {
    if (!firestoreAdmin) throw new Error("A conexão com o servidor de dados falhou.");
    try {
        let clientId: string | undefined = undefined;
        if (data.processId) {
          const processDoc = await firestoreAdmin.collection('processes').doc(data.processId).get();
          if (processDoc.exists) {
              clientId = (processDoc.data() as Process).clientId;
          }
        }

        const newTitle = { ...data, clientId };
        if(!newTitle.processId) delete newTitle.processId;
        if(!newTitle.clientId) delete newTitle.clientId;

        await firestoreAdmin.collection('financial_titles').add(newTitle);
        return { success: true, message: 'Título financeiro criado com sucesso!' };
    } catch (error: any) {
        throw new Error(error.message || 'Falha ao criar o título.');
    }
}

export async function updateFinancialTitleStatus(titleId: string, status: 'PAGO' | 'PENDENTE' | 'ATRASADO'): Promise<{ success: boolean; message: string }> {
    if (!firestoreAdmin) throw new Error("A conexão com o servidor de dados falhou.");
    try {
        const titleRef = firestoreAdmin.collection('financial_titles').doc(titleId);
        const titleDoc = await titleRef.get();
        if (!titleDoc.exists) throw new Error('Título não encontrado.');
        
        const titleData = titleDoc.data() as FinancialTitle;

        const updateData: any = { status };
        if (status === 'PAGO') {
            updateData.paymentDate = FieldValue.serverTimestamp();
            
            // Se o título está vinculado a um evento financeiro, LIBERA os créditos dos advogados
            if (titleData.financialEventId) {
                const staffSnapshot = await firestoreAdmin.collection('staff').get();
                for (const staffDoc of staffSnapshot.docs) {
                    const creditsQuery = await staffDoc.ref.collection('credits')
                        .where('financialEventId', '==', titleData.financialEventId)
                        .where('status', '==', 'RETIDO')
                        .get();
                    
                    for (const creditDoc of creditsQuery.docs) {
                        await creditDoc.ref.update({ status: 'DISPONIVEL' });
                    }
                }
            }
        } else if (status === 'PENDENTE') {
            // LÓGICA DE ESTORNO: Volta créditos de DISPONIVEL para RETIDO
            updateData.paymentDate = FieldValue.delete();

            if (titleData.financialEventId) {
                const staffSnapshot = await firestoreAdmin.collection('staff').get();
                for (const staffDoc of staffSnapshot.docs) {
                    const creditsQuery = await staffDoc.ref.collection('credits')
                        .where('financialEventId', '==', titleData.financialEventId)
                        .where('status', '==', 'DISPONIVEL')
                        .get();
                    
                    for (const creditDoc of creditsQuery.docs) {
                        await creditDoc.ref.update({ status: 'RETIDO' });
                    }
                }
            }
        } else {
            updateData.paymentDate = FieldValue.delete();
        }

        await titleRef.update(updateData);
        return { success: true, message: 'Status atualizado!' };
    } catch (error: any) {
        throw new Error(error.message || 'Falha ao atualizar status.');
    }
}

export async function processRepasse(staffId: string, creditIds: string[], totalValue: number) {
  if (!firestoreAdmin) throw new Error("Servidor indisponível.");
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado.");

  const batch = firestoreAdmin.batch();
  const staffRef = firestoreAdmin.collection('staff').doc(staffId);
  const staffDoc = await staffRef.get();
  const staffData = staffDoc.data() as Staff;

  // 1. Marcar créditos como pagos
  for (const id of creditIds) {
    const creditRef = staffRef.collection('credits').doc(id);
    batch.update(creditRef, { 
      status: 'PAGO', 
      paymentDate: FieldValue.serverTimestamp(),
      paidBy: session.user.name 
    });
  }

  // 2. Lançar despesa no financeiro
  const titleRef = firestoreAdmin.collection('financial_titles').doc();
  const newTitle: Omit<FinancialTitle, 'id'> = {
    description: `Repasse Consolidado: ${staffData.firstName} ${staffData.lastName}`,
    type: 'DESPESA',
    origin: 'HONORARIOS_PAGOS',
    value: totalValue,
    dueDate: new Date(),
    paymentDate: Timestamp.now() as any,
    status: 'PAGO',
    paidToStaffId: staffId
  };
  batch.set(titleRef, newTitle);

  try {
    await batch.commit();
    
    // Notificar o profissional
    await createNotification({
      userId: staffId,
      title: "Repasse Recebido",
      description: `O escritório processou um pagamento de ${totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para você.`,
      type: 'finance',
      href: '/dashboard/reembolsos'
    });

    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function launchPayroll() {
  if (!firestoreAdmin) throw new Error("Servidor indisponível.");
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') throw new Error("Apenas administradores podem processar folha.");

  const batch = firestoreAdmin.batch();
  const staffSnap = await firestoreAdmin.collection('staff').get();
  let count = 0;

  const currentMonthKey = format(new Date(), 'yyyy-MM');

  for (const doc of staffSnap.docs) {
    const data = doc.data() as Staff;
    
    // Regra: Apenas se tiver remuneração fixa configurada
    if (data.remuneration?.type === 'FIXO_MENSAL' && data.remuneration.fixedMonthlyValue) {
      
      // Checar se já foi rodado este mês para este colaborador (Evitar duplicidade)
      const existingRef = await doc.ref.collection('credits')
        .where('monthKey', '==', currentMonthKey)
        .where('type', '==', 'SALARIO')
        .get();

      if (existingRef.empty) {
        const creditRef = doc.ref.collection('credits').doc();
        batch.set(creditRef, {
          type: 'SALARIO',
          description: `Pro-labore/Salário: ${format(new Date(), 'MMMM/yyyy', { locale: ptBR })}`,
          value: data.remuneration.fixedMonthlyValue,
          status: 'DISPONIVEL',
          date: FieldValue.serverTimestamp(),
          monthKey: currentMonthKey
        });
        count++;
      }
    }
  }

  if (count > 0) {
    await batch.commit();
  }
  
  return { success: true, count };
}
