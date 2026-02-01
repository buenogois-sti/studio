
'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Process } from './types';
import type { firestore as adminFirestore } from 'firebase-admin';

function serializeProcess(doc: adminFirestore.DocumentSnapshot): Process | null {
    const data = doc.data();
    const id = doc.id;

    if (!data) {
        return null;
    }
    
    // This is a simplified serialization. Add date handling etc. as needed.
    return {
        id,
        name: data.name || '',
        processNumber: data.processNumber || '',
        clientId: data.clientId,
        status: data.status,
        createdAt: data.createdAt, // Assume it's already in a serializable format or handle conversion
    };
}


export async function searchProcesses(query: string): Promise<Process[]> {
    if (!query) return [];
    
    if (!firestoreAdmin) {
        console.error("Firebase Admin not initialized, cannot search processes.");
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    
    try {
        const processesSnapshot = await firestoreAdmin.collection('processes').get();
        
        const allProcessesData = processesSnapshot.docs
            .map(serializeProcess)
            .filter((process): process is Process => process !== null);

        const lowerCaseQuery = query.toLowerCase();

        const filteredProcesses = allProcessesData.filter(process => {
            const name = process.name.toLowerCase();
            const processNumber = process.processNumber || '';
            return name.includes(lowerCaseQuery) || processNumber.includes(lowerCaseQuery);
        });

        return filteredProcesses.slice(0, 10);
    } catch (error) {
        console.error("Error searching processes:", error);
        throw new Error('Ocorreu um erro ao buscar os processos.');
    }
}
