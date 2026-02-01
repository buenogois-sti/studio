'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, PlusCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { Hearing, Process, Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function AudienciasPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const { firestore, isUserLoading } = useFirebase();

  // Fetch all hearings
  const hearingsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'hearings') : null),
    [firestore]
  );
  const { data: hearingsData, isLoading: isLoadingHearings } = useCollection<Hearing>(hearingsQuery);

  // Fetch all processes
  const processesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'processes') : null),
    [firestore]
  );
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  // Fetch all clients
  const clientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clients') : null),
    [firestore]
  );
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const isLoading = isUserLoading || isLoadingHearings || isLoadingProcesses || isLoadingClients;
  const hearings = hearingsData || [];

  const upcomingHearings = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return hearings
      .filter(h => h.date && (h.date as unknown as Timestamp).toDate() >= today)
      .sort((a, b) => (a.date as unknown as Timestamp).toMillis() - (b.date as unknown as Timestamp).toMillis());
  }, [hearings]);

  const selectedDayHearings = React.useMemo(() => {
    if (!date) return [];
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    const selectedEnd = new Date(selected);
    selectedEnd.setDate(selectedEnd.getDate() + 1);
    
    return hearings.filter(h => {
      if (!h.date) return false;
      const hearingDate = (h.date as unknown as Timestamp).toDate();
      return hearingDate >= selected && hearingDate < selectedEnd;
    });
  }, [hearings, date]);
  
  const getHearingInfo = (hearing: Hearing) => {
    const process = processesMap.get(hearing.processId);
    if (!process) return { processName: 'Processo não encontrado', clientName: 'Cliente não encontrado' };

    const client = clientsMap.get(process.clientId);
    return {
      processName: process.name,
      clientName: client ? `${client.firstName} ${client.lastName}` : 'Cliente não encontrado'
    };
  };

  const formatDate = (date: Timestamp | string) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date.toDate();
    return format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  }
  
  const formatTime = (date: Timestamp | string) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date.toDate();
    return format(dateObj, 'HH:mm', { locale: ptBR });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[350px_1fr] lg:grid-cols-[400px_1fr]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
             <CardTitle className="font-headline">Calendário de Audiências</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border p-0"
              locale={ptBR}
              modifiers={{
                hasHearing: hearings.filter(h => h.date).map(h => (h.date as unknown as Timestamp).toDate())
              }}
              modifiersClassNames={{
                hasHearing: "bg-primary/20 text-primary-foreground rounded-md font-bold"
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-headline text-lg">Próximas Audiências</CardTitle>
             <Button size="sm" className="h-8 gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Agendar</span>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : upcomingHearings.length > 0 ? (
              <div className="space-y-4">
                {upcomingHearings.slice(0, 5).map(hearing => {
                  const { processName, clientName } = getHearingInfo(hearing);
                  return (
                    <div key={hearing.id} className="p-3 rounded-lg border bg-muted/50">
                      <p className="font-semibold text-sm truncate">{processName}</p>
                      <p className="text-xs text-muted-foreground">{clientName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(hearing.date)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma audiência futura agendada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">
            Audiências para {date ? format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) : '...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
              <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
          ) : selectedDayHearings.length > 0 ? (
            <div className="space-y-4">
              {selectedDayHearings.map(hearing => {
                const { processName, clientName } = getHearingInfo(hearing);
                return (
                  <div key={hearing.id} className="p-4 rounded-lg border bg-card flex items-start gap-4">
                    <div className="flex-1 space-y-1">
                      <p className="font-bold">{processName}</p>
                      <p className="text-sm text-muted-foreground">Cliente: {clientName}</p>
                      <p className="text-sm text-muted-foreground">Local: {hearing.location}</p>
                      <p className="text-sm text-muted-foreground">Responsável: {hearing.responsibleParty}</p>
                    </div>
                    <Badge variant="secondary" className="font-mono text-base">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatTime(hearing.date)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
             <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                <CalendarIcon className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Nenhuma audiência para o dia selecionado.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
