
'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { Lead, LeadStatus, LeadPriority, TimelineEvent, OpposingParty } from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

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

export async function updateLeadOpposingParties(id: string, parties: OpposingParty[]) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  try {
    await firestoreAdmin.collection('leads').doc(id).update({
      opposingParties: parties,
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function assignLeadToLawyer(leadId: string, lawyerId: string) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  try {
    await firestoreAdmin.collection('leads').doc(leadId).update({
      lawyerId,
      updatedAt: Timestamp.now()
    });

    await createNotification({
      userId: lawyerId,
      title: "Lead Encaminhado",
      description: `Um novo lead foi atribuído à sua pauta de triagem.`,
      type: 'info',
      href: '/dashboard/leads'
    });

    revalidatePath('/dashboard/leads');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function convertLeadToProcess(leadId: string) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const leadRef = firestoreAdmin.collection('leads').doc(leadId);
    const leadDoc = await leadRef.get();
    if (!leadDoc.exists) throw new Error('Lead não encontrado.');
    
    const leadData = leadDoc.data() as Lead;
    if (leadData.status === 'DISTRIBUIDO') throw new Error('Este lead já foi convertido em processo.');

    // Validar dados do cliente
    const clientDoc = await firestoreAdmin.collection('clients').doc(leadData.clientId).get();
    if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
    const clientData = clientDoc.data();

    const processRef = firestoreAdmin.collection('processes').doc();
    
    const timelineEvent = {
      id: uuidv4(),
      type: 'system',
      description: `PROCESSO DISTRIBUÍDO: Convertido a partir do CRM (Lead #${leadId.substring(0, 6)}). Responsável: ${session.user.name}.`,
      date: Timestamp.now(),
      authorName: session.user.name || 'Sistema'
    };

    const processPayload = {
      clientId: leadData.clientId,
      name: leadData.title,
      legalArea: leadData.legalArea,
      description: leadData.description || '',
      status: 'Ativo',
      leadLawyerId: leadData.lawyerId,
      opposingParties: leadData.opposingParties || [],
      driveFolderId: leadData.driveFolderId || null,
      timeline: [timelineEvent],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const batch = firestoreAdmin.batch();
    batch.set(processRef, processPayload);
    batch.update(leadRef, { status: 'DISTRIBUIDO', updatedAt: Timestamp.now() });
    
    // Atualizar status do cliente para ativo
    batch.update(clientDoc.ref, { status: 'active', updatedAt: Timestamp.now() });

    await batch.commit();

    revalidatePath('/dashboard/processos');
    revalidatePath('/dashboard/leads');
    
    return { success: true, processId: processRef.id };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteLead(id: string) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  try {
    await firestoreAdmin.collection('leads').doc(id).delete();
    revalidatePath('/dashboard/leads');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
