'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { LegalDeadline, LegalDeadlineStatus, TimelineEvent } from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { v4 as uuidv4 } from 'uuid';
import { getGoogleApiClientsForUser } from '@/lib/drive';
import { formatISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createNotification } from './notification-actions';
import { revalidatePath } from 'next/cache';

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
    const processData = processDoc.data();
    
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

    let responsibleName = session.user.name || 'Advogado Responsável';
    if (processData?.leadLawyerId) {
        const staffDoc = await firestoreAdmin.collection('staff').doc(processData.leadLawyerId).get();
        const staffData = staffDoc.data();
        if (staffData) {
            responsibleName = `${staffData.firstName} ${staffData.lastName}`;
        }
    }

    const deadlinePayload: Omit<LegalDeadline, 'id'> = {
      processId: data.processId,
      type: data.type,
      startDate: Timestamp.fromDate(new Date(data.startDate)),
      endDate: Timestamp.fromDate(new Date(data.endDate)),
      daysCount: data.daysCount,
      isBusinessDays: data.isBusinessDays,
      publicationText: data.publicationText || '',
      observations: data.observations || '',
      status: 'PENDENTE' as LegalDeadlineStatus,
      authorId: session.user.id,
      authorName: session.user.name || 'Advogado',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const calendarDescription = buildDeadlineCalendarDescription({
      type: data.type,
      endDate: new Date(data.endDate),
      legalArea: processData?.legalArea || 'N/A',
      processName: processData?.name || 'Processo',
      processNumber: processData?.processNumber || 'N/A',
      clientName: clientInfo.name,
      clientPhone: clientInfo.phone,
      publicationText: data.publicationText,
      observations: data.observations,
      responsibleParty: responsibleName,
      status: 'PENDENTE',
      id: deadlineRef.id
    });

    // 1. Sincronização com Google Calendar e Google Tasks
    let googleCalendarEventId: string | undefined;
    let googleTaskId: string | undefined;

    try {
      const { calendar, tasks } = await getGoogleApiClientsForUser();
      
      const fatalDate = new Date(data.endDate);
      fatalDate.setHours(9, 0, 0, 0);
      const endDateTime = new Date(fatalDate);
      endDateTime.setHours(10, 0, 0, 0);

      // Criar Evento no Calendário
      const event = {
        summary: `🚨 PRAZO: ${data.type} | ${clientInfo.name}`,
        description: calendarDescription,
        start: { dateTime: formatISO(fatalDate), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: formatISO(endDateTime), timeZone: 'America/Sao_Paulo' },
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
      // NOTA: O campo 'due' no Google Tasks deve ser um RFC 3339 timestamp sem offset (Z).
      try {
        const taskDate = new Date(data.endDate);
        taskDate.setUTCHours(0, 0, 0, 0); 

        const createdTask = await tasks.tasks.insert({
          tasklist: '@default',
          requestBody: {
            title: `🚨 PRAZO: ${data.type} | ${processData?.name}`,
            notes: calendarDescription,
            due: taskDate.toISOString(),
          }
        });
        googleTaskId = createdTask.data.id || undefined;
        console.log('[DeadlineActions] Google Task criada com sucesso:', googleTaskId);
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
      description: `PRAZO LANÇADO: ${data.type} (${data.daysCount} ${methodLabel}). Vencimento: ${new Date(data.endDate).toLocaleDateString('pt-BR')}. Tarefa criada no Workspace.`,
      date: Timestamp.now(),
      authorName: session.user.name || 'Sistema',
      endDate: Timestamp.fromDate(new Date(data.endDate)),
      isBusinessDays: data.isBusinessDays
    };

    const batch = firestoreAdmin.batch();
    batch.set(deadlineRef, deadlinePayload);
    batch.update(processRef, {
      timeline: FieldValue.arrayUnion(timelineEvent),
      updatedAt: FieldValue.serverTimestamp()
    });

    await batch.commit();

    if (session.user.id) {
      await createNotification({
        userId: session.user.id,
        title: "Prazo Registrado",
        description: `${data.type} para ${processData?.name} agendado para ${new Date(data.endDate).toLocaleDateString('pt-BR')}.`,
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

    const updatePayload = {
      type: data.type,
      startDate: Timestamp.fromDate(new Date(data.startDate)),
      endDate: Timestamp.fromDate(new Date(data.endDate)),
      daysCount: data.daysCount,
      isBusinessDays: data.isBusinessDays,
      publicationText: data.publicationText || '',
      observations: data.observations || '',
      updatedAt: Timestamp.now(),
    };

    await deadlineRef.update(updatePayload);

    // Atualizar Google Workspace
    try {
      const { calendar, tasks } = await getGoogleApiClientsForUser();
      const processDoc = await processRef.get();
      const processData = processDoc.data();
      
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

      let responsibleName = session.user.name || 'Advogado Responsável';
      if (processData?.leadLawyerId) {
          const staffDoc = await firestoreAdmin.collection('staff').doc(processData.leadLawyerId).get();
          const staffData = staffDoc.data();
          if (staffData) {
              responsibleName = `${staffData.firstName} ${staffData.lastName}`;
          }
      }

      const newDescription = buildDeadlineCalendarDescription({
        type: data.type,
        endDate: new Date(data.endDate),
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
        const fatalDate = new Date(data.endDate);
        fatalDate.setHours(9, 0, 0, 0);
        const endDateTime = new Date(fatalDate);
        endDateTime.setHours(10, 0, 0, 0);

        await calendar.events.patch({
          calendarId: 'primary',
          eventId: oldData.googleCalendarEventId,
          requestBody: {
            description: newDescription,
            summary: `${oldData.status === 'CUMPRIDO' ? '✅ ' : '🚨 '}PRAZO: ${data.type} | ${clientInfo.name}`,
            start: { dateTime: formatISO(fatalDate), timeZone: 'America/Sao_Paulo' },
            end: { dateTime: formatISO(endDateTime), timeZone: 'America/Sao_Paulo' },
          }
        });
      }

      if (oldData.googleTaskId) {
        const taskDate = new Date(data.endDate);
        taskDate.setUTCHours(0, 0, 0, 0);

        await tasks.tasks.patch({
          tasklist: '@default',
          task: oldData.googleTaskId,
          requestBody: {
            title: `🚨 PRAZO: ${data.type} | ${processData?.name}`,
            notes: newDescription,
            due: taskDate.toISOString(),
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

    await deadlineRef.update({ 
      status, 
      updatedAt: Timestamp.now() 
    });

    // Atualizar Google Workspace
    try {
      const { calendar, tasks } = await getGoogleApiClientsForUser();
      const processDoc = await processRef.get();
      const processData = processDoc.data();
      
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

      let responsibleName = session.user.name || 'Advogado Responsável';
      if (processData?.leadLawyerId) {
          const staffDoc = await firestoreAdmin.collection('staff').doc(processData.leadLawyerId).get();
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
      date: Timestamp.now(),
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
    const deadlineData = deadlineDoc.data();

    try {
      const { calendar, tasks } = await getGoogleApiClientsForUser();
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
