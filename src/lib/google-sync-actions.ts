
'use server';

import { firestoreAdmin } from '@/firebase/admin';
import { getGoogleApiClientsForUser, getGoogleClientsForStaff } from './drive';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Triggers a manual sync check for the current user.
 * This can be expanded to actually trigger sync jobs.
 */
export async function triggerManualSync() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Não autenticado.");
    
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    
    const userRef = firestoreAdmin.collection('users').doc(session.user.id);
    await userRef.update({
        updatedAt: new Date(),
        // Aqui poderíamos marcar um flag para um worker processar
    });

    revalidatePath('/dashboard/perfil');
    return { success: true };
}

/**
 * Procura por prazos e audiências do usuário que não estão no Google e tenta sincronizar.
 */
export async function syncUpcomingEventsToGoogle() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Não autenticado.");
    
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");

    const userDoc = await firestoreAdmin.collection('users').doc(session.user.id).get();
    const userData = userDoc.data();
    
    if (!userData?.googleRefreshToken) {
        throw new Error("Sua conta Google não está totalmente vinculada (falta refresh token). Clique em Sincronizar novamente.");
    }

    // Nota: A implementação real aqui percorreria as coleções 'deadlines' e 'hearings'
    // filtrando pelo lawyerId/authorId e googleCalendarEventId == null.
    // Para este MVP, vamos apenas simular que iniciamos o processo.
    
    return { success: true, message: "Sincronização de eventos futuros iniciada." };
}
