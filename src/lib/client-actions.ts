'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Client } from './types';
import type { firestore as adminFirestore } from 'firebase-admin';

// Helper function to serialize a Firestore document into a Client object
function serializeClient(doc: adminFirestore.DocumentSnapshot): Client | null {
    const data = doc.data();
    const id = doc.id;

    if (!data) {
        return null;
    }

    // --- Robust Date Handling ---
    let createdAtString: string;
    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        createdAtString = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'string') {
        createdAtString = data.createdAt;
    } else {
        console.warn(`Document ${id} is missing a valid 'createdAt' field. Skipping.`);
        return null;
    }

    let updatedAtString: string | undefined = undefined;
    if (data.updatedAt) {
        if (typeof data.updatedAt.toDate === 'function') {
            updatedAtString = data.updatedAt.toDate().toISOString();
        } else if (typeof data.updatedAt === 'string') {
            updatedAtString = data.updatedAt;
        }
    }

    const serializableClient: Client = {
        id: id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        document: data.document || '',
        email: data.email || '',
        avatar: data.avatar || '',
        createdAt: createdAtString,
        updatedAt: updatedAtString,
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
    
    return serializableClient;
}


export async function searchClients(query: string): Promise<Client[]> {
    if (!query) return [];
    
    if (!firestoreAdmin) {
        console.error("Firebase Admin not initialized, cannot search clients.");
        throw new Error("A conexão com o servidor de dados falhou. Verifique a configuração do servidor.");
    }
    
    try {
        const clientsSnapshot = await firestoreAdmin.collection('clients').get();
        
        const allClientsData = clientsSnapshot.docs
            .map(serializeClient)
            .filter((client): client is Client => client !== null);

        const lowerCaseQuery = query.toLowerCase();

        const filteredClients = allClientsData.filter(client => {
            const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
            const document = client.document || '';
            return fullName.includes(lowerCaseQuery) || document.includes(lowerCaseQuery);
        });

        return filteredClients.slice(0, 10);
    } catch (error) {
        console.error("Error searching clients:", error);
        throw new Error('Ocorreu um erro ao buscar os clientes.');
    }
}

export async function getClientById(clientId: string): Promise<Client | null> {
    if (!clientId) return null;
    
    if (!firestoreAdmin) {
        console.error("Firebase Admin not initialized, cannot get client by ID.");
        throw new Error("A conexão com o servidor de dados falhou. Verifique a configuração do servidor.");
    }
    
    try {
        const clientDoc = await firestoreAdmin.collection('clients').doc(clientId).get();
        
        if (!clientDoc.exists) {
            return null;
        }

        return serializeClient(clientDoc);
        
    } catch (error) {
        console.error(`Error fetching client with ID ${clientId}:`, error);
        throw new Error('Ocorreu um erro ao buscar os dados do cliente.');
    }
}

export async function bulkCreateClients(clients: Partial<Client>[]): Promise<{ success: boolean; count: number; error?: string }> {
    if (!firestoreAdmin) {
        throw new Error("A conexão com o servidor de dados falhou.");
    }

    try {
        const batch = firestoreAdmin.batch();
        const clientsCollection = firestoreAdmin.collection('clients');

        clients.forEach(clientData => {
            const newDocRef = clientsCollection.doc();
            batch.set(newDocRef, {
                ...clientData,
                document: clientData.document || 'PENDENTE',
                clientType: clientData.clientType || 'Pessoa Física',
                createdAt: adminFirestore.FieldValue.serverTimestamp(),
                updatedAt: adminFirestore.FieldValue.serverTimestamp(),
                avatar: '',
            });
        });

        await batch.commit();
        return { success: true, count: clients.length };
    } catch (error: any) {
        console.error("Error bulk creating clients:", error);
        return { success: false, count: 0, error: error.message };
    }
}
