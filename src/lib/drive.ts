'use server';

import { google, type drive_v3, type sheets_v4 } from 'googleapis';
import { firestoreAdmin } from '@/firebase/admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import type { Session } from 'next-auth';

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

const TEMPLATE_DOCS = [
  { envKey: 'TEMPLATE_PROCURACAO_ID', name: 'Procuração Ad Judicia' },
  { envKey: 'TEMPLATE_HIPOSSUFICIENCIA_ID', name: 'Declaração de Hipossuficiência' },
  { envKey: 'TEMPLATE_CONTRATO_ID', name: 'Contrato de Honorários' },
];


interface GoogleApiClients {
    drive: drive_v3.Drive;
    sheets: sheets_v4.Sheets;
}

/**
 * Creates authenticated Google API clients using the user's session.
 * This function is for use in SERVER-SIDE code (Server Actions, API routes).
 * It retrieves the access token from the NextAuth session.
 * @returns An object containing authenticated Drive and Sheets clients.
 */
export async function getGoogleApiClientsForUser(): Promise<GoogleApiClients> {
    const session: Session | null = await getServerSession(authOptions);

    if (!session?.accessToken) {
        throw new Error('Usuário não autenticado ou token de acesso indisponível. Faça login novamente.');
    }
    
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });
    
    return { drive, sheets };
}


// Creates a new folder for a client within the root folder.
async function createClientFolder(drive: drive_v3.Drive, clientName: string): Promise<string | null | undefined> {
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
    console.log('Folder created with ID:', file.data.id);
    return file.data.id;
  } catch (error: any) {
    console.error('Error creating Google Drive folder:', error);
    // The problem is external (Workspace policy, etc.) so we show the raw error from the API.
    throw new Error(`Falha ao criar pasta no Google Drive. A API do Google retornou: ${error.message}`);
  }
}

// Creates a new Google Sheet for the client.
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

// Creates a "client kit" of documents from templates.
async function createClientKitFromTemplates(drive: drive_v3.Drive, clientName: string, folderId: string): Promise<void> {
    console.log('Starting client kit creation...');
    
    for (const doc of TEMPLATE_DOCS) {
        const templateId = process.env[doc.envKey];
        if (templateId) {
            try {
                const newDocName = `${doc.name} - ${clientName}`;
                await drive.files.copy({
                    fileId: templateId,
                    requestBody: {
                        name: newDocName,
                        parents: [folderId],
                    },
                    supportsAllDrives: true,
                });
                console.log(`Successfully copied '${doc.name}' to folder ${folderId}`);
            } catch (error: any) {
                // Log the error but don't fail the whole sync process
                console.error(`Error copying template ${doc.name} (ID: ${templateId}):`, error.message);
            }
        } else {
            console.warn(`Template environment variable ${doc.envKey} not set. Skipping document.`);
        }
    }
}


/**
 * Orchestrates the creation of a client folder and sheet, then updates the client's record in Firestore.
 * This is designed to be called as a server action from the client-side.
 * @param clientId The ID of the client document in Firestore.
 * @param clientName The name of the client, used for folder/sheet titles.
 */
export async function syncClientToDrive(clientId: string, clientName: string): Promise<void> {
    // Guard clause to handle failed Firebase Admin initialization
    if (!firestoreAdmin) {
        console.error("Firebase Admin not initialized, cannot sync client to Drive.");
        throw new Error("A conexão com o servidor de dados falhou. Verifique a configuração do servidor.");
    }
    
    try {
        const { drive, sheets } = await getGoogleApiClientsForUser();

        const folderId = await createClientFolder(drive, clientName);
        if (!folderId) {
            throw new Error('Falha ao criar pasta no Google Drive.');
        }

        await createClientKitFromTemplates(drive, clientName, folderId);

        const sheetId = await createClientSheet(sheets, clientName);
        if (!sheetId) {
            throw new Error('Falha ao criar planilha no Google Sheets.');
        }
        
        // Move the sheet into the newly created folder
        const file = await drive.files.get({
            fileId: sheetId,
            fields: 'parents',
            supportsAllDrives: true, 
        });
        const previousParents = file.data.parents ? file.data.parents.join(',') : '';

        await drive.files.update({
            fileId: sheetId,
            addParents: folderId,
            removeParents: previousParents,
            fields: 'id, parents',
            supportsAllDrives: true,
        });
        console.log('Moved Sheet into Client Folder.');
        
        // Update the client document in Firestore with the new IDs
        const clientRef = firestoreAdmin.collection('clients').doc(clientId);
        await clientRef.update({
            driveFolderId: folderId,
            sheetId: sheetId,
            updatedAt: new Date(),
        });

    } catch (error: any) {
        console.error("Error in syncClientToDrive:", error);
        // Re-throw with a clean error message to avoid Next.js redacting it in production.
        throw new Error(error.message || 'Ocorreu um erro desconhecido durante a sincronização com o Google Drive.');
    }
}


/**
 * Creates a subfolder for a specific legal process within the client's main Drive folder.
 * @param processId The ID of the process document in Firestore.
 */
export async function syncProcessToDrive(processId: string): Promise<void> {
    if (!firestoreAdmin) {
        throw new Error("A conexão com o servidor de dados falhou. Verifique a configuração do servidor.");
    }

    try {
        // 1. Get process and client data
        const processRef = firestoreAdmin.collection('processes').doc(processId);
        const processDoc = await processRef.get();
        if (!processDoc.exists) {
            throw new Error('Processo não encontrado.');
        }
        const processData = processDoc.data()!;

        if (processData.driveFolderId) {
             console.log("Process folder already exists.");
             return;
        }

        const clientRef = firestoreAdmin.collection('clients').doc(processData.clientId);
        const clientDoc = await clientRef.get();
        if (!clientDoc.exists) {
            throw new Error('Cliente associado ao processo não encontrado.');
        }
        const clientData = clientDoc.data()!;

        if (!clientData.driveFolderId) {
            throw new Error('O cliente principal precisa ser sincronizado com o Drive primeiro.');
        }

        // 2. Get Google API clients
        const { drive } = await getGoogleApiClientsForUser();

        // 3. Create process sub-folder
        const folderName = `${processData.name} - ${processData.processNumber || 'S-N'}`.replace(/[\/\\?%*:|"<>]/g, '-');
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [clientData.driveFolderId],
        };
        
        const folder = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
            supportsAllDrives: true,
        });
        const folderId = folder.data.id;
        if (!folderId) {
            throw new Error('Falha ao criar a subpasta do processo no Google Drive.');
        }

        // 4. Update process document with folder ID
        await processRef.update({
            driveFolderId: folderId,
            updatedAt: new Date(),
        });
        
    } catch (error: any) {
        console.error("Error in syncProcessToDrive:", error);
        throw new Error(error.message || 'Ocorreu um erro desconhecido durante a sincronização do processo.');
    }
}
