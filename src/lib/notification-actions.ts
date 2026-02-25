'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { Notification, NotificationType, UserProfile, Staff } from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

interface CreateNotificationData {
  userId: string; // Pode ser o Google ID ou o Staff ID (o motor irá resolver)
  title: string;
  description: string;
  href?: string;
  type?: NotificationType;
}

/**
 * Resolve o Google ID (ID da coleção /users) a partir de um staffId ou Email.
 * Essencial para garantir que notificações cheguem ao destino correto.
 */
async function resolveActualUserId(idOrEmail: string): Promise<string | null> {
  if (!firestoreAdmin) return null;

  // 1. Tenta verificar se já é um Google ID válido (existe na col users)
  const userDoc = await firestoreAdmin.collection('users').doc(idOrEmail).get();
  if (userDoc.exists) return idOrEmail;

  // 2. Se não for, tenta tratar como staffId e buscar o email
  const staffDoc = await firestoreAdmin.collection('staff').doc(idOrEmail).get();
  if (staffDoc.exists) {
    const email = staffDoc.data()?.email;
    if (email) {
      const userByEmail = await firestoreAdmin.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
      if (!userByEmail.empty) return userByEmail.docs[0].id;
    }
  }

  // 3. Se for um email direto
  if (idOrEmail.includes('@')) {
    const userByEmail = await firestoreAdmin.collection('users').where('email', '==', idOrEmail.toLowerCase()).limit(1).get();
    if (!userByEmail.empty) return userByEmail.docs[0].id;
  }

  return null;
}

export async function createNotification(data: CreateNotificationData): Promise<void> {
  if (!firestoreAdmin) {
    console.error("[Notifications] Firebase Admin não inicializado.");
    return;
  }
  
  try {
    // RESOLUÇÃO DE IDENTIDADE: Crucial para o Bueno Gois
    const actualUserId = await resolveActualUserId(data.userId);
    
    if (!actualUserId) {
      console.warn(`[Notifications] Não foi possível localizar um usuário ativo para o ID: ${data.userId}. Notificação descartada.`);
      return;
    }

    const notificationData = {
      userId: actualUserId,
      title: data.title,
      description: data.description,
      href: data.href || '#',
      isRead: false,
      type: data.type || 'info',
      createdAt: FieldValue.serverTimestamp(),
    };
    
    await firestoreAdmin.collection(`users/${actualUserId}/notifications`).add(notificationData);
    console.log(`[Notifications] Mensagem entregue para o usuário: ${actualUserId}`);

  } catch (error) {
    console.error("[Notifications] Erro ao criar notificação:", error);
  }
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    if (!firestoreAdmin) return;

    try {
        const notifRef = firestoreAdmin.doc(`users/${userId}/notifications/${notificationId}`);
        await notifRef.update({ 
          isRead: true,
          updatedAt: FieldValue.serverTimestamp()
        });
        revalidatePath('/dashboard');
    } catch (error) {
        console.error(`[Notifications] Erro ao marcar como lida:`, error);
    }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!firestoreAdmin) return;
  try {
    const colRef = firestoreAdmin.collection(`users/${userId}/notifications`);
    const unread = await colRef.where('isRead', '==', false).get();
    
    const batch = firestoreAdmin.batch();
    unread.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true, updatedAt: FieldValue.serverTimestamp() });
    });
    
    await batch.commit();
    revalidatePath('/dashboard');
  } catch (error) {
    console.error("[Notifications] Erro ao limpar notificações:", error);
  }
}

export async function clearAllNotifications(userId: string): Promise<void> {
  if (!firestoreAdmin) return;
  try {
    const colRef = firestoreAdmin.collection(`users/${userId}/notifications`);
    const all = await colRef.get();
    
    const batch = firestoreAdmin.batch();
    all.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    revalidatePath('/dashboard');
  } catch (error) {
    console.error("[Notifications] Erro ao excluir histórico:", error);
  }
}
