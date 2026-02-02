'use client';

import * as React from 'react';
import {
  PlusCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  MoreVertical,
  Calendar as CalendarIcon,
  List as ListIcon,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock3,
  Filter,
  ChevronLeft,
  ChevronRight,
  Gavel
} from 'lucide-react';
import { format, addDays, isToday, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Hearing, Process, Client, HearingStatus, HearingType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { searchProcesses } from '@/lib/process-actions';
import { createHearing, deleteHearing, updateHearingStatus } from '@/lib/hearing-actions';
import { cn } from '@/lib/utils';
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
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { H1 } from '@/components/ui/typography';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const hearingSchema = z.object({
  processId: z.string().min(1, 'É obrigatório selecionar um processo.'),
  processName: z.string(),
  date: z.coerce.date({ required_error: 'A data é obrigatória.' }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM).'),
  location: z.string().min(3, 'O local é obrigatório.'),
  responsibleParty: z.string().min(3, 'O responsável é obrigatório.'),
  type: z.enum(['CONCILIACAO', 'INSTRUCAO', 'UNA', 'JULGAMENTO', 'OUTRA']),
  status: z.enum(['PENDENTE', 'REALIZADA', 'CANCELADA', 'ADIADA']).default('PENDENTE'),
  notes: z.string().optional(),
});

const hearingTypes: { value: HearingType; label: string }[] = [
    { value: 'CONCILIACAO', label: 'Conciliação' },
    { value: 'INSTRUCAO', label: 'Instrução' },
    { value: 'UNA', label: 'Una' },
    { value: 'JULGAMENTO', label: 'Julgamento' },
    { value: 'OUTRA', label: 'Outra' },
];

const statusConfig: Record<HearingStatus, { label: string; icon: any; color: string }> = {
    PENDENTE: { label: 'Pendente', icon: Clock3, color: 'text-blue-500 bg-blue-500/10' },
    REALIZADA: { label: 'Realizada', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
    CANCELADA: { label: 'Cancelada', icon: XCircle, color: 'text-rose-500 bg-rose-500/10' },
    ADIADA: { label: 'Adiada', icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10' },
};

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
        toast({ variant: 'destructive', title: 'Erro ao Buscar', description: error.message });
      } finally {
        setIsLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, toast]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between h-11 font-normal">
          {selectedProcess ? selectedProcess.name : "Selecione um processo..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar processo..." value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && <CommandEmpty>Buscando...</CommandEmpty>}
            <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
            <CommandGroup>
              {results.map((process) => (
                <CommandItem key={process.id} value={process.name} onSelect={() => { onSelect(process); setOpen(false); }}>
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

function NewHearingDialog({ onHearingCreated, hearingsData }: { onHearingCreated: () => void; hearingsData: Hearing[] | null }) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null);

  const form = useForm<z.infer<typeof hearingSchema>>({
    resolver: zodResolver(hearingSchema),
    defaultValues: { time: '09:00', type: 'UNA', status: 'PENDENTE' }
  });

  const watchedDate = form.watch('date');
  const watchedTime = form.watch('time');

  const conflict = React.useMemo(() => {
    if (!watchedDate || !watchedTime || !hearingsData) return null;
    const [hours, minutes] = watchedTime.split(':').map(Number);
    const checkDate = new Date(watchedDate);
    checkDate.setHours(hours, minutes, 0, 0);

    return hearingsData.find(h => {
        const hDate = h.date.toDate();
        hDate.setSeconds(0);
        hDate.setMilliseconds(0);
        return hDate.getTime() === checkDate.getTime();
    });
  }, [watchedDate, watchedTime, hearingsData]);

  const onSubmit = async (values: z.infer<typeof hearingSchema>) => {
    setIsSaving(true);
    try {
        const [hours, minutes] = values.time.split(':').map(Number);
        const hearingDateTime = new Date(values.date);
        hearingDateTime.setHours(hours, minutes);

        await createHearing({
            ...values,
            processName: selectedProcess!.name,
            hearingDate: hearingDateTime.toISOString(),
        });

      form.reset();
      setSelectedProcess(null);
      onHearingCreated();
      setOpen(false);
      toast({ title: 'Audiência Agendada!' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao agendar', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-1 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="h-4 w-4" />
          <span>Novo Agendamento</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agendar Nova Audiência</DialogTitle>
          <DialogDescription>Sincronização automática com Google Agenda e notificações.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
             <FormField
              control={form.control}
              name="processId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Processo Vinculado *</FormLabel>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Tipo..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {hearingTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data *</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-11" {...field} value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : field.value || ''} />
                      </FormControl>
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
                        <FormControl><Input type="time" className="h-11" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {conflict && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-medium animate-pulse">
                    <AlertTriangle className="h-4 w-4" />
                    Atenção: Já existe uma audiência agendada para este mesmo horário.
                </div>
            )}

             <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Local da Audiência *</FormLabel>
                    <FormControl><Input placeholder="Ex: Sala 02 - Fórum Trabalhista de SBC" className="h-11" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            
            <FormField
                control={form.control}
                name="responsibleParty"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Advogado Responsável *</FormLabel>
                    <FormControl><Input placeholder="Ex: Dr. Alan Bueno" className="h-11" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

             <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Notas e Observações</FormLabel>
                    <FormControl><Textarea placeholder="Link da audiência, testemunhas, lembretes..." className="resize-none" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <DialogFooter className="gap-2 border-t pt-6">
                <DialogClose asChild><Button type="button" variant="ghost" disabled={isSaving}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? "Gravando..." : "Confirmar Agendamento"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function MonthCalendar({ hearings, onDateClick, processesMap }: { hearings: Hearing[], onDateClick: (date: Date) => void, processesMap: Map<string, Process> }) {
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const getHearingsForDay = (day: Date) => {
        return hearings.filter(h => isSameDay(h.date.toDate(), day));
    };

    return (
        <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-muted/10">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold font-headline capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</h2>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="h-4 w-4"/></Button>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
            </div>
            <div className="grid grid-cols-7 border-b bg-muted/30">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} className="p-2 text-center text-[10px] font-black uppercase text-muted-foreground">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                    const dayHearings = getHearingsForDay(day);
                    const isSelected = isSameMonth(day, monthStart);
                    const isTodayDay = isToday(day);

                    return (
                        <div 
                            key={i} 
                            className={cn(
                                "min-h-[120px] p-2 border-r border-b relative group hover:bg-muted/20 transition-colors cursor-pointer",
                                !isSelected && "bg-muted/10 opacity-40"
                            )}
                            onClick={() => onDateClick(day)}
                        >
                            <div className={cn(
                                "text-sm font-bold flex items-center justify-center w-7 h-7 rounded-full transition-colors",
                                isTodayDay && "bg-primary text-primary-foreground"
                            )}>
                                {format(day, 'd')}
                            </div>
                            <div className="mt-2 space-y-1">
                                {dayHearings.slice(0, 3).map(h => (
                                    <div key={h.id} className="text-[9px] p-1 rounded bg-primary/10 border-l-2 border-primary truncate font-bold uppercase tracking-tighter">
                                        {format(h.date.toDate(), 'HH:mm')} - {processesMap.get(h.processId)?.name || '...'}
                                    </div>
                                ))}
                                {dayHearings.length > 3 && (
                                    <div className="text-[9px] text-muted-foreground font-bold text-center">
                                        + {dayHearings.length - 3} mais
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function AudienciasPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [hearingToDelete, setHearingToDelete] = React.useState<Hearing | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar'>('list');
  const { toast } = useToast();

  const hearingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'hearings') : null, [firestore, refreshKey]);
  const { data: hearingsData, isLoading: isLoadingHearings } = useCollection<Hearing>(hearingsQuery);

  const processesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'processes') : null, [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  const clientsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const isLoading = isUserLoading || isLoadingHearings || isLoadingProcesses || isLoadingClients;
  
  const handleUpdateStatus = async (hearingId: string, status: HearingStatus) => {
      try {
          await updateHearingStatus(hearingId, status);
          toast({ title: 'Status atualizado!' });
          setRefreshKey(prev => prev + 1);
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Erro', description: e.message });
      }
  };

  const handleDelete = async () => {
    if (!hearingToDelete) return;
    setIsDeleting(true);
    try {
        await deleteHearing(hearingToDelete.id, hearingToDelete.googleCalendarEventId);
        toast({ title: 'Audiência Excluída' });
        setRefreshKey(prev => prev + 1);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
        setHearingToDelete(null);
        setIsDeleting(false);
    }
  };

  const todayHearings = React.useMemo(() => {
      if (!hearingsData) return [];
      return hearingsData.filter(h => isToday(h.date.toDate())).sort((a, b) => a.date.seconds - b.date.seconds);
  }, [hearingsData]);

  const weekDays = React.useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) days.push(addDays(today, i));
    return days;
  }, []);

  return (
    <>
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <H1>Agenda de Audiências</H1>
                    <p className="text-sm text-muted-foreground">Gestão integrada de compromissos judiciais.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9" onClick={() => setRefreshKey(k => k+1)}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                        Sincronizar
                    </Button>
                    <NewHearingDialog onHearingCreated={() => setRefreshKey(k => k+1)} hearingsData={hearingsData} />
                </div>
            </div>

            {/* Hoje Quick View */}
            {todayHearings.length > 0 && (
                <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-primary">
                            <Gavel className="h-5 w-5" />
                            <CardTitle className="text-lg">Foco de Hoje: {todayHearings.length} Audiência(s)</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {todayHearings.map(h => (
                            <div key={h.id} className="p-4 rounded-xl bg-background border shadow-sm space-y-3 relative group">
                                <div className="absolute top-2 right-2">
                                    <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", statusConfig[h.status || 'PENDENTE'].color)}>
                                        {statusConfig[h.status || 'PENDENTE'].label}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center border border-primary/20">
                                        <span className="text-[10px] font-black leading-none">{format(h.date.toDate(), 'HH:mm')}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm truncate">{processesMap.get(h.processId)?.name || 'Processo'}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{h.type}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{h.location}</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)} className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="list" className="gap-2"><ListIcon className="h-4 w-4"/> Próximos 7 Dias</TabsTrigger>
                        <TabsTrigger value="calendar" className="gap-2"><CalendarIcon className="h-4 w-4"/> Visão Mensal</TabsTrigger>
                    </TabsList>
                    
                    <div className="flex items-center gap-2">
                        <Select defaultValue="all">
                            <SelectTrigger className="w-[150px] h-9">
                                <Filter className="h-3.5 w-3.5 mr-2" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos Status</SelectItem>
                                <SelectItem value="PENDENTE">Pendentes</SelectItem>
                                <SelectItem value="REALIZADA">Realizadas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <TabsContent value="list">
                    <Card>
                        <CardContent className="p-0">
                            <Accordion type="single" collapsible defaultValue={`day-${new Date().toISOString().split('T')[0]}`} className="w-full">
                                {weekDays.map(day => {
                                    const dayKey = `day-${day.toISOString().split('T')[0]}`;
                                    const daily = hearingsData?.filter(h => isSameDay(h.date.toDate(), day)) || [];
                                    const isDayToday = isToday(day);

                                    return (
                                        <AccordionItem value={dayKey} key={dayKey} className="border-b px-6">
                                            <AccordionTrigger className="hover:no-underline py-6">
                                                <div className="flex items-center justify-between w-full pr-4">
                                                    <div className='flex items-center gap-4'>
                                                        <div className={cn(
                                                            "flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 transition-colors",
                                                            isDayToday ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
                                                        )}>
                                                            <span className="text-[10px] font-black uppercase text-muted-foreground">{format(day, 'MMM', { locale: ptBR })}</span>
                                                            <span className="text-xl font-black leading-none">{format(day, 'dd')}</span>
                                                        </div>
                                                        <div className="text-left">
                                                            <span className='font-headline text-lg font-bold capitalize block'>{isDayToday ? 'Hoje' : format(day, "EEEE", { locale: ptBR })}</span>
                                                            <span className="text-xs text-muted-foreground">{format(day, "d 'de' MMMM", { locale: ptBR })}</span>
                                                        </div>
                                                    </div>
                                                    {daily.length > 0 && <Badge variant="secondary" className="font-bold">{daily.length} Compromisso(s)</Badge>}
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-6">
                                                {isLoading ? <Skeleton className="h-20 w-full" /> : daily.length > 0 ? (
                                                    <div className="grid gap-3">
                                                        {daily.sort((a, b) => a.date.seconds - b.date.seconds).map(h => {
                                                            const p = processesMap.get(h.processId);
                                                            const c = p ? clientsMap.get(p.clientId) : null;
                                                            const StatusIcon = statusConfig[h.status || 'PENDENTE'].icon;

                                                            return (
                                                                <div key={h.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-all group">
                                                                    <div className="flex flex-col items-center justify-center p-2 bg-muted/50 rounded-lg min-w-[70px]">
                                                                        <Clock className="h-3 w-3 text-muted-foreground mb-1" />
                                                                        <span className="text-sm font-black">{format(h.date.toDate(), 'HH:mm')}</span>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{h.type}</Badge>
                                                                            <span className="text-[10px] text-muted-foreground">•</span>
                                                                            <span className="text-[10px] text-muted-foreground font-bold uppercase truncate">{h.location}</span>
                                                                        </div>
                                                                        <h4 className="font-bold text-base truncate">{p?.name}</h4>
                                                                        <p className="text-xs text-muted-foreground">{c?.firstName} {c?.lastName}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <Badge variant="outline" className={cn("gap-1.5 h-7 px-3", statusConfig[h.status || 'PENDENTE'].color)}>
                                                                            <StatusIcon className="h-3 w-3" />
                                                                            {statusConfig[h.status || 'PENDENTE'].label}
                                                                        </Badge>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="w-56">
                                                                                <DropdownMenuLabel>Gestão da Audiência</DropdownMenuLabel>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onSelect={() => handleUpdateStatus(h.id, 'REALIZADA')}>Marcar como Realizada</DropdownMenuItem>
                                                                                <DropdownMenuItem onSelect={() => handleUpdateStatus(h.id, 'ADIADA')}>Marcar como Adiada</DropdownMenuItem>
                                                                                <DropdownMenuItem onSelect={() => handleUpdateStatus(h.id, 'CANCELADA')} className="text-rose-500">Marcar como Cancelada</DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem>Ver Processo</DropdownMenuItem>
                                                                                <DropdownMenuItem className="text-destructive" onSelect={() => setHearingToDelete(h)}>Excluir Agendamento</DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="text-center text-muted-foreground p-12 border border-dashed rounded-xl bg-muted/5">
                                                        Nenhuma audiência agendada para este dia.
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })}
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="calendar">
                    {hearingsData && (
                        <MonthCalendar 
                            hearings={hearingsData} 
                            processesMap={processesMap}
                            onDateClick={(d) => {
                                toast({ title: `Dia selecionado: ${format(d, 'dd/MM/yyyy')}` });
                            }} 
                        />
                    )}
                </TabsContent>
            </Tabs>
        </div>
        
        <AlertDialog open={!!hearingToDelete} onOpenChange={(open) => !isDeleting && !open && setHearingToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja excluir esta audiência? Esta ação também removerá o evento do Google Agenda.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Excluir permanentemente'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
