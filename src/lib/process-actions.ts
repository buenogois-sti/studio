'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { Process, DocumentTemplate, TimelineEvent, Client, Staff } from './types';
import { copyFile } from './drive-actions';
import { syncProcessToDrive, getGoogleApiClientsForUser } from './drive';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { extractFileId } from './utils';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { revalidatePath } from 'next/cache';

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
        await docsApi.documents.batchUpdate({ 
            documentId: fileId, 
            requestBody: { requests } 
        });
    } catch (error: any) {
        console.error('[DocsAutomation] Erro no Google Docs batchUpdate:', error.message);
        throw new Error(`Falha na edição do rascunho: ${error.message}`);
    }
}

async function applyBoldToTexts(docsApi: any, fileId: string, texts: string[]) {
    if (!texts || texts.length === 0) return;
    
    try {
        const docRes = await docsApi.documents.get({ documentId: fileId });
        const content = docRes.data.body?.content || [];
        const requests: any[] = [];

        const targets = [...new Set(texts.filter(t => t && t.length > 2))];

        for (const structuralElement of content) {
            const paragraph = structuralElement.paragraph;
            if (!paragraph) continue;

            for (const elem of paragraph.elements || []) {
                const textRun = elem.textRun;
                if (!textRun || !elem.startIndex || !textRun.content) continue;

                const txt = textRun.content;
                
                targets.forEach(target => {
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
                });
            }
        }

        if (requests.length > 0) {
            await docsApi.documents.batchUpdate({ 
                documentId: fileId, 
                requestBody: { requests } 
            });
        }
    } catch (err: any) {
        console.error('[DocsAutomation] Erro ao aplicar negrito:', err?.message || err);
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

        const syncResult = await syncProcessToDrive(processId);
        if (!syncResult.success) throw new Error(`Falha ao organizar pastas: ${syncResult.error}`);

        const { drive, docs } = apiClients;
        const physicalFolderId = processData.driveFolderId;
        if (!physicalFolderId) throw new Error("Pasta do processo não disponível.");

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
        if (!copiedFile.id) throw new Error("Falha ao criar cópia do modelo.");

        const fmtAddr = (addr: any) => addr ? `${addr.street || ''}, nº ${addr.number || 'S/N'}${addr.complement ? ', ' + addr.complement : ''}, ${addr.neighborhood || ''}, CEP ${addr.zipCode || ''}, ${addr.city || ''}/${addr.state || ''}` : '---';
        
        const clientAddr = fmtAddr(clientData.address);
        const staffAddr = fmtAddr(staffData?.address);
        const clientFull = `${clientData.firstName} ${clientData.lastName || ''}`.trim();

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

        const staffFull = staffData ? `${staffData.firstName} ${staffData.lastName}` : '---';
        const lawyerQual = staffData ? `${staffFull.toUpperCase()}, advogado inscrito na OAB/${staffData.oabNumber?.includes('/') ? staffData.oabNumber : 'SP sob o nº ' + staffData.oabNumber}, ${staffData.nationality || 'brasileiro'}, ${staffData.civilStatus || 'divorciado'}, com escritório profissional situado à ${staffAddr}.` : '---';

        const dataMap: Record<string, string> = {
            'CLIENTE_QUALIFICACAO_COMPLETA': clientQual,
            'CLIENTE_NOME_COMPLETO': clientFull,
            'RECLAMANTE_NOME': clientFull,
            'CLIENTE_CPF_CNPJ': clientData.document || '---',
            'CLIENTE_RG': clientData.rg || '---',
            'CLIENTE_ENDERECO_COMPLETO': clientAddr,
            'PROCESSO_NUMERO': processData.processNumber || 'Pendente',
            'PROCESSO_VARA': processData.courtBranch || '---',
            'RECLAMADA_NOME': processData.opposingParties?.[0]?.name || '---',
            'ADVOGADO_LIDER_NOME': staffFull,
            'ADVOGADO_LIDER_OAB': staffData?.oabNumber || '---',
            'ADVOGADO_LIDER_QUALIFICACAO_COMPLETA': lawyerQual,
            'ESCRITORIO_NOME': officeData?.officeName || 'Bueno Gois Advogados',
            'DATA_EXTENSO': format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
            'DATA_HOJE': format(new Date(), "dd/MM/yyyy"),
        };

        await replacePlaceholdersInDoc(docs, copiedFile.id, dataMap);

        const boldTargets = [
            clientFull,
            clientData.document,
            staffFull,
            staffData?.oabNumber,
            processData.processNumber
        ].filter(Boolean) as string[];

        await applyBoldToTexts(docs, copiedFile.id, boldTargets);

        await firestoreAdmin.collection('processes').doc(processId).update({
            timeline: FieldValue.arrayUnion({
                id: uuidv4(),
                type: 'petition',
                description: `DOCUMENTO GERADO: "${documentName}". Destaques aplicados automaticamente.`,
                date: Timestamp.now(),
                authorName: session.user.name || 'Sistema'
            }),
            updatedAt: FieldValue.serverTimestamp()
        });

        revalidatePath(`/dashboard/processos`);
        return { success: true, url: copiedFile.webViewLink! };
    } catch (error: any) {
        console.error("[draftDocument] Erro crítico:", error);
        return { success: false, error: error.message || "Erro desconhecido." };
    }
}
