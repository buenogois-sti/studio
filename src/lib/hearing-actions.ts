'use server';

import { firestoreAdmin } from '@/firebase/admin';
import { getGoogleApiClientsForUser } from '@/lib/drive';
import { add, formatISO } from 'date-fns';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import type { HearingStatus, HearingType } from './types';
import { summarizeAddress } from './utils';

interface CreateHearingData {
  processId: string;
  processName: string;
  hearingDate: string;
  location: string;
  responsibleParty: string;
  status: HearingStatus;
  type: HearingType;
  notes?: string;
}

export async function createHearing(data: CreateHearingData) {
  if (!firestoreAdmin) {
    throw new Error('A conexão com o servidor de dados falhou.');
  }

  const { processId, processName, hearingDate, location, responsibleParty, status, type, notes } = data;
  const session = await getServerSession(authOptions);

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
      date: new Date(hearingDate),
      location,
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

      const description = [
        `📌 Processo Judicial`,
        `Tipo: ${legalArea}`,
        ``,
        `🔢 Número do Processo:`,
        `${processNumber}`,
        ``,
        `👤 Cliente:`,
        `${clientInfo.name} (${clientInfo.phone})`,
        ``,
        `⚖️ Fórum / Local:`,
        `${summarizedLoc}`,
        ``,
        `👨‍⚖️ Responsável:`,
        `${responsibleParty}`,
        ``,
        `🚩 Status:`,
        `${status}`,
        ``,
        `📝 Observações:`,
        `${notes || 'Nenhuma anotação no momento.'}`,
        ``,
        `🔐 ID Interno: ${hearingRef.id}`
      ].join('\n');

      const event = {
        summary: `Audiência [${type}] | ${clientInfo.name}`,
        location: forumName,
        description: description,
        start: { dateTime: formatISO(startDateTime), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: formatISO(endDateTime), timeZone: 'America/Sao_Paulo' },
      };

      const createdEvent = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      if (createdEvent.data.id) {
        await hearingRef.update({ googleCalendarEventId: createdEvent.data.id });
        
        if (session?.user?.id) {
            await createNotification({
                userId: session.user.id,
                title: "Audiência Agendada",
                description: `Audiência de ${clientInfo.name} sincronizada com Google Agenda.`,
                href: `/dashboard/audiencias`,
            });
        }
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

export async function syncHearings() {
  if (!firestoreAdmin) throw new Error('A conexão com o servidor de dados falhou.');
  
  try {
    const hearingsSnapshot = await firestoreAdmin.collection('hearings')
      .where('status', '==', 'PENDENTE')
      .get();
    
    const { calendar } = await getGoogleApiClientsForUser();
    let syncedCount = 0;

    for (const doc of hearingsSnapshot.docs) {
      const hearing = doc.data();
      if (!hearing.googleCalendarEventId) {
        const processDoc = await firestoreAdmin.collection('processes').doc(hearing.processId).get();
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

        const forumName = hearing.location.split('-')[0]?.trim() || hearing.location.split(',')[0]?.trim() || hearing.location;
        const summarizedLoc = summarizeAddress(hearing.location);

        const description = [
          `📌 Processo Judicial`,
          `Tipo: ${legalArea}`,
          ``,
          `🔢 Número do Processo:`,
          `${processNumber}`,
          ``,
          `👤 Cliente:`,
          `${clientInfo.name} (${clientInfo.phone})`,
          ``,
          `⚖️ Fórum / Local:`,
          `${summarizedLoc}`,
          ``,
          `👨‍⚖️ Responsável:`,
          `${hearing.responsibleParty}`,
          ``,
          `🚩 Status:`,
          `${hearing.status}`,
          ``,
          `📝 Observações:`,
          `${hearing.notes || 'Nenhuma anotação no momento.'}`,
          ``,
          `🔐 ID Interno: ${doc.id}`
        ].join('\n');

        const startDateTime = hearing.date.toDate();
        const endDateTime = add(startDateTime, { hours: 1 });

        const event = {
          summary: `Audiência [${hearing.type}] | ${clientInfo.name}`,
          location: forumName,
          description: description,
          start: { dateTime: formatISO(startDateTime), timeZone: 'America/Sao_Paulo' },
          end: { dateTime: formatISO(endDateTime), timeZone: 'America/Sao_Paulo' },
        };

        try {
          const createdEvent = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
          });

          if (createdEvent.data.id) {
            await doc.ref.update({ googleCalendarEventId: createdEvent.data.id, updatedAt: new Date() });
            syncedCount++;
          }
        } catch (e) {
          console.error(`Failed to sync hearing ${doc.id}:`, e);
        }
      }
    }
    return { success: true, syncedCount };
  } catch (error: any) {
    console.error('Error in syncHearings action:', error);
    throw new Error(error.message || 'Erro na comunicação com o Google Calendar.');
  }
}

export async function updateHearingStatus(hearingId: string, status: HearingStatus) {
    if (!firestoreAdmin) throw new Error('A conexão com o servidor de dados falhou.');
    try {
        await firestoreAdmin.collection('hearings').doc(hearingId).update({ status, updatedAt: new Date() });
        return { success: true };
    } catch (e: any) {
        throw new Error('Falha ao atualizar status da audiência.');
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
    console.error('Error deleting hearing:', error);
    throw new Error(error.message || 'Falha ao excluir audiência.');
  }
}
