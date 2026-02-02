
'use server';

import { initializeAdminDriveStructure as initDrive } from './drive';

export async function initializeAdminDriveStructure() {
    return initDrive();
}
