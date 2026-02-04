
'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { Reimbursement, ReimbursementStatus } from './types';
import { Timestamp } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export async function createReimbursement(data: {
  description: string;
  value: number;
  requestDate: string;
  userId?: string;
  userName?: string;
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  const targetUserId = data.userId || session.user.id;
  const targetUserName = data.userName || session.user.name || 'Usuário';

  try {
    const reimbursementRef = firestoreAdmin.collection('reimbursements').doc();
    const payload = {
      userId: targetUserId,
      userName: targetUserName,
      description: data.description,
      value: data.value,
      status: 'SOLICITADO' as ReimbursementStatus,
      requestDate: Timestamp.fromDate(new Date(data.requestDate)),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await reimbursementRef.set(payload);
    return { success: true };
  } catch (error: any) {
    console.error('Error creating reimbursement:', error);
    throw new Error(error.message);
  }
}

export async function updateReimbursementStatus(id: string, status: ReimbursementStatus, notes?: string) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw new Error('Apenas administradores podem alterar o status.');
  }

  try {
    await firestoreAdmin.collection('reimbursements').doc(id).update({
      status,
      notes: notes || '',
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteReimbursement(id: string) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  try {
    await firestoreAdmin.collection('reimbursements').doc(id).delete();
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
