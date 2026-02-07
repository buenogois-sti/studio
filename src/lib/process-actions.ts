'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Process, DocumentTemplate, TimelineEvent, Client, Staff } from './types';
import { copyFile } from './drive-actions';
import { syncProcessToDrive, getGoogleApiClientsForUser } from './drive';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import { extractFileId } from './utils';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

async function ensureSubfolder(drive: any, parentId: string, folderName: string): Promise<string> {
    const res = await drive.files.list({
        q: `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
        pageSize: 1,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    
    if (res.data.files && res.data.files.length > 0) return res.data.files[0].id;

    const folder = await drive.files.create({
        requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
        fields: 'id',
        supportsAllDrives: true,
    });
    return folder.data.id;
}

async function replacePlaceholdersInDoc(docsApi: any, fileId: string, dataMap: Record<string, string>) {
    const requests = Object.entries(dataMap).map(([key, value]) => ({
        replaceAllText: {
            containsText: { text: `{{${key}}}`, matchCase: true },
            replaceText: value || '',
        },
    }));

    if (requests.length === 0) return;
    try {
        await docsApi.documents.batchUpdate({ documentId: fileId, requestBody: { requests } });
    } catch (error) {
        console.error('[replacePlaceholders] Error:', error);
    }
}

export async function searchProcesses(query: string): Promise<Process[]> {
    if (!query || query.length < 2) return [];
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    
    try {
        const q = query.trim().toLowerCase();
        
        // Busca exata por número do processo primeiro
        const exactMatch = await firestoreAdmin.collection('processes')
            .where('processNumber', '==', query.trim())
            .limit(1)
            .get();
        
        if (!exactMatch.empty) {
            return [{ id: exactMatch.docs[0].id, ...exactMatch.docs[0].data() } as Process];
        }

        const snapshot = await firestoreAdmin.collection('processes')
            .orderBy('updatedAt', 'desc')
            .limit(150)
            .get();
        
        const results = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Process))
            .filter(p => 
                p.name.toLowerCase().includes(q) || 
                (p.processNumber || '').includes(q) ||
                p.opposingParties?.some(party => party.name.toLowerCase().includes(q))
            );

        return results.slice(0, 10);
    } catch (error) {
        console.error("Error searching processes:", error);
        return [];
    }
}

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
        const [apiClients, processDoc, settingsDoc] = await Promise.all([
            getGoogleApiClientsForUser(),
            firestoreAdmin.collection('processes').doc(processId).get(),
            firestoreAdmin.collection('system_settings').doc('general').get()
        ]);

        if (!processDoc.exists) throw new Error("Processo não encontrado.");
        const processData = processDoc.data() as Process;

        // Garante estrutura do Drive
        await syncProcessToDrive(processId);
        const { drive, docs } = apiClients;
        
        // Re-fetch para pegar driveFolderId atualizado
        const updatedProcess = await firestoreAdmin.collection('processes').doc(processId).get();
        const physicalFolderId = updatedProcess.data()?.driveFolderId;
        if (!physicalFolderId) throw new Error("Pasta do processo não disponível.");

        // Define subpasta baseada em heurística de categoria
        const categoryMap: Record<string, string> = {
            'procuração': '01 - Petições',
            'contrato': '01 - Petições',
            'ata': '04 - Atas e Audiências',
            'audiência': '04 - Atas e Audiências',
            'recurso': '03 - Recursos',
            'decisão': '02 - Decisões e Sentenças',
            'sentença': '02 - Decisões e Sentenças',
        };
        
        const targetFolder = Object.entries(categoryMap).find(([key]) => category.toLowerCase().includes(key))?.[1] || '01 - Petições';
        const targetFolderId = await ensureSubfolder(drive, physicalFolderId, targetFolder);

        // Coleta dados em paralelo para o preenchimento
        const [clientDoc, staffDoc] = await Promise.all([
            firestoreAdmin.collection('clients').doc(processData.clientId).get(),
            processData.leadLawyerId ? firestoreAdmin.collection('staff').doc(processData.leadLawyerId).get() : Promise.resolve(null)
        ]);

        const clientData = clientDoc.data() as Client;
        const staffData = staffDoc?.data() as Staff | undefined;
        const officeData = settingsDoc.data();

        const cleanTemplateId = extractFileId(templateId);
        const newFileName = `${documentName} - ${processData.name}`;
        const copiedFile = await copyFile(cleanTemplateId, newFileName, targetFolderId);

        if (!copiedFile.id) throw new Error("Falha ao criar arquivo no Drive.");

        const clientAddr = clientData.address ? `${clientData.address.street || ''}, nº ${clientData.address.number || 'S/N'}, ${clientData.address.neighborhood || ''}, ${clientData.address.city || ''}/${clientData.address.state || ''}` : '---';
        const staffAddr = staffData?.address ? `${staffData.address.street || ''}, nº ${staffData.address.number || 'S/N'}, ${staffData.address.neighborhood || ''}, ${staffData.address.city || ''}/${staffData.address.state || ''}` : '---';
        const clientFull = `${clientData.firstName} ${clientData.lastName || ''}`.trim();

        const dataMap = {
            'CLIENTE_NOME_COMPLETO': clientFull,
            'RECLAMANTE_NOME': clientFull,
            'CLIENTE_CPF_CNPJ': clientData.document || '---',
            'CLIENTE_RG': clientData.rg || '---',
            'CLIENTE_NACIONALIDADE': clientData.nationality || 'brasileiro(a)',
            'CLIENTE_ESTADO_CIVIL': clientData.civilStatus || 'solteiro(a)',
            'CLIENTE_PROFISSAO': clientData.profession || 'ajudante geral',
            'CLIENTE_ENDERECO_COMPLETO': clientAddr,
            'PROCESSO_NUMERO_CNJ': processData.processNumber || 'Pendente',
            'PROCESSO_VARA': processData.courtBranch || '---',
            'PROCESSO_FORUM': processData.court || '---',
            'RECLAMADA_NOME': processData.opposingParties?.[0]?.name || '---',
            'ADVOGADO_LIDER_NOME': staffData ? `${staffData.firstName} ${staffData.lastName}` : '---',
            'ADVOGADO_LIDER_OAB': staffData?.oabNumber || '---',
            'ADVOGADO_LIDER_ENDERECO_PROFISSIONAL': staffAddr,
            'ESCRITORIO_NOME': officeData?.officeName || 'Bueno Gois Advogados',
            'DATA_EXTENSO': format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
            'DATA_HOJE': format(new Date(), "dd/MM/yyyy"),
        };

        await replacePlaceholdersInDoc(docs, copiedFile.id, dataMap);

        await firestoreAdmin.collection('processes').doc(processId).update({
            timeline: FieldValue.arrayUnion({
                id: uuidv4(),
                type: 'petition',
                description: `DOCUMENTO GERADO: "${documentName}"`,
                date: Timestamp.now(),
                authorName: session.user.name || 'Sistema'
            }),
            updatedAt: FieldValue.serverTimestamp()
        });

        return { success: true, url: copiedFile.webViewLink! };
    } catch (error: any) {
        console.error("[draftDocument] Error:", error);
        return { success: false, error: error.message };
    }
}
