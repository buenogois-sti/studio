'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { ChecklistTemplate, ChecklistExecution } from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notification-actions';

/**
 * Salva ou atualiza um modelo de checklist.
 */
export async function upsertChecklistTemplate(data: Partial<ChecklistTemplate>) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') throw new Error('Apenas administradores podem gerenciar modelos.');

  try {
    const id = data.id || firestoreAdmin.collection('checklist_templates').doc().id;
    const ref = firestoreAdmin.collection('checklist_templates').doc(id);

    const payload = {
      ...data,
      id,
      updatedAt: FieldValue.serverTimestamp(),
      ...(data.id ? {} : { 
        createdAt: FieldValue.serverTimestamp(),
        createdBy: session.user.id,
        createdByName: session.user.name || 'Admin'
      }),
    };

    await ref.set(payload, { merge: true });
    revalidatePath('/dashboard/checklists');
    return { success: true, id };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Exclui um modelo de checklist.
 */
export async function deleteChecklistTemplate(id: string) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') throw new Error('Não autorizado.');

  try {
    await firestoreAdmin.collection('checklist_templates').doc(id).delete();
    revalidatePath('/dashboard/checklists');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Registra a execução de um checklist.
 */
export async function saveChecklistExecution(data: Omit<ChecklistExecution, 'id' | 'executedAt' | 'userId' | 'userName'>) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const ref = firestoreAdmin.collection('checklist_executions').doc();
    const payload = {
      ...data,
      id: ref.id,
      userId: session.user.id,
      userName: session.user.name || 'Colaborador',
      executedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(payload);

    // Notificar administração sobre a execução concluída
    const admins = await firestoreAdmin.collection('users').where('role', '==', 'admin').get();
    for (const admin of admins.docs) {
      await createNotification({
        userId: admin.id,
        title: "Checklist Executado",
        description: `${session.user.name} completou o checklist: ${data.templateTitle}.`,
        type: 'success',
        href: '/dashboard/checklists'
      });
    }

    revalidatePath('/dashboard/checklists');
    return { success: true, id: ref.id };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
