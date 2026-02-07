'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Process } from './types';
import type { firestore as adminFirestore } from 'firebase-admin';
import { copyFile } from './drive-actions';
import { syncProcessToDrive } from './drive';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';

async function serializeProcess(doc: adminFirestore.DocumentSnapshot): Promise<Process | null> {
    const data = doc.data();
    const id = doc.id;

    if (!data) {
        return null;
    }

    let clientName = '';
    if (data.clientId && firestoreAdmin) {
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
        clientName,
        name: data.name || '',
        processNumber: data.processNumber || '',
        court: data.court || '',
        courtBranch: data.courtBranch || '',
        caseValue: data.caseValue || 0,
        opposingParties: data.opposingParties || [],
        description: data.description || '',
        status: data.status || 'Ativo',
        legalArea: data.legalArea || '',
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
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    
    try {
        // Otimização: Buscamos os processos mais recentes para filtrar em memória,
        // garantindo busca por réus e nomes parciais que o Firestore nativo não suporta bem em arrays.
        const processesSnapshot = await firestoreAdmin.collection('processes').orderBy('updatedAt', 'desc').limit(300).get();
        
        const allProcessesData = await Promise.all(
            processesSnapshot.docs.map(doc => serializeProcess(doc))
        );

        const q = query.toLowerCase();
        const filtered = allProcessesData.filter((process): process is Process => {
            if (!process) return false;
            
            // Busca no Título e Número
            const matchesBasic = process.name.toLowerCase().includes(q) || 
                                (process.processNumber || '').includes(q);
            
            // Busca no Nome do Cliente
            const matchesClient = (process.clientName || '').toLowerCase().includes(q);
            
            // Busca nos Réus (Polo Passivo)
            const matchesOpposing = process.opposingParties?.some(party => 
                party.name.toLowerCase().includes(q)
            );

            return matchesBasic || matchesClient || matchesOpposing;
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
    const session = await getServerSession(authOptions);

    try {
        const processRef = firestoreAdmin.collection('processes').doc(processId);
        const processDoc = await processRef.get();
        if (!processDoc.exists) throw new Error("Processo não encontrado.");
        
        const processData = processDoc.data() as Process;

        if (!processData.driveFolderId) {
            await syncProcessToDrive(processId);
            const updatedDoc = await processRef.get();
            const updatedData = updatedDoc.data() as Process;
            if (!updatedData.driveFolderId) throw new Error("Falha ao sincronizar pasta do processo no Drive.");
            processData.driveFolderId = updatedData.driveFolderId;
        }

        const newFileName = `${fileName} - ${processData.name}`;
        const copiedFile = await copyFile(templateFileId, newFileName, processData.driveFolderId);

        if (session?.user?.id) {
          await createNotification({
            userId: session.user.id,
            title: "Rascunho Gerado",
            description: `O documento "${fileName}" foi criado para o processo ${processData.name}.`,
            type: 'success',
            href: copiedFile.webViewLink || '#'
          });
        }

        return { 
            success: true, 
            url: copiedFile.webViewLink || undefined 
        };
    } catch (error: any) {
        console.error("Error drafting document:", error);
        return { success: false, error: error.message };
    }
}
