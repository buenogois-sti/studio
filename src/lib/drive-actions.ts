'use server';

import { drive_v3 } from 'googleapis';
import { getGoogleApiClientsForUser } from './drive';

/**
 * Lista arquivos de uma pasta, incluindo suporte a Drives Compartilhados.
 */
export async function listFiles(folderId: string): Promise<drive_v3.Schema$File[]> {
    try {
        const { drive } = await getGoogleApiClientsForUser();
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, webViewLink, iconLink, createdTime)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            orderBy: 'folder,name',
        });
        return res.data.files || [];
    } catch (error: any) {
        console.error('[DriveAction] Erro ao listar arquivos:', error.message);
        throw new Error('Não foi possível carregar os arquivos do Drive.');
    }
}

/**
 * Faz upload de um arquivo Base64 para uma pasta específica.
 */
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
        
        if (!file.data) throw new Error('A API não retornou dados após o upload.');

        return file.data;
    } catch (error: any) {
        console.error('[DriveAction] Erro no upload:', error.message);
        throw new Error(`Falha ao enviar arquivo: ${error.message}`);
    }
}

/**
 * Exclui um arquivo permanentemente.
 */
export async function deleteFile(fileId: string): Promise<void> {
    try {
        const { drive } = await getGoogleApiClientsForUser();
        await drive.files.delete({
            fileId: fileId,
            supportsAllDrives: true,
        });
    } catch (error: any) {
        console.error('[DriveAction] Erro ao excluir:', error.message);
        throw new Error('Não foi possível remover o item do Drive.');
    }
}

/**
 * Renomeia um arquivo ou pasta.
 */
export async function renameFile(fileId: string, newName: string): Promise<drive_v3.Schema$File> {
    if (!newName) throw new Error('O novo nome é obrigatório.');
    
    try {
        const { drive } = await getGoogleApiClientsForUser();
        const response = await drive.files.update({
            fileId: fileId,
            requestBody: { name: newName },
            fields: 'id, name, mimeType, webViewLink, iconLink, createdTime',
            supportsAllDrives: true,
        });
        
        if (!response.data) throw new Error('Falha na resposta da API de renomeação.');

        return response.data;
    } catch (error: any) {
        console.error('[DriveAction] Erro ao renomear:', error.message);
        throw new Error('Erro ao atualizar o nome do item no Drive.');
    }
}

/**
 * Cria uma nova pasta.
 */
export async function createFolder(parentId: string, folderName: string): Promise<drive_v3.Schema$File> {
    if (!folderName) throw new Error('O nome da pasta é obrigatório.');
    
    try {
        const { drive } = await getGoogleApiClientsForUser();
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        };
        const file = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id, name, mimeType, webViewLink, createdTime',
            supportsAllDrives: true,
        });

        if (!file.data) throw new Error('Falha na criação da pasta.');

        return file.data;
    } catch (error: any) {
        console.error('[DriveAction] Erro ao criar pasta:', error.message);
        throw new Error('Erro ao criar pasta no Drive.');
    }
}

/**
 * Copia um arquivo para um novo local (usado na geração de rascunhos).
 */
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
        
        if (!res.data) throw new Error('A API não retornou dados da cópia.');
        
        return res.data;
    } catch (error: any) {
        console.error('[DriveAction] Erro ao copiar arquivo:', error.message);
        throw new Error(`Falha ao copiar modelo no Drive: ${error.message}`);
    }
}
