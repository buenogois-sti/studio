
'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { LegalDeadline, LegalDeadlineStatus, TimelineEvent, Process } from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { v4 as uuidv4 } from 'uuid';
import { getGoogleClientsForStaff } from '@/lib/drive';
import { formatISO, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createNotification } from './notification-actions';
import { revalidatePath } from 'next/cache';

/**
 * Utility to ensure a date string has the correct Brazil offset (-03:00)
 */
function ensureBrazilOffset(dateStr: string): string {
  if (!dateStr) return dateStr;
  if (dateStr.includes('-03:00') || dateStr.endsWith('Z')) return dateStr;
  if (dateStr.includes('T') && !dateStr.includes('+') && !dateStr.match(/-\d{2}:\d{2}$/)) {
    return `${dateStr}:00-03:00`;
  }
  // For plain dates YYYY-MM-DD
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return `${dateStr}T09:00:00-03:00`;
  }
  return dateStr;
}

/**
 * Constrói a descrição detalhada do prazo para o Google Agenda e Tasks seguindo o padrão Bueno Gois.
 */
function buildDeadlineCalendarDescription(data: {
  type: string;
  endDate: Date;
  legalArea: string;
  processName: string;
  processNumber: string;
  clientName: string;
  clientPhone: string;
  publicationText?: string;
  observations?: string;
  responsibleParty: string;
  status: string;
  id: string;
}) {
  const cleanPhone = data.clientPhone.replace(/\D/g, '');
  const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${encodeURIComponent(`Olá ${data.clientName}, sou do escritório Bueno Gois e gostaria de falar sobre o andamento do seu processo ${data.processNumber}.`)}` : 'Telefone não disponível';
  
  const dateFormatted = format(data.endDate, "dd/MM (EEEE)", { locale: ptBR });

  return [
    `🚨 PRAZO JUDICIAL FATAL – ${data.type.toUpperCase()}`,
    ``,
    `📅 Data do Prazo:`,
    `${dateFormatted}`,
    `⏰ Horário limite sugerido para protocolo: 06h00`,
    ``,
    `⚖️ Providência Processual`,
    `Ato: ${data.type}`,
    `Natureza: Prazo fatal (preclusivo)`,
    ``,
    `🔢 Processo`,
    `Classe: ${data.legalArea}`,
    `Número: ${data.processNumber}`,
    `Título: ${data.processName}`,
    ``,
    `👤 Cliente`,
    `Nome: ${data.clientName}`,
    `WhatsApp: ${whatsappLink}`,
    ``,
    `📰 Publicação Oficial`,
    `${data.publicationText || 'Nenhuma publicação registrada.'}`,
    ``,
    `👨‍⚖️ Responsável`,
    `Advogado: ${data.responsibleParty}`,
    ``,
    `🚩 Status atual no sistema: ${data.status}`,
    ``,
    `💡 Observações Estratégicas`,
    `${data.observations || 'Nenhuma observação registrada.'}`,
    ``,
    `🔔 Alertas configurados no sistema LexFlow`,
    ``,
    `🔐 ID Interno: ${data.id}`
  ].join('\n');
}

export async function createLegalDeadline(data: {
  processId: string;
  type: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  isBusinessDays: boolean;
  publicationText?: string;
  observations?: string;
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const deadlineRef = firestoreAdmin.collection('deadlines').doc();
    const processRef = firestoreAdmin.collection('processes').doc(data.processId);

    const processDoc = await processRef.get();
    const processData = processDoc.data() as Process | undefined;
    const processNumber = processData?.processNumber || 'Não informado';
    const leadLawyerId = processData?.leadLawyerId || session.user.id;
    
    let clientInfo = { name: 'Não informado', phone: 'Não informado' };
    if (processData?.clientId) {
      const clientDoc = await firestoreAdmin.collection('clients').doc(processData.clientId).get();
      const clientData = clientDoc.data();
      if (clientData) {
        clientInfo = {
          name: `${clientData.firstName} ${clientData.lastName}`.trim(),
          phone: clientData.mobile || clientData.phone || 'Não informado'
        };
      }
    }

    let responsibleName = 'Advogado Responsável';
    if (leadLawyerId) {
        const staffDoc = await firestoreAdmin.collection('staff').doc(leadLawyerId).get();
        const staffData = staffDoc.data();
        if (staffData) {
            responsibleName = `${staffData.firstName} ${staffData.lastName}`;
        }
    }

    const normalizedStartDate = ensureBrazilOffset(data.startDate);
    const normalizedEndDate = ensureBrazilOffset(data.endDate);

    const startDateTime = parseISO(normalizedStartDate);
    const endDateTime = parseISO(normalizedEndDate);

    const deadlinePayload: Omit<LegalDeadline, 'id'> = {
      processId: data.processId,
      type: data.type,
      startDate: Timestamp.fromDate(startDateTime) as any,
      endDate: Timestamp.fromDate(endDateTime) as any,
      daysCount: data.daysCount,
      isBusinessDays: data.isBusinessDays,
      publicationText: data.publicationText || '',
      observations: data.observations || '',
      status: 'PENDENTE' as LegalDeadlineStatus,
      authorId: session.user.id,
      authorName: session.user.name || 'Advogado',
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    };

    const calendarDescription = buildDeadlineCalendarDescription({
      type: data.type,
      endDate: endDateTime,
      legalArea: processData?.legalArea || 'N/A',
      processName: processData?.name || 'Processo',
      processNumber: processNumber,
      clientName: clientInfo.name,
      clientPhone: clientInfo.phone,
      publicationText: data.publicationText,
      observations: data.observations,
      responsibleParty: responsibleName,
      status: 'PENDENTE',
      id: deadlineRef.id
    });

    // 1. Sincronização com Google Agenda e Google Tasks
    let googleCalendarEventId: string | undefined;
    let googleTaskId: string | undefined;

    try {
      const { calendar, tasks } = await getGoogleClientsForStaff(leadLawyerId);
      
      const fatalDateStart = new Date(endDateTime);
      fatalDateStart.setHours(9, 0, 0, 0);
      const fatalDateEnd = new Date(endDateTime);
      fatalDateEnd.setHours(10, 0, 0, 0);

      // Criar Evento no Calendário
      const event = {
        summary: `🚨 PRAZO: ${data.type} | ${clientInfo.name}`,
        description: calendarDescription,
        start: { dateTime: formatISO(fatalDateStart), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: formatISO(fatalDateEnd), timeZone: 'America/Sao_Paulo' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 1440 },
            { method: 'popup', minutes: 720 },
            { method: 'email', minutes: 1440 }
          ],
        },
      };

      const createdEvent = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });
      googleCalendarEventId = createdEvent.data.id || undefined;

      // Criar Tarefa no Google Tasks
      try {
        const taskDue = new Date(endDateTime);
        taskDue.setUTCHours(0, 0, 0, 0); 

        const createdTask = await tasks.tasks.insert({
          tasklist: '@default',
          requestBody: {
            title: `🚨 PRAZO: ${data.type} | ${processData?.name}`,
            notes: calendarDescription,
            due: taskDue.toISOString(),
          }
        });
        googleTaskId = createdTask.data.id || undefined;
      } catch (taskErr: any) {
        console.warn('[DeadlineActions] Falha ao sincronizar com Google Tasks:', taskErr.message);
      }

    } catch (calendarError: any) {
      console.warn('[DeadlineActions] Falha na sincronização Google Workspace:', calendarError.message);
    }

    if (googleCalendarEventId) deadlinePayload.googleCalendarEventId = googleCalendarEventId;
    if (googleTaskId) deadlinePayload.googleTaskId = googleTaskId;

    const methodLabel = data.isBusinessDays ? 'dias úteis' : 'dias corridos';
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'deadline',
      description: `PRAZO LANÇADO: ${data.type} (${data.daysCount} ${methodLabel}). Vencimento: ${format(endDateTime, 'dd/MM/yyyy')}. Tarefa criada no Workspace do responsável.`,
      date: Timestamp.now() as any,
      authorName: session.user.name || 'Sistema',
      endDate: Timestamp.fromDate(endDateTime) as any,
      isBusinessDays: data.isBusinessDays
    };

    const batch = firestoreAdmin.batch();
    batch.set(deadlineRef, deadlinePayload);
    batch.update(processRef, {
      timeline: FieldValue.arrayUnion(timelineEvent),
      updatedAt: FieldValue.serverTimestamp()
    });

    await batch.commit();

    if (leadLawyerId) {
      await createNotification({
        userId: leadLawyerId,
        title: "Novo Prazo na sua Agenda",
        description: `${data.type} para ${processData?.name} agendado por ${session.user.name}.`,
        type: 'deadline',
        href: `/dashboard/prazos`,
      });
    }

    revalidatePath('/dashboard/prazos');
    return { success: true, id: deadlineRef.id };
  } catch (error: any) {
    console.error('Error creating deadline:', error);
    throw new Error(error.message || 'Falha ao lançar prazo.');
  }
}

export async function updateLegalDeadline(id: string, data: {
  type: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  isBusinessDays: boolean;
  publicationText?: string;
  observations?: string;
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const deadlineRef = firestoreAdmin.collection('deadlines').doc(id);
    const deadlineDoc = await deadlineRef.get();
    if (!deadlineDoc.exists) throw new Error('Prazo não encontrado.');
    
    const oldData = deadlineDoc.data() as LegalDeadline;
    const processRef = firestoreAdmin.collection('processes').doc(oldData.processId);
    const processDoc = await processRef.get();
    const processData = processDoc.data() as Process | undefined;
    const leadLawyerId = processData?.leadLawyerId || oldData.authorId;

    const normalizedStartDate = ensureBrazilOffset(data.startDate);
    const normalizedEndDate = ensureBrazilOffset(data.endDate);

    const startDateTime = parseISO(normalizedStartDate);
    const endDateTime = parseISO(normalizedEndDate);

    const updatePayload = {
      type: data.type,
      startDate: Timestamp.fromDate(startDateTime),
      endDate: Timestamp.fromDate(endDateTime),
      daysCount: data.daysCount,
      isBusinessDays: data.isBusinessDays,
      publicationText: data.publicationText || '',
      observations: data.observations || '',
      updatedAt: Timestamp.now(),
    };

    await deadlineRef.update(updatePayload);

    // Atualizar Google Workspace do Responsável
    try {
      const { calendar, tasks } = await getGoogleClientsForStaff(leadLawyerId);
      
      let clientInfo = { name: 'Não informado', phone: 'Não informado' };
      if (processData?.clientId) {
        const clientDoc = await firestoreAdmin.collection('clients').doc(processData.clientId).get();
        const clientData = clientDoc.data();
        if (clientData) {
          clientInfo = {
            name: `${clientData.firstName} ${clientData.lastName}`.trim(),
            phone: clientData.mobile || clientData.phone || 'Não informado'
          };
        }
      }

      let responsibleName = 'Advogado Responsável';
      if (leadLawyerId) {
          const staffDoc = await firestoreAdmin.collection('staff').doc(leadLawyerId).get();
          const staffData = staffDoc.data();
          if (staffData) {
              responsibleName = `${staffData.firstName} ${staffData.lastName}`;
          }
      }

      const newDescription = buildDeadlineCalendarDescription({
        type: data.type,
        endDate: endDateTime,
        legalArea: processData?.legalArea || 'N/A',
        processName: processData?.name || 'Processo',
        processNumber: processData?.processNumber || 'N/A',
        clientName: clientInfo.name,
        clientPhone: clientInfo.phone,
        publicationText: data.publicationText,
        observations: data.observations,
        responsibleParty: responsibleName,
        status: oldData.status,
        id: id
      });

      if (oldData.googleCalendarEventId) {
        const fatalDateStart = new Date(endDateTime);
        fatalDateStart.setHours(9, 0, 0, 0);
        const fatalDateEnd = new Date(endDateTime);
        fatalDateEnd.setHours(10, 0, 0, 0);

        await calendar.events.patch({
          calendarId: 'primary',
          eventId: oldData.googleCalendarEventId,
          requestBody: {
            description: newDescription,
            summary: `${oldData.status === 'CUMPRIDO' ? '✅ ' : '🚨 '}PRAZO: ${data.type} | ${clientInfo.name}`,
            start: { dateTime: formatISO(fatalDateStart), timeZone: 'America/Sao_Paulo' },
            end: { dateTime: formatISO(fatalDateEnd), timeZone: 'America/Sao_Paulo' },
          }
        });
      }

      if (oldData.googleTaskId) {
        const taskDue = new Date(endDateTime);
        taskDue.setUTCHours(0, 0, 0, 0);

        await tasks.tasks.patch({
          tasklist: '@default',
          task: oldData.googleTaskId,
          requestBody: {
            title: `🚨 PRAZO: ${data.type} | ${processData?.name}`,
            notes: newDescription,
            due: taskDue.toISOString(),
          }
        });
      }
    } catch (e) {
      console.warn('Failed to update Workspace items for deadline:', id);
    }

    revalidatePath('/dashboard/prazos');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateDeadlineStatus(id: string, status: LegalDeadlineStatus) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const deadlineRef = firestoreAdmin.collection('deadlines').doc(id);
    const deadlineDoc = await deadlineRef.get();
    if (!deadlineDoc.exists) throw new Error('Prazo não encontrado.');
    
    const deadlineData = deadlineDoc.data() as LegalDeadline;
    const processRef = firestoreAdmin.collection('processes').doc(deadlineData.processId);
    const processDoc = await processRef.get();
    const processData = processDoc.data() as Process | undefined;
    const leadLawyerId = processData?.leadLawyerId || deadlineData.authorId;

    await deadlineRef.update({ 
      status, 
      updatedAt: Timestamp.now() 
    });

    // Atualizar Google Workspace do Responsável
    try {
      const { calendar, tasks } = await getGoogleClientsForStaff(leadLawyerId);
      
      let clientInfo = { name: 'Não informado', phone: 'Não informado' };
      if (processData?.clientId) {
        const clientDoc = await firestoreAdmin.collection('clients').doc(processData.clientId).get();
        const clientData = clientDoc.data();
        if (clientData) {
          clientInfo = {
            name: `${clientData.firstName} ${clientData.lastName}`.trim(),
            phone: clientData.mobile || clientData.phone || 'Não informado'
          };
        }
      }

      let responsibleName = 'Advogado Responsável';
      if (leadLawyerId) {
          const staffDoc = await firestoreAdmin.collection('staff').doc(leadLawyerId).get();
          const staffData = staffDoc.data();
          if (staffData) {
              responsibleName = `${staffData.firstName} ${staffData.lastName}`;
          }
      }

      const newDescription = buildDeadlineCalendarDescription({
        type: deadlineData.type,
        endDate: deadlineData.endDate.toDate(),
        legalArea: processData?.legalArea || 'N/A',
        processName: processData?.name || 'Processo',
        processNumber: processData?.processNumber || 'N/A',
        clientName: clientInfo.name,
        clientPhone: clientInfo.phone,
        publicationText: deadlineData.publicationText,
        observations: deadlineData.observations,
        responsibleParty: responsibleName,
        status: status,
        id: id
      });

      if (deadlineData.googleCalendarEventId) {
        await calendar.events.patch({
          calendarId: 'primary',
          eventId: deadlineData.googleCalendarEventId,
          requestBody: {
            description: newDescription,
            summary: `${status === 'CUMPRIDO' ? '✅ ' : '🚨 '}PRAZO: ${deadlineData.type} | ${clientInfo.name}`
          }
        });
      }

      if (deadlineData.googleTaskId) {
        await tasks.tasks.patch({
          tasklist: '@default',
          task: deadlineData.googleTaskId,
          requestBody: {
            status: status === 'CUMPRIDO' ? 'completed' : 'needsAction',
            notes: newDescription
          }
        });
      }
    } catch (e) {
      console.warn('Failed to update Workspace status for deadline:', id);
    }

    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'note',
      description: `PRAZO ATUALIZADO: O prazo de "${deadlineData.type}" foi marcado como ${status}.`,
      date: Timestamp.now() as any,
      authorName: session.user.name || 'Sistema'
    };

    await processRef.update({
      timeline: FieldValue.arrayUnion(timelineEvent),
      updatedAt: FieldValue.serverTimestamp()
    });

    revalidatePath('/dashboard/prazos');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteLegalDeadline(id: string) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  try {
    const deadlineRef = firestoreAdmin.collection('deadlines').doc(id);
    const deadlineDoc = await deadlineRef.get();
    if (!deadlineDoc.exists) return { success: true };
    
    const deadlineData = deadlineDoc.data() as LegalDeadline;
    const processRef = firestoreAdmin.collection('processes').doc(deadlineData.processId);
    const processDoc = await processRef.get();
    const leadLawyerId = processDoc.data()?.leadLawyerId || deadlineData.authorId;

    try {
      const { calendar, tasks } = await getGoogleClientsForStaff(leadLawyerId);
      if (deadlineData?.googleCalendarEventId) {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: deadlineData.googleCalendarEventId,
        });
      }
      if (deadlineData?.googleTaskId) {
        await tasks.tasks.delete({
          tasklist: '@default',
          task: deadlineData.googleTaskId,
        });
      }
    } catch (e) {
      console.warn('Could not delete Workspace items for deadline:', id);
    }

    await deadlineRef.delete();
    revalidatePath('/dashboard/prazos');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
