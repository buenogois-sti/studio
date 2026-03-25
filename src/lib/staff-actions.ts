'use server';
import { firestoreAdmin } from '@/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export async function createStaff(data: any) {
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    try {
        const staffRef = firestoreAdmin.collection('staff').doc();
        const payload = {
            ...data,
            id: staffRef.id,
            admissionDate: data.admissionDate ? Timestamp.fromDate(new Date(data.admissionDate)) : null,
            birthDate: data.birthDate ? Timestamp.fromDate(new Date(data.birthDate)) : null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };
        await staffRef.set(payload);
        revalidatePath('/dashboard/staff');
        revalidatePath('/dashboard/rh');
        return { success: true, id: staffRef.id };
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function updateStaff(id: string, data: any) {
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    try {
        const staffRef = firestoreAdmin.collection('staff').doc(id);
        const payload = {
            ...data,
            admissionDate: data.admissionDate ? Timestamp.fromDate(new Date(data.admissionDate)) : null,
            resignationDate: data.resignationDate ? Timestamp.fromDate(new Date(data.resignationDate)) : null,
            birthDate: data.birthDate ? Timestamp.fromDate(new Date(data.birthDate)) : null,
            updatedAt: FieldValue.serverTimestamp(),
        };
        await staffRef.update(payload);
        revalidatePath('/dashboard/staff');
        revalidatePath('/dashboard/rh');
        return { success: true };
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function processPayroll(monthKey: string, entries: any[]) {
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    try {
        const batch = firestoreAdmin.batch();
        
        for (const entry of entries) {
            const payrollRef = firestoreAdmin.collection('payroll').doc();
            const financialRef = firestoreAdmin.collection('financial_titles').doc();
            
            const payload = {
                ...entry,
                id: payrollRef.id,
                monthKey,
                status: 'APPROVED',
                financialTitleId: financialRef.id,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            };
            
            batch.set(payrollRef, payload);
            
            // Create corresponding financial title (DEBIT)
            batch.set(financialRef, {
                description: `Folha de Pagamento - ${entry.staffName} (${monthKey})`,
                type: 'DESPESA',
                origin: 'SALARIOS_PROLABORE',
                value: entry.netValue,
                dueDate: Timestamp.fromDate(new Date()),
                status: 'PENDENTE',
                beneficiaryName: entry.staffName,
                notes: `Automático via Módulo RH - Mês ${monthKey}`,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
        
        await batch.commit();
        revalidatePath('/dashboard/rh');
        revalidatePath('/dashboard/financeiro');
        return { success: true };
    } catch (error: any) {
        throw new Error(error.message);
    }
}
