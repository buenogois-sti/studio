
'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { FinancialTitle, Process, FinancialEvent, Staff, LawyerCredit } from './types';
import { FieldValue } from 'firebase-admin/firestore';
import { addMonths } from 'date-fns';

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

  // 1. Buscar dados do Processo e do Advogado Responsável
  const processDoc = await firestoreAdmin.collection('processes').doc(processId).get();
  if (!processDoc.exists) {
    throw new Error("Processo associado não encontrado.");
  }
  const processData = processDoc.data() as Process;
  const leadLawyerId = processData.leadLawyerId;

  // 2. Criar o Evento Financeiro Central
  const eventRef = firestoreAdmin.collection('financial_events').doc();
  const newEvent: Omit<FinancialEvent, 'id'> = {
    processId,
    type,
    eventDate: new Date(eventDate),
    description,
    totalValue,
  };
  batch.set(eventRef, newEvent);

  // 3. Gerar Títulos de Receita (Fluxo de Caixa do Escritório)
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

  // 4. CÁLCULO DE HONORÁRIOS (Crédito do Advogado)
  if (leadLawyerId) {
    const lawyerDoc = await firestoreAdmin.collection('staff').doc(leadLawyerId).get();
    if (lawyerDoc.exists) {
      const lawyerData = lawyerDoc.data() as Staff;
      const rem = lawyerData.remuneration;

      if (rem) {
        let lawyerValue = 0;
        
        // Regra de Sucumbência ou Quota Litis
        if ((rem.type === 'SUCUMBENCIA' || rem.type === 'QUOTA_LITIS') && rem.lawyerPercentage) {
          lawyerValue = totalValue * (rem.lawyerPercentage / 100);
        }

        if (lawyerValue > 0) {
          const creditRef = firestoreAdmin.collection(`staff/${leadLawyerId}/credits`).doc();
          const newCredit: Omit<LawyerCredit, 'id'> = {
            processId,
            description: `Honorários (${rem.type}): ${description}`,
            value: lawyerValue,
            status: 'RETIDO', // Fica retido até o cliente pagar o título
            date: new Date(),
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
        const titleData = titleDoc.data() as FinancialTitle;

        const updateData: any = { status };
        if (status === 'PAGO') {
            updateData.paymentDate = FieldValue.serverTimestamp();
            
            // Liberar créditos de advogados vinculados a este evento financeiro
            if (titleData.financialEventId) {
                const staffSnapshot = await firestoreAdmin.collection('staff').get();
                for (const staffDoc of staffSnapshot.docs) {
                    const creditsQuery = await staffDoc.ref.collection('credits')
                        .where('financialEventId', '==', titleData.financialEventId)
                        .get();
                    
                    for (const creditDoc of creditsQuery.docs) {
                        await creditDoc.ref.update({ status: 'DISPONIVEL' });
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
