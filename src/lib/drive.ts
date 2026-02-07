'use server';

import { google, type drive_v3, type sheets_v4, type calendar_v3, type tasks_v1, type docs_v1 } from 'googleapis';
import { firestoreAdmin } from '@/firebase/admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import type { Session } from 'next-auth';
import type { Client, Process } from './types';

const ROOT_CLIENTS_FOLDER_ID = '1DVI828qlM7SoN4-FJsGj9wwmxcOEjh6l';
const ROOT_PROCESSES_FOLDER_ID = '1V6xGiXQnapkA4y4m3on1s5zZTYqMPkhH';

const CLIENT_FOLDER_STRUCTURE: Record<string, string[]> = {
  'level1': [
    '01 - Cadastro e Documentos Pessoais',
    '02 - Contratos e Procurações',
    '03 - Processos',
    '04 - Financeiro',
    '05 - Comunicações e Atendimentos',
    
  ]
};

const PROCESS_FOLDER_STRUCTURE: Record<string, string[]> = {
  'level1': [
    '01 - Petições',
    '04 - Andamentos e Prazos',
    '02 - Decisões e Sentenças',
    '03 - Provas e Documentos Processuais',
    '04 - Recursos',
    '05 - Atas e Audiências',
    '06 - Execução',
    '07 - Encerramento'
  ]
};

interface GoogleApiClients {
    drive: drive_v3.Drive;
    sheets: sheets_v4.Sheets;
    calendar: calendar_v3.Calendar;
    tasks: tasks_v1.Tasks;
    docs: docs_v1.Docs;
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
    const tasks = google.tasks({ version: 'v1', auth });
    const docs = google.docs({ version: 'v1', auth });
    
    return { drive, sheets, calendar, tasks, docs };
}

async function findItemByName(drive: drive_v3.Drive, parentId: string, name: string, mimeType?: string): Promise<string | null> {
    try {
        const safeName = name.replace(/'/g, "\\'");
        let q = `'${parentId}' in parents and name = '${safeName}' and trashed = false`;
        if (mimeType) {
            q += ` and mimeType = '${mimeType}'`;
        }
        
        const res = await drive.files.list({
            q,
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
        console.error(`[findItemByName] Error finding '${name}':`, error.message);
        return null;
    }
}

async function ensureFolder(drive: drive_v3.Drive, parentId: string, name: string): Promise<string> {
    let folderId = await findItemByName(drive, parentId, name, 'application/vnd.google-apps.folder');
    if (!folderId) {
        const file = await drive.files.create({
            requestBody: {
                name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            },
            fields: 'id',
            supportsAllDrives: true,
        });
        folderId = file.data.id!;
    }
    return folderId;
}

export async function syncClientToDrive(clientId: string, clientName: string): Promise<void> {
    if (!firestoreAdmin) throw new Error("A conexão com o servidor de dados falhou.");
    
    try {
        const { drive } = await getGoogleApiClientsForUser();
        const clientRef = firestoreAdmin.collection('clients').doc(clientId);
        const clientDoc = await clientRef.get();
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        const clientData = clientDoc.data() as Client;
        const clientDocument = clientData.document || 'PENDENTE';

        const mainFolderName = `${clientName} - ${clientDocument}`;
        const mainFolderId = await ensureFolder(drive, ROOT_CLIENTS_FOLDER_ID, mainFolderName);

        // Garante a estrutura de nível 1
        for (const name of CLIENT_FOLDER_STRUCTURE.level1) {
            await ensureFolder(drive, mainFolderId, name);
        }

        await clientRef.update({
            driveFolderId: mainFolderId,
            updatedAt: new Date(),
        });

    } catch (error: any) {
        console.error("Error in syncClientToDrive:", error);
        throw new Error(error.message || 'Erro durante a sincronização do cliente.');
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

        if (!clientData.driveFolderId) throw new Error('Falha ao obter pasta do cliente.');

        const { drive } = await getGoogleApiClientsForUser();

        // 1. Localiza ou cria a pasta "03 - Processos" dentro do Cliente
        const processosFolderId = await ensureFolder(drive, clientData.driveFolderId, '03 - Processos');

        // 2. Cria a pasta FÍSICA do processo dentro do cliente
        const processFolderName = `${processData.processNumber || 'SEM-NUMERO'} - ${processData.name}`;
        const physicalProcessFolderId = await ensureFolder(drive, processosFolderId, processFolderName);

        // Garante as subpastas operacionais na pasta física
        for (const name of PROCESS_FOLDER_STRUCTURE.level1) {
            await ensureFolder(drive, physicalProcessFolderId, name);
        }

        // 3. Cria um ATALHO (Shortcut) na pasta global de Processos por Área
        const areaFolderId = await ensureFolder(drive, ROOT_PROCESSES_FOLDER_ID, processData.legalArea);
        
        let shortcutId = await findItemByName(drive, areaFolderId, processFolderName, 'application/vnd.google-apps.shortcut');
        
        if (!shortcutId) {
            const res = await drive.files.create({
                requestBody: {
                    name: processFolderName,
                    mimeType: 'application/vnd.google-apps.shortcut',
                    parents: [areaFolderId],
                    shortcutDetails: {
                        targetId: physicalProcessFolderId,
                    },
                },
                fields: 'id',
                supportsAllDrives: true,
            });
            shortcutId = res.data.id!;
        }

        // Atualiza o Firestore com os IDs finais
        // driveFolderId = Pasta Física (dentro do cliente)
        // globalDriveFolderId = Atalho (na visão global de processos)
        await processRef.update({
            driveFolderId: physicalProcessFolderId,
            globalDriveFolderId: shortcutId,
            updatedAt: new Date(),
        });
        
    } catch (error: any) {
        console.error("Error in syncProcessToDrive:", error);
        throw new Error(error.message || 'Erro durante a sincronização do processo.');
    }
}
