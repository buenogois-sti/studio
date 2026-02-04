'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Client } from './types';
import { firestore } from 'firebase-admin';

// Helper function to serialize a Firestore document into a Client object with robust fallbacks
function serializeClient(doc: firestore.DocumentSnapshot): Client | null {
    const data = doc.data();
    const id = doc.id;

    if (!data) return null;

    // Handle createdAt with multiple fallbacks to prevent dropping documents from results
    let createdAtString = new Date().toISOString();
    if (data.createdAt) {
        if (typeof data.createdAt.toDate === 'function') {
            createdAtString = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === 'string') {
            createdAtString = data.createdAt;
        }
    }

    return {
        id: id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        document: data.document || '',
        email: data.email || '',
        avatar: data.avatar || '',
        createdAt: createdAtString,
        clientType: data.clientType,
        motherName: data.motherName,
        rg: data.rg,
        ctps: data.ctps,
        pis: data.pis,
        phone: data.phone,
        mobile: data.mobile,
        emergencyContact: data.emergencyContact,
        legalArea: data.legalArea,
        address: data.address,
        bankInfo: data.bankInfo,
        driveFolderId: data.driveFolderId,
        sheetId: data.sheetId,
    };
}

export async function searchClients(query: string): Promise<Client[]> {
    if (!query || query.length < 2) return [];
    
    if (!firestoreAdmin) {
        console.error('[searchClients] firestoreAdmin não inicializado');
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    
    try {
        console.log('[searchClients] Iniciando busca por:', query);
        const clientsSnapshot = await firestoreAdmin.collection('clients').get();
        console.log('[searchClients] Total de clientes na base:', clientsSnapshot.docs.length);
        
        const lowerCaseQuery = query.toLowerCase().replace(/\D/g, ''); // For document matching
        const textQuery = query.toLowerCase();

        const filtered = clientsSnapshot.docs
            .map(serializeClient)
            .filter((client): client is Client => {
                if (!client) return false;
                const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
                const docClean = (client.document || '').replace(/\D/g, '');
                
                return fullName.includes(textQuery) || 
                       (docClean && docClean.includes(lowerCaseQuery)) ||
                       (client.document || '').includes(textQuery);
            })
            .slice(0, 10);
        
        console.log('[searchClients] Resultados após filtro:', filtered.length);
        return filtered;
    } catch (error) {
        console.error("[searchClients] Erro na busca:", error);
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
    if (!firestoreAdmin) throw new Error("A conexão com o servidor de dados falhou.");

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
        return { success: true, count: clients.length };
    } catch (error: any) {
        return { success: false, count: 0, error: error.message };
    }
}
