
'use server';

import { syncClientToDrive } from './drive';
import { firestoreAdmin } from '@/firebase/admin';

export async function initializeAdminDriveStructure() {
    try {
        // Get all clients and sync them to drive
        const clientsSnapshot = await firestoreAdmin.collection('clients').get();
        
        for (const doc of clientsSnapshot.docs) {
            const client = doc.data();
            await syncClientToDrive(doc.id, client.name);
        }
        
        return { success: true, message: 'Drive structure initialized successfully' };
    } catch (error) {
        console.error('Error initializing drive structure:', error);
        throw error;
    }
}
