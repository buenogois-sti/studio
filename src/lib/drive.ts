
'use server';

import { google, type drive_v3, type sheets_v4, type calendar_v3 } from 'googleapis';
import { firestoreAdmin } from '@/firebase/admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import type { Session } from 'next-auth';
import type { Client, Process } from './types';

const ROOT_CLIENTS_FOLDER_ID = '1DVI828qlM7SoN4-FJsGj9wwmxcOEjh6l';
const ROOT_ADMIN_FOLDER_ID = '1V6xGiXQnapkA4y4m3on1s5zZTYqMPkhH';

const CLIENT_FOLDER_STRUCTURE: Record<string, string[] | Record<string, string[]>> = {
  'level1': [
    '01 - Cadastro e Documentos Pessoais',
    '02 - Contratos e Procurações',
    '03 - Processos',
    '04 - Andamentos e Prazos',
    '05 - Provas e Documentos Processuais',
    '06 - Financeiro',
    '07 - Comunicações e Atendimentos',
    '08 - Modelos e Documentos Gerados'
  ],
  '06 - Financeiro': [
    '01 - Honorários Contratuais',
    '02 - Acordos',
    '03 - Execuções / Sentenças',
    '04 - Repasse para Advogados',
    '05 - Custas e Despesas',
    '06 - Recibos e Comprovantes'
  ]
};

const PROCESS_FOLDER_STRUCTURE: Record<string, string[] | Record<string, string[]>> = {
  'level1': [
    '01 - Petições',
    '02 - Decisões e Sentenças',
    '03 - Recursos',
    '04 - Atas e Audiências',
    '05 - Execução',
    '06 - Encerramento'
  ]
};

const ADMIN_FINANCEIRO_STRUCTURE: Record<string, string[]> = {
  'level1': [
    '01 - Recebimentos',
    '02 - Pagamentos',
    '03 - Contas Fixas',
    '04 - Contas Variáveis',
    '05 - Honorários Advocatícios',
    '06 - Repasse de Advogados',
    '07 - Impostos e Tributos',
    '08 - Reembolsos e Custas',
    '09 - Extratos e Conciliação',
    '10 - Relatórios Financeiros'
  ],
  '05 - Honorários Advocatícios': [
    '01 - Honorários Contratuais',
    '02 - Honorários de Êxito',
    '03 - Honorários Sucumbenciais',
    '04 - Acordos',
    '05 - Execuções'
  ]
};


interface GoogleApiClients {
    drive: drive_v3.Drive;
    sheets: sheets_v4.Sheets;
    calendar: calendar_v3.Calendar;
}

export async function getGoogleApiClientsForUser(): Promise<GoogleApiClients> {
    const session: Session | null = await getServerSession(authOptions);

    if (!session?.accessToken) {
        throw new Error('Usuário não autenticado ou token de acesso indisponível. Faça login novamente.');
    }
    
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });
    const calendar = google.calendar({ version: 'v3', auth });
    
    return { drive, sheets, calendar };
}

async function createMultipleFolders(drive: drive_v3.Drive, parentId: string, folderNames: string[]): Promise<Map<string, string>> {
  const folderIds = new Map<string, string>();
  for (const name of folderNames) {
    const fileMetadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    };
    try {
      const file = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
        supportsAllDrives: true,
      });
      if (file.data.id) {
        folderIds.set(name, file.data.id);
        console.log(`Created folder '${name}' with ID: ${file.data.id}`);
      }
    } catch (error: any) {
        console.error(`Error creating folder '${name}':`, error.message);
    }
  }
  return folderIds;
}

async function findFolderByName(drive: drive_v3.Drive, parentId: string, name: string): Promise<string | null> {
    try {
        const res = await drive.files.list({
            q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${name}' and trashed = false`,
            fields: 'files(id)',
            pageSize: 1,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
        if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
            return res.data.files[0].id;
        }
        return null;
    } catch (error: any) {
        console.error(`Error finding folder '${name}':`, error.message);
        return null;
    }
}

async function createClientKitFromTemplates(
    drive: drive_v3.Drive, 
    clientName: string, 
    subfolderIds: Map<string, string>,
    templates: { name: string; templateId: string; destination: string; }[]
): Promise<void> {
    if (templates.length === 0) return;

    for (const doc of templates) {
        const templateId = doc.templateId;
        const destinationFolderId = subfolderIds.get(doc.destination);

        if (templateId && destinationFolderId) {
            try {
                const newDocName = `${doc.name} - ${clientName}`;
                await drive.files.copy({
                    fileId: templateId,
                    requestBody: {
                        name: newDocName,
                        parents: [destinationFolderId],
                    },
                    supportsAllDrives: true,
                });
            } catch (error: any) {
                console.error(`Error copying template ${doc.name}:`, error.message);
            }
        }
    }
}

async function createClientMainFolder(drive: drive_v3.Drive, clientName: string): Promise<string | null | undefined> {
  const fileMetadata = {
    name: clientName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [ROOT_CLIENTS_FOLDER_ID],
  };

  try {
    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
      supportsAllDrives: true,
    });
    return file.data.id;
  } catch (error: any) {
    console.error('Error creating main client Google Drive folder:', error);
    throw new Error(`Falha ao criar pasta principal do cliente no Google Drive.`);
  }
}

async function createClientSheet(sheets: sheets_v4.Sheets, clientName: string): Promise<string | null | undefined> {
    const spreadsheet = {
        properties: {
            title: `Financeiro - ${clientName}`,
        },
    };
    try {
        const response = await sheets.spreadsheets.create({
            requestBody: spreadsheet,
            fields: 'spreadsheetId',
        });
        return response.data.spreadsheetId;
    } catch (error: any) {
        console.error('Error creating Google Sheet:', error);
        throw new Error(`Falha ao criar planilha no Google Sheets.`);
    }
}

export async function syncClientToDrive(clientId: string, clientName: string): Promise<void> {
    if (!firestoreAdmin) throw new Error("A conexão com o servidor de dados falhou.");
    
    try {
        const { drive, sheets } = await getGoogleApiClientsForUser();

        const clientRef = firestoreAdmin.collection('clients').doc(clientId);
        const clientDoc = await clientRef.get();
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        const clientData = clientDoc.data() as Client;
        const clientDocument = clientData.document || 'PENDENTE';

        const mainFolderName = `${clientName} - ${clientDocument}`;
        const mainFolderId = await createClientMainFolder(drive, mainFolderName);
        if (!mainFolderId) throw new Error('Falha ao criar a pasta principal do cliente.');

        const level1FolderIds = await createMultipleFolders(drive, mainFolderId, CLIENT_FOLDER_STRUCTURE.level1 as string[]);

        for (const [parent, children] of Object.entries(CLIENT_FOLDER_STRUCTURE)) {
            if (parent === 'level1') continue;
            if (Array.isArray(children)) {
                const parentFolderId = level1FolderIds.get(parent);
                if (parentFolderId) {
                    await createMultipleFolders(drive, parentFolderId, children as string[]);
                }
            }
        }

        const settingsDoc = await firestoreAdmin.collection('system_settings').doc('client_kit').get();
        const templates = settingsDoc.exists && settingsDoc.data()?.templates ? settingsDoc.data()?.templates : [];
        await createClientKitFromTemplates(drive, clientName, level1FolderIds, templates);

        const sheetId = await createClientSheet(sheets, clientName);
        if (sheetId) {
            const cadastroFolderId = level1FolderIds.get('01 - Cadastro e Documentos Pessoais');
            if (cadastroFolderId) {
                const file = await drive.files.get({ fileId: sheetId, fields: 'parents', supportsAllDrives: true });
                const previousParents = file.data.parents ? file.data.parents.join(',') : '';
                await drive.files.update({
                    fileId: sheetId,
                    addParents: cadastroFolderId,
                    removeParents: previousParents,
                    fields: 'id, parents',
                    supportsAllDrives: true,
                });
            }
        }
        
        await clientRef.update({
            driveFolderId: mainFolderId,
            sheetId: sheetId,
            updatedAt: new Date(),
        });

    } catch (error: any) {
        console.error("Error in syncClientToDrive:", error);
        throw new Error(error.message || 'Erro durante a sincronização com o Google Drive.');
    }
}


export async function syncProcessToDrive(processId: string): Promise<void> {
    if (!firestoreAdmin) throw new Error("A conexão com o servidor de dados falhou.");

    try {
        const processRef = firestoreAdmin.collection('processes').doc(processId);
        const processDoc = await processRef.get();
        if (!processDoc.exists) throw new Error('Processo não encontrado.');
        const processData = processDoc.data() as Process;

        if (processData.driveFolderId) return;

        const clientRef = firestoreAdmin.collection('clients').doc(processData.clientId);
        const clientDoc = await clientRef.get();
        if (!clientDoc.exists) throw new Error('Cliente associado não encontrado.');
        const clientData = clientDoc.data() as Client;

        if (!clientData.driveFolderId) throw new Error('O cliente principal precisa ser sincronizado com o Drive primeiro.');

        const { drive } = await getGoogleApiClientsForUser();

        let processosFolderId = await findFolderByName(drive, clientData.driveFolderId, '03 - Processos');
        if (!processosFolderId) {
            const createdFolders = await createMultipleFolders(drive, clientData.driveFolderId, ['03 - Processos']);
            processosFolderId = createdFolders.get('03 - Processos')!;
        }

        const processFolderName = `${processData.processNumber || 'SEM-NUMERO'} - ${processData.name}`.replace(/[\/\\?%*:|"<>]/g, '-');
        const mainProcessFolderId = (await createMultipleFolders(drive, processosFolderId!, [processFolderName])).get(processFolderName)!;
        
        if (mainProcessFolderId) {
            await createMultipleFolders(drive, mainProcessFolderId, PROCESS_FOLDER_STRUCTURE.level1 as string[]);
            await processRef.update({
                driveFolderId: mainProcessFolderId,
                updatedAt: new Date(),
            });
        }
        
    } catch (error: any) {
        console.error("Error in syncProcessToDrive:", error);
        throw new Error(error.message || 'Erro durante a sincronização do processo.');
    }
}

export async function initializeAdminDriveStructure(): Promise<{ success: boolean; message: string }> {
    try {
        const { drive } = await getGoogleApiClientsForUser();

        // 1. Encontrar ou Criar pasta FINANCEIRO dentro da raiz Administrativa
        let financeiroFolderId = await findFolderByName(drive, ROOT_ADMIN_FOLDER_ID, 'FINANCEIRO');
        
        if (!financeiroFolderId) {
            const res = await drive.files.create({
                requestBody: {
                    name: 'FINANCEIRO',
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [ROOT_ADMIN_FOLDER_ID],
                },
                fields: 'id',
                supportsAllDrives: true,
            });
            financeiroFolderId = res.data.id!;
        }

        // 2. Criar subpastas do nível 1 do financeiro
        const level1Ids = await createMultipleFolders(drive, financeiroFolderId, ADMIN_FINANCEIRO_STRUCTURE.level1);

        // 3. Criar subpastas específicas (ex: Honorários Advocatícios)
        const honorariosFolderId = level1Ids.get('05 - Honorários Advocatícios');
        if (honorariosFolderId) {
            await createMultipleFolders(drive, honorariosFolderId, ADMIN_FINANCEIRO_STRUCTURE['05 - Honorários Advocatícios']);
        }

        return { success: true, message: 'Estrutura Administrativa/Financeira criada com sucesso no Google Drive.' };
    } catch (error: any) {
        console.error("Error initializing admin drive structure:", error);
        throw new Error(error.message || 'Falha ao inicializar estrutura no Drive.');
    }
}
