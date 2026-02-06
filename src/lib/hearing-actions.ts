'use server';

import { firestoreAdmin } from '@/firebase/admin';
import { getGoogleApiClientsForUser } from '@/lib/drive';
import { add, formatISO } from 'date-fns';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import type { HearingStatus, HearingType, TimelineEvent } from './types';
import { summarizeAddress } from './utils';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

/**
 * Constrói a descrição detalhada para o Google Agenda seguindo o padrão Bueno Gois.
 */
function buildCalendarDescription(data: {
  legalArea: string;
  processNumber: string;
  clientName: string;
  clientPhone: string;
  location: string;
  courtBranch?: string;
  responsibleParty: string;
  status: string;
  notes?: string;
  id: string;
}) {
  const cleanPhone = data.clientPhone.replace(/\D/g, '');
  const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}` : 'Telefone não disponível';

  return [
    `📌 Processo Judicial`,
    `Tipo: ${data.legalArea}`,
    ``,
    `🔢 Número do Processo:`,
    `${data.processNumber}`,
    ``,
    `⚖️ Juízo / Vara:`,
    `${data.courtBranch || 'Não informado'}`,
    ``,
    `👤 Cliente:`,
    `${data.clientName} - ${data.clientPhone}`,
    `Link WhatsApp: ${whatsappLink}`,
    ``,
    `📍 Local:`,
    `${data.location}`,
    ``,
    `👨‍⚖️ Responsável:`,
    `${data.responsibleParty}`,
    ``,
    `🚩 Status:`,
    `${data.status}`,
    ``,
    `📝 Observações:`,
    `${data.notes || 'Nenhuma anotação no momento.'}`,
    ``,
    `🔐 ID Interno: ${data.id}`
  ].join('\n');
}

export async function createHearing(data: {
  processId: string;
  processName: string;
  hearingDate: string;
  location: string;
  courtBranch?: string;
  responsibleParty: string;
  status: HearingStatus;
  type: HearingType;
  notes?: string;
}) {
  if (!firestoreAdmin) {
    throw new Error('A conexão com o servidor de dados falhou.');
  }

  const { processId, hearingDate, location, courtBranch, responsibleParty, status, type, notes } = data;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Não autenticado.');
  }

  try {
    const processDoc = await firestoreAdmin.collection('processes').doc(processId).get();
    const processData = processDoc.data();
    const processNumber = processData?.processNumber || 'Não informado';
    const legalArea = processData?.legalArea || 'Não informada';
    
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

    const hearingRef = await firestoreAdmin.collection('hearings').add({
      processId,
      lawyerId: session.user.id,
      date: new Date(hearingDate),
      location: summarizeAddress(location),
      courtBranch: courtBranch || '',
      responsibleParty,
      status: status || 'PENDENTE',
      type: type || 'OUTRA',
      notes: notes || '',
      createdAt: new Date(),
    });

    try {
      const { calendar } = await getGoogleApiClientsForUser();
      const startDateTime = new Date(hearingDate);
      const endDateTime = add(startDateTime, { hours: 1 });

      const forumName = location.split('-')[0]?.trim() || location.split(',')[0]?.trim() || location;
      const summarizedLoc = summarizeAddress(location);

      const description = buildCalendarDescription({
        legalArea,
        processNumber,
        clientName: clientInfo.name,
        clientPhone: clientInfo.phone,
        location: summarizedLoc,
        courtBranch: courtBranch,
        responsibleParty,
        status: status || 'PENDENTE',
        notes,
        id: hearingRef.id
      });

      const event = {
        summary: `Audiência [${type}] | ${clientInfo.name}`,
        location: forumName,
        description: description,
        start: { dateTime: formatISO(startDateTime), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: formatISO(endDateTime), timeZone: 'America/Sao_Paulo' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 1440 },
            { method: 'popup', minutes: 120 },
          ],
        },
      };

      const createdEvent = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      if (createdEvent.data.id) {
        await hearingRef.update({ googleCalendarEventId: createdEvent.data.id });
        
        await createNotification({
            userId: session.user.id,
            title: "Audiência Agendada",
            description: `Audiência de ${clientInfo.name} sincronizada com Google Agenda.`,
            type: 'hearing',
            href: `/dashboard/audiencias`,
        });
      }
    } catch (calendarError: any) {
      console.error("Calendar sync failed:", calendarError.message);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error creating hearing:', error);
    throw new Error(error.message || 'Falha ao agendar audiência.');
  }
}

export async function processHearingReturn(id: string, data: {
  resultNotes: string;
  nextStepType?: string;
  nextStepDeadline?: string;
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const hearingRef = firestoreAdmin.collection('hearings').doc(id);
    const hearingDoc = await hearingRef.get();
    if (!hearingDoc.exists) throw new Error('Audiência não encontrada.');
    const hearingData = hearingDoc.data();

    const processRef = firestoreAdmin.collection('processes').doc(hearingData!.processId);

    // 1. Atualizar status da audiência
    await hearingRef.update({
      status: 'REALIZADA',
      resultNotes: data.resultNotes,
      hasFollowUp: true,
      updatedAt: Timestamp.now()
    });

    // 2. Registrar na linha do tempo do processo
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'hearing',
      description: `AUDIÊNCIA REALIZADA: ${data.resultNotes}`,
      date: Timestamp.now() as any,
      authorName: session.user.name || 'Sistema'
    };

    await processRef.update({
      timeline: FieldValue.arrayUnion(timelineEvent),
      updatedAt: FieldValue.serverTimestamp()
    });

    // 3. Se houver próximo passo, criar um Google Task ou Deadline
    if (data.nextStepDeadline && data.nextStepType) {
      // Aqui poderíamos chamar createLegalDeadline, mas para simplificar o "seguimento":
      try {
        const { tasks } = await getGoogleApiClientsForUser();
        const taskDate = new Date(data.nextStepDeadline);
        taskDate.setUTCHours(0, 0, 0, 0);

        await tasks.tasks.insert({
          tasklist: '@default',
          requestBody: {
            title: `⏭️ SEGUIMENTO: ${data.nextStepType} (Pós-Audiência)`,
            notes: `Tarefa gerada automaticamente após retorno de audiência.\nAudiência: ${hearingData?.type}\nResultados: ${data.resultNotes}`,
            due: taskDate.toISOString(),
          }
        });
      } catch (e) {
        console.warn('Failed to create follow-up task in Google Tasks');
      }
    }

    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateHearingStatus(hearingId: string, status: HearingStatus) {
    if (!firestoreAdmin) throw new Error('A conexão com o servidor de dados falhou.');
    
    try {
        const hearingRef = firestoreAdmin.collection('hearings').doc(hearingId);
        const hearingDoc = await hearingRef.get();
        if (!hearingDoc.exists) throw new Error('Audiência não encontrada.');
        const hearing = hearingDoc.data();

        await hearingRef.update({ status, updatedAt: new Date() });

        if (hearing?.googleCalendarEventId) {
            try {
                const { calendar } = await getGoogleApiClientsForUser();
                const prefix = status === 'REALIZADA' ? '✅ ' : status === 'CANCELADA' ? '❌ ' : '';
                
                await calendar.events.patch({
                    calendarId: 'primary',
                    eventId: hearing.googleCalendarEventId,
                    requestBody: {
                        summary: `${prefix}Audiência [${hearing.type}] | ID: ${hearingId.substring(0,4)}`,
                    }
                });
            } catch (calendarError: any) {
                console.warn("Could not update calendar event status:", calendarError.message);
            }
        }

        return { success: true };
    } catch (e: any) {
        throw new Error(e.message || 'Falha ao atualizar status.');
    }
}

export async function deleteHearing(hearingId: string, googleCalendarEventId?: string) {
  if (!firestoreAdmin) {
    throw new Error('A conexão com o servidor de dados falhou.');
  }

  try {
    if (googleCalendarEventId) {
      try {
        const { calendar } = await getGoogleApiClientsForUser();
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: googleCalendarEventId,
        });
      } catch (calendarError: any) {
         console.warn("Could not delete calendar event:", calendarError.message);
      }
    }

    await firestoreAdmin.collection('hearings').doc(hearingId).delete();
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || 'Falha ao excluir audiência.');
  }
}
