
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

    // Aciona a reparação de links como parte do processo de sync
    await repairAllUpcomingGoogleLinks();
    
    return { success: true, message: "Sincronização e reparação de links iniciada." };
}

/**
 * Percorre os eventos futuros do usuário e corrige links 'localhost' nas descrições do Google Agenda.
 */
export async function repairAllUpcomingGoogleLinks() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Não autenticado.");
    
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");

    const userDoc = await firestoreAdmin.collection('users').doc(session.user.id).get();
    const userData = userDoc.data();
    const staffId = userData?.staffId;
    
    if (!staffId) return { success: false, message: "Vínculo de colaborador não encontrado." };

    try {
        const { calendar } = await getGoogleClientsForStaff(staffId);
        const now = new Date();
        const futureLimit = new Date();
        futureLimit.setDate(now.getDate() + 90); // Próximos 90 dias

        // 1. Corrigir Audiências / Atendimentos
        const hearingsSnap = await firestoreAdmin.collection('hearings')
            .where('lawyerId', '==', staffId)
            .where('date', '>=', Timestamp.fromDate(now))
            .where('date', '<=', Timestamp.fromDate(futureLimit))
            .get();

        let count = 0;
        for (const doc of hearingsSnap.docs) {
            const data = doc.data();
            if (data.googleCalendarEventId) {
                try {
                    const event = await calendar.events.get({
                        calendarId: 'primary',
                        eventId: data.googleCalendarEventId
                    });

                    let description = event.data.description || '';
                    if (description.includes('localhost:3000') || description.includes('localhost:9002')) {
                        const newDescription = description
                            .replace(/http:\/\/localhost:3000/g, 'https://www.buenogoisadvogado.com.br')
                            .replace(/http:\/\/localhost:9002/g, 'https://www.buenogoisadvogado.com.br');
                        
                        await calendar.events.patch({
                            calendarId: 'primary',
                            eventId: data.googleCalendarEventId,
                            requestBody: { description: newDescription }
                        });
                        count++;
                    }
                } catch (e) {
                    console.warn(`Erro ao reparar evento de audiência ${doc.id}:`, e);
                }
            }
        }

        // 2. Corrigir Prazos (Deadlines)
        const deadlinesSnap = await firestoreAdmin.collection('deadlines')
            .where('endDate', '>=', Timestamp.fromDate(now))
            .where('endDate', '<=', Timestamp.fromDate(futureLimit))
            .get();

        // Prazos não têm lawyerId direto, mas podemos filtrar pelo authorId ou buscar o leadLawyerId do processo
        for (const doc of deadlinesSnap.docs) {
            const data = doc.data();
            // Apenas se for o autor ou se estivermos processando todos
            if (data.googleCalendarEventId && (data.authorId === session.user.id)) {
                try {
                    const event = await calendar.events.get({
                        calendarId: 'primary',
                        eventId: data.googleCalendarEventId
                    });

                    let description = event.data.description || '';
                    if (description.includes('localhost:3000') || description.includes('localhost:9002')) {
                        const newDescription = description
                            .replace(/http:\/\/localhost:3000/g, 'https://www.buenogoisadvogado.com.br')
                            .replace(/http:\/\/localhost:9002/g, 'https://www.buenogoisadvogado.com.br');
                        
                        await calendar.events.patch({
                            calendarId: 'primary',
                            eventId: data.googleCalendarEventId,
                            requestBody: { description: newDescription }
                        });
                        count++;
                    }
                } catch (e) {
                    console.warn(`Erro ao reparar evento de prazo ${doc.id}:`, e);
                }
            }
        }

        return { success: true, count, message: `${count} eventos foram reparados com sucesso.` };
    } catch (error: any) {
        console.error("Erro ao reparar links:", error);
        throw error;
    }
}
