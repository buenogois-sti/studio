'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { FinancialTitle, Process, FinancialEvent } from './types';
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

// Map event types to title origins
const eventTypeToOriginMap: Record<CreateEventData['type'], FinancialTitle['origin']> = {
  'ACORDO': 'ACORDO',
  'SENTENCA': 'SENTENCA',
  'EXECUCAO': 'SENTENCA', // Executions often derive from sentences
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

  // 1. Get Process and Client info
  const processDoc = await firestoreAdmin.collection('processes').doc(processId).get();
  if (!processDoc.exists) {
    throw new Error("Processo associado não encontrado.");
  }
  const processData = processDoc.data() as Process;

  // 2. Create the FinancialEvent
  const eventRef = firestoreAdmin.collection('financial_events').doc();
  const newEvent: Omit<FinancialEvent, 'id'> = {
    processId,
    type,
    eventDate,
    description,
    totalValue,
  };
  batch.set(eventRef, newEvent);

  // 3. Create FinancialTitle(s)
  const installmentValue = totalValue / installments;
  const origin = eventTypeToOriginMap[type];

  for (let i = 0; i < installments; i++) {
    const titleRef = firestoreAdmin.collection('financial_titles').doc();
    
    const titleDescription = installments > 1
      ? `${description} - Parcela ${i + 1}/${installments}`
      : description;
      
    const dueDate = addMonths(firstDueDate, i);

    const newTitle: Omit<FinancialTitle, 'id'> = {
      financialEventId: eventRef.id,
      processId: processId,
      clientId: processData.clientId,
      description: titleDescription,
      type: 'RECEITA', // Events always generate revenue
      origin: origin,
      value: installmentValue,
      dueDate: dueDate,
      status: 'PENDENTE',
    };
    batch.set(titleRef, newTitle);
  }

  // 4. Commit batch
  try {
    await batch.commit();
    return { success: true, message: `Evento financeiro e ${installments} título(s) criados com sucesso!` };
  } catch (error: any) {
    console.error("Error committing financial event batch:", error);
    throw new Error(error.message || 'Falha ao salvar o evento e os títulos financeiros.');
  }
}

export async function createFinancialTitle(data: Partial<Omit<FinancialTitle, 'id' | 'paymentDate'>> & { processId?: string }): Promise<{ success: boolean; message: string }> {
    if (!firestoreAdmin) {
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    try {
        let clientId: string | undefined = undefined;
        if (data.processId) {
          const processDoc = await firestoreAdmin.collection('processes').doc(data.processId).get();
          if (!processDoc.exists) {
              throw new Error("Processo associado não encontrado.");
          }
          const processData = processDoc.data() as Process;
          clientId = processData.clientId;
        }

        const newTitle: Omit<FinancialTitle, 'id'> = {
            ...data,
            clientId: clientId,
        } as Omit<FinancialTitle, 'id'>;

        // Clean up undefined fields
        if(!newTitle.processId) delete newTitle.processId;
        if(!newTitle.clientId) delete newTitle.clientId;


        await firestoreAdmin.collection('financial_titles').add(newTitle);

        return { success: true, message: 'Título financeiro criado com sucesso!' };
    } catch (error: any) {
        console.error("Error creating financial title:", error);
        throw new Error(error.message || 'Falha ao criar o título financeiro.');
    }
}

export async function updateFinancialTitleStatus(
    titleId: string, 
    status: 'PAGO' | 'PENDENTE' | 'ATRASADO'
): Promise<{ success: boolean; message: string }> {
    if (!firestoreAdmin) {
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    try {
        const titleRef = firestoreAdmin.collection('financial_titles').doc(titleId);

        const updateData: { status: string; paymentDate?: FieldValue } = { status };
        
        if (status === 'PAGO') {
            // Set paymentDate to the time of the update on the server
            updateData.paymentDate = FieldValue.serverTimestamp();
        } else {
            // If status is changed back to 'PENDENTE' or 'ATRASADO', remove the paymentDate
            updateData.paymentDate = FieldValue.delete();
        }

        await titleRef.update(updateData);
        
        return { success: true, message: 'Status do título atualizado com sucesso!' };

    } catch (error: any) {
        console.error("Error updating financial title status:", error);
        throw new Error(error.message || 'Falha ao atualizar o status do título.');
    }
}
