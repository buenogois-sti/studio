
'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { Lead, LeadStatus, LeadPriority, TimelineEvent, OpposingParty, Process } from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { getGoogleApiClientsForUser } from './drive';
import { formatISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Cria um novo lead na pauta de triagem com tarefas iniciais concluídas.
 */
export async function createLead(data: {
  clientId: string;
  lawyerId: string;
  title: string;
  legalArea: string;
  priority: LeadPriority;
  captureSource: string;
  referralName?: string;
  referralType?: string;
  isUrgent: boolean;
  prescriptionDate?: string;
  description?: string;
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const leadRef = firestoreAdmin.collection('leads').doc();
    
    // Buscar dados do cliente para denormalização (facilita a busca)
    const clientDoc = await firestoreAdmin.collection('clients').doc(data.clientId).get();
    const clientData = clientDoc.data();

    const prescriptionDate = data.prescriptionDate 
      ? Timestamp.fromDate(new Date(data.prescriptionDate))
      : undefined;

    const now = Timestamp.now();
    const payload: any = {
      clientId: data.clientId,
      clientName: clientData ? `${clientData.firstName} ${clientData.lastName}`.trim() : 'Cliente não identificado',
      clientDocument: clientData?.document || '',
      lawyerId: data.lawyerId,
      title: data.title,
      legalArea: data.legalArea,
      priority: data.priority,
      captureSource: data.captureSource,
      referralName: data.referralName || '',
      referralType: data.referralType || '',
      isUrgent: data.isUrgent,
      description: data.description || '',
      status: 'NOVO' as LeadStatus,
      opposingParties: [],
      completedTasks: [], 
      stageEntryDates: {
        'NOVO': now
      },
      createdAt: now,
      updatedAt: now,
    };

    if (prescriptionDate) {
      payload.prescriptionDate = prescriptionDate;
    }

    await leadRef.set(payload);

    if (data.lawyerId) {
      await createNotification({
        userId: data.lawyerId,
        title: "Novo Lead Designado",
        description: `Você foi encarregado de elaborar a ação: ${data.title}.`,
        type: data.isUrgent ? 'warning' : 'info',
        href: '/dashboard/leads'
      });
    }

    revalidatePath('/dashboard/leads');
    return { success: true, id: leadRef.id };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Atualiza campos específicos de um lead (Qualificação, Área, Advogado).
 */
export async function updateLeadDetails(id: string, data: Partial<Lead>) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  try {
    const now = Timestamp.now();
    await firestoreAdmin.collection('leads').doc(id).update({
      ...data,
      updatedAt: now
    });
    revalidatePath('/dashboard/leads');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Atualiza o status (fase) do lead no Kanban e registra data de entrada.
 */
export async function updateLeadStatus(id: string, status: LeadStatus) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  try {
    const now = Timestamp.now();
    await firestoreAdmin.collection('leads').doc(id).update({
      status,
      [`stageEntryDates.${status}`]: now,
      updatedAt: now
    });
    revalidatePath('/dashboard/leads');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Busca leads ativos por nome do cliente, documento ou título.
 */
export async function searchLeads(queryText: string): Promise<Lead[]> {
    if (!queryText || queryText.length < 2) return [];
    if (!firestoreAdmin) throw new Error("Servidor inacessível.");
    
    try {
        const q = queryText.trim().toLowerCase();
        // Busca leads ativos (não convertidos)
        const snapshot = await firestoreAdmin.collection('leads')
            .where('status', '!=', 'CONVERTIDO')
            .orderBy('status') // Necessário para o filtro de '!='
            .orderBy('updatedAt', 'desc')
            .limit(200)
            .get();
        
        const results = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Lead))
            .filter(l => 
                l.title.toLowerCase().includes(q) || 
                (l.clientName || '').toLowerCase().includes(q) ||
                (l.clientDocument || '').includes(q)
            );

        return results.slice(0, 10);
    } catch (error) {
        console.error("Error searching leads:", error);
        return [];
    }
}

/**
 * Converte um Lead em um Processo ativo (Distribuição Processual).
 */
export async function convertLeadToProcess(leadId: string, data: {
  processNumber: string;
  court: string;
  courtBranch: string;
  caseValue: number;
  opposingParties: OpposingParty[];
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const leadRef = firestoreAdmin.collection('leads').doc(leadId);
    const leadDoc = await leadRef.get();
    if (!leadDoc.exists) throw new Error('Lead não encontrado.');
    
    const leadData = leadDoc.data() as Lead;
    if (leadData.status === 'CONVERTIDO') throw new Error('Este lead já foi convertido.');

    const clientRef = firestoreAdmin.collection('clients').doc(leadData.clientId);
    const processRef = firestoreAdmin.collection('processes').doc();
    
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'system',
      description: `DISTRIBUIÇÃO PROCESSUAL CONCLUÍDA: Convertido do CRM. CNJ: ${data.processNumber}. Vara: ${data.courtBranch} do ${data.court}. Valor: R$ ${data.caseValue.toFixed(2)}.`,
      date: Timestamp.now() as any,
      authorName: session.user.name || 'Sistema'
    };

    const processPayload: Omit<Process, 'id'> = {
      clientId: leadData.clientId,
      clientName: leadData.clientName || '',
      clientDocument: leadData.clientDocument || '',
      name: leadData.title,
      legalArea: leadData.legalArea,
      description: leadData.description || '',
      status: 'Ativo',
      processNumber: data.processNumber,
      court: data.court,
      courtBranch: data.courtBranch,
      caseValue: data.caseValue,
      leadLawyerId: leadData.lawyerId,
      opposingParties: data.opposingParties || [],
      driveFolderId: leadData.driveFolderId || '',
      timeline: [timelineEvent],
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    };

    const batch = firestoreAdmin.batch();
    batch.set(processRef, processPayload);
    batch.update(leadRef, { status: 'CONVERTIDO', updatedAt: Timestamp.now() });
    batch.update(clientRef, { status: 'active', updatedAt: Timestamp.now() });

    await batch.commit();

    revalidatePath('/dashboard/processos');
    revalidatePath('/dashboard/leads');
    
    return { success: true, processId: processRef.id };
  } catch (error: any) {
    console.error('[convertLeadToProcess] Error:', error);
    throw new Error(error.message || 'Falha ao converter lead.');
  }
}

/**
 * Agenda uma entrevista de atendimento no Google Agenda do advogado.
 */
export async function scheduleLeadInterview(leadId: string, data: {
  date: string;
  time: string;
  location: string;
  notes?: string;
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const leadRef = firestoreAdmin.collection('leads').doc(leadId);
    const leadDoc = await leadRef.get();
    const leadData = leadDoc.data() as Lead;

    if (!leadDoc.exists) throw new Error('Lead não encontrado.');

    const clientDoc = await firestoreAdmin.collection('clients').doc(leadData.clientId).get();
    const clientData = clientDoc.data();

    const { calendar } = await getGoogleApiClientsForUser();
    
    const startDateTime = new Date(`${data.date}T${data.time}`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1h de duração

    const eventDescription = [
      `📅 ENTREVISTA TÉCNICA DE TRIAGEM`,
      `Lead: ${leadData.title}`,
      `Cliente: ${clientData?.firstName} ${clientData?.lastName || ''}`,
      `WhatsApp: ${clientData?.mobile || 'N/A'}`,
      `Área: ${leadData.legalArea}`,
      ``,
      `📍 Local/Modo: ${data.location}`,
      `📝 Observações do Agendamento:`,
      `${data.notes || 'Sem observações.'}`,
      ``,
      `🔗 Link LexFlow: https://buenogois.com.br/dashboard/leads`,
      `🔐 ID Interno: ${leadId}`
    ].join('\n');

    const calendarEvent = {
      summary: `💬 Entrevista: ${clientData?.firstName} | ${leadData.title}`,
      location: data.location,
      description: eventDescription,
      start: { dateTime: formatISO(startDateTime), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: formatISO(endDateTime), timeZone: 'America/Sao_Paulo' },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'email', minutes: 1440 }
        ],
      },
    };

    const createdEvent = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: calendarEvent,
    });

    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'system',
      description: `ENTREVISTA AGENDADA: Para o dia ${format(startDateTime, 'dd/MM/yy')} às ${data.time}. Local: ${data.location}. Evento criado na agenda Google.`,
      date: Timestamp.now() as any,
      authorName: session.user.name || 'Sistema'
    };

    const completedTasks = leadData.completedTasks || [];
    if (!completedTasks.includes('Entrevista técnica realizada')) {
      completedTasks.push('Entrevista técnica realizada');
    }

    await leadRef.update({
      timeline: FieldValue.arrayUnion(timelineEvent),
      completedTasks,
      updatedAt: FieldValue.serverTimestamp()
    });

    revalidatePath('/dashboard/leads');
    return { success: true, googleEventId: createdEvent.data.id };
  } catch (error: any) {
    console.error('[scheduleLeadInterview] Error:', error);
    throw new Error(error.message || 'Falha ao agendar compromisso.');
  }
}
