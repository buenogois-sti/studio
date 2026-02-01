'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { Notification } from './types';
import { Timestamp } from 'firebase-admin/firestore';

interface CreateNotificationData {
  userId: string;
  title: string;
  description: string;
  href?: string;
}

export async function createNotification(data: CreateNotificationData): Promise<void> {
  if (!firestoreAdmin) {
    console.error("Firebase Admin not initialized, cannot create notification.");
    // Don't throw an error, as notifications are non-critical.
    return;
  }
  
  try {
    const notificationData: Omit<Notification, 'id' | 'createdAt'> & { createdAt: Timestamp } = {
      userId: data.userId,
      title: data.title,
      description: data.description,
      href: data.href || '#',
      isRead: false,
      createdAt: Timestamp.now(),
    };
    
    await firestoreAdmin.collection(`users/${data.userId}/notifications`).add(notificationData);

  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't re-throw, to avoid failing the primary action.
  }
}
