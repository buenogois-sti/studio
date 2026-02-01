'use client';

import * as React from 'react';
import {
  Calendar as CalendarIcon,
  PlusCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isToday } from 'date-fns';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


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
        <Button size="sm" className="h-9 gap-1">
          <PlusCircle className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Agendar Audiência</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Agendar Nova Audiência</DialogTitle>
          <DialogDescription>Preencha os dados para criar a audiência no sistema e no seu Google Agenda.</DialogDescription>
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

  // Data fetching
  const hearingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'hearings') : null, [firestore, refreshKey]);
  const { data: hearingsData, isLoading: isLoadingHearings } = useCollection<Hearing>(hearingsQuery);

  const processesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'processes') : null, [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  const clientsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const isLoading = isUserLoading || isLoadingHearings || isLoadingProcesses || isLoadingClients;
  const hearings = hearingsData || [];

  // Date and week logic
  const selectedDate = date || new Date();
  const startOfWeekDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const endOfWeekDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: startOfWeekDate, end: endOfWeekDate });

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

  const formatTime = (date: Timestamp | string) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date.toDate();
    return format(dateObj, 'HH:mm', { locale: ptBR });
  }

  const handleRefresh = () => setRefreshKey(prev => prev + 1);
  const goToPreviousWeek = () => setDate(addDays(selectedDate, -7));
  const goToNextWeek = () => setDate(addDays(selectedDate, 7));


  return (
    <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-[1fr_350px]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <h2 className="font-headline text-2xl font-semibold capitalize">
                    {format(startOfWeekDate, 'MMMM yyyy', { locale: ptBR })}
                </h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToPreviousWeek}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" onClick={() => setDate(new Date())}>Hoje</Button>
                    <Button variant="outline" size="icon" onClick={goToNextWeek}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 gap-1" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4" />
                    <span>Sincronizar</span>
                </Button>
                <NewHearingDialog onHearingCreated={handleRefresh} />
             </div>
        </div>

        {isLoading ? (
             <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
             </div>
        ) : (
            <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="pr-4">
                {daysInWeek.map((day, index) => {
                    const hearingsOnDay = hearings
                        .filter(h => h.date && new Date((h.date as unknown as Timestamp).seconds * 1000).toDateString() === day.toDateString())
                        .sort((a,b) => (a.date as unknown as Timestamp).seconds - (b.date as unknown as Timestamp).seconds);
                    
                    return (
                        <div key={index} className="mb-8">
                            <h3 className={cn("font-semibold text-lg mb-4 pl-2 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10 border-b", isToday(day) && "text-primary")}>
                                {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            </h3>
                            {hearingsOnDay.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Hora</TableHead>
                                            <TableHead>Detalhes da Audiência</TableHead>
                                            <TableHead className="hidden md:table-cell">Local</TableHead>
                                            <TableHead className="hidden lg:table-cell">Responsável</TableHead>
                                            <TableHead className="text-right w-[50px]">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {hearingsOnDay.map(hearing => {
                                            const { processName, clientName, clientAvatar } = getHearingInfo(hearing);
                                            return (
                                                <TableRow key={hearing.id} className="hover:bg-muted/50">
                                                    <TableCell className="w-[100px]">
                                                        <Badge variant="secondary" className="font-mono text-base font-semibold">
                                                            {formatTime(hearing.date)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-bold text-base">{processName}</div>
                                                         <div className="flex items-center gap-2 mt-1">
                                                            <Avatar className="h-6 w-6 border">
                                                                <AvatarImage src={clientAvatar} />
                                                                <AvatarFallback>{clientName.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm text-muted-foreground">{clientName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">{hearing.location}</TableCell>
                                                    <TableCell className="hidden lg:table-cell">{hearing.responsibleParty}</TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                                                                <DropdownMenuItem>Editar</DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground px-4 py-8 text-center">Nenhuma audiência agendada para este dia.</p>
                            )}
                        </div>
                    );
                })}
                </div>
            </ScrollArea>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
             <CardTitle className="font-headline">Calendário</CardTitle>
             <CardDescription>Selecione uma data para ver a semana correspondente.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={ptBR}
              modifiers={{ hasHearing: hearings.filter(h => h.date).map(h => (h.date as unknown as Timestamp).toDate()) }}
              modifiersClassNames={{ hasHearing: "bg-primary/20 text-primary-foreground rounded-md" }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
