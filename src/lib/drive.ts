'use server';

import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

// This function creates and returns an authenticated client that will
// automatically use Application Default Credentials (ADC).
function getAuthClient() {
  const auth = new GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
  
  // The `auth.getClient()` method will automatically find and use the credentials
  // set up by `gcloud auth application-default login` in a local environment,
  // or the runtime's service account in a deployed Google Cloud environment.
  return auth;
}

// Creates a new folder within a specified parent folder in Google Drive.
async function createClientFolder(clientName: string) {
  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error('A variável de ambiente GOOGLE_DRIVE_ROOT_FOLDER_ID não está definida.');
  }
  
  const fileMetadata = {
    name: clientName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [rootFolderId],
  };

  try {
    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });
    console.log('Folder created with ID:', file.data.id);
    return file.data.id;
  } catch (error: any) {
    console.error('Error creating Google Drive folder:', error);
    if (error.message && (error.message.includes('Insufficient Permission') || error.message.includes('permission'))) {
        throw new Error(`Permissão insuficiente para criar a pasta. Verifique se o e-mail autenticado tem permissão de "Editor" na pasta raiz do Google Drive (ID: ${rootFolderId}).`);
    }
    throw new Error(`Falha ao criar pasta no Google Drive: ${error.message}`);
  }
}

// Creates a new Google Sheet for the client.
async function createClientSheet(clientName: string) {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

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
        throw new Error(`Falha ao criar planilha no Google Sheets: ${error.message}`);
    }
}

// Orchestrates the creation of both the folder and the sheet.
export async function createClientFolderAndSheet(clientName: string): Promise<{ folderId: string | null | undefined, sheetId: string | null | undefined }> {
    try {
        const folderId = await createClientFolder(clientName);
        const sheetId = await createClientSheet(clientName);
        
        // Optionally, move the sheet into the newly created folder
        if (folderId && sheetId) {
            const auth = getAuthClient();
            const drive = google.drive({ version: 'v3', auth });
            
            // Retrieve the file to update its parents
            const file = await drive.files.get({
                fileId: sheetId,
                fields: 'parents'
            });
            const previousParents = file.data.parents ? file.data.parents.join(',') : '';

            await drive.files.update({
                fileId: sheetId,
                addParents: folderId,
                removeParents: previousParents,
                fields: 'id, parents'
            });
             console.log('Moved Sheet into Client Folder.');
        }

        return { folderId, sheetId };
    } catch (error) {
        console.error("Error in createClientFolderAndSheet:", error);
        // In a real app, you might want to implement cleanup logic here
        // (e.g., delete the folder if sheet creation fails).
        throw error;
    }
}
