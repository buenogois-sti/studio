'use server';

import { google, type drive_v3, type sheets_v4, type calendar_v3 } from 'googleapis';
import { firestoreAdmin } from '@/firebase/admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import type { Session } from 'next-auth';
import type { Client, Process } from './types';

const ROOT_CLIENTS_FOLDER_ID = '1DVI828qlM7SoN4-FJsGj9wwmxcOEjh6l';
const ROOT_PROCESSES_FOLDER_ID = '1V6xGiXQnapkA4y4m3on1s5zZTYqMPkhH'; // Global processes root

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
        let mainFolderId = await findFolderByName(drive, ROOT_CLIENTS_FOLDER_ID, mainFolderName);
        
        if (!mainFolderId) {
            const file = await drive.files.create({
                requestBody: {
                    name: mainFolderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [ROOT_CLIENTS_FOLDER_ID],
                },
                fields: 'id',
                supportsAllDrives: true,
            });
            mainFolderId = file.data.id!;
        }

        const level1FolderIds = await createMultipleFolders(drive, mainFolderId, CLIENT_FOLDER_STRUCTURE.level1 as string[]);

        await clientRef.update({
            driveFolderId: mainFolderId,
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

        const clientRef = firestoreAdmin.collection('clients').doc(processData.clientId);
        const clientDoc = await clientRef.get();
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        const clientData = clientDoc.data() as Client;

        if (!clientData.driveFolderId) {
            await syncClientToDrive(clientData.id, `${clientData.firstName} ${clientData.lastName}`);
            const updatedClient = await clientRef.get();
            clientData.driveFolderId = updatedClient.data()?.driveFolderId;
        }

        const { drive } = await getGoogleApiClientsForUser();

        // 1. Organização na pasta do Cliente
        let processosFolderId = await findFolderByName(drive, clientData.driveFolderId!, '03 - Processos');
        if (!processosFolderId) {
            const created = await createMultipleFolders(drive, clientData.driveFolderId!, ['03 - Processos']);
            processosFolderId = created.get('03 - Processos')!;
        }

        const processFolderName = `${processData.processNumber || 'SEM-NUMERO'} - ${processData.name}`;
        
        // Criar pasta do processo dentro do Cliente
        const clientProcessFolder = await drive.files.create({
            requestBody: {
                name: processFolderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [processosFolderId!],
            },
            fields: 'id',
            supportsAllDrives: true,
        });

        // 2. Organização na pasta Global por Tipo de Ação
        let areaFolderId = await findFolderByName(drive, ROOT_PROCESSES_FOLDER_ID, processData.legalArea);
        if (!areaFolderId) {
            const res = await drive.files.create({
                requestBody: {
                    name: processData.legalArea,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [ROOT_PROCESSES_FOLDER_ID],
                },
                fields: 'id',
                supportsAllDrives: true,
            });
            areaFolderId = res.data.id!;
        }

        // Shortcut ou pasta espelhada na pasta global
        const globalProcessFolder = await drive.files.create({
            requestBody: {
                name: processFolderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [areaFolderId!],
            },
            fields: 'id',
            supportsAllDrives: true,
        });

        if (clientProcessFolder.data.id) {
            await createMultipleFolders(drive, clientProcessFolder.data.id, PROCESS_FOLDER_STRUCTURE.level1 as string[]);
            await processRef.update({
                driveFolderId: clientProcessFolder.data.id,
                globalDriveFolderId: globalProcessFolder.data.id,
                updatedAt: new Date(),
            });
        }
        
    } catch (error: any) {
        console.error("Error in syncProcessToDrive:", error);
        throw new Error(error.message || 'Erro durante a sincronização do processo.');
    }
}
