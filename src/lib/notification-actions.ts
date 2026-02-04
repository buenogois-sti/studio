'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { Notification, NotificationType } from './types';
import { Timestamp } from 'firebase-admin/firestore';

interface CreateNotificationData {
  userId: string;
  title: string;
  description: string;
  href?: string;
  type?: NotificationType;
}

export async function createNotification(data: CreateNotificationData): Promise<void> {
  if (!firestoreAdmin) {
    console.error("Firebase Admin not initialized, cannot create notification.");
    return;
  }
  
  try {
    const notificationData: Omit<Notification, 'id' | 'createdAt'> & { createdAt: Timestamp } = {
      userId: data.userId,
      title: data.title,
      description: data.description,
      href: data.href || '#',
      isRead: false,
      type: data.type || 'info',
      createdAt: Timestamp.now(),
    };
    
    await firestoreAdmin.collection(`users/${data.userId}/notifications`).add(notificationData);

  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    if (!firestoreAdmin) {
        console.error("Firebase Admin not initialized, cannot mark notification as read.");
        return;
    }

    try {
        const notifRef = firestoreAdmin.doc(`users/${userId}/notifications/${notificationId}`);
        await notifRef.update({ isRead: true });
    } catch (error) {
        console.error(`Error marking notification ${notificationId} as read:`, error);
    }
}
