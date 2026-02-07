'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Process, DocumentTemplate, TimelineEvent, Client, Staff } from './types';
import { copyFile, createFolder } from './drive-actions';
import { syncProcessToDrive, getGoogleApiClientsForUser } from './drive';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import { extractFileId } from './utils';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

/**
 * Realiza a substituição de placeholders (tags) no documento Google Docs.
 */
async function replacePlaceholdersInDoc(docsApi: any, fileId: string, dataMap: Record<string, string>) {
    const requests = Object.entries(dataMap).map(([key, value]) => ({
        replaceAllText: {
            containsText: {
                text: `{{${key}}}`,
                matchCase: true,
            },
            replaceText: value || '',
        },
    }));

    if (requests.length === 0) return;

    try {
        await docsApi.documents.batchUpdate({
            documentId: fileId,
            requestBody: {
                requests,
            },
        });
    } catch (error) {
        console.error('[replacePlaceholders] Failed to update document:', error);
    }
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
 * Gera um rascunho de documento a partir de um modelo, organizando-o na subpasta correta do processo
 * e preenchendo automaticamente os dados do cliente e do processo.
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
        const { drive, docs } = await getGoogleApiClientsForUser();
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
        let targetFolderName = '01 - Petições';
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

        // 3. Busca os dados do cliente e do escritório para o preenchimento
        const clientDoc = await firestoreAdmin.collection('clients').doc(processData.clientId).get();
        const clientData = clientDoc.data() as Client;

        const settingsDoc = await firestoreAdmin.collection('system_settings').doc('general').get();
        const officeData = settingsDoc.exists ? settingsDoc.data() : null;

        // 4. Busca dados do advogado líder
        let lawyerName = 'Advogado Responsável';
        let lawyerOAB = 'Pendente';
        let lawyerEmail = '';
        let lawyerWhatsapp = '';
        if (processData.leadLawyerId) {
            const staffDoc = await firestoreAdmin.collection('staff').doc(processData.leadLawyerId).get();
            if (staffDoc.exists) {
                const staffData = staffDoc.data() as Staff;
                lawyerName = `${staffData.firstName} ${staffData.lastName}`;
                lawyerOAB = staffData.oabNumber || 'Pendente';
                lawyerEmail = staffData.email || '';
                lawyerWhatsapp = staffData.whatsapp || '';
            }
        }

        // 5. Sanitiza o ID do modelo
        const cleanTemplateId = extractFileId(templateId);
        if (!cleanTemplateId) throw new Error("ID do modelo inválido.");

        // 6. Copia o arquivo para a subpasta
        const newFileName = `${documentName} - ${processData.name}`;
        const copiedFile = await copyFile(cleanTemplateId, newFileName, targetFolderId);

        if (!copiedFile.id || !copiedFile.webViewLink) {
            throw new Error("Falha ao copiar o arquivo no Google Drive.");
        }

        // 7. Inteligência: Preenchimento Automático de Dados (Data Merge Avançado)
        const clientAddress = clientData.address 
            ? `${clientData.address.street || ''}, ${clientData.address.number || 'S/N'}, ${clientData.address.neighborhood || ''}, ${clientData.address.city || ''}/${clientData.address.state || ''}`
            : 'Endereço não informado';

        const clientFullName = `${clientData.firstName} ${clientData.lastName || ''}`.trim();
        const firstOpposingParty = processData.opposingParties?.[0]?.name || '---';
        const allOpposingParties = processData.opposingParties?.map(p => p.name).join(', ') || '---';

        // Helper para qualificação completa
        const qualification = `${clientFullName}, ${clientData.nationality || 'brasileiro(a)'}, ${clientData.civilStatus || 'solteiro(a)'}, ${clientData.profession || 'ajudante geral'}, portador(a) do RG nº ${clientData.rg || '---'} e do CPF nº ${clientData.document || '---'}, residente em ${clientAddress}`;

        const dataMap = {
            // Tags de Cliente / Reclamante
            'CLIENTE_NOME_COMPLETO': clientFullName,
            'RECLAMANTE_NOME': clientFullName,
            'CLIENTE_PRIMEIRO_NOME': clientData.firstName || '',
            'CLIENTE_DOCUMENTO': clientData.document || '---',
            'CLIENTE_CPF_CNPJ': clientData.document || '---',
            'CLIENTE_RG': clientData.rg || '---',
            'CLIENTE_PIS': clientData.pis || '---',
            'CLIENTE_CTPS': clientData.ctps || '---',
            'CLIENTE_MAE': clientData.motherName || '---',
            'CLIENTE_EMAIL': clientData.email || '---',
            'CLIENTE_WHATSAPP': clientData.mobile || '---',
            'CLIENTE_ENDERECO_COMPLETO': clientAddress,
            'CLIENTE_CIDADE': clientData.address?.city || '---',
            'CLIENTE_BAIRRO': clientData.address?.neighborhood || '---',
            'CLIENTE_NACIONALIDADE': clientData.nationality || 'brasileiro(a)',
            'CLIENTE_ESTADO_CIVIL': clientData.civilStatus || 'solteiro(a)',
            'CLIENTE_PROFISSAO': clientData.profession || 'ajudante geral',
            'CLIENTE_QUALIFICACAO_COMPLETA': qualification,
            
            // Tags de Processo / Endereçamento
            'PROCESSO_TITULO': processData.name || '',
            'PROCESSO_NUMERO_CNJ': processData.processNumber || 'Pendente',
            'PROCESSO_AREA': processData.legalArea || '---',
            'PROCESSO_FORUM': processData.court || '---',
            'PROCESSO_VARA': processData.courtBranch || '---',
            'PROCESSO_VALOR': (processData.caseValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            
            // Tags de Réu / Reclamada
            'REU_NOME': firstOpposingParty,
            'RECLAMADA_NOME': firstOpposingParty,
            'RECLAMADA_LISTA_TODOS': allOpposingParties,
            
            // Tags de Advogado
            'ADVOGADO_LIDER_NOME': lawyerName,
            'ADVOGADO_LIDER_OAB': lawyerOAB,
            'ADVOGADO_LIDER_EMAIL': lawyerEmail,
            'ADVOGADO_LIDER_WHATSAPP': lawyerWhatsapp,

            // Tags de Escritório
            'ESCRITORIO_NOME': officeData?.officeName || 'Bueno Gois Advogados e Associados',
            'ESCRITORIO_ENDERECO': officeData?.address || 'Rua Marechal Deodoro, 1594 - Sala 2, SBC/SP',
            'ESCRITORIO_TELEFONE': officeData?.phone || '(11) 2897-5218',
            'ESCRITORIO_EMAIL': officeData?.adminEmail || 'contato@buenogoisadvogado.com.br',
            'ESCRITORIO_INSTAGRAM': officeData?.instagram || '',
            
            // Outros
            'DATA_EXTENSO': format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
            'DATA_HOJE': format(new Date(), "dd/MM/yyyy"),
        };

        await replacePlaceholdersInDoc(docs, copiedFile.id, dataMap);

        // 8. Registra na timeline do processo
        const timelineEvent: TimelineEvent = {
            id: uuidv4(),
            type: 'petition',
            description: `DOCUMENTO AUTOMATIZADO: "${documentName}" gerado com sucesso. Dados do cliente (${clientData.firstName}) vinculados ao modelo.`,
            date: Timestamp.now() as any,
            authorName: session.user.name || 'Sistema'
        };

        await processRef.update({
            timeline: FieldValue.arrayUnion(timelineEvent),
            updatedAt: FieldValue.serverTimestamp()
        });

        // 9. Notifica o usuário
        await createNotification({
            userId: session.user.id,
            title: "Documento Pronto!",
            description: `O documento "${documentName}" foi preenchido e está na pasta do processo.`,
            type: 'success',
            href: copiedFile.webViewLink
        });

        return { 
            success: true, 
            url: copiedFile.webViewLink 
        };

    } catch (error: any) {
        console.error("Error drafting document:", error);
        return { success: false, error: error.message || 'Erro interno ao gerar documento.' };
    }
}
