'use server';

import { drive_v3 } from 'googleapis';
import { getGoogleApiClientsForUser } from './drive';

export async function listFiles(folderId: string): Promise<drive_v3.Schema$File[]> {
    try {
        const { drive } = await getGoogleApiClientsForUser();
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
    fileContentBase64: string
): Promise<drive_v3.Schema$File> {
    try {
        const { drive } = await getGoogleApiClientsForUser();
        
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


export async function deleteFile(fileId: string): Promise<void> {
    try {
        const { drive } = await getGoogleApiClientsForUser();
        await drive.files.delete({
            fileId: fileId,
            supportsAllDrives: true,
        });
    } catch (error: any) {
        console.error('Error deleting file from Google Drive:', error);
        throw new Error(error.message || 'Ocorreu um erro desconhecido ao excluir o arquivo do Google Drive.');
    }
}


export async function renameFile(fileId: string, newName: string): Promise<drive_v3.Schema$File> {
    if (!newName) {
        throw new Error('O novo nome não pode ser vazio.');
    }
    try {
        const { drive } = await getGoogleApiClientsForUser();
        const response = await drive.files.update({
            fileId: fileId,
            requestBody: {
                name: newName,
            },
            fields: 'id, name, mimeType, webViewLink, iconLink, createdTime',
            supportsAllDrives: true,
        });
        
        if (!response.data) {
             throw new Error('A API do Google não retornou dados do arquivo após a renomeação.');
        }

        return response.data;
    } catch (error: any) {
        console.error('Error renaming file in Google Drive:', error);
        throw new Error(error.message || 'Ocorreu um erro desconhecido ao renomear o arquivo.');
    }
}

export async function createFolder(parentId: string, folderName: string): Promise<drive_v3.Schema$File> {
    if (!folderName) {
        throw new Error('O nome da pasta não pode ser vazio.');
    }
    try {
        const { drive } = await getGoogleApiClientsForUser();
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        };
        const file = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id, name, mimeType, webViewLink, iconLink, createdTime',
            supportsAllDrives: true,
        });

        if (!file.data) {
            throw new Error('A API do Google não retornou dados da pasta após a criação.');
        }

        return file.data;
    } catch (error: any) {
        console.error('Error creating folder in Google Drive:', error);
        throw new Error(error.message || 'Ocorreu um erro desconhecido ao criar a pasta no Google Drive.');
    }
}

export async function copyFile(fileId: string, name: string, parentId: string): Promise<drive_v3.Schema$File> {
    try {
        const { drive } = await getGoogleApiClientsForUser();
        const res = await drive.files.copy({
            fileId,
            requestBody: {
                name,
                parents: [parentId],
            },
            fields: 'id, name, webViewLink',
            supportsAllDrives: true,
        });
        return res.data;
    } catch (error: any) {
        console.error('Error copying file in Drive:', error);
        throw new Error(error.message || 'Erro ao copiar arquivo no Drive.');
    }
}
