'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Process, DocumentTemplate, TimelineEvent } from './types';
import type { firestore as adminFirestore } from 'firebase-admin';
import { copyFile, createFolder } from './drive-actions';
import { syncProcessToDrive, getGoogleApiClientsForUser } from './drive';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import { extractFileId } from './utils';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

/**
 * Busca uma subpasta específica por nome dentro de uma pasta pai.
 */
async function findSubfolder(drive: any, parentId: string, folderName: string): Promise<string | null> {
    const res = await drive.files.list({
        q: `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    return res.data.files?.[0]?.id || null;
}

export async function searchProcesses(query: string): Promise<Process[]> {
    if (!query || query.length < 2) return [];
    
    if (!firestoreAdmin) {
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    
    try {
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

/**
 * Gera um rascunho de documento a partir de um modelo, organizando-o na subpasta correta do processo.
 */
export async function draftDocument(
    processId: string, 
    templateId: string, 
    documentName: string,
    category: string
): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!firestoreAdmin) throw new Error("Servidor indisponível.");
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Não autorizado.");

    try {
        const { drive } = await getGoogleApiClientsForUser();
        const processRef = firestoreAdmin.collection('processes').doc(processId);
        const processDoc = await processRef.get();
        if (!processDoc.exists) throw new Error("Processo não encontrado.");
        
        const processData = processDoc.data() as Process;

        // 1. Garante que o processo tenha pasta no Drive
        if (!processData.driveFolderId) {
            await syncProcessToDrive(processId);
            const updatedDoc = await processRef.get();
            processData.driveFolderId = (updatedDoc.data() as Process).driveFolderId;
        }

        if (!processData.driveFolderId) throw new Error("Não foi possível localizar a pasta do processo.");

        // 2. Define a subpasta de destino baseada na categoria do modelo
        let targetFolderName = '01 - Petições'; // Default
        const cat = category.toLowerCase();
        if (cat.includes('procuração') || cat.includes('contrato')) {
            targetFolderName = '01 - Petições';
        } else if (cat.includes('ata') || cat.includes('audiência')) {
            targetFolderName = '04 - Atas e Audiências';
        } else if (cat.includes('recurso')) {
            targetFolderName = '03 - Recursos';
        } else if (cat.includes('decisão') || cat.includes('sentença')) {
            targetFolderName = '02 - Decisões e Sentenças';
        }

        let targetFolderId = await findSubfolder(drive, processData.driveFolderId, targetFolderName);
        
        if (!targetFolderId) {
            const folder = await createFolder(processData.driveFolderId, targetFolderName);
            targetFolderId = folder.id!;
        }

        // 3. Sanitiza o ID do modelo
        const cleanTemplateId = extractFileId(templateId);
        if (!cleanTemplateId) throw new Error("ID do modelo inválido.");

        // 4. Copia o arquivo para a subpasta
        const newFileName = `${documentName} - ${processData.name}`;
        const copiedFile = await copyFile(cleanTemplateId, newFileName, targetFolderId);

        if (!copiedFile.webViewLink) {
            throw new Error("O Google Drive não retornou o link de edição. Verifique as permissões do modelo.");
        }

        // 5. Registra na timeline do processo
        const timelineEvent: TimelineEvent = {
            id: uuidv4(),
            type: 'petition',
            description: `RASCUNHO GERADO: "${documentName}" criado na pasta "${targetFolderName}". Link de edição disponibilizado para o advogado.`,
            date: Timestamp.now() as any,
            authorName: session.user.name || 'Sistema'
        };

        await processRef.update({
            timeline: FieldValue.arrayUnion(timelineEvent),
            updatedAt: FieldValue.serverTimestamp()
        });

        // 6. Notifica o usuário com o link direto
        await createNotification({
            userId: session.user.id,
            title: "Rascunho Pronto p/ Edição",
            description: `O documento "${documentName}" está pronto no Google Docs.`,
            type: 'success',
            href: copiedFile.webViewLink
        });

        return { 
            success: true, 
            url: copiedFile.webViewLink 
        };

    } catch (error: any) {
        console.error("Error drafting document:", error);
        if (error.message.includes('File not found')) {
            throw new Error(`Modelo não encontrado. Certifique-se de compartilhar o arquivo original com o e-mail: studio-7080106838-23904@studio-7080106838-23904.iam.gserviceaccount.com`);
        }
        return { success: false, error: error.message || 'Erro interno ao gerar rascunho.' };
    }
}
