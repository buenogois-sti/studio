'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Process } from './types';
import type { firestore as adminFirestore } from 'firebase-admin';
import { copyFile } from './drive-actions';
import { syncProcessToDrive } from './drive';

function serializeProcess(doc: adminFirestore.DocumentSnapshot): Process | null {
    const data = doc.data();
    const id = doc.id;

    if (!data) {
        return null;
    }
    
    return {
        id,
        clientId: data.clientId,
        name: data.name || '',
        processNumber: data.processNumber || '',
        court: data.court || '',
        courtBranch: data.courtBranch || '',
        caseValue: data.caseValue || 0,
        opposingParties: data.opposingParties || [],
        description: data.description || '',
        status: data.status || 'Ativo',
        responsibleStaffIds: data.responsibleStaffIds || [],
        driveFolderId: data.driveFolderId,
        timeline: data.timeline || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
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

export async function draftDocument(processId: string, templateFileId: string, fileName: string): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!firestoreAdmin) throw new Error("Servidor indisponível.");

    try {
        const processRef = firestoreAdmin.collection('processes').doc(processId);
        const processDoc = await processRef.get();
        if (!processDoc.exists) throw new Error("Processo não encontrado.");
        
        const processData = processDoc.data() as Process;

        // Ensure Drive folder exists
        if (!processData.driveFolderId) {
            await syncProcessToDrive(processId);
            // Refresh data
            const updatedDoc = await processRef.get();
            const updatedData = updatedDoc.data() as Process;
            if (!updatedData.driveFolderId) throw new Error("Falha ao sincronizar pasta do processo no Drive.");
            processData.driveFolderId = updatedData.driveFolderId;
        }

        const newFileName = `${fileName} - ${processData.name}`;
        const copiedFile = await copyFile(templateFileId, newFileName, processData.driveFolderId);

        return { 
            success: true, 
            url: copiedFile.webViewLink || undefined 
        };
    } catch (error: any) {
        console.error("Error drafting document:", error);
        return { success: false, error: error.message };
    }
}
