'use server';

import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = 'studio-7080106838-23904';

// This function creates and returns an authenticated client that will
// automatically use Application Default Credentials (ADC).
function getAuthClient() {
  const auth = new GoogleAuth({
    // Explicitly setting the project ID to resolve any ambiguity for ADC.
    projectId: PROJECT_ID,
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
      supportsAllDrives: true,
    });
    console.log('Folder created with ID:', file.data.id);
    return file.data.id;
  } catch (error: any) {
    console.error('Error creating Google Drive folder:', error);
    if (error.message && error.message.includes('Insufficient Permission')) {
        throw new Error(`Falha de permissão na API do Google Drive. Isso geralmente indica que a API do Google Drive não está ativada no seu projeto Google Cloud. Por favor, acesse o Console do Google Cloud, verifique se está no projeto correto ('${PROJECT_ID}') e ative a 'Google Drive API'. Erro original: ${error.message}`);
    }
    // Pass the original error message up, as it's the most specific clue we have.
    throw new Error(`Falha ao criar pasta no Google Drive. Erro da API: ${error.message}`);
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
        if (error.message && error.message.includes('Insufficient Permission')) {
            throw new Error(`Falha de permissão na API do Google Sheets. Verifique se a 'Google Sheets API' está ativada em seu projeto ('${PROJECT_ID}') no Google Cloud. Erro original: ${error.message}`);
        }
        throw new Error(`Falha ao criar planilha no Google Sheets. Erro da API: ${error.message}`);
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
        // In a real app, you might want to implement cleanup logic here
        // (e.g., delete the folder if sheet creation fails).
        throw error;
    }
}
