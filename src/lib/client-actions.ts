'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Client } from './types';

export async function searchClients(query: string): Promise<Client[]> {
    if (!query) return [];
    
    if (!firestoreAdmin) {
        console.error("Firebase Admin not initialized, cannot search clients.");
        throw new Error("A conexão com o servidor de dados falhou. Verifique a configuração do servidor.");
    }
    
    try {
        const clientsSnapshot = await firestoreAdmin.collection('clients').get();
        
        const allClientsData = clientsSnapshot.docs
            .map(doc => {
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
                // --- End Robust Date Handling ---

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
            })
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
