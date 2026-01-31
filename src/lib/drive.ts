'use server';

import { google, type drive_v3, type sheets_v4 } from 'googleapis';
import { firestoreAdmin } from '@/firebase/admin';
import { oauth2Client } from '@/lib/google-auth';

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

interface GoogleApiClients {
    drive: drive_v3.Drive;
    sheets: sheets_v4.Sheets;
}

/**
 * Creates authenticated Google API clients for a specific user.
 * It fetches the user's refresh token, validates it by getting a new access token,
 * and handles invalid tokens by deleting them and throwing a user-friendly error.
 * @param userId The UID of the user to authenticate as.
 * @returns An object containing authenticated Drive and Sheets clients.
 */
async function getGoogleApiClientsForUser(userId: string): Promise<GoogleApiClients> {
    const userDocRef = firestoreAdmin.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();
    const refreshToken = userData?.googleRefreshToken;

    if (!refreshToken) {
        throw new Error('Usuário não conectado ao Google. Por favor, vá para a página de Configurações e conecte sua conta.');
    }
    
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    try {
        // Proactively refresh the access token to validate the refresh token.
        // This will throw an 'invalid_grant' error if the refresh token is bad.
        const { token } = await oauth2Client.getAccessToken();
        if (!token) {
            // This case is unlikely if getAccessToken() succeeds, but it's a safe check.
            throw new Error('Failed to obtain a new access token from Google.');
        }
    } catch (error: any) {
        console.error("Failed to refresh access token, likely due to an invalid refresh token:", error.message);
        
        // The token is invalid, so we remove it from the database to force re-authentication.
        // This is a self-healing mechanism.
        await userDocRef.update({
            googleRefreshToken: firestoreAdmin.FieldValue.delete(),
        });
        
        // Inform the user what happened and how to fix it.
        throw new Error('Sua conexão com o Google expirou ou se tornou inválida. Por favor, vá para Configurações e conecte sua conta novamente.');
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
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

// Orchestrates the creation of both the folder and the sheet, using user-specific auth.
export async function createClientFolderAndSheet(clientName: string, userId: string): Promise<{ folderId: string | null | undefined, sheetId: string | null | undefined }> {
    try {
        const { drive, sheets } = await getGoogleApiClientsForUser(userId);

        const folderId = await createClientFolder(drive, clientName);
        const sheetId = await createClientSheet(sheets, clientName);
        
        // Move the sheet into the newly created folder
        if (folderId && sheetId) {
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
        }

        return { folderId, sheetId };
    } catch (error) {
        console.error("Error in createClientFolderAndSheet:", error);
        // Re-throw the specific error from the failing function.
        throw error;
    }
}
