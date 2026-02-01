'use server';

import { firestoreAdmin } from '@/firebase/admin';
import { getGoogleApiClientsForUser } from '@/lib/drive';
import { add, formatISO } from 'date-fns';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';

interface CreateHearingData {
  processId: string;
  processName: string;
  hearingDate: string; // ISO string from the client
  location: string;
  responsibleParty: string;
  notes?: string;
}

export async function createHearing(data: CreateHearingData) {
  if (!firestoreAdmin) {
    throw new Error('A conexão com o servidor de dados falhou.');
  }

  const { processId, processName, hearingDate, location, responsibleParty, notes } = data;
  const session = await getServerSession(authOptions);

  try {
    // 1. Save to Firestore first, to get an ID
    const hearingRef = await firestoreAdmin.collection('hearings').add({
      processId,
      date: new Date(hearingDate), // Store as Firestore Timestamp
      location,
      responsibleParty,
      notes: notes || '',
      createdAt: new Date(),
    });
    console.log('Hearing created in Firestore with ID:', hearingRef.id);

    // 2. Try to add to Google Calendar
    try {
      const { calendar } = await getGoogleApiClientsForUser();
      const startDateTime = new Date(hearingDate);
      const endDateTime = add(startDateTime, { hours: 1 });

      const event = {
        summary: `Audiência: ${processName}`,
        location: location,
        description: `Detalhes da audiência para o processo "${processName}".\n\nNotas: ${notes || 'Nenhuma'}\n\nID Interno: ${hearingRef.id}`,
        start: { dateTime: formatISO(startDateTime), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: formatISO(endDateTime), timeZone: 'America/Sao_Paulo' },
      };

      const createdEvent = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      // 3a. On Calendar Success: Update Firestore with Event ID and send success notification
      if (createdEvent.data.id) {
        await hearingRef.update({ googleCalendarEventId: createdEvent.data.id });
        console.log(`Linked Google Calendar event ${createdEvent.data.id} to Firestore hearing ${hearingRef.id}`);

        if (session?.user?.id) {
            await createNotification({
                userId: session.user.id,
                title: "Audiência Agendada e Sincronizada",
                description: `A audiência para "${processName}" foi salva e adicionada ao seu Google Agenda.`,
                href: `/dashboard/audiencias`,
            });
        }
      }
    } catch (calendarError: any) {
      // 3b. On Calendar Failure: Log error and send failure notification
      console.error("Failed to create Google Calendar event, but hearing was saved to Firestore. Error:", calendarError.message);
      if (session?.user?.id) {
          await createNotification({
              userId: session.user.id,
              title: "Falha na Sincronização da Agenda",
              description: `A audiência "${processName}" foi salva, mas falhou ao sincronizar com o Google Agenda.`,
              href: `/dashboard/audiencias`,
          });
      }
    }
    
    return { success: true, message: 'Operação de agendamento concluída.' };

  } catch (error: any) {
    console.error('Error creating hearing:', error);
    throw new Error(error.message || 'Falha ao agendar audiência.');
  }
}

export async function deleteHearing(hearingId: string, googleCalendarEventId?: string) {
  if (!firestoreAdmin) {
    throw new Error('A conexão com o servidor de dados falhou.');
  }

  try {
    // 1. Delete from Google Calendar if an event ID exists
    if (googleCalendarEventId) {
      try {
        const { calendar } = await getGoogleApiClientsForUser();
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: googleCalendarEventId,
        });
        console.log(`Successfully deleted Google Calendar event: ${googleCalendarEventId}`);
      } catch (calendarError: any) {
         if ((calendarError as any).code !== 404) {
            console.error(`Failed to delete Google Calendar event ${googleCalendarEventId}, but proceeding with Firestore deletion. Error: ${(calendarError as any).message}`);
        } else {
            console.log(`Google Calendar event ${googleCalendarEventId} was not found. It might have been deleted already.`);
        }
      }
    }

    // 2. Delete from Firestore
    await firestoreAdmin.collection('hearings').doc(hearingId).delete();
    console.log(`Successfully deleted hearing ${hearingId} from Firestore.`);

    return { success: true, message: 'Audiência excluída com sucesso.' };
  } catch (error: any) {
    console.error('Error deleting hearing:', error);
    throw new Error(error.message || 'Falha ao excluir audiência.');
  }
}
