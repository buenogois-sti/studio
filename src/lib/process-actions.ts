'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Process } from './types';
import type { firestore as adminFirestore } from 'firebase-admin';
import { copyFile } from './drive-actions';
import { syncProcessToDrive } from './drive';
import { revalidatePath } from 'next/cache';

async function serializeProcess(doc: adminFirestore.DocumentSnapshot): Promise<Process | null> {
    const data = doc.data();
    const id = doc.id;

    if (!data) {
        return null;
    }

    // Busca o nome do cliente para enriquecer o resultado da busca
    let clientName = '';
    if (data.clientId) {
        try {
            const clientDoc = await firestoreAdmin.collection('clients').doc(data.clientId).get();
            if (clientDoc.exists) {
                const c = clientDoc.data();
                clientName = `${c?.firstName || ''} ${c?.lastName || ''}`.trim();
            }
        } catch (e) {
            console.warn(`Could not fetch client name for process ${id}`);
        }
    }
    
    return {
        id,
        clientId: data.clientId,
        clientName, // Campo extra para busca/exibição
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
    } as Process;
}


export async function searchProcesses(query: string): Promise<Process[]> {
    if (!query || query.length < 2) return [];
    
    if (!firestoreAdmin) {
        console.error("Firebase Admin not initialized, cannot search processes.");
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    
    try {
        // Busca otimizada: No Firestore real, faríamos um where, 
        // mas como a query pode bater no nome do cliente ou processo, 
        // pegamos os recentes e filtramos. Em larga escala, denormalizaríamos a busca.
        const processesSnapshot = await firestoreAdmin.collection('processes').limit(100).get();
        
        const allProcessesData = await Promise.all(
            processesSnapshot.docs.map(doc => serializeProcess(doc))
        );

        const filtered = allProcessesData.filter((process): process is Process => {
            if (!process) return false;
            const q = query.toLowerCase();
            return (
                process.name.toLowerCase().includes(q) ||
                (process.processNumber || '').includes(q) ||
                (process.clientName || '').toLowerCase().includes(q)
            );
        });

        return filtered.slice(0, 10);
    } catch (error) {
        console.error("Error searching processes:", error);
        throw new Error('Ocorreu um erro ao buscar os processos.');
    }
}

export async function archiveProcess(processId: string): Promise<{ success: boolean; error?: string }> {
    if (!firestoreAdmin) throw new Error("Servidor indisponível.");
    try {
        await firestoreAdmin.collection('processes').doc(processId).update({
            status: 'Arquivado',
            updatedAt: new Date(),
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
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
