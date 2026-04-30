
'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { Lead, LeadStatus, LeadPriority, TimelineEvent, OpposingParty, Process } from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { getGoogleApiClientsForUser, getGoogleClientsForStaff } from './drive';
import { formatISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'http://localhost:9002';

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
  interviewerId?: string;
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const leadRef = firestoreAdmin.collection('leads').doc();
    
    // Buscar dados do cliente para denormalização
    const clientDoc = await firestoreAdmin.collection('clients').doc(data.clientId).get();
    const clientData = clientDoc.data();

    const prescriptionDate = data.prescriptionDate 
      ? Timestamp.fromDate(new Date(data.prescriptionDate))
      : undefined;

    const now = Timestamp.now();
    
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'system',
      description: `TRIAGEM INICIADA: Lead criado por ${session.user.name}.`,
      date: now as any,
      authorName: session.user.name || 'Sistema'
    };

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
      interviewerId: data.interviewerId || '',
      status: 'NOVO' as LeadStatus,
      opposingParties: [],
      completedTasks: ['Qualificação do Lead', 'Identificação da área jurídica', 'Direcionamento ao Adv. Responsável'], 
      stageEntryDates: {
        'NOVO': now
      },
      timeline: [timelineEvent],
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
 * Registra mudanças na timeline para rastreabilidade.
 */
export async function updateLeadDetails(id: string, data: Partial<Lead>) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  
  try {
    const now = Timestamp.now();
    const leadRef = firestoreAdmin.collection('leads').doc(id);
    const leadDoc = await leadRef.get();
    const currentData = leadDoc.data() as Lead;

    const timelineEvents: TimelineEvent[] = [];

    // Rastrear mudança de advogado
    if (data.lawyerId && data.lawyerId !== currentData.lawyerId) {
      const staffDoc = await firestoreAdmin.collection('staff').doc(data.lawyerId).get();
      const staffName = staffDoc.exists ? `${staffDoc.data()?.firstName} ${staffDoc.data()?.lastName}` : 'Novo Advogado';
      timelineEvents.push({
        id: uuidv4(),
        type: 'system',
        description: `DIRECIONAMENTO: Atendimento redirecionado para ${staffName} por ${session?.user?.name || 'Sistema'}.`,
        date: now as any,
        authorName: session?.user?.name || 'Sistema'
      });
    }

    // Rastrear mudança de área
    if (data.legalArea && data.legalArea !== currentData.legalArea) {
      timelineEvents.push({
        id: uuidv4(),
        type: 'system',
        description: `ÁREA ATUALIZADA: Área jurídica alterada de "${currentData.legalArea}" para "${data.legalArea}".`,
        date: now as any,
        authorName: session?.user?.name || 'Sistema'
      });
    }

    // Rastrear mudança de entrevistador
    if (data.interviewerId && data.interviewerId !== currentData.interviewerId) {
      const staffDoc = await firestoreAdmin.collection('staff').doc(data.interviewerId).get();
      const staffName = staffDoc.exists ? staffDoc.data()?.firstName : 'Novo Entrevistador';
      timelineEvents.push({
        id: uuidv4(),
        type: 'system',
        description: `TRIAGEM: Entrevistador alterado para ${staffName} por ${session?.user?.name || 'Sistema'}.`,
        date: now as any,
        authorName: session?.user?.name || 'Sistema'
      });
    }

    const updatePayload: any = {
      ...data,
      updatedAt: now
    };

    if (timelineEvents.length > 0) {
      updatePayload.timeline = FieldValue.arrayUnion(...timelineEvents);
    }

    await leadRef.update(updatePayload);

    // Notificar advogado sobre novas tarefas completadas por terceiros
    const currentTasks = currentData.completedTasks || [];
    if (data.completedTasks && Array.isArray(data.completedTasks)) {
      if (data.completedTasks.length > currentTasks.length) {
        if (currentData.lawyerId && currentData.lawyerId !== session?.user?.id) {
          const newTasks = data.completedTasks.filter(t => !currentTasks.includes(t));
          if (newTasks.length > 0) {
            await createNotification({
              userId: currentData.lawyerId,
              title: "Triagem: Tarefa Concluída",
              description: `A tarefa "${newTasks[0]}" foi concluída por ${session?.user?.name || 'Sistema'} no lead "${currentData.title}".`,
              type: 'info',
              href: '/dashboard/leads'
            });
          }
        }
      }
    }

    revalidatePath('/dashboard/leads');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Atualiza o status (fase) do lead no Kanban e registra data de entrada.
 * Notifica o advogado responsável (Compliance/Ciência) caso a ação seja feita por outro colaborador.
 */
export async function updateLeadStatus(id: string, status: LeadStatus) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  
  try {
    const now = Timestamp.now();
    const leadRef = firestoreAdmin.collection('leads').doc(id);
    const leadDoc = await leadRef.get();
    const leadData = leadDoc.exists ? (leadDoc.data() as Lead) : null;

    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'system',
      description: `MUDANÇA DE FASE: Movido para "${status}" por ${session?.user?.name || 'Sistema'}.`,
      date: now as any,
      authorName: session?.user?.name || 'Sistema'
    };

    await leadRef.update({
      status,
      [`stageEntryDates.${status}`]: now,
      timeline: FieldValue.arrayUnion(timelineEvent),
      updatedAt: now
    });

    if (leadData && leadData.lawyerId && leadData.lawyerId !== session?.user?.id) {
      await createNotification({
        userId: leadData.lawyerId,
        title: "Avanço no Fluxo (Triagem)",
        description: `O lead "${leadData.title}" avançou para a fase ${status} por ${session?.user?.name || 'Sistema'}.`,
        type: 'info',
        href: '/dashboard/leads'
      });
    }

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
  commissionStaffId?: string;
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
      commissionStaffId: data.commissionStaffId || null as any,
      opposingParties: data.opposingParties || [],
      driveFolderId: leadData.driveFolderId || '',
      timeline: [timelineEvent],
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    };

    const batch = firestoreAdmin.batch();
    batch.set(processRef, processPayload);
    batch.update(leadRef, { 
      status: 'CONVERTIDO', 
      updatedAt: Timestamp.now(),
      timeline: FieldValue.arrayUnion({
        id: uuidv4(),
        type: 'system',
        description: `LEAD CONVERTIDO: Processo protocolado sob o nº ${data.processNumber}. Atendimento encerrado no CRM.`,
        date: Timestamp.now() as any,
        authorName: session.user.name || 'Sistema'
      })
    });
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
  staffId: string;
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

    // Sincroniza usando a agenda do profissional SELECIONADO (Adv ou Entrevistador)
    const { calendar, tasks, targetEmail } = await getGoogleClientsForStaff(data.staffId);
    
    // Buscar info do staff selecionado para checar se é supervisionado
    const selectedStaffDoc = await firestoreAdmin.collection('staff').doc(data.staffId).get();
    const selectedStaffData = selectedStaffDoc.data();
    const isInterviewer = selectedStaffData?.role === 'intern'; // Ou lógica baseada em roles

    const startDateTime = new Date(`${data.date}T${data.time}`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1h de duração

    const eventDescription = [
      isInterviewer ? `⚠️ ATENÇÃO: ATENDIMENTO SUPERVISIONADO` : `💬 ENTREVISTA TÉCNICA DE TRIAGEM`,
      isInterviewer ? `Este atendimento deve seguir o DNA Bueno Gois sob supervisão do Dr. Responsável.` : ``,
      ``,
      `Lead: ${leadData.title}`,
      `Cliente: ${clientData?.firstName} ${clientData?.lastName || ''}`,
      `WhatsApp: ${clientData?.mobile || 'N/A'}`,
      `Área: ${leadData.legalArea}`,
      ``,
      `📍 Local/Modo: ${data.location}`,
      `📝 Notas da Triagem:`,
      `${data.notes || 'Sem observações adicionais.'}`,
      ``,
      `🔗 Link Bueno Gois Advogados: ${BASE_URL}/dashboard/leads`,
      `🔐 ID Interno: ${leadId}`
    ].join('\n');

    const isMeet = data.location.toLowerCase().includes('meet');

    const calendarEvent: any = {
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

    if (isMeet) {
      calendarEvent.conferenceData = {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      };
    }

    let createdEvent;
    try {
      createdEvent = await calendar.events.insert({
        calendarId: targetEmail || 'primary',
        requestBody: calendarEvent,
        conferenceDataVersion: isMeet ? 1 : 0,
      });
    } catch (error: any) {
      if (error.code === 404 || error.status === 404) {
        console.warn(`[Calendar] Alvo ${targetEmail} não encontrado. Fazendo fallback para primary.`);
        // Tenta novamente na agenda principal do token atual (fallback)
        calendarEvent.summary = `⚠️ [PENDÊNCIA SYNC: ${targetEmail}] ${calendarEvent.summary}`;
        createdEvent = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: calendarEvent,
          conferenceDataVersion: isMeet ? 1 : 0,
        });
      } else {
        throw error;
      }
    }

    const now = Timestamp.now();
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'system',
      description: `ENTREVISTA AGENDADA: Para o dia ${format(startDateTime, 'dd/MM/yy')} às ${data.time}. Local: ${data.location}. Evento sincronizado na agenda do advogado designado.`,
      date: now as any,
      authorName: session.user.name || 'Sistema'
    };

    const completedTasks = leadData.completedTasks || [];
    if (!completedTasks.includes('Entrevista técnica realizada')) {
      completedTasks.push('Entrevista técnica realizada');
    }

    // Move AUTOMATICAMENTE para fase de ATENDIMENTO
    await leadRef.update({
      status: 'ATENDIMENTO',
      [`stageEntryDates.ATENDIMENTO`]: now,
      timeline: FieldValue.arrayUnion(timelineEvent),
      completedTasks,
      interviewDate: data.date,
      interviewTime: data.time,
      updatedAt: now
    });

    // Notificar o profissional alvo
    await createNotification({
      userId: data.staffId,
      title: "Nova Entrevista na sua Pauta",
      description: `Um novo atendimento foi agendado para o lead: ${leadData.title}. Verifique sua agenda.`,
      type: 'hearing',
      href: '/dashboard/leads'
    });

    // COMPLIANCE: Notificar o advogado responsável original caso tenha sido agendado para outro
    if (leadData.lawyerId && leadData.lawyerId !== data.staffId) {
      await createNotification({
        userId: leadData.lawyerId,
        title: "Agenda de Terceiro: Entrevista Marcada",
        description: `Uma entrevista para o seu lead "${leadData.title}" foi agendada na pauta de ${selectedStaffData?.firstName}.`,
        type: 'info',
        href: '/dashboard/leads'
      });
    }

    revalidatePath('/dashboard/leads');
    return { success: true, googleEventId: createdEvent.data.id };
  } catch (error: any) {
    console.error('[scheduleLeadInterview] Error:', error);
    throw new Error(error.message || 'Falha ao agendar compromisso na agenda do advogado.');
  }
}

/**
 * Atualiza a análise de IA de um lead.
 */
export async function updateLeadAiAnalysis(leadId: string, analysis: Lead['aiAnalysis']) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const leadRef = firestoreAdmin.collection('leads').doc(leadId);
    
    await leadRef.update({
      aiAnalysis: {
        ...analysis,
        analyzedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath('/dashboard/leads');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Arquiva um lead (Muda para ABANDONADO) e registra na linha do tempo.
 */
export async function archiveLead(leadId: string, reason: string = 'Nenhum motivo informado') {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const leadRef = firestoreAdmin.collection('leads').doc(leadId);
    const leadDoc = await leadRef.get();
    if (!leadDoc.exists) throw new Error('Lead não encontrado.');

    const now = Timestamp.now();
    const leadData = leadDoc.data() as Lead;

    await firestoreAdmin.collection('audit_logs').add({
      action: 'ARCHIVE_LEAD',
      entityId: leadId,
      entityType: 'lead',
      entityName: leadData.title,
      userId: session.user.id || 'unknown',
      userName: session.user.name || 'Sistema',
      reason,
      timestamp: now
    });

    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'system',
      description: `LEAD ARQUIVADO/ABANDONADO: ${reason} - por ${session.user.name}`,
      date: now as any,
      authorName: session.user.name || 'Sistema'
    };

    await leadRef.update({
      status: 'ABANDONADO',
      updatedAt: now,
      timeline: FieldValue.arrayUnion(timelineEvent)
    });

    revalidatePath('/dashboard/leads');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Exclui permanentemente um lead e registra auditoria.
 */
export async function deleteLeadAction(leadId: string, reason: string = 'Exclusão manual') {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');
  
  try {
    const leadRef = firestoreAdmin.collection('leads').doc(leadId);
    const leadDoc = await leadRef.get();
    if (!leadDoc.exists) throw new Error('Lead não encontrado.');

    const leadData = leadDoc.data() as Lead;
    const now = Timestamp.now();

    await firestoreAdmin.collection('audit_logs').add({
      action: 'DELETE_LEAD',
      entityId: leadId,
      entityType: 'lead',
      entityName: leadData.title,
      userId: session.user.id || 'unknown',
      userName: session.user.name || 'Sistema',
      reason,
      deletedData: leadData,
      timestamp: now
    });

    await leadRef.delete();

    revalidatePath('/dashboard/leads');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

