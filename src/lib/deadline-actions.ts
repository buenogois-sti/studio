'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { LegalDeadline, LegalDeadlineStatus, TimelineEvent } from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { v4 as uuidv4 } from 'uuid';

export async function createLegalDeadline(data: {
  processId: string;
  type: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  isBusinessDays: boolean;
  publicationText?: string;
  observations?: string;
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const deadlineRef = firestoreAdmin.collection('deadlines').doc();
    const processRef = firestoreAdmin.collection('processes').doc(data.processId);

    const deadlinePayload: Omit<LegalDeadline, 'id'> = {
      processId: data.processId,
      type: data.type,
      startDate: Timestamp.fromDate(new Date(data.startDate)),
      endDate: Timestamp.fromDate(new Date(data.endDate)),
      daysCount: data.daysCount,
      isBusinessDays: data.isBusinessDays,
      publicationText: data.publicationText || '',
      observations: data.observations || '',
      status: 'PENDENTE' as LegalDeadlineStatus,
      authorId: session.user.id,
      authorName: session.user.name || 'Advogado',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const methodLabel = data.isBusinessDays ? 'dias úteis' : 'dias corridos';
    
    // Criar o evento para a Timeline do Processo
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'deadline',
      description: `PRAZO LANÇADO: ${data.type} (${data.daysCount} ${methodLabel}). Vencimento: ${new Date(data.endDate).toLocaleDateString('pt-BR')}`,
      date: Timestamp.now(),
      authorName: session.user.name || 'Sistema',
      endDate: Timestamp.fromDate(new Date(data.endDate)),
      isBusinessDays: data.isBusinessDays
    };

    const batch = firestoreAdmin.batch();
    batch.set(deadlineRef, deadlinePayload);
    batch.update(processRef, {
      timeline: FieldValue.arrayUnion(timelineEvent),
      updatedAt: FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { success: true, id: deadlineRef.id };
  } catch (error: any) {
    console.error('Error creating deadline:', error);
    throw new Error(error.message || 'Falha ao lançar prazo.');
  }
}

export async function deleteLegalDeadline(id: string) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  try {
    await firestoreAdmin.collection('deadlines').doc(id).delete();
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
