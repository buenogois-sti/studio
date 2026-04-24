
'use server';

import { firestoreAdmin, authAdmin } from '@/firebase/admin';
import type { UserRole, UserRoleInfo, RolePermissions, PermissionKey } from './types';
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


export async function deleteUserRole(email: string): Promise<{ success: boolean; error?: string }> {
    if (!firestoreAdmin || !authAdmin) {
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    const lowercasedEmail = email.toLowerCase();
    
    try {
        // 1. Delete from pre-assigned roles
        await firestoreAdmin.collection('user_roles').doc(lowercasedEmail).delete();

        // 2. Delete from users collection (query by email)
        const userQuery = await firestoreAdmin.collection('users').where('email', '==', lowercasedEmail).get();
        const deletePromises: Promise<any>[] = [];
        
        userQuery.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });
        
        await Promise.all(deletePromises);

        // 3. Delete from Firebase Auth
        try {
            const userRecord = await authAdmin.getUserByEmail(lowercasedEmail);
            if (userRecord) {
                await authAdmin.deleteUser(userRecord.uid);
            }
        } catch(authError: any) {
            if (authError.code !== 'auth/user-not-found') {
                console.error(`Error deleting user from Auth ${lowercasedEmail}:`, authError);
            }
        }

        revalidatePath('/dashboard/configuracoes');
        return { success: true };
    } catch (error: any) {
        console.error("Error in deleteUserRole:", error);
        return { success: false, error: error.message };
    }
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

const DEFAULT_PERMISSIONS: RolePermissions = {
    admin: {
        view_finance: true,
        manage_users: true,
        view_reports: true,
        view_all_processes: true,
        edit_settings: true,
        manage_leads: true,
        manage_staff: true,
    },
    lawyer: {
        view_finance: false,
        manage_users: false,
        view_reports: true,
        view_all_processes: true,
        edit_settings: false,
        manage_leads: true,
        manage_staff: false,
    },
    financial: {
        view_finance: true,
        manage_users: false,
        view_reports: true,
        view_all_processes: false,
        edit_settings: false,
        manage_leads: false,
        manage_staff: true,
    },
    assistant: {
        view_finance: false,
        manage_users: false,
        view_reports: false,
        view_all_processes: true,
        edit_settings: false,
        manage_leads: true,
        manage_staff: false,
    }
};

export async function getRolePermissions(): Promise<RolePermissions> {
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    const doc = await firestoreAdmin.collection('system_settings').doc('role_permissions').get();
    if (!doc.exists) {
        return DEFAULT_PERMISSIONS;
    }
    return doc.data() as RolePermissions;
}

export async function updateRolePermissions(permissions: RolePermissions): Promise<{ success: boolean }> {
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    await firestoreAdmin.collection('system_settings').doc('role_permissions').set(permissions);
    revalidatePath('/dashboard/configuracoes');
    return { success: true };
}
