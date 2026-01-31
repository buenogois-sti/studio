'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Client } from './types';

export async function searchClients(query: string): Promise<Client[]> {
    if (!query) return [];
    
    try {
        // This search is not optimized for large datasets as it fetches all clients.
        // For production with many clients, a dedicated search service like Algolia is recommended.
        const clientsSnapshot = await firestoreAdmin.collection('clients').get();
        
        const allClientsData = clientsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                // Ensure all fields are correctly typed, especially timestamps
                ...data,
                createdAt: data.createdAt, // Assuming it's already a serializable format
            } as Client;
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
