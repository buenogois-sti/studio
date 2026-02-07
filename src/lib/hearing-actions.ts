
'use server';

import { firestoreAdmin } from '@/firebase/admin';
import { getGoogleApiClientsForUser } from '@/lib/drive';
import { add, formatISO, format } from 'date-fns';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import type { HearingStatus, HearingType, NotificationMethod } from './types';
import { summarizeAddress } from './utils';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { ptBR } from 'date-fns/locale';

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
  createdByName: string;
  clientNotified?: boolean;
  notificationMethod?: string;
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
    `✅ Cliente Avisado? ${data.clientNotified ? 'SIM' : 'NÃO'}`,
    `📢 Meio de Aviso: ${data.notificationMethod || 'Pendente'}`,
    ``,
    `📝 Observações:`,
    `${data.notes || 'Nenhuma anotação no momento.'}`,
    ``,
    `📋 Agendado por: ${data.createdByName}`,
    `🔐 ID Interno: ${data.id}`
  ].join('\n');
}

export async function createHearing(data: {
  processId: string;
  processName: string;
  lawyerId: string;
  hearingDate: string;
  location: string;
  courtBranch?: string;
  responsibleParty: string;
  status: HearingStatus;
  type: HearingType;
  notes?: string;
  clientNotified?: boolean;
  notificationMethod?: NotificationMethod;
}) {
  if (!firestoreAdmin) {
    throw new Error('A conexão com o servidor de dados falhou.');
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Não autenticado.');
  }

  const { 
    processId, lawyerId, hearingDate, location, 
    courtBranch, responsibleParty, status, type, notes,
    clientNotified, notificationMethod 
  } = data;

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

    const lawyerDoc = await firestoreAdmin.collection('staff').doc(lawyerId).get();
    const lawyerData = lawyerDoc.data();
    const lawyerName = lawyerData ? `${lawyerData.firstName} ${lawyerData.lastName}` : 'Advogado';

    const hearingPayload = {
      processId,
      lawyerId,
      lawyerName,
      createdById: session.user.id,
      createdByName: session.user.name || 'Sistema',
      date: Timestamp.fromDate(new Date(hearingDate)),
      location: summarizeAddress(location),
      courtBranch: courtBranch || '',
      responsibleParty,
      status: status || 'PENDENTE',
      type: type || 'OUTRA',
      notes: notes || '',
      clientNotified: !!clientNotified,
      notificationMethod: notificationMethod || null,
      notificationDate: clientNotified ? FieldValue.serverTimestamp() : null,
      createdAt: FieldValue.serverTimestamp(),
    };

    const hearingRef = await firestoreAdmin.collection('hearings').add(hearingPayload);

    // Sincronização com o Google Agenda
    try {
      const { calendar } = await getGoogleApiClientsForUser();
      const startDateTime = new Date(hearingDate);
      const endDateTime = add(startDateTime, { hours: 1 });

      const description = buildCalendarDescription({
        legalArea,
        processNumber,
        clientName: clientInfo.name,
        clientPhone: clientInfo.phone,
        location: summarizeAddress(location),
        courtBranch: courtBranch,
        responsibleParty,
        status: status || 'PENDENTE',
        notes,
        id: hearingRef.id,
        createdByName: session.user.name || 'Sistema',
        clientNotified: !!clientNotified,
        notificationMethod: notificationMethod
      });

      const event = {
        summary: `⚖️ Audiência [${type}] | ${clientInfo.name} (Dr. ${lawyerName})`,
        location: location,
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
      }
    } catch (calendarError: any) {
      console.warn("Calendar sync partially failed:", calendarError.message);
    }

    // Notificar o advogado alvo
    if (lawyerId !== session.user.id) {
      await createNotification({
        userId: lawyerId,
        title: "Nova Audiência Agendada",
        description: `${session.user.name} agendou uma audiência (${type}) para você no processo ${processData?.name}.`,
        type: 'hearing',
        href: `/dashboard/audiencias`,
      });
    }
    
    return { success: true, id: hearingRef.id };
  } catch (error: any) {
    console.error('Error creating hearing:', error);
    throw new Error(error.message || 'Falha ao agendar audiência.');
  }
}

export async function updateHearingStatus(hearingId: string, status: HearingStatus) {
    if (!firestoreAdmin) throw new Error('A conexão com o servidor de dados falhou.');
    
    try {
        const hearingRef = firestoreAdmin.collection('hearings').doc(hearingId);
        const hearingDoc = await hearingRef.get();
        if (!hearingDoc.exists) throw new Error('Audiência não encontrada.');
        const hearing = hearingDoc.data();

        await hearingRef.update({ status, updatedAt: FieldValue.serverTimestamp() });

        if (hearing?.googleCalendarEventId) {
            try {
                const { calendar } = await getGoogleApiClientsForUser();
                const prefix = status === 'REALIZADA' ? '✅ ' : status === 'CANCELADA' ? '❌ ' : status === 'ADIADA' ? '⏳ ' : '';
                
                await calendar.events.patch({
                    calendarId: 'primary',
                    eventId: hearing.googleCalendarEventId,
                    requestBody: {
                        summary: `${prefix}Audiência [${hearing.type}] | ${hearing.responsibleParty}`,
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

export async function processHearingReturn(hearingId: string, data: { resultNotes: string; nextStepType?: string; nextStepDeadline?: string }) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const hearingRef = firestoreAdmin.collection('hearings').doc(hearingId);
    const hearingSnap = await hearingRef.get();
    const hearingData = hearingSnap.data();
    
    if (!hearingSnap.exists || !hearingData) throw new Error('Audiência não encontrada.');

    const batch = firestoreAdmin.batch();

    // 1. Atualizar status da audiência
    batch.update(hearingRef, {
      status: 'REALIZADA',
      resultNotes: data.resultNotes,
      hasFollowUp: true,
      updatedAt: FieldValue.serverTimestamp()
    });

    // 2. Criar evento na timeline do processo
    const processRef = firestoreAdmin.collection('processes').doc(hearingData.processId);
    const timelineEvent = {
      id: uuidv4(),
      type: 'hearing',
      description: `RESULTADO DA AUDIÊNCIA (${hearingData.type}): ${data.resultNotes}`,
      date: Timestamp.now(),
      authorName: session.user.name || 'Advogado'
    };
    batch.update(processRef, {
      timeline: FieldValue.arrayUnion(timelineEvent),
      updatedAt: FieldValue.serverTimestamp()
    });

    // 3. Agendar próximo passo no Google Tasks se houver prazo
    if (data.nextStepType && data.nextStepDeadline) {
      try {
        const { tasks } = await getGoogleApiClientsForUser();
        const taskDate = new Date(data.nextStepDeadline);
        taskDate.setUTCHours(0, 0, 0, 0);

        await tasks.tasks.insert({
          tasklist: '@default',
          requestBody: {
            title: `📋 SEGUIMENTO: ${data.nextStepType} | ${hearingData.processName || 'Processo'}`,
            notes: `Referente ao retorno da audiência realizada em ${format(hearingData.date.toDate(), 'dd/MM/yyyy')}.\nResultado: ${data.resultNotes}`,
            due: taskDate.toISOString(),
          }
        });
      } catch (e) {
        console.warn('Google Tasks sync failed during hearing return:', e);
      }
    }

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
