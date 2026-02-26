
'use server';

import { firestoreAdmin } from '@/firebase/admin';
import { getGoogleClientsForStaff } from '@/lib/drive';
import { add, formatISO, format, parseISO } from 'date-fns';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createNotification } from './notification-actions';
import type { Hearing, HearingStatus, HearingType, NotificationMethod, TimelineEvent } from './types';
import { summarizeAddress } from './utils';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { ptBR } from 'date-fns/locale';
import { revalidatePath } from 'next/cache';
import { createFinancialEventAndTitles } from './finance-actions';
import { createLegalDeadline } from './deadline-actions';

/**
 * Utility to ensure a date string has the correct Brazil offset (-03:00)
 */
function ensureBrazilOffset(dateStr: string): string {
  if (!dateStr) return dateStr;
  // If it already has an offset or Z, leave it
  if (dateStr.includes('-03:00') || dateStr.endsWith('Z')) return dateStr;
  // If it has 'T' but no offset, append -03:00
  if (dateStr.includes('T') && !dateStr.includes('+') && !dateStr.match(/-\d{2}:\d{2}$/)) {
    return `${dateStr}:00-03:00`;
  }
  return dateStr;
}

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
  meetingLink?: string;
  meetingPassword?: string;
  id: string;
  createdByName: string;
  clientNotified?: boolean;
  notificationMethod?: string;
  isMeeting?: boolean;
}) {
  const cleanPhone = data.clientPhone.replace(/\D/g, '');
  const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}` : 'Telefone não disponível';

  const typeLabel = data.isMeeting ? '🗓️ ATENDIMENTO / REUNIÃO' : '📌 PROCESSO JUDICIAL';
  const returnUrl = `https://www.buenogoisadvogado.com.br/dashboard/audiencias?returnId=${data.id}`;

  const sections = [
    typeLabel,
    data.isMeeting ? `Finalidade: ${data.legalArea}` : `Tipo: ${data.legalArea}`,
    ``,
    `🔗 DAR RETORNO NO LEXFLOW:`,
    `${returnUrl}`,
    ``,
    `🔢 Número do Processo:`,
    `${data.processNumber}`,
    ``,
    data.isMeeting ? `📍 Local/Modo:` : `⚖️ Juízo / Vara:`,
    `${data.courtBranch || data.location || 'Não informado'}`,
    ``
  ];

  if (data.meetingLink) {
    sections.push(`🔗 LINK DA SALA VIRTUAL:`);
    sections.push(`${data.meetingLink}`);
    if (data.meetingPassword) {
      sections.push(`🔑 SENHA DE ACESSO: ${data.meetingPassword}`);
    }
    sections.push(``);
  }

  sections.push(
    `👤 Cliente:`,
    `${data.clientName} - ${data.clientPhone}`,
    `Link WhatsApp: ${whatsappLink}`,
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
  );

  return sections.join('\n');
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
  meetingLink?: string;
  meetingPassword?: string;
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

  // Ensure date has correct offset for Brazil
  const normalizedDate = ensureBrazilOffset(data.hearingDate);

  const { 
    processId, lawyerId, location, 
    courtBranch, responsibleParty, status, type, notes,
    meetingLink, meetingPassword,
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

    const hearingDateTime = parseISO(normalizedDate);

    const hearingPayload = {
      processId,
      lawyerId,
      lawyerName,
      createdById: session.user.id,
      createdByName: session.user.name || 'Sistema',
      date: Timestamp.fromDate(hearingDateTime),
      location: type === 'ATENDIMENTO' ? location : summarizeAddress(location),
      courtBranch: courtBranch || '',
      responsibleParty,
      status: status || 'PENDENTE',
      type: type || 'OUTRA',
      notes: notes || '',
      meetingLink: meetingLink || '',
      meetingPassword: meetingPassword || '',
      clientNotified: !!clientNotified,
      notificationMethod: notificationMethod || null,
      notificationDate: clientNotified ? FieldValue.serverTimestamp() : null,
      createdAt: FieldValue.serverTimestamp(),
      hasFollowUp: false
    };

    const hearingRef = await firestoreAdmin.collection('hearings').add(hearingPayload);

    // Timeline do Processo
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: type === 'ATENDIMENTO' ? 'meeting' : 'hearing',
      description: `${type === 'ATENDIMENTO' ? 'ATENDIMENTO AGENDADO' : 'AUDIÊNCIA AGENDADA'}: ${type} para o dia ${format(hearingDateTime, 'dd/MM/yyyy HH:mm', { locale: ptBR })}. Local: ${location}.${meetingLink ? ' Link virtual configurado.' : ''}`,
      date: Timestamp.now() as any,
      authorName: session.user.name || 'Sistema'
    };

    await firestoreAdmin.collection('processes').doc(processId).update({
      timeline: FieldValue.arrayUnion(timelineEvent),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Sincronização com o Google Workspace (Agenda e Tasks)
    try {
      const { calendar, tasks } = await getGoogleClientsForStaff(lawyerId);
      const startDateTime = hearingDateTime;
      const endDateTime = add(startDateTime, { hours: 1 });
      const reminderTime = add(startDateTime, { hours: 1, minutes: 30 });

      const isMeeting = type === 'ATENDIMENTO';

      const description = buildCalendarDescription({
        legalArea,
        processNumber,
        clientName: clientInfo.name,
        clientPhone: clientInfo.phone,
        location: isMeeting ? location : summarizeAddress(location),
        courtBranch: courtBranch,
        responsibleParty,
        status: status || 'PENDENTE',
        notes,
        meetingLink,
        meetingPassword,
        id: hearingRef.id,
        createdByName: session.user.name || 'Sistema',
        clientNotified: !!clientNotified,
        notificationMethod: notificationMethod,
        isMeeting
      });

      // 1. Criar Evento na Agenda
      const summaryPrefix = isMeeting ? '🗓️ REUNIÃO' : (type === 'PERICIA' ? '🔍 Perícia' : '⚖️ Audiência');
      const event = {
        summary: `${summaryPrefix} [${type}] | ${clientInfo.name} (Dr. ${lawyerName})`,
        location: meetingLink || location,
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

      // 2. Criar Tarefa de Lembrete de Retorno (Google Tasks)
      try {
        await tasks.tasks.insert({
          tasklist: '@default',
          requestBody: {
            title: `📝 EMITIR RELATÓRIO: ${clientInfo.name}`,
            notes: `O ato processual encerrou. Clique para preencher o retorno: https://www.buenogoisadvogado.com.br/dashboard/audiencias?returnId=${hearingRef.id}`,
            due: reminderTime.toISOString(),
          }
        });
      } catch (tError) {
        console.warn("Tasks sync failed:", tError);
      }

      if (createdEvent.data.id) {
        await hearingRef.update({ googleCalendarEventId: createdEvent.data.id });
      }
    } catch (calendarError: any) {
      console.warn("Workspace sync partially failed:", calendarError.message);
    }

    // Notificar o advogado alvo
    if (lawyerId !== session.user.id) {
      await createNotification({
        userId: lawyerId,
        title: "Novo Atendimento Agendado",
        description: `${session.user.name} agendou um compromisso (${type}) para você no processo ${processData?.name}.`,
        type: 'hearing',
        href: `/dashboard/audiencias`,
      });
    }
    
    revalidatePath('/dashboard/audiencias');
    return { success: true, id: hearingRef.id };
  } catch (error: any) {
    console.error('Error creating hearing/meeting:', error);
    throw new Error(error.message || 'Falha ao realizar agendamento.');
  }
}

export async function updateHearing(hearingId: string, data: Partial<Hearing>) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const hearingRef = firestoreAdmin.collection('hearings').doc(hearingId);
    const hearingSnap = await hearingRef.get();
    if (!hearingSnap.exists) throw new Error('Audiência não encontrada.');
    const oldData = hearingSnap.data() as Hearing;

    const lawyerDoc = await firestoreAdmin.collection('staff').doc(data.lawyerId || oldData.lawyerId).get();
    const lawyerData = lawyerDoc.data();
    const lawyerName = lawyerData ? `${lawyerData.firstName} ${lawyerData.lastName}` : oldData.lawyerName;

    const updatePayload: any = {
      ...data,
      lawyerName,
      updatedAt: FieldValue.serverTimestamp(),
    };

    let updatedDateTime: Date | null = null;
    if (data.date) {
      const normalizedDate = ensureBrazilOffset(data.date as any);
      updatedDateTime = parseISO(normalizedDate);
      updatePayload.date = Timestamp.fromDate(updatedDateTime);
    }

    await hearingRef.update(updatePayload);

    // Sincronizar com Google Calendar se houver ID
    if (oldData.googleCalendarEventId) {
      try {
        const { calendar } = await getGoogleClientsForStaff(data.lawyerId || oldData.lawyerId);
        
        const processDoc = await firestoreAdmin.collection('processes').doc(oldData.processId).get();
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

        const startDateTime = updatedDateTime || oldData.date.toDate();
        const endDateTime = add(startDateTime, { hours: 1 });

        const description = buildCalendarDescription({
          legalArea: processData?.legalArea || 'N/A',
          processNumber: processData?.processNumber || 'N/A',
          clientName: clientInfo.name,
          clientPhone: clientInfo.phone,
          location: data.location || oldData.location,
          courtBranch: data.courtBranch || oldData.courtBranch,
          responsibleParty: data.responsibleParty || oldData.responsibleParty,
          status: data.status || oldData.status,
          notes: data.notes || oldData.notes,
          meetingLink: data.meetingLink || oldData.meetingLink,
          meetingPassword: data.meetingPassword || oldData.meetingPassword,
          id: hearingId,
          createdByName: oldData.createdByName,
          clientNotified: data.clientNotified ?? oldData.clientNotified,
          notificationMethod: data.notificationMethod || oldData.notificationMethod,
          isMeeting: (data.type || oldData.type) === 'ATENDIMENTO'
        });

        const summaryPrefix = (data.type || oldData.type) === 'ATENDIMENTO' ? '🗓️ REUNIÃO' : ((data.type || oldData.type) === 'PERICIA' ? '🔍 Perícia' : '⚖️ Audiência');

        await calendar.events.patch({
          calendarId: 'primary',
          eventId: oldData.googleCalendarEventId,
          requestBody: {
            summary: `${summaryPrefix} [${data.type || oldData.type}] | ${clientInfo.name} (Dr. ${lawyerName})`,
            location: data.meetingLink || data.location || oldData.location,
            description: description,
            start: { dateTime: formatISO(startDateTime), timeZone: 'America/Sao_Paulo' },
            end: { dateTime: formatISO(endDateTime), timeZone: 'America/Sao_Paulo' },
          }
        });
      } catch (e) {
        console.warn('[updateHearing] Falha ao atualizar Google Calendar:', e);
      }
    }

    revalidatePath('/dashboard/audiencias');
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
        if (!hearingDoc.exists) throw new Error('Agendamento não encontrado.');
        const hearing = hearingDoc.data();

        await hearingRef.update({ status, updatedAt: FieldValue.serverTimestamp() });

        if (hearing?.googleCalendarEventId && hearing.lawyerId) {
            try {
                const { calendar } = await getGoogleClientsForStaff(hearing.lawyerId);
                
                if (status === 'ADIADA' || status === 'CANCELADA') {
                  await calendar.events.delete({
                    calendarId: 'primary',
                    eventId: hearing.googleCalendarEventId,
                  });
                  await hearingRef.update({ googleCalendarEventId: FieldValue.delete() });
                } else {
                  const prefix = status === 'REALIZADA' ? '✅ ' : '';
                  const isMeeting = hearing.type === 'ATENDIMENTO';
                  const typeLabel = isMeeting ? 'Reunião' : (hearing.type === 'PERICIA' ? 'Perícia' : 'Audiência');
                  
                  await calendar.events.patch({
                      calendarId: 'primary',
                      eventId: hearing.googleCalendarEventId,
                      requestBody: {
                          summary: `${prefix}${typeLabel} [${hearing.type}] | ${hearing.responsibleParty}`,
                      }
                  });
                }
            } catch (calendarError: any) {
                console.warn("Could not update calendar event status:", calendarError.message);
            }
        }

        revalidatePath('/dashboard/audiencias');
        return { success: true };
    } catch (e: any) {
        throw new Error(e.message || 'Falha ao atualizar status.');
    }
}

export async function processHearingReturn(hearingId: string, data: { 
  resultNotes: string; 
  nextStepType?: string; 
  nextStepDeadline?: string;
  createLegalDeadline?: boolean;
  scheduleNewHearing?: boolean;
  newHearingType?: HearingType;
  newHearingDate?: string;
  newHearingTime?: string;
  dateNotSet?: boolean;
  hasAgreement?: boolean;
  agreementValue?: number;
  agreementInstallments?: number;
  agreementFirstDueDate?: string;
}) {
  if (!firestoreAdmin) throw new Error('Servidor indisponível.');
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Não autenticado.');

  try {
    const hearingRef = firestoreAdmin.collection('hearings').doc(hearingId);
    const hearingSnap = await hearingRef.get();
    const hearingData = hearingSnap.data();
    
    if (!hearingSnap.exists || !hearingData) throw new Error('Ato não encontrado.');

    const batch = firestoreAdmin.batch();

    // 1. Atualizar status do ato atual para REALIZADA
    batch.update(hearingRef, {
      status: 'REALIZADA',
      resultNotes: data.resultNotes,
      hasFollowUp: true,
      updatedAt: FieldValue.serverTimestamp()
    });

    // 2. Criar evento na timeline do processo
    const processRef = firestoreAdmin.collection('processes').doc(hearingData.processId);
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: hearingData.type === 'PERICIA' ? 'pericia' : 'hearing',
      description: `RESULTADO DO ATO (${hearingData.type}): ${data.resultNotes}${data.dateNotSet ? " | NOTA: Nova data não designada em ata, consultar autos posteriormente." : ""}`,
      date: Timestamp.now() as any,
      authorName: session.user.name || 'Advogado'
    };
    batch.update(processRef, {
      timeline: FieldValue.arrayUnion(timelineEvent),
      updatedAt: FieldValue.serverTimestamp()
    });

    // 3. Processar Acordo (se houver)
    if (data.hasAgreement && data.agreementValue && data.agreementValue > 0) {
      await createFinancialEventAndTitles({
        processId: hearingData.processId,
        type: 'ACORDO',
        eventDate: hearingData.date.toDate(),
        description: `Acordo Judicial em Audiência (${hearingData.type})`,
        totalValue: data.agreementValue,
        installments: data.agreementInstallments || 1,
        firstDueDate: data.agreementFirstDueDate ? new Date(data.agreementFirstDueDate) : new Date(),
      });
    }

    // 4. Lançar Prazo Fatal Oficial (se marcado)
    if (data.createLegalDeadline && data.nextStepDeadline && data.nextStepType) {
      const start = hearingData.date.toDate();
      const end = new Date(data.nextStepDeadline);
      const daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      await createLegalDeadline({
        processId: hearingData.processId,
        type: data.nextStepType,
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: data.nextStepDeadline,
        daysCount: daysCount,
        isBusinessDays: true, // Padrão Bueno Gois para prazos judiciais
        observations: `Gerado automaticamente via retorno de audiência (${hearingData.type}).`
      });
    }

    // 5. Agendar iterações futuras (Respeitando o advogado do ato)
    const { tasks } = await getGoogleClientsForStaff(hearingData.lawyerId);

    // 5.1. Tarefa de seguimento genérica (Se não for prazo fatal oficial)
    if (!data.createLegalDeadline && data.nextStepType && data.nextStepDeadline) {
      try {
        const taskDate = new Date(data.nextStepDeadline);
        taskDate.setUTCHours(0, 0, 0, 0);

        await tasks.tasks.insert({
          tasklist: '@default',
          requestBody: {
            title: `📋 SEGUIMENTO: ${data.nextStepType} | ${hearingData.processName || 'Processo'}`,
            notes: `Referente ao retorno do ato realizado em ${format(hearingData.date.toDate(), 'dd/MM/yyyy', { locale: ptBR })}.\nResultado: ${data.resultNotes}`,
            due: taskDate.toISOString(),
          }
        });
      } catch (e) {
        console.warn('Google Tasks sync failed during hearing return:', e);
      }
    }

    // 5.2. Agendar nova data (se designada em ata e data selecionada)
    if (data.scheduleNewHearing && !data.dateNotSet && data.newHearingDate && data.newHearingTime) {
      const newHearingDateISO = `${data.newHearingDate}T${data.newHearingTime}`;
      await createHearing({
        processId: hearingData.processId,
        processName: hearingData.processName,
        lawyerId: hearingData.lawyerId,
        hearingDate: newHearingDateISO,
        location: hearingData.location,
        courtBranch: hearingData.courtBranch,
        responsibleParty: hearingData.responsibleParty,
        status: 'PENDENTE',
        type: data.newHearingType || 'UNA',
        notes: `Designada em ata após o ato de ${format(hearingData.date.toDate(), 'dd/MM/yyyy', { locale: ptBR })}`
      });
    }

    await batch.commit();
    revalidatePath('/dashboard/audiencias');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
