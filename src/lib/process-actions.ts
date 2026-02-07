'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Process, DocumentTemplate, TimelineEvent, Client, Staff } from './types';
import { copyFile, createFolder, listFiles } from './drive-actions';
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
 * Busca uma subpasta específica por nome dentro de uma pasta pai de forma idempotente.
 */
async function ensureSubfolder(drive: any, parentId: string, folderName: string): Promise<string> {
    const res = await drive.files.list({
        q: `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    
    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
    }

    const folder = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        },
        fields: 'id',
        supportsAllDrives: true,
    });
    
    return folder.data.id;
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

        // 1. Garante que o processo tenha pasta no Drive (idempotente)
        await syncProcessToDrive(processId);
        const updatedDoc = await processRef.get();
        const finalProcessData = updatedDoc.data() as Process;

        if (!finalProcessData.driveFolderId) throw new Error("Não foi possível localizar a pasta do processo.");

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

        const targetFolderId = await ensureSubfolder(drive, finalProcessData.driveFolderId, targetFolderName);

        // 3. Busca os dados do cliente e do escritório para o preenchimento
        const clientDoc = await firestoreAdmin.collection('clients').doc(finalProcessData.clientId).get();
        const clientData = clientDoc.data() as Client;

        const settingsDoc = await firestoreAdmin.collection('system_settings').doc('general').get();
        const officeData = settingsDoc.exists ? settingsDoc.data() : null;

        // 4. Busca dados do advogado líder
        let lawyerName = 'Advogado Responsável';
        let lawyerOAB = 'Pendente';
        let lawyerEmail = '';
        let lawyerWhatsapp = '';
        let lawyerNationality = '';
        let lawyerCivilStatus = '';
        let lawyerAddress = '';

        if (finalProcessData.leadLawyerId) {
            const staffDoc = await firestoreAdmin.collection('staff').doc(finalProcessData.leadLawyerId).get();
            if (staffDoc.exists) {
                const staffData = staffDoc.data() as Staff;
                lawyerName = `${staffData.firstName} ${staffData.lastName}`;
                lawyerOAB = staffData.oabNumber || 'Pendente';
                lawyerEmail = staffData.email || '';
                lawyerWhatsapp = staffData.whatsapp || '';
                lawyerNationality = staffData.nationality || 'brasileiro(a)';
                lawyerCivilStatus = staffData.civilStatus || 'solteiro(a)';
                lawyerAddress = staffData.address 
                    ? `${staffData.address.street || ''}, nº ${staffData.address.number || 'S/N'}, ${staffData.address.neighborhood || ''}, ${staffData.address.city || ''}/${staffData.address.state || ''}`
                    : 'Endereço profissional não cadastrado';
            }
        }

        // 5. Sanitiza o ID do modelo
        const cleanTemplateId = extractFileId(templateId);
        if (!cleanTemplateId) throw new Error("ID do modelo inválido.");

        // 6. Copia o arquivo para a subpasta
        const newFileName = `${documentName} - ${finalProcessData.name}`;
        const copiedFile = await copyFile(cleanTemplateId, newFileName, targetFolderId);

        if (!copiedFile.id || !copiedFile.webViewLink) {
            throw new Error("Falha ao copiar o arquivo no Google Drive.");
        }

        // 7. Inteligência: Preenchimento Automático de Dados
        const clientAddress = clientData.address 
            ? `${clientData.address.street || ''}, nº ${clientData.address.number || 'S/N'}, ${clientData.address.neighborhood || ''}, ${clientData.address.city || ''}/${clientData.address.state || ''}`
            : 'Endereço não informado';

        const clientFullName = `${clientData.firstName} ${clientData.lastName || ''}`.trim();
        const firstOpposingParty = finalProcessData.opposingParties?.[0]?.name || '---';
        const allOpposingParties = finalProcessData.opposingParties?.map(p => p.name).join(', ') || '---';

        const qualification = `${clientFullName}, ${clientData.nationality || 'brasileiro(a)'}, ${clientData.civilStatus || 'solteiro(a)'}, ${clientData.profession || 'ajudante geral'}, portador(a) do RG nº ${clientData.rg || '---'}${clientData.rgIssuer ? ` ${clientData.rgIssuer}` : ''}, inscrito(a) no CPF/MF sob nº ${clientData.document || '---'}, residente e domiciliado em ${clientAddress}`;

        const lawyerQualification = `${lawyerName}, advogado inscrito na OAB/${lawyerOAB}, ${lawyerNationality}, ${lawyerCivilStatus}, com escritório profissional situado à ${lawyerAddress}`;

        const dataMap = {
            'CLIENTE_NOME_COMPLETO': clientFullName,
            'RECLAMANTE_NOME': clientFullName,
            'CLIENTE_PRIMEIRO_NOME': clientData.firstName || '',
            'CLIENTE_DOCUMENTO': clientData.document || '---',
            'CLIENTE_CPF_CNPJ': clientData.document || '---',
            'CLIENTE_RG': clientData.rg || '---',
            'CLIENTE_RG_ORGAO': clientData.rgIssuer || '---',
            'CLIENTE_RG_EXPEDICAO': clientData.rgIssuanceDate || '---',
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
            'PROCESSO_TITULO': finalProcessData.name || '',
            'PROCESSO_NUMERO_CNJ': finalProcessData.processNumber || 'Pendente',
            'PROCESSO_AREA': finalProcessData.legalArea || '---',
            'PROCESSO_FORUM': finalProcessData.court || '---',
            'PROCESSO_VARA': finalProcessData.courtBranch || '---',
            'PROCESSO_VALOR': (finalProcessData.caseValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            'REU_NOME': firstOpposingParty,
            'RECLAMADA_NOME': firstOpposingParty,
            'RECLAMADA_LISTA_TODOS': allOpposingParties,
            'ADVOGADO_LIDER_NOME': lawyerName,
            'ADVOGADO_LIDER_OAB': lawyerOAB,
            'ADVOGADO_LIDER_EMAIL': lawyerEmail,
            'ADVOGADO_LIDER_WHATSAPP': lawyerWhatsapp,
            'ADVOGADO_LIDER_NACIONALIDADE': lawyerNationality,
            'ADVOGADO_LIDER_ESTADO_CIVIL': lawyerCivilStatus,
            'ADVOGADO_LIDER_ENDERECO_PROFISSIONAL': lawyerAddress,
            'ADVOGADO_LIDER_QUALIFICACAO_COMPLETA': lawyerQualification,
            'ESCRITORIO_NOME': officeData?.officeName || 'Bueno Gois Advogados e Associados',
            'ESCRITORIO_ENDERECO': officeData?.address || 'Rua Marechal Deodoro, 1594 - Sala 2, SBC/SP',
            'ESCRITORIO_TELEFONE': officeData?.phone || '(11) 2897-5218',
            'ESCRITORIO_EMAIL': officeData?.adminEmail || 'contato@buenogoisadvogado.com.br',
            'ESCRITORIO_INSTAGRAM': officeData?.instagram || '',
            'DATA_EXTENSO': format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
            'DATA_HOJE': format(new Date(), "dd/MM/yyyy"),
        };

        await replacePlaceholdersInDoc(docs, copiedFile.id, dataMap);

        // 8. Registra na timeline do processo
        const timelineEvent: TimelineEvent = {
            id: uuidv4(),
            type: 'petition',
            description: `DOCUMENTO AUTOMATIZADO: "${documentName}" gerado com sucesso. Dados vinculados ao modelo.`,
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
            description: `O rascunho "${documentName}" está disponível para edição.`,
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
