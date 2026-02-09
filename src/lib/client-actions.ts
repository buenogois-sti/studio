'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Client } from './types';
import { firestore } from 'firebase-admin';
import { revalidatePath } from 'next/cache';

/**
 * Serializa um snapshot do Firestore para o tipo Client com proteções contra campos nulos.
 */
function serializeClient(doc: firestore.DocumentSnapshot): Client | null {
    const data = doc.data();
    if (!data) return null;

    const id = doc.id;
    let createdAtString = new Date().toISOString();
    
    if (data.createdAt) {
        if (typeof data.createdAt.toDate === 'function') {
            createdAtString = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === 'string') {
            createdAtString = data.createdAt;
        }
    }

    return {
        id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        document: data.document || '',
        email: data.email || '',
        avatar: data.avatar || '',
        createdAt: createdAtString,
        clientType: data.clientType || 'Pessoa Física',
        status: data.status || 'active',
        motherName: data.motherName || '',
        rg: data.rg || '',
        ctps: data.ctps || '',
        pis: data.pis || '',
        nationality: data.nationality || 'brasileiro(a)',
        civilStatus: data.civilStatus || 'solteiro(a)',
        profession: data.profession || '',
        phone: data.phone || '',
        mobile: data.mobile || '',
        legalArea: data.legalArea || '',
        address: data.address || {},
        bankInfo: data.bankInfo || {},
        driveFolderId: data.driveFolderId,
    };
}

export async function createClient(data: Partial<Client>): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!firestoreAdmin) throw new Error("Servidor de dados inacessível.");
    try {
        const docRef = await firestoreAdmin.collection('clients').add({
            ...data,
            status: data.status || 'active',
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
        });
        
        // Invalida o cache para atualizar a lista de clientes e o dashboard
        revalidatePath('/dashboard/clientes');
        revalidatePath('/dashboard');
        
        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error("[createClient] Error:", error);
        return { success: false, error: error.message };
    }
}

export async function searchClients(query: string): Promise<Client[]> {
    if (!query || query.length < 2) return [];
    if (!firestoreAdmin) throw new Error("A conexão com o servidor de dados falhou.");
    
    try {
        const cleanQuery = query.trim();
        const docOnlyQuery = cleanQuery.replace(/\D/g, '');

        // 1. Tenta busca exata por documento
        if (docOnlyQuery.length >= 11) {
            const exactMatch = await firestoreAdmin.collection('clients')
                .where('document', '==', cleanQuery)
                .limit(1)
                .get();
            
            if (!exactMatch.empty) {
                const client = serializeClient(exactMatch.docs[0]);
                return client ? [client] : [];
            }
        }

        // 2. Fallback para busca textual limitada
        const clientsSnapshot = await firestoreAdmin.collection('clients')
            .orderBy('updatedAt', 'desc')
            .limit(100)
            .get();
        
        const textQuery = cleanQuery.toLowerCase();

        return clientsSnapshot.docs
            .map(serializeClient)
            .filter((client): client is Client => {
                if (!client) return false;
                const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
                return fullName.includes(textQuery) || (client.document || '').includes(textQuery);
            })
            .slice(0, 10);
    } catch (error) {
        console.error("[searchClients] Erro:", error);
        return [];
    }
}

export async function getClientById(clientId: string): Promise<Client | null> {
    if (!clientId || !firestoreAdmin) return null;
    try {
        const clientDoc = await firestoreAdmin.collection('clients').doc(clientId).get();
        return clientDoc.exists ? serializeClient(clientDoc) : null;
    } catch (error) {
        console.error(`Error fetching client ${clientId}:`, error);
        return null;
    }
}

export async function bulkCreateClients(clients: Partial<Client>[]): Promise<{ success: boolean; count: number; error?: string }> {
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    try {
        const batch = firestoreAdmin.batch();
        const clientsCollection = firestoreAdmin.collection('clients');

        clients.forEach(clientData => {
            const newDocRef = clientsCollection.doc();
            batch.set(newDocRef, {
                ...clientData,
                createdAt: firestore.FieldValue.serverTimestamp(),
                updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        });

        await batch.commit();
        revalidatePath('/dashboard/clientes');
        return { success: true, count: clients.length };
    } catch (error: any) {
        return { success: false, count: 0, error: error.message };
    }
}
