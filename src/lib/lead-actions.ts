'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { Lead, LeadStatus, TimelineEvent } from './types';
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
  description?: string;
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const leadRef = firestoreAdmin.collection('leads').doc();
    const payload: Omit<Lead, 'id'> = {
      ...data,
      status: 'NOVO' as LeadStatus,
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    };

    await leadRef.set(payload);

    if (data.lawyerId) {
      await createNotification({
        userId: data.lawyerId,
        title: "Novo Lead Designado",
        description: `Você foi encarregado de elaborar a ação: ${data.title}.`,
        type: 'info',
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

export async function convertLeadToProcess(leadId: string) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const leadRef = firestoreAdmin.collection('leads').doc(leadId);
    const leadDoc = await leadRef.get();
    if (!leadDoc.exists) throw new Error('Lead não encontrado.');
    
    const leadData = leadDoc.data() as Lead;
    if (leadData.status === 'CONVERTIDO') throw new Error('Este lead já foi convertido em processo.');

    const processRef = firestoreAdmin.collection('processes').doc();
    
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'system',
      description: `PROCESSO CRIADO: Convertido a partir do Lead #${leadId.substring(0, 6)}. Elaboração concluída por Dr(a). ${leadData.lawyerId}.`,
      date: Timestamp.now() as any,
      authorName: session.user.name || 'Sistema'
    };

    const processPayload = {
      clientId: leadData.clientId,
      name: leadData.title,
      legalArea: leadData.legalArea,
      description: leadData.description || '',
      status: 'Ativo',
      leadLawyerId: leadData.lawyerId,
      teamParticipants: [],
      opposingParties: [],
      timeline: [timelineEvent],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const batch = firestoreAdmin.batch();
    batch.set(processRef, processPayload);
    batch.update(leadRef, { status: 'CONVERTIDO', updatedAt: Timestamp.now() });
    
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
