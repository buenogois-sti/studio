'use server';

import { firestoreAdmin } from '@/firebase/admin';
import { getGoogleApiClientsForUser } from './drive';
import { format } from 'date-fns';

const COLLECTIONS_TO_BACKUP = [
    'users',
    'clients',
    'processes',
    'hearings',
    'financial_events',
    'financial_titles',
    'staff',
    'system_settings',
    'document_templates'
];

async function findOrCreateBackupFolder(drive: any): Promise<string> {
    const folderName = 'LexFlow Backups';
    try {
        const res = await drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and 'root' in parents and trashed=false`,
            fields: 'files(id)',
            pageSize: 1,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
            console.log(`Found backup folder with ID: ${res.data.files[0].id}`);
            return res.data.files[0].id;
        }

        console.log("Backup folder not found, creating it.");
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['root'],
        };
        const file = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
            supportsAllDrives: true,
        });
        
        if (!file.data.id) {
             throw new Error('Could not create backup folder in Google Drive.');
        }
        console.log(`Created backup folder with ID: ${file.data.id}`);
        return file.data.id;
    } catch (error: any) {
        console.error('Error finding or creating backup folder:', error.message);
        throw new Error('Falha ao localizar ou criar la pasta de backups no Google Drive.');
    }
}


export async function triggerManualBackup(): Promise<{ fileLink: string }> {
    if (!firestoreAdmin) {
        throw new Error('A conexão com o servidor de dados falhou.');
    }

    try {
        const backupData: Record<string, any[]> = {};
        
        for (const collectionName of COLLECTIONS_TO_BACKUP) {
            const snapshot = await firestoreAdmin.collection(collectionName).get();
            backupData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        // Note: This simple implementation does not handle sub-collections.

        const backupJsonString = JSON.stringify(backupData, null, 2);
        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
        const fileName = `lexflow-backup-${timestamp}.json`;

        const { drive } = await getGoogleApiClientsForUser();

        const backupFolderId = await findOrCreateBackupFolder(drive);

        const fileMetadata = {
            name: fileName,
            parents: [backupFolderId],
            mimeType: 'application/json',
        };
        const media = {
            mimeType: 'application/json',
            body: backupJsonString,
        };

        const file = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id, webViewLink',
            supportsAllDrives: true,
        });
        
        if (!file.data.webViewLink) {
             throw new Error('Falha ao obter o link do arquivo de backup após o upload.');
        }

        return { fileLink: file.data.webViewLink };

    } catch (error: any) {
        console.error('Error during manual backup process:', error);
        throw new Error(error.message || 'Ocorreu um erro desconhecido durante o processo de backup.');
    }
}
