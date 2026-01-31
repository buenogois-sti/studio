'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Client } from './types';
import { Timestamp } from 'firebase-admin/firestore';

export async function searchClients(query: string): Promise<Client[]> {
    if (!query) return [];
    
    try {
        const clientsSnapshot = await firestoreAdmin.collection('clients').get();
        
        const allClientsData = clientsSnapshot.docs
            .map(doc => {
                const data = doc.data();
                const id = doc.id;

                const createdAt = data.createdAt;
                const updatedAt = data.updatedAt;

                // Skip documents that are missing the required createdAt field or if it's not a Timestamp
                if (!(createdAt instanceof Timestamp)) {
                    console.warn(`Skipping document ${id} due to invalid 'createdAt' field.`);
                    return null;
                }

                // Create a serializable client object, explicitly casting to avoid type issues with raw data.
                const serializableClient: Client = {
                    id: id,
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    document: data.document || '',
                    email: data.email || '',
                    avatar: data.avatar || '',
                    createdAt: createdAt.toDate().toISOString(),
                    updatedAt: (updatedAt instanceof Timestamp) ? updatedAt.toDate().toISOString() : undefined,
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
            .filter((client): client is Client => client !== null); // Filter out any skipped (null) documents

        const lowerCaseQuery = query.toLowerCase();

        const filteredClients = allClientsData.filter(client => {
            const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
            const document = client.document || '';
            return fullName.includes(lowerCaseQuery) || document.includes(lowerCaseQuery);
        });

        return filteredClients.slice(0, 10); // Limit results for performance
    } catch (error) {
        console.error("Error searching clients:", error);
        // Throw a generic, serializable error to the client.
        throw new Error('An error occurred while searching for clients.');
    }
}
