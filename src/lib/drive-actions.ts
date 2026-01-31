'use server';

import { drive_v3 } from 'googleapis';
import { getGoogleApiClientsForUser } from './drive';

export async function listFiles(folderId: string, userId: string): Promise<drive_v3.Schema$File[]> {
    try {
        const { drive } = await getGoogleApiClientsForUser(userId);
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, webViewLink, iconLink, createdTime)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
        return res.data.files || [];
    } catch (error: any) {
        console.error('Error listing files from Google Drive:', error);
        throw new Error(error.message || 'Ocorreu um erro desconhecido ao listar os arquivos do Google Drive.');
    }
}

export async function uploadFile(
    folderId: string,
    fileName: string,
    mimeType: string,
    fileContentBase64: string,
    userId: string
): Promise<drive_v3.Schema$File> {
    try {
        const { drive } = await getGoogleApiClientsForUser(userId);
        
        // Use Buffer for the body as expected by the googleapis library
        const media = {
            mimeType: mimeType,
            body: Buffer.from(fileContentBase64, 'base64'),
        };
        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };
        const file = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, mimeType, webViewLink, iconLink, createdTime',
            supportsAllDrives: true,
        });
        
        if (!file.data) {
            throw new Error('A API do Google não retornou dados do arquivo após o upload.');
        }

        return file.data;
    } catch (error: any) {
        console.error('Error uploading file to Google Drive:', error);
        throw new Error(error.message || 'Ocorreu um erro desconhecido ao fazer upload do arquivo para o Google Drive.');
    }
}


export async function deleteFile(fileId: string, userId: string): Promise<void> {
    try {
        const { drive } = await getGoogleApiClientsForUser(userId);
        await drive.files.delete({
            fileId: fileId,
            supportsAllDrives: true,
        });
    } catch (error: any) {
        console.error('Error deleting file from Google Drive:', error);
        throw new Error(error.message || 'Ocorreu um erro desconhecido ao excluir o arquivo do Google Drive.');
    }
}
