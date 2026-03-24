
'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { ChecklistTemplate, ChecklistExecution } from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notification-actions';

/**
 * Salva ou atualiza um modelo de checklist.
 */
export async function upsertChecklistTemplate(data: Partial<ChecklistTemplate>) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') throw new Error('Apenas administradores podem gerenciar modelos.');

  try {
    const id = data.id || firestoreAdmin.collection('checklist_templates').doc().id;
    const ref = firestoreAdmin.collection('checklist_templates').doc(id);

    const payload = {
      ...data,
      id,
      isActive: data.isActive ?? true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(data.id ? {} : { 
        createdAt: FieldValue.serverTimestamp(),
        createdBy: session.user.id,
        createdByName: session.user.name || 'Admin'
      }),
    };

    await ref.set(payload, { merge: true });
    revalidatePath('/dashboard/checklists');
    return { success: true, id };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Alterna o status de um modelo de checklist.
 */
export async function toggleChecklistStatus(id: string, currentStatus: boolean) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') throw new Error('Não autorizado.');

  try {
    await firestoreAdmin.collection('checklist_templates').doc(id).update({
      isActive: !currentStatus,
      updatedAt: FieldValue.serverTimestamp()
    });
    revalidatePath('/dashboard/checklists');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Exclui um modelo de checklist.
 */
export async function deleteChecklistTemplate(id: string) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') throw new Error('Não autorizado.');

  try {
    await firestoreAdmin.collection('checklist_templates').doc(id).delete();
    revalidatePath('/dashboard/checklists');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Registra a execução de um checklist.
 */
export async function saveChecklistExecution(data: Omit<ChecklistExecution, 'id' | 'executedAt' | 'userId' | 'userName'>) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const ref = firestoreAdmin.collection('checklist_executions').doc();
    const payload = {
      ...data,
      id: ref.id,
      userId: session.user.id,
      userName: session.user.name || 'Colaborador',
      executedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(payload);

    // Notificar administração sobre a execução concluída
    const admins = await firestoreAdmin.collection('users').where('role', '==', 'admin').get();
    for (const admin of admins.docs) {
      await createNotification({
        userId: admin.id,
        title: "Checklist Executado",
        description: `${session.user.name} completou o checklist: ${data.templateTitle}${data.processName ? ` para o processo ${data.processName}` : ''}.`,
        type: 'success',
        href: '/dashboard/checklists'
      });
    }

    revalidatePath('/dashboard/checklists');
    return { success: true, id: ref.id };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Injeta uma biblioteca de modelos pré-definidos no Laboratório de Matrizes.
 */
export async function injectLibrary() {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') throw new Error('Apenas administradores podem injetar a biblioteca.');

  const templates: Partial<ChecklistTemplate>[] = [
    {
      title: "APOSENTADORIA POR IDADE / TEMPO",
      category: "Entrevista de Triagem",
      legalArea: "Previdenciário",
      description: "Roteiro essencial para triagem de benefícios programáveis do RGPS.",
      items: [
        { id: "p1", label: "Possui NIT/PIS em mãos?", type: "YES_NO", required: true },
        { id: "p2", label: "Tempo de contribuição total (estimado)", type: "NUMBER", required: true },
        { id: "p3", label: "Possui períodos de atividade especial/rural?", type: "YES_NO_MAYBE", required: false },
        { id: "p4", label: "Já possui negativa do INSS?", type: "YES_NO", required: true }
      ]
    },
    {
      title: "DEFESA EXECUÇÃO FISCAL",
      category: "Entrevista de Triagem",
      legalArea: "Tributário",
      description: "Análise técnica de CDAs e viabilidade de Exceção de Pré-Executividade ou Embargos.",
      items: [
        { id: "t1", label: "Número da CDA identificado?", type: "YES_NO", required: true },
        { id: "t2", label: "Data da Citação", type: "TEXT", required: true },
        { id: "t3", label: "Houve bloqueio de valores (Bacenjud)?", type: "YES_NO", required: true },
        { id: "t4", label: "Tributo federal, estadual ou municipal?", type: "TEXT", required: true }
      ]
    },
    {
      title: "DIVORCIO E ALIMENTOS",
      category: "Entrevista de Triagem",
      legalArea: "Família",
      description: "Levantamento de regime de bens, prole e binômio necessidade-possibilidade.",
      items: [
        { id: "f1", label: "Regime de bens do casamento", type: "TEXT", required: true },
        { id: "f2", label: "Existem filhos menores ou incapazes?", type: "YES_NO", required: true },
        { id: "f3", label: "Há consenso sobre a partilha?", type: "YES_NO_MAYBE", required: true },
        { id: "f4", label: "Estimativa de gastos mensais dos filhos", type: "NUMBER", required: true }
      ]
    },
    {
      title: "ACAO INDENIZATORIA CIVEL",
      category: "Entrevista de Triagem",
      legalArea: "Cível",
      description: "Estruturação de fatos para responsabilidade civil e danos morais.",
      items: [
        { id: "c1", label: "Data do evento danoso", type: "TEXT", required: true },
        { id: "c2", label: "Possui provas documentais (Prints, Notas, Contratos)?", type: "YES_NO", required: true },
        { id: "c3", label: "Houve tentativa de solução administrativa?", type: "YES_NO", required: false },
        { id: "c4", label: "Valor estimado do prejuízo material", type: "NUMBER", required: false }
      ]
    },
    {
      title: "TRIAGEM INICIAL TRABALHISTA",
      category: "Entrevista de Triagem",
      legalArea: "Trabalhista",
      description: "Coleta rápida de dados contratuais para cálculo de verbas rescisórias.",
      items: [
        { id: "tr1", label: "Data de admissão e demissão", type: "TEXT", required: true },
        { id: "tr2", label: "Último salário base nominal", type: "NUMBER", required: true },
        { id: "tr3", label: "Realizava horas extras com frequência?", type: "YES_NO_MAYBE", required: true },
        { id: "tr4", label: "Recebeu todas as verbas rescisórias?", type: "YES_NO", required: true },
        { id: "tr5", label: "Trabalhava em condições insalubres?", type: "YES_NO_MAYBE", required: false }
      ]
    }
  ];

  try {
    const batch = firestoreAdmin.batch();
    const now = FieldValue.serverTimestamp();

    for (const data of templates) {
      const id = firestoreAdmin.collection('checklist_templates').doc().id;
      const ref = firestoreAdmin.collection('checklist_templates').doc(id);
      
      batch.set(ref, {
        ...data,
        id,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: session.user.id,
        createdByName: session.user.name || 'Admin',
      });
    }

    await batch.commit();
    revalidatePath('/dashboard/checklists');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
