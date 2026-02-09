
'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { Lead, LeadStatus, LeadPriority, TimelineEvent, OpposingParty, Process } from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cria um novo lead na pauta de triagem com tarefas iniciais concluídas.
 */
export async function createLead(data: {
  clientId: string;
  lawyerId: string;
  title: string;
  legalArea: string;
  priority: LeadPriority;
  captureSource: string;
  isUrgent: boolean;
  prescriptionDate?: string;
  description?: string;
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const leadRef = firestoreAdmin.collection('leads').doc();
    
    const prescriptionDate = data.prescriptionDate 
      ? Timestamp.fromDate(new Date(data.prescriptionDate))
      : undefined;

    const payload: any = {
      clientId: data.clientId,
      lawyerId: data.lawyerId,
      title: data.title,
      legalArea: data.legalArea,
      priority: data.priority,
      captureSource: data.captureSource,
      isUrgent: data.isUrgent,
      description: data.description || '',
      status: 'NOVO' as LeadStatus,
      opposingParties: [],
      completedTasks: ['Captar contatos'], // Tarefa inicial padrão
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (prescriptionDate) {
      payload.prescriptionDate = prescriptionDate;
    }

    await leadRef.set(payload);

    if (data.lawyerId) {
      await createNotification({
        userId: data.lawyerId,
        title: "Novo Lead Designado",
        description: `Você foi encarregado de elaborar a ação: ${data.title}.`,
        type: data.isUrgent ? 'warning' : 'info',
        href: '/dashboard/leads'
      });
    }

    revalidatePath('/dashboard/leads');
    return { success: true, id: leadRef.id };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Atualiza o status (fase) do lead no Kanban.
 */
export async function updateLeadStatus(id: string, status: LeadStatus) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  try {
    await firestoreAdmin.collection('leads').doc(id).update({
      status,
      updatedAt: Timestamp.now()
    });
    revalidatePath('/dashboard/leads');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Converte um Lead em um Processo ativo (Distribuição Processual).
 */
export async function convertLeadToProcess(leadId: string, data: {
  processNumber: string;
  court: string;
  courtBranch: string;
  caseValue: number;
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const leadRef = firestoreAdmin.collection('leads').doc(leadId);
    const leadDoc = await leadRef.get();
    if (!leadDoc.exists) throw new Error('Lead não encontrado.');
    
    const leadData = leadDoc.data() as Lead;
    if (leadData.status === 'CONVERTIDO') throw new Error('Este lead já foi convertido.');

    const clientRef = firestoreAdmin.collection('clients').doc(leadData.clientId);
    const processRef = firestoreAdmin.collection('processes').doc();
    
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'system',
      description: `DISTRIBUIÇÃO PROCESSUAL CONCLUÍDA: Convertido do CRM. CNJ: ${data.processNumber}. Vara: ${data.courtBranch} do ${data.court}. Valor: R$ ${data.caseValue.toFixed(2)}.`,
      date: Timestamp.now() as any,
      authorName: session.user.name || 'Sistema'
    };

    const processPayload: Omit<Process, 'id'> = {
      clientId: leadData.clientId,
      name: leadData.title,
      legalArea: leadData.legalArea,
      description: leadData.description || '',
      status: 'Ativo',
      processNumber: data.processNumber,
      court: data.court,
      courtBranch: data.courtBranch,
      caseValue: data.caseValue,
      leadLawyerId: leadData.lawyerId,
      opposingParties: leadData.opposingParties || [],
      driveFolderId: leadData.driveFolderId || '',
      timeline: [timelineEvent],
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    };

    const batch = firestoreAdmin.batch();
    batch.set(processRef, processPayload);
    batch.update(leadRef, { status: 'CONVERTIDO', updatedAt: Timestamp.now() });
    batch.update(clientRef, { status: 'active', updatedAt: Timestamp.now() });

    await batch.commit();

    revalidatePath('/dashboard/processos');
    revalidatePath('/dashboard/leads');
    
    return { success: true, processId: processRef.id };
  } catch (error: any) {
    console.error('[convertLeadToProcess] Error:', error);
    throw new Error(error.message || 'Falha ao converter lead.');
  }
}
