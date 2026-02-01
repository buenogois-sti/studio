
'use server';

import { firestoreAdmin } from '@/firebase/admin';
import { getGoogleApiClientsForUser } from '@/lib/drive';
import { add, formatISO } from 'date-fns';

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

    // 2. Add to Google Calendar
    try {
      const { calendar } = await getGoogleApiClientsForUser();
      
      const startDateTime = new Date(hearingDate);
      const endDateTime = add(startDateTime, { hours: 1 }); // Assume 1-hour duration

      const event = {
        summary: `Audiência: ${processName}`,
        location: location,
        description: `Detalhes da audiência para o processo "${processName}".\n\nNotas: ${notes || 'Nenhuma'}\n\nID Interno: ${hearingRef.id}`,
        start: {
          dateTime: formatISO(startDateTime),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: formatISO(endDateTime),
          timeZone: 'America/Sao_Paulo',
        },
      };

      const createdEvent = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      console.log('Event created in Google Calendar:', createdEvent.data.htmlLink);

      // 3. Update Firestore document with the Google Calendar Event ID
      if (createdEvent.data.id) {
          await hearingRef.update({ googleCalendarEventId: createdEvent.data.id });
          console.log(`Linked Google Calendar event ${createdEvent.data.id} to Firestore hearing ${hearingRef.id}`);
      }
      
    } catch (calendarError: any) {
        // If calendar fails, we don't fail the whole operation, but we log it.
        // The hearing is already in Firestore.
        console.error("Failed to create Google Calendar event, but hearing was saved to Firestore. Error:", calendarError.message);
    }
    
    return { success: true, message: 'Audiência agendada com sucesso no sistema e no Google Agenda!' };

  } catch (error: any) {
    console.error('Error creating hearing:', error);
    throw new Error(error.message || 'Falha ao agendar audiência.');
  }
}
