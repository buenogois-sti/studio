'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { Reimbursement, ReimbursementStatus } from './types';
import { Timestamp } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';

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

    // Notificar Admin
    const admins = await firestoreAdmin.collection('users').where('role', '==', 'admin').get();
    for (const admin of admins.docs) {
      await createNotification({
        userId: admin.id,
        title: "Novo Pedido de Reembolso",
        description: `${targetUserName} solicitou R$ ${data.value.toFixed(2)}: ${data.description}`,
        type: 'finance',
        href: '/dashboard/reembolsos'
      });
    }

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
    const ref = firestoreAdmin.collection('reimbursements').doc(id);
    const doc = await ref.get();
    const data = doc.data();

    await ref.update({
      status,
      notes: notes || '',
      updatedAt: Timestamp.now(),
    });

    // Notificar o solicitante
    if (data?.userId) {
      const statusLabels = {
        APROVADO: "✅ Aprovado",
        NEGADO: "❌ Negado",
        REEMBOLSADO: "💰 Pago"
      };
      
      await createNotification({
        userId: data.userId,
        title: `Reembolso ${statusLabels[status as keyof typeof statusLabels] || status}`,
        description: `Seu pedido de R$ ${data.value.toFixed(2)} (${data.description}) foi atualizado.`,
        type: status === 'NEGADO' ? 'error' : 'success',
        href: '/dashboard/reembolsos'
      });
    }

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
