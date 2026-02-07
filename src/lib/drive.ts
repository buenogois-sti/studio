'use server';

import { google, type drive_v3, type sheets_v4, type calendar_v3, type tasks_v1, type docs_v1 } from 'googleapis';
import { firestoreAdmin } from '@/firebase/admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import type { Session } from 'next-auth';
import type { Client, Process } from './types';

// IDs de pastas raiz no Drive da Bueno Gois
const ROOT_CLIENTS_FOLDER_ID = '1DVI828qlM7SoN4-FJsGj9wwmxcOEjh6l';
const ROOT_PROCESSES_FOLDER_ID = '1V6xGiXQnapkA4y4m3on1s5zZTYqMPkhH';

const CLIENT_FOLDER_STRUCTURE = [
  '01 - Cadastro e Documentos Pessoais',
  '02 - Contratos e Procurações',
  '03 - Processos',
  '04 - Financeiro',
  '05 - Comunicações e Atendimentos'
];

const PROCESS_FOLDER_STRUCTURE = [
  '01 - Petições',
  '02 - Decisões e Sentenças',
  '03 - Provas e Documentos Processuais',
  '04 - Recursos',
  '05 - Atas e Audiências',
  '06 - Execução',
  '07 - Encerramento'
];

interface GoogleApiClients {
    drive: drive_v3.Drive;
    sheets: sheets_v4.Sheets;
    calendar: calendar_v3.Calendar;
    tasks: tasks_v1.Tasks;
    docs: docs_v1.Docs;
}

/**
 * Obtém os clientes da API do Google autenticados para o usuário da sessão.
 */
export async function getGoogleApiClientsForUser(): Promise<GoogleApiClients> {
    const session: Session | null = await getServerSession(authOptions);

    if (!session?.accessToken) {
        throw new Error('Sessão expirada ou token inválido. Por favor, saia e entre novamente no sistema.');
    }
    
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });

    return {
        drive: google.drive({ version: 'v3', auth }),
        sheets: google.sheets({ version: 'v4', auth }),
        calendar: google.calendar({ version: 'v3', auth }),
        tasks: google.tasks({ version: 'v1', auth }),
        docs: google.docs({ version: 'v1', auth }),
    };
}

/**
 * Busca um item (pasta, arquivo ou atalho) pelo nome dentro de um diretório pai.
 * Implementa escape de caracteres para segurança.
 */
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
        
        return res.data.files && res.data.files.length > 0 ? res.data.files[0].id! : null;
    } catch (error: any) {
        console.error(`[DriveSearch] Erro ao buscar "${name}":`, error.message);
        return null;
    }
}

/**
 * Garante a existência de uma pasta, criando-a apenas se necessário.
 */
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

/**
 * Sincroniza a estrutura de pastas de um cliente.
 */
export async function syncClientToDrive(clientId: string, clientName: string): Promise<void> {
    if (!firestoreAdmin) throw new Error("Servidor de dados inacessível.");
    
    try {
        const { drive } = await getGoogleApiClientsForUser();
        const clientRef = firestoreAdmin.collection('clients').doc(clientId);
        const clientDoc = await clientRef.get();
        if (!clientDoc.exists) throw new Error('Cliente não encontrado no banco de dados.');
        
        const clientData = clientDoc.data() as Client;
        const clientDocument = clientData.document || 'SEM-CPF-CNPJ';

        const mainFolderName = `${clientName} - ${clientDocument}`;
        const mainFolderId = await ensureFolder(drive, ROOT_CLIENTS_FOLDER_ID, mainFolderName);

        // Cria estrutura de subpastas padrão do cliente
        for (const name of CLIENT_FOLDER_STRUCTURE) {
            await ensureFolder(drive, mainFolderId, name);
        }

        await clientRef.update({
            driveFolderId: mainFolderId,
            updatedAt: new Date(),
        });

    } catch (error: any) {
        console.error("[syncClientToDrive] Erro:", error.message);
        throw new Error(`Falha ao organizar pastas do cliente: ${error.message}`);
    }
}

/**
 * Sincroniza um processo, garantindo que ele esteja dentro do cliente e possua um atalho global.
 */
export async function syncProcessToDrive(processId: string): Promise<void> {
    if (!firestoreAdmin) throw new Error("Servidor de dados inacessível.");

    try {
        const processRef = firestoreAdmin.collection('processes').doc(processId);
        const processDoc = await processRef.get();
        if (!processDoc.exists) throw new Error('Processo não encontrado.');
        const processData = processDoc.data() as Process;

        const clientRef = firestoreAdmin.collection('clients').doc(processData.clientId);
        const clientDoc = await clientRef.get();
        if (!clientDoc.exists) throw new Error('Cliente do processo não encontrado.');
        const clientData = clientDoc.data() as Client;

        // Se o cliente não tem pasta, sincroniza o cliente primeiro
        if (!clientData.driveFolderId) {
            await syncClientToDrive(clientData.id, `${clientData.firstName} ${clientData.lastName}`);
            const updatedClient = await clientRef.get();
            clientData.driveFolderId = updatedClient.data()?.driveFolderId;
        }

        if (!clientData.driveFolderId) throw new Error('Falha crítica ao criar diretório do cliente.');

        const { drive } = await getGoogleApiClientsForUser();

        // 1. Garante a subpasta "03 - Processos" dentro do Cliente
        const clientProcessContainerId = await ensureFolder(drive, clientData.driveFolderId, '03 - Processos');

        // 2. Garante a pasta FÍSICA do processo
        const processFolderName = `${processData.processNumber || 'SEM-NUMERO'} - ${processData.name}`;
        const physicalProcessFolderId = await ensureFolder(drive, clientProcessContainerId, processFolderName);

        // 3. Garante subpastas operacionais (Petições, Prazos, etc)
        for (const name of PROCESS_FOLDER_STRUCTURE) {
            await ensureFolder(drive, physicalProcessFolderId, name);
        }

        // 4. Gerencia o ATALHO na visão global por Área Jurídica
        const areaFolderId = await ensureFolder(drive, ROOT_PROCESSES_FOLDER_ID, processData.legalArea);
        
        // Busca se já existe um atalho com este nome na pasta da área
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

        // Atualiza Firestore: driveFolderId (Físico) e globalDriveFolderId (Atalho)
        await processRef.update({
            driveFolderId: physicalProcessFolderId,
            globalDriveFolderId: shortcutId,
            updatedAt: new Date(),
        });
        
    } catch (error: any) {
        console.error("[syncProcessToDrive] Erro:", error.message);
        throw new Error(`Falha ao organizar pastas do processo: ${error.message}`);
    }
}
