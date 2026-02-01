'use server';
import { firestoreAdmin } from '@/firebase/admin';
import type { FinancialTitle, Process } from './types';
import { FieldValue } from 'firebase-admin/firestore';

export async function createFinancialTitle(data: Omit<FinancialTitle, 'id' | 'clientId' | 'paymentDate'> & { processId: string }): Promise<{ success: boolean; message: string }> {
    if (!firestoreAdmin) {
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    try {
        const processDoc = await firestoreAdmin.collection('processes').doc(data.processId).get();
        if (!processDoc.exists) {
            throw new Error("Processo associado não encontrado.");
        }
        const processData = processDoc.data() as Process;

        const newTitle: Omit<FinancialTitle, 'id'> = {
            ...data,
            clientId: processData.clientId,
        };

        await firestoreAdmin.collection('financial_titles').add(newTitle);

        return { success: true, message: 'Título financeiro criado com sucesso!' };
    } catch (error: any) {
        console.error("Error creating financial title:", error);
        throw new Error(error.message || 'Falha ao criar o título financeiro.');
    }
}

export async function updateFinancialTitleStatus(
    titleId: string, 
    status: 'PAGO' | 'PENDENTE' | 'ATRASADO'
): Promise<{ success: boolean; message: string }> {
    if (!firestoreAdmin) {
        throw new Error("A conexão com o servidor de dados falhou.");
    }
    try {
        const titleRef = firestoreAdmin.collection('financial_titles').doc(titleId);

        const updateData: { status: string; paymentDate?: FieldValue } = { status };
        
        if (status === 'PAGO') {
            // Set paymentDate to the time of the update on the server
            updateData.paymentDate = FieldValue.serverTimestamp();
        } else {
            // If status is changed back to 'PENDENTE' or 'ATRASADO', remove the paymentDate
            updateData.paymentDate = FieldValue.delete();
        }

        await titleRef.update(updateData);
        
        return { success: true, message: 'Status do título atualizado com sucesso!' };

    } catch (error: any) {
        console.error("Error updating financial title status:", error);
        throw new Error(error.message || 'Falha ao atualizar o status do título.');
    }
}
