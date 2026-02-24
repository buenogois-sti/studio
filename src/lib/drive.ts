'use server';

import { google, type drive_v3, type sheets_v4, type calendar_v3, type tasks_v1, type docs_v1 } from 'googleapis';
import { firestoreAdmin } from '@/firebase/admin';
import admin from 'firebase-admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import type { Session } from 'next-auth';
import type { Client, Process, Lead } from './types';
import { revalidatePath } from 'next/cache';

// Nomes das pastas raiz para autodescoberta
const CLIENTS_ROOT_NAME = '00 - CLIENTES';
const PROCESSES_ROOT_NAME = '00 - PROCESSOS';
const LEADS_ROOT_NAME = '00 - TRIAGEM (LEADS)';

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
 * Busca ou cria uma pasta raiz. 
 * AGORA: Busca globalmente em itens compartilhados para evitar criação no drive pessoal se já existir.
 */
async function getOrCreateRootFolder(drive: drive_v3.Drive, name: string): Promise<string> {
    try {
        // Busca global por nome (inclui compartilhados e drives compartilhados)
        const res = await drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`,
            fields: 'files(id, name, parents)',
            pageSize: 1,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        if (res.data.files && res.data.files.length > 0) {
            console.log(`[DriveRoot] Pasta raiz encontrada: ${name} (${res.data.files[0].id})`);
            return res.data.files[0].id!;
        }

        // Se não encontrar em lugar nenhum, cria na raiz do usuário atual (Fallback inicial)
        console.log(`[DriveRoot] Pasta "${name}" não encontrada. Criando nova pasta.`);
        const newFolder = await drive.files.create({
            requestBody: {
                name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: ['root'],
            },
            fields: 'id',
            supportsAllDrives: true,
        });

        return newFolder.data.id!;
    } catch (error: any) {
        console.error(`[DriveRoot] Erro ao gerenciar pasta raiz "${name}":`, error.message);
        throw new Error(`Falha ao acessar ou criar a pasta raiz "${name}" no Google Drive.`);
    }
}

/**
 * Busca um item (pasta, arquivo ou atalho) pelo nome dentro de um diretório pai.
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
export async function syncClientToDrive(clientId: string, clientName: string): Promise<{ success: boolean; error?: string }> {
    if (!firestoreAdmin) return { success: false, error: "Servidor de dados inacessível." };
    
    try {
        const { drive } = await getGoogleApiClientsForUser();
        const clientRef = firestoreAdmin.collection('clients').doc(clientId);
        const clientDoc = await clientRef.get();
        if (!clientDoc.exists) throw new Error('Cliente não encontrado.');
        
        const clientData = { id: clientDoc.id, ...clientDoc.data() } as Client;
        const clientDocument = clientData.document || 'SEM-CPF-CNPJ';

        const rootClientsId = await getOrCreateRootFolder(drive, CLIENTS_ROOT_NAME);

        const mainFolderName = `${clientName} - ${clientDocument}`;
        const mainFolderId = await ensureFolder(drive, rootClientsId, mainFolderName);

        for (const name of CLIENT_FOLDER_STRUCTURE) {
            await ensureFolder(drive, mainFolderId, name);
        }

        await clientRef.update({
            driveFolderId: mainFolderId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        revalidatePath('/dashboard/clientes');
        return { success: true };
    } catch (error: any) {
        console.error("[syncClientToDrive] Erro:", error.message);
        return { success: false, error: error.message || "Erro desconhecido na sincronização do cliente." };
    }
}

/**
 * Sincroniza a estrutura de um Lead (Triagem).
 */
export async function syncLeadToDrive(leadId: string): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!firestoreAdmin) return { success: false, error: "Servidor de dados inacessível." };

    try {
        const leadRef = firestoreAdmin.collection('leads').doc(leadId);
        const leadDoc = await leadRef.get();
        if (!leadDoc.exists) throw new Error('Lead não encontrado.');
        const leadData = leadDoc.data() as Lead;

        const { drive } = await getGoogleApiClientsForUser();
        const rootLeadsId = await getOrCreateRootFolder(drive, LEADS_ROOT_NAME);

        const leadFolderName = `${leadData.title} - Lead #${leadId.substring(0, 6)}`;
        const leadFolderId = await ensureFolder(drive, rootLeadsId, leadFolderName);

        await leadRef.update({
            driveFolderId: leadFolderId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, id: leadFolderId };
    } catch (error: any) {
        console.error("[syncLeadToDrive] Erro:", error.message);
        return { success: false, error: error.message || "Erro na sincronização do Lead." };
    }
}

/**
 * Sincroniza um processo, garantindo que ele esteja dentro do cliente e possua um atalho global.
 */
export async function syncProcessToDrive(processId: string): Promise<{ success: boolean; error?: string }> {
    if (!firestoreAdmin) return { success: false, error: "Servidor de dados inacessível." };

    try {
        const processRef = firestoreAdmin.collection('processes').doc(processId);
        const processDoc = await processRef.get();
        if (!processDoc.exists) throw new Error('Processo não encontrado.');
        const processData = { id: processDoc.id, ...processDoc.data() } as Process;

        const clientRef = firestoreAdmin.collection('clients').doc(processData.clientId);
        const clientDoc = await clientRef.get();
        if (!clientDoc.exists) throw new Error('Cliente do processo não encontrado.');
        const clientData = { id: clientDoc.id, ...clientDoc.data() } as Client;

        const { drive } = await getGoogleApiClientsForUser();

        // Se o cliente não tem pasta, sincroniza o cliente primeiro
        if (!clientData.driveFolderId) {
            const syncRes = await syncClientToDrive(clientData.id, `${clientData.firstName} ${clientData.lastName}`);
            if (!syncRes.success) throw new Error(syncRes.error);
            const updatedClient = await clientRef.get();
            clientData.driveFolderId = updatedClient.data()?.driveFolderId;
        }

        if (!clientData.driveFolderId) throw new Error('Falha crítica ao criar diretório do cliente.');

        const clientProcessContainerId = await ensureFolder(drive, clientData.driveFolderId, '03 - Processos');

        const processFolderName = `${processData.processNumber || 'SEM-NUMERO'} - ${processData.name}`;
        const physicalProcessFolderId = await ensureFolder(drive, clientProcessContainerId, processFolderName);

        for (const name of PROCESS_FOLDER_STRUCTURE) {
            await ensureFolder(drive, physicalProcessFolderId, name);
        }

        const rootProcessesId = await getOrCreateRootFolder(drive, PROCESSES_ROOT_NAME);
        const areaFolderId = await ensureFolder(drive, rootProcessesId, processData.legalArea);
        
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

        await processRef.update({
            driveFolderId: physicalProcessFolderId,
            globalDriveFolderId: shortcutId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        revalidatePath('/dashboard/processos');
        return { success: true };
    } catch (error: any) {
        console.error("[syncProcessToDrive] Erro:", error.message);
        return { success: false, error: error.message || "Erro desconhecido na sincronização do processo." };
    }
}