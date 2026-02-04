'use server';

import { firestoreAdmin } from '@/firebase/admin';
import type { LegalDeadline, LegalDeadlineStatus, TimelineEvent } from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { v4 as uuidv4 } from 'uuid';
import { getGoogleApiClientsForUser } from '@/lib/drive';
import { formatISO } from 'date-fns';
import { createNotification } from './notification-actions';
import { revalidatePath } from 'next/cache';

/**
 * Constrói a descrição detalhada do prazo para o Google Agenda.
 */
function buildDeadlineCalendarDescription(data: {
  type: string;
  processName: string;
  processNumber: string;
  clientName: string;
  clientPhone: string;
  publicationText?: string;
  observations?: string;
  id: string;
  status: string;
}) {
  const cleanPhone = data.clientPhone.replace(/\D/g, '');
  const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}` : 'Não disponível';

  return [
    `📅 PRAZO JUDICIAL FATAL`,
    `Tipo: ${data.type}`,
    `Status Atual: ${data.status}`,
    ``,
    `🔢 Processo:`,
    `${data.processName}`,
    `Nº: ${data.processNumber}`,
    ``,
    `👤 Cliente:`,
    `${data.clientName}`,
    `WhatsApp: ${whatsappLink}`,
    ``,
    `📝 Publicação Oficial:`,
    `${data.publicationText || 'Não informada.'}`,
    ``,
    `💡 Observações Estratégicas:`,
    `${data.observations || 'Nenhuma.'}`,
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

    // 1. Sincronização com Google Calendar
    let googleCalendarEventId: string | undefined;
    try {
      const { calendar } = await getGoogleApiClientsForUser();
      
      const fatalDate = new Date(data.endDate);
      fatalDate.setHours(9, 0, 0, 0);
      const endDateTime = new Date(fatalDate);
      endDateTime.setHours(10, 0, 0, 0);

      const description = buildDeadlineCalendarDescription({
        type: data.type,
        processName: processData?.name || 'Processo',
        processNumber: processData?.processNumber || 'N/A',
        clientName: clientInfo.name,
        clientPhone: clientInfo.phone,
        publicationText: data.publicationText,
        observations: data.observations,
        id: deadlineRef.id,
        status: 'PENDENTE'
      });

      const event = {
        summary: `🚨 PRAZO: ${data.type} | ${processData?.name || 'Processo'}`,
        description: description,
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
    } catch (calendarError: any) {
      console.warn('Google Calendar sync failed for deadline:', calendarError.message);
    }

    if (googleCalendarEventId) {
      deadlinePayload.googleCalendarEventId = googleCalendarEventId;
    }

    const methodLabel = data.isBusinessDays ? 'dias úteis' : 'dias corridos';
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'deadline',
      description: `PRAZO LANÇADO: ${data.type} (${data.daysCount} ${methodLabel}). Vencimento: ${new Date(data.endDate).toLocaleDateString('pt-BR')}. Sincronizado com Agenda.`,
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

    // Atualizar Google Calendar
    if (oldData.googleCalendarEventId) {
      try {
        const { calendar } = await getGoogleApiClientsForUser();
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

        const fatalDate = new Date(data.endDate);
        fatalDate.setHours(9, 0, 0, 0);
        const endDateTime = new Date(fatalDate);
        endDateTime.setHours(10, 0, 0, 0);

        const newDescription = buildDeadlineCalendarDescription({
          type: data.type,
          processName: processData?.name || 'Processo',
          processNumber: processData?.processNumber || 'N/A',
          clientName: clientInfo.name,
          clientPhone: clientInfo.phone,
          publicationText: data.publicationText,
          observations: data.observations,
          id: id,
          status: oldData.status
        });

        await calendar.events.patch({
          calendarId: 'primary',
          eventId: oldData.googleCalendarEventId,
          requestBody: {
            description: newDescription,
            summary: `${oldData.status === 'CUMPRIDO' ? '✅ ' : ''}PRAZO: ${data.type} | ${processData?.name || 'Processo'}`,
            start: { dateTime: formatISO(fatalDate), timeZone: 'America/Sao_Paulo' },
            end: { dateTime: formatISO(endDateTime), timeZone: 'America/Sao_Paulo' },
          }
        });
      } catch (e) {
        console.warn('Failed to update calendar event for deadline:', id);
      }
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

    // Atualizar Google Calendar
    if (deadlineData.googleCalendarEventId) {
      try {
        const { calendar } = await getGoogleApiClientsForUser();
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

        const newDescription = buildDeadlineCalendarDescription({
          type: deadlineData.type,
          processName: processData?.name || 'Processo',
          processNumber: processData?.processNumber || 'N/A',
          clientName: clientInfo.name,
          clientPhone: clientInfo.phone,
          publicationText: deadlineData.publicationText,
          observations: deadlineData.observations,
          id: id,
          status: status
        });

        await calendar.events.patch({
          calendarId: 'primary',
          eventId: deadlineData.googleCalendarEventId,
          requestBody: {
            description: newDescription,
            summary: `${status === 'CUMPRIDO' ? '✅ ' : ''}PRAZO: ${deadlineData.type} | ${processData?.name || 'Processo'}`
          }
        });
      } catch (e) {
        console.warn('Failed to update calendar event for deadline:', id);
      }
    }

    // Adicionar evento na timeline do processo
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

    if (deadlineData?.googleCalendarEventId) {
      try {
        const { calendar } = await getGoogleApiClientsForUser();
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: deadlineData.googleCalendarEventId,
        });
      } catch (e) {
        console.warn('Could not delete calendar event for deadline:', id);
      }
    }

    await deadlineRef.delete();
    revalidatePath('/dashboard/prazos');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
