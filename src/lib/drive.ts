
'use server';

import { google, type drive_v3, type sheets_v4, type calendar_v3 } from 'googleapis';
import { firestoreAdmin } from '@/firebase/admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import type { Session } from 'next-auth';
import type { Client, Process } from './types';

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

const CLIENT_FOLDER_STRUCTURE = [
  '00_DADOS_DO_CLIENTE',
  '01_CONTRATO_E_HONORÁRIOS',
  '02_DOCUMENTOS_PESSOAIS',
  '03_PROCESSOS',
  '99_ADMINISTRATIVO_INTERNO'
];

const PROCESS_FOLDER_STRUCTURE: Record<string, string[] | Record<string, string[]>> = {
  'level1': [
    '00_DADOS_DO_PROCESSO',
    '01_PETIÇÕES_INICIAIS',
    '02_CONTESTAÇÃO_E_MANIFESTAÇÕES',
    '03_PROVAS',
    '04_MOVIMENTAÇÕES_E_ANDAMENTOS',
    '05_DECISÕES_E_SENTENÇAS',
    '06_RECURSOS',
    '07_CÁLCULOS_E_LIQUIDAÇÃO',
    '08_EXECUÇÃO_E_CUMPRIMENTO',
    '09_ACORDOS_E_CONCILIAÇÕES',
    '10_PRAZOS',
    '99_ENCERRAMENTO',
  ],
  '03_PROVAS': ['DOCUMENTAIS', 'TESTEMUNHAIS', 'PERICIAIS', 'AUDIO_VIDEO'],
  '05_DECISÕES_E_SENTENÇAS': ['DECISÕES_INTERLOCUTÓRIAS', 'SENTENÇA', 'ACÓRDÃO'],
  '10_PRAZOS': ['ABERTOS', 'CUMPRIDOS', 'PERDIDOS'],
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
    console.log('Starting client kit creation from settings...');
    
    if (templates.length === 0) {
        console.log("No client kit templates configured in settings. Skipping.");
        return;
    }

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
                console.log(`Successfully copied '${doc.name}' to folder '${doc.destination}'`);
            } catch (error: any) {
                console.error(`Error copying template ${doc.name} (ID: ${templateId}):`, error.message);
            }
        } else {
            if (!templateId) console.warn(`Template ID for ${doc.name} is missing. Skipping document.`);
            if (!destinationFolderId) console.warn(`Destination folder '${doc.destination}' not found. Skipping document '${doc.name}'.`);
        }
    }
}

async function createClientMainFolder(drive: drive_v3.Drive, clientName: string): Promise<string | null | undefined> {
  if (!ROOT_FOLDER_ID) {
    throw new Error('A variável de ambiente GOOGLE_DRIVE_ROOT_FOLDER_ID não está definida.');
  }

  const fileMetadata = {
    name: clientName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [ROOT_FOLDER_ID],
  };

  try {
    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
      supportsAllDrives: true,
    });
    console.log('Main client folder created with ID:', file.data.id);
    return file.data.id;
  } catch (error: any) {
    console.error('Error creating main client Google Drive folder:', error);
    throw new Error(`Falha ao criar pasta principal do cliente no Google Drive. A API do Google retornou: ${error.message}`);
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
        console.log('Spreadsheet created with ID:', response.data.spreadsheetId);
        return response.data.spreadsheetId;
    } catch (error: any) {
        console.error('Error creating Google Sheet:', error);
        throw new Error(`Falha ao criar planilha no Google Sheets. A API do Google retornou: ${error.message}`);
    }
}

export async function syncClientToDrive(clientId: string, clientName: string): Promise<void> {
    if (!firestoreAdmin) {
        throw new Error("A conexão com o servidor de dados falhou. Verifique a configuração do servidor.");
    }
    
    try {
        const { drive, sheets } = await getGoogleApiClientsForUser();

        const mainFolderName = `${clientId.substring(0, 6)} - ${clientName}`;
        const mainFolderId = await createClientMainFolder(drive, mainFolderName);
        if (!mainFolderId) {
            throw new Error('Falha ao criar a pasta principal do cliente no Google Drive.');
        }

        const subfolderIds = await createMultipleFolders(drive, mainFolderId, CLIENT_FOLDER_STRUCTURE);
        console.log("Client subfolders created.");

        const settingsDoc = await firestoreAdmin.collection('system_settings').doc('client_kit').get();
        const templates = settingsDoc.exists && settingsDoc.data()?.templates ? settingsDoc.data()?.templates : [];

        await createClientKitFromTemplates(drive, clientName, subfolderIds, templates);

        const sheetId = await createClientSheet(sheets, clientName);
        if (!sheetId) {
            throw new Error('Falha ao criar planilha no Google Sheets.');
        }
        
        const adminFolderId = subfolderIds.get('99_ADMINISTRATIVO_INTERNO');
        if (adminFolderId) {
            const file = await drive.files.get({
                fileId: sheetId,
                fields: 'parents',
                supportsAllDrives: true, 
            });
            const previousParents = file.data.parents ? file.data.parents.join(',') : '';

            await drive.files.update({
                fileId: sheetId,
                addParents: adminFolderId,
                removeParents: previousParents,
                fields: 'id, parents',
                supportsAllDrives: true,
            });
            console.log('Moved Sheet into 99_ADMINISTRATIVO_INTERNO folder.');
        }
        
        const clientRef = firestoreAdmin.collection('clients').doc(clientId);
        await clientRef.update({
            driveFolderId: mainFolderId,
            sheetId: sheetId,
            updatedAt: new Date(),
        });

    } catch (error: any) {
        console.error("Error in syncClientToDrive:", error);
        throw new Error(error.message || 'Ocorreu um erro desconhecido durante a sincronização com o Google Drive.');
    }
}


export async function syncProcessToDrive(processId: string): Promise<void> {
    if (!firestoreAdmin) {
        throw new Error("A conexão com o servidor de dados falhou. Verifique a configuração do servidor.");
    }

    try {
        const processRef = firestoreAdmin.collection('processes').doc(processId);
        const processDoc = await processRef.get();
        if (!processDoc.exists) throw new Error('Processo não encontrado.');
        const processData = processDoc.data() as Process;

        if (processData.driveFolderId) {
             console.log("Process folder already exists.");
             return;
        }

        const clientRef = firestoreAdmin.collection('clients').doc(processData.clientId);
        const clientDoc = await clientRef.get();
        if (!clientDoc.exists) throw new Error('Cliente associado ao processo não encontrado.');
        const clientData = clientDoc.data() as Client;

        if (!clientData.driveFolderId) {
            throw new Error('O cliente principal precisa ser sincronizado com o Drive primeiro.');
        }

        const { drive } = await getGoogleApiClientsForUser();

        let processosFolderId = await findFolderByName(drive, clientData.driveFolderId, '03_PROCESSOS');
        if (!processosFolderId) {
            console.warn("'03_PROCESSOS' folder not found, creating it now.");
            const createdFolders = await createMultipleFolders(drive, clientData.driveFolderId, ['03_PROCESSOS']);
            processosFolderId = createdFolders.get('03_PROCESSOS')!;
            if (!processosFolderId) throw new Error("Could not create '03_PROCESSOS' folder.");
        }

        const processFolderName = `${processData.processNumber || 'S-N'} - ${clientData.legalArea || 'ÁREA'} - ${processData.name}`.replace(/[\/\\?%*:|"<>]/g, '-');
        const mainProcessFolderId = (await createMultipleFolders(drive, processosFolderId, [processFolderName])).get(processFolderName)!;
        if (!mainProcessFolderId) throw new Error("Failed to create main process folder.");

        const level1Folders = await createMultipleFolders(drive, mainProcessFolderId, PROCESS_FOLDER_STRUCTURE.level1 as string[]);

        for (const [parent, children] of Object.entries(PROCESS_FOLDER_STRUCTURE)) {
            if (parent === 'level1' || !Array.isArray(children)) continue;
            const parentFolderId = level1Folders.get(parent);
            if (parentFolderId) {
                await createMultipleFolders(drive, parentFolderId, children);
            }
        }
        
        console.log("Canonical process folder structure created successfully.");

        await processRef.update({
            driveFolderId: mainProcessFolderId,
            updatedAt: new Date(),
        });
        
    } catch (error: any) {
        console.error("Error in syncProcessToDrive:", error);
        throw new Error(error.message || 'Ocorreu um erro desconhecido durante a sincronização do processo.');
    }
}
