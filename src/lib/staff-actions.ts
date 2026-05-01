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
            admissionDate: data.admissionDate ? Timestamp.fromDate(new Date(data.admissionDate + (typeof data.admissionDate === 'string' && !data.admissionDate.includes('T') ? 'T12:00:00' : ''))) : null,
            birthDate: data.birthDate ? Timestamp.fromDate(new Date(data.birthDate + (typeof data.birthDate === 'string' && !data.birthDate.includes('T') ? 'T12:00:00' : ''))) : null,
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
            admissionDate: data.admissionDate ? Timestamp.fromDate(new Date(data.admissionDate + (typeof data.admissionDate === 'string' && !data.admissionDate.includes('T') ? 'T12:00:00' : ''))) : null,
            resignationDate: data.resignationDate ? Timestamp.fromDate(new Date(data.resignationDate + (typeof data.resignationDate === 'string' && !data.resignationDate.includes('T') ? 'T12:00:00' : ''))) : null,
            birthDate: data.birthDate ? Timestamp.fromDate(new Date(data.birthDate + (typeof data.birthDate === 'string' && !data.birthDate.includes('T') ? 'T12:00:00' : ''))) : null,
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

function serializeStaff(doc: any) {
  const data = doc.data();
  if (!data) return null;

  // Converte Timestamps para strings ISO para evitar erro de serialização no Next.js
  const serialized = { ...data, id: doc.id };

  if (data.createdAt instanceof Timestamp) {
    serialized.createdAt = data.createdAt.toDate().toISOString();
  }
  if (data.updatedAt instanceof Timestamp) {
    serialized.updatedAt = data.updatedAt.toDate().toISOString();
  }
  if (data.admissionDate instanceof Timestamp) {
    serialized.admissionDate = data.admissionDate.toDate().toISOString();
  }
  if (data.birthDate instanceof Timestamp) {
    serialized.birthDate = data.birthDate.toDate().toISOString();
  }

  return serialized;
}

export async function searchStaff(query: string): Promise<any[]> {
  if (!query || query.length < 2) return [];
  if (!firestoreAdmin)
    throw new Error("A conexão com o servidor de dados falhou.");

  try {
    const staffSnapshot = await firestoreAdmin
      .collection("staff")
      .orderBy("updatedAt", "desc")
      .limit(100)
      .get();

    const textQuery = query.toLowerCase();

    return staffSnapshot.docs
      .map((doc) => serializeStaff(doc))
      .filter((member: any) => {
        if (!member) return false;
        const fullName =
          `${member.firstName} ${member.lastName}`.toLowerCase();
        return (
          fullName.includes(textQuery) ||
          (member.documentCPF || "").includes(textQuery)
        );
      })
      .slice(0, 10);
  } catch (error) {
    console.error("[searchStaff] Erro:", error);
    return [];
  }
}
