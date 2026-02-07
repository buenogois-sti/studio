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
import { extractFileId } from './utils';

// Helper simplificado para evitar N+1 durante buscas em lote
async function serializeProcessBasic(doc: adminFirestore.DocumentSnapshot): Promise<Process | null> {
    const data = doc.data();
    const id = doc.id;
    if (!data) return null;

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
        // Otimização: Buscamos apenas os 200 processos mais recentes para filtrar em memória
        // Isso evita o crash do navegador e reduz custos drásticos.
        const processesSnapshot = await firestoreAdmin.collection('processes')
            .orderBy('updatedAt', 'desc')
            .limit(200)
            .get();
        
        const processes = processesSnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data } as Process;
        });

        const q = query.toLowerCase();
        const filtered = processes.filter(process => {
            const matchesBasic = process.name.toLowerCase().includes(q) || 
                                (process.processNumber || '').includes(q);
            
            const matchesOpposing = !!process.opposingParties?.some(party => 
                party.name.toLowerCase().includes(q)
            );

            return matchesBasic || matchesOpposing;
        });

        return filtered.slice(0, 10);
    } catch (error) {
        console.error("Error searching processes:", error);
        return [];
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

export async function draftDocument(processId: string, templateInput: string, fileName: string): Promise<{ success: boolean; url?: string; error?: string }> {
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

        // Sanitiza o ID do modelo (aceita link ou ID direto)
        const templateFileId = extractFileId(templateInput);
        if (!templateFileId) throw new Error("ID do modelo inválido ou não informado.");

        const newFileName = `${fileName} - ${processData.name}`;
        
        try {
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
        } catch (copyErr: any) {
            // Se o erro for 404, damos uma instrução clara sobre compartilhamento
            if (copyErr.message.includes('File not found')) {
                throw new Error(`Arquivo não encontrado ou sem permissão. Certifique-se de compartilhar o modelo com o e-mail: studio-7080106838-23904@studio-7080106838-23904.iam.gserviceaccount.com`);
            }
            throw copyErr;
        }
    } catch (error: any) {
        console.error("Error drafting document:", error);
        return { success: false, error: error.message };
    }
}
