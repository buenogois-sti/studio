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

async function replacePlaceholdersInDoc(docsApi: any, fileId: string, dataMap: Record<string, string>, boldKeys: string[] = []) {
    const requests = Object.entries(dataMap).map(([key, value]) => ({
        replaceAllText: {
            containsText: { text: `{{${key}}}`, matchCase: true },
            replaceText: value || '',
        },
    }));

    if (requests.length === 0) return;
    
    try {
        console.log(`[DocsAutomation] Iniciando batchUpdate para o doc: ${fileId}`);
        await docsApi.documents.batchUpdate({ 
            documentId: fileId, 
            requestBody: { requests } 
        });
        console.log(`[DocsAutomation] Sucesso na substituição de ${requests.length} tags.`);
    } catch (error: any) {
        console.error('[DocsAutomation] Erro crítico no Google Docs batchUpdate:', error.message);
        throw new Error(`Falha técnica na edição do rascunho: Certifique-se de que a "Google Docs API" está ATIVADA no Console do Google Cloud. Erro: ${error.message}`);
    }
}

async function applyBoldToTexts(docsApi: any, fileId: string, texts: string[]) {
    if (!texts || texts.length === 0) return;
    try {
        const doc = await docsApi.documents.get({ documentId: fileId });
        const content = doc.data.body?.content || [];
        const requests: any[] = [];

        for (const structuralElement of content) {
            const paragraph = structuralElement.paragraph;
            if (!paragraph) continue;
            for (const elem of paragraph.elements || []) {
                const textRun = elem.textRun;
                if (!textRun || !elem.startIndex) continue;
                const txt = textRun.content || '';
                for (const target of texts) {
                    if (!target) continue;
                    let idx = txt.indexOf(target);
                    while (idx !== -1) {
                        const start = elem.startIndex + idx;
                        const end = start + target.length;
                        requests.push({
                            updateTextStyle: {
                                range: { startIndex: start, endIndex: end },
                                textStyle: { bold: true },
                                fields: 'bold'
                            }
                        });
                        idx = txt.indexOf(target, idx + target.length);
                    }
                }
            }
        }

        if (requests.length === 0) return;
        await docsApi.documents.batchUpdate({ documentId: fileId, requestBody: { requests } });
    } catch (err: any) {
        console.error('[DocsAutomation] Erro aplicando negrito:', err?.message || err);
    }
}

export async function searchProcesses(query: string): Promise<Process[]> {
    if (!query || query.length < 2) return [];
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    
    try {
        const q = query.trim().toLowerCase();
        
        const snapshot = await firestoreAdmin.collection('processes')
            .orderBy('updatedAt', 'desc')
            .limit(150)
            .get();
        
        const results = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Process))
            .filter(p => 
                p.name.toLowerCase().includes(q) || 
                (p.processNumber || '').includes(q)
            );

        return results.slice(0, 10);
    } catch (error) {
        console.error("Error searching processes:", error);
        return [];
    }
}

export async function draftDocument(
    processId: string, 
    templateIdOrLink: string, 
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
        const syncResult = await syncProcessToDrive(processId);
        if (!syncResult.success) {
            throw new Error(`Falha ao organizar pastas do processo: ${syncResult.error}`);
        }

        const { drive, docs } = apiClients;
        
        const updatedProcessSnap = await firestoreAdmin.collection('processes').doc(processId).get();
        const physicalFolderId = updatedProcessSnap.data()?.driveFolderId;
        if (!physicalFolderId) throw new Error("Pasta do processo não disponível no Drive.");

        const categoryMap: Record<string, string> = {
            'procuração': '02 - Contratos e Procurações',
            'contrato': '02 - Contratos e Procurações',
            'substabelecimento': '02 - Contratos e Procurações',
            'ata': '05 - Atas e Audiências',
            'audiência': '05 - Atas e Audiências',
            'recurso': '04 - Recursos',
            'decisão': '02 - Decisões e Sentenças',
            'sentença': '02 - Decisões e Sentenças',
        };
        
        const targetFolderName = Object.entries(categoryMap).find(([key]) => category.toLowerCase().includes(key) || documentName.toLowerCase().includes(key))?.[1] || '01 - Petições';
        const targetFolderId = await ensureSubfolder(drive, physicalFolderId, targetFolderName);

        const [clientDoc, staffDoc] = await Promise.all([
            firestoreAdmin.collection('clients').doc(processData.clientId).get(),
            processData.leadLawyerId ? firestoreAdmin.collection('staff').doc(processData.leadLawyerId).get() : Promise.resolve(null)
        ]);

        const clientData = clientDoc.data() as Client;
        const staffData = staffDoc?.data() as Staff | undefined;
        const officeData = settingsDoc.data();

        const cleanTemplateId = extractFileId(templateIdOrLink);
        const newFileName = `${documentName} - ${processData.name}`;
        
        const copiedFile = await copyFile(cleanTemplateId, newFileName, targetFolderId);

        if (!copiedFile.id) throw new Error("Falha ao criar cópia do modelo no Google Drive.");

        // Formatação de Endereços
        const fmtAddr = (addr: any) => addr ? `${addr.street || ''}, nº ${addr.number || 'S/N'}${addr.complement ? ', ' + addr.complement : ''}, ${addr.neighborhood || ''}, CEP ${addr.zipCode || ''}, ${addr.city || ''}/${addr.state || ''}` : '---';
        
        const clientAddr = fmtAddr(clientData.address);
        const staffAddr = fmtAddr(staffData?.address);
        const clientFull = `${clientData.firstName} ${clientData.lastName || ''}`.trim();

        // Tag Composta: Qualificação Completa (PF vs PJ)
        let clientQual = '';
        if (clientData.clientType === 'Pessoa Jurídica') {
            clientQual = `${clientFull}, inscrita no CNPJ sob o nº ${clientData.document || '---'}, com sede na ${clientAddr}`;
            if (clientData.representativeName) {
                clientQual += `, neste ato representada por seu ${clientData.representativeRole || 'representante legal'}, ${clientData.representativeName}, portador do RG nº ${clientData.representativeRg || '---'} e CPF nº ${clientData.representativeCpf || '---'}`;
            }
        } else {
            const genderSuffix = clientData.civilStatus?.toLowerCase().endsWith('a') || clientData.nationality?.toLowerCase().endsWith('a') ? 'a' : '';
            clientQual = `${clientFull}, ${clientData.nationality || 'brasileiro(a)'}, ${clientData.civilStatus || 'solteiro(a)'}, ${clientData.profession || 'trabalhador(a)'}, portador${genderSuffix} da Cédula de Identidade RG nº ${clientData.rg || '---'} ${clientData.rgIssuer ? clientData.rgIssuer : ''}${clientData.rgIssuanceDate ? ', expedida em ' + format(new Date(clientData.rgIssuanceDate as any), "dd/MM/yyyy") : ''}, inscrito(a)${genderSuffix} no CPF sob o nº ${clientData.document || '---'}, residente e domiciliado(a)${genderSuffix} na ${clientAddr}.`;
        }

        // Qualificação Advogado Líder (Para Substabelecimento)
        const staffFull = staffData ? `${staffData.firstName} ${staffData.lastName}` : '---';
        const lawyerQual = staffData ? `${staffFull.toUpperCase()}, advogado inscrito na OAB/${staffData.oabNumber?.includes('/') ? staffData.oabNumber : 'SP sob o nº ' + staffData.oabNumber}, ${staffData.nationality || 'brasileiro'}, ${staffData.civilStatus || 'divorciado'}, com escritório profissional situado à ${staffAddr}.` : '---';

        const dataMap = {
            'CLIENTE_QUALIFICACAO_COMPLETA': clientQual,
            'CLIENTE_NOME_COMPLETO': clientFull,
            'RECLAMANTE_NOME': clientFull,
            'CLIENTE_CPF_CNPJ': clientData.document || '---',
            'CLIENTE_RG': clientData.rg || '---',
            'CLIENTE_RG_ORGAO': clientData.rgIssuer || 'SSP/SP',
            'CLIENTE_RG_EXPEDICAO': clientData.rgIssuanceDate ? format(new Date(clientData.rgIssuanceDate as any), "dd/MM/yyyy") : '---',
            'CLIENTE_NACIONALIDADE': clientData.nationality || 'brasileiro(a)',
            'CLIENTE_ESTADO_CIVIL': clientData.civilStatus || 'solteiro(a)',
            'CLIENTE_PROFISSAO': clientData.profession || 'ajudante geral',
            'CLIENTE_ENDERECO_COMPLETO': clientAddr,
            'REPRESENTANTE_LEGAL_NOME': clientData.representativeName || '---',
            'REPRESENTANTE_LEGAL_QUALIFICACAO': clientData.representativeName ? `${clientData.representativeName}, ${clientData.representativeRole || 'Representante'}` : '---',
            'PROCESSO_NUMERO_CNJ': processData.processNumber || 'Pendente',
            'PROCESSO_NUMERO': processData.processNumber || 'Pendente',
            'PROCESSO_VARA': processData.courtBranch || '---',
            'PROCESSO_FORUM': processData.court || '---',
            'RECLAMADA_NOME': processData.opposingParties?.[0]?.name || '---',
            'RECLAMADA_LISTA_TODOS': processData.opposingParties?.map(p => p.name).join(', ') || '---',
            'ADVOGADO_LIDER_NOME': staffFull,
            'ADVOGADO_LIDER_OAB': staffData?.oabNumber || '---',
            'ADVOGADO_LIDER_NACIONALIDADE': staffData?.nationality || '---',
            'ADVOGADO_LIDER_ESTADO_CIVIL': staffData?.civilStatus || '---',
            'ADVOGADO_LIDER_ENDERECO_PROFISSIONAL': staffAddr,
            'ADVOGADO_LIDER_QUALIFICACAO_COMPLETA': lawyerQual,
            'ESCRITORIO_NOME': officeData?.officeName || 'Bueno Gois Advogados',
            'ESCRITORIO_ENDERECO': officeData?.address || '---',
            'ESCRITORIO_TELEFONE': officeData?.phone || '---',
            'ESCRITORIO_EMAIL': officeData?.adminEmail || '---',
            'DATA_EXTENSO': format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
            'DATA_HOJE': format(new Date(), "dd/MM/yyyy"),
        };

        // Substitui placeholders e aplica negrito em partes importantes (ex.: nome do cliente / advogado)
        const boldKeys = ['CLIENTE_NOME_COMPLETO'];
        if (staffData) boldKeys.push('ADVOGADO_LIDER_NOME');
        await replacePlaceholdersInDoc(docs, copiedFile.id, dataMap, boldKeys);

        // Após a substituição, aplica o estilo de negrito nos textos reais correspondentes
        const boldTexts = boldKeys.map(k => dataMap[k as keyof typeof dataMap]).filter(Boolean);
        await applyBoldToTexts(docs, copiedFile.id, boldTexts as string[]);

        await firestoreAdmin.collection('processes').doc(processId).update({
            timeline: FieldValue.arrayUnion({
                id: uuidv4(),
                type: 'petition',
                description: `DOCUMENTO GERADO: "${documentName}". Disponível no Drive com qualificação completa.`,
                date: Timestamp.now(),
                authorName: session.user.name || 'Sistema'
            }),
            updatedAt: FieldValue.serverTimestamp()
        });

        return { success: true, url: copiedFile.webViewLink! };
    } catch (error: any) {
        console.error("[draftDocument] Erro crítico:", error);
        return { success: false, error: error.message || "Erro desconhecido ao gerar rascunho." };
    }
}
