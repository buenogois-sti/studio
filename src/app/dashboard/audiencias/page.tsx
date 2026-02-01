
'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, PlusCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Hearing, Process, Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { searchProcesses } from '@/lib/process-actions';
import { createHearing } from '@/lib/hearing-actions';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const hearingSchema = z.object({
  processId: z.string().min(1, 'É obrigatório selecionar um processo.'),
  processName: z.string(),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM).'),
  location: z.string().min(3, 'O local é obrigatório.'),
  responsibleParty: z.string().min(3, 'O responsável é obrigatório.'),
  notes: z.string().optional(),
});


function ProcessSearch({ onSelect, selectedProcess }: { onSelect: (process: Process) => void; selectedProcess: Process | null }) {
  const [search, setSearch] = React.useState('');
  const [results, setResults] = React.useState<Process[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const processes = await searchProcesses(search);
        setResults(processes);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao Buscar Processos', description: error.message });
      } finally {
        setIsLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, toast]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedProcess ? selectedProcess.name : "Selecione um processo..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Buscar processo por nome ou número..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && <CommandEmpty>Buscando...</CommandEmpty>}
            <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
            <CommandGroup>
              {results.map((process) => (
                <CommandItem
                  key={process.id}
                  value={process.name}
                  onSelect={() => {
                    onSelect(process);
                    setOpen(false);
                  }}
                >
                  {process.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


function NewHearingDialog({ onHearingCreated }: { onHearingCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null);

  const form = useForm<z.infer<typeof hearingSchema>>({
    resolver: zodResolver(hearingSchema),
    defaultValues: {
      time: '09:00',
    }
  });

  const onSubmit = async (values: z.infer<typeof hearingSchema>) => {
    setIsSaving(true);
    try {
        const [hours, minutes] = values.time.split(':').map(Number);
        const hearingDateTime = new Date(values.date);
        hearingDateTime.setHours(hours, minutes);

        await createHearing({
            processId: values.processId,
            processName: selectedProcess!.name,
            hearingDate: hearingDateTime.toISOString(),
            location: values.location,
            responsibleParty: values.responsibleParty,
            notes: values.notes,
        });

      toast({
        title: 'Audiência Agendada!',
        description: 'A audiência foi salva e adicionada ao seu Google Agenda.',
      });

      form.reset();
      setSelectedProcess(null);
      onHearingCreated();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao agendar',
        description: error.message || 'Não foi possível salvar a audiência.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only">Agendar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Agendar Nova Audiência</DialogTitle>
          <CardDescription>Preencha os dados para criar a audiência no sistema e no seu Google Agenda.</CardDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="processId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Processo *</FormLabel>
                   <ProcessSearch 
                      selectedProcess={selectedProcess}
                      onSelect={(process) => {
                          setSelectedProcess(process);
                          field.onChange(process.id);
                          form.setValue('processName', process.name);
                      }}
                   />
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data da Audiência *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Hora *</FormLabel>
                        <FormControl>
                            <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Local *</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: Fórum Trabalhista de SBC" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="responsibleParty"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Responsável *</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: Dr. Alan" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Link da audiência, testemunhas, detalhes importantes..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? "Salvando..." : "Salvar Agendamento"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export default function AudienciasPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Fetch all hearings
  const hearingsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'hearings') : null),
    [firestore, refreshKey]
  );
  const { data: hearingsData, isLoading: isLoadingHearings } = useCollection<Hearing>(hearingsQuery);

  // Fetch all processes
  const processesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'processes') : null),
    [firestore, refreshKey]
  );
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  // Fetch all clients
  const clientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clients') : null),
    [firestore, refreshKey]
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
    if (!process) return { processName: 'Processo não encontrado', clientName: 'Cliente não encontrado', clientAvatar: '' };

    const client = clientsMap.get(process.clientId);
    return {
      processName: process.name,
      clientName: client ? `${client.firstName} ${client.lastName}` : 'Cliente não encontrado',
      clientAvatar: client?.avatar || '',
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

  const handleHearingCreated = () => {
    // Increment key to force re-fetch of collections if not using realtime updates
    // For onSnapshot, this helps if queries themselves change, though not strictly needed here.
    setRefreshKey(prev => prev + 1);
  };


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
             <NewHearingDialog onHearingCreated={handleHearingCreated} />
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
                const { processName, clientName, clientAvatar } = getHearingInfo(hearing);
                return (
                  <div key={hearing.id} className="p-4 rounded-lg border bg-card flex items-start gap-4">
                     <Avatar>
                        <AvatarImage src={clientAvatar} />
                        <AvatarFallback>{clientName?.charAt(0) || 'P'}</AvatarFallback>
                    </Avatar>
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
