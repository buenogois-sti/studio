
'use server';

import { firestoreAdmin, authAdmin } from '@/firebase/admin';
import type { UserRole, UserRoleInfo } from './types';
import { revalidatePath } from 'next/cache';
import { Timestamp } from 'firebase-admin/firestore';

export async function getUserRoles(): Promise<UserRoleInfo[]> {
    if (!firestoreAdmin) {
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    const snapshot = await firestoreAdmin.collection('user_roles').get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => doc.data() as UserRoleInfo);
}

export async function upsertUserRole(email: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
    if (!firestoreAdmin) {
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    if (!email || !role) {
        throw new Error("Email e perfil são obrigatórios.");
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: 'Formato de e-mail inválido.' };
    }

    const userRoleRef = firestoreAdmin.collection('user_roles').doc(email.toLowerCase());
    await userRoleRef.set({ email: email.toLowerCase(), role }, { merge: true });
    
    // If user already exists, update their role in the main users collection too
    try {
        const userQuery = await firestoreAdmin.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
        if(!userQuery.empty) {
            const userDoc = userQuery.docs[0];
            await userDoc.ref.update({ role: role });
        }
    } catch (e) {
        console.error("Could not update existing user's role:", e);
        // Don't throw, the main operation succeeded
    }

    revalidatePath('/dashboard/configuracoes');
    return { success: true };
}


export async function deleteUserRole(email: string): Promise<{ success: boolean }> {
    if (!firestoreAdmin || !authAdmin) {
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    const lowercasedEmail = email.toLowerCase();
    
    // Delete the pre-assigned role
    await firestoreAdmin.collection('user_roles').doc(lowercasedEmail).delete();

    // Find user by email and delete from Firestore and Auth
    try {
        const userRecord = await authAdmin.getUserByEmail(lowercasedEmail);
        if (userRecord) {
            await firestoreAdmin.collection('users').doc(userRecord.uid).delete();
            await authAdmin.deleteUser(userRecord.uid);
        }
    } catch(e: any) {
        if (e.code !== 'auth/user-not-found') {
            console.error(`Error finding/deleting user ${lowercasedEmail}:`, e);
            // Don't throw, as the primary goal (deleting role) succeeded.
        }
    }
    
    revalidatePath('/dashboard/configuracoes');
    return { success: true };
}

export async function acceptLGPDTerms(userId: string): Promise<{ success: boolean }> {
  if (!firestoreAdmin) throw new Error("Servidor inacessível.");
  try {
    await firestoreAdmin.collection('users').doc(userId).update({
      lgpdAccepted: true,
      lgpdAcceptedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
