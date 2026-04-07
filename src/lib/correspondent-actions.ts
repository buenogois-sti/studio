'use server';
import { firestoreAdmin } from '@/firebase/admin';

function serializeCorrespondent(doc: any) {
  const data = doc.data();
  if (!data) return null;

  const serialized = { ...data, id: doc.id };

  // Converte Timestamps para strings ISO
  if (data.createdAt && typeof data.createdAt.toDate === "function") {
    serialized.createdAt = data.createdAt.toDate().toISOString();
  }
  if (data.updatedAt && typeof data.updatedAt.toDate === "function") {
    serialized.updatedAt = data.updatedAt.toDate().toISOString();
  }

  return serialized;
}

export async function searchCorrespondents(query: string): Promise<any[]> {
  if (!query || query.length < 2) return [];
  if (!firestoreAdmin)
    throw new Error("A conexão com o servidor de dados falhou.");

  try {
    const snapshot = await firestoreAdmin
      .collection("correspondents")
      .orderBy("updatedAt", "desc")
      .limit(100)
      .get();

    const textQuery = query.toLowerCase();

    return snapshot.docs
      .map((doc) => serializeCorrespondent(doc))
      .filter((item: any) => {
        if (!item) return false;
        const name = (item.name || "").toLowerCase();
        const document = (item.document || "").toLowerCase();
        return name.includes(textQuery) || document.includes(textQuery);
      })
      .slice(0, 10);
  } catch (error) {
    console.error("[searchCorrespondents] Erro:", error);
    return [];
  }
}
