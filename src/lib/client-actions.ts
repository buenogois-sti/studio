'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Client } from './types';
import { Timestamp } from 'firebase-admin/firestore';

export async function searchClients(query: string): Promise<Client[]> {
    if (!query) return [];
    
    try {
        // This search is not optimized for large datasets as it fetches all clients.
        // For production with many clients, a dedicated search service like Algolia is recommended.
        const clientsSnapshot = await firestoreAdmin.collection('clients').get();
        
        const allClientsData = clientsSnapshot.docs.map(doc => {
            const data = doc.data();

            // Safely convert timestamps to ISO strings for serialization
            const createdAt = data.createdAt as Timestamp;
            const updatedAt = data.updatedAt as Timestamp | undefined;
            
            const serializableData = {
                ...data,
                id: doc.id,
                createdAt: createdAt.toDate().toISOString(),
                updatedAt: updatedAt ? updatedAt.toDate().toISOString() : undefined,
            };
            return serializableData as Client;
        });

        const lowerCaseQuery = query.toLowerCase();

        const filteredClients = allClientsData.filter(client => {
            const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
            const document = client.document || '';
            return fullName.includes(lowerCaseQuery) || document.includes(lowerCaseQuery);
        });

        return filteredClients.slice(0, 10); // Limit results for performance
    } catch (error) {
        console.error("Error searching clients:", error);
        // In a real app, you might want to handle this more gracefully
        return [];
    }
}
