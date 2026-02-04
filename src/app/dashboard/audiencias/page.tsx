
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
  Gavel,
  Check,
  ChevronsUpDown,
  Search,
  User,
  Hash,
  History
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
import type { Hearing, Process, Client, HearingStatus, HearingType, Staff } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { searchProcesses } from '@/lib/process-actions';
import { createHearing, deleteHearing, updateHearingStatus, syncHearings } from '@/lib/hearing-actions';
import { cn, summarizeAddress } from '@/lib/utils';
import { LocationSearch } from '@/components/shared/LocationSearch';
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
import { ScrollArea } from '@/components/ui/scroll-area';

const statusConfig: Record<HearingStatus, { label: string; icon: any; color: string }> = {
    PENDENTE: { label: 'Pendente', icon: Clock3, color: 'text-blue-500 bg-blue-500/10' },
    REALIZADA: { label: 'Realizada', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
    CANCELADA: { label: 'Cancelada', icon: XCircle, color: 'text-rose-500 bg-rose-500/10' },
    ADIADA: { label: 'Adiada', icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10' },
};

export default function AudienciasPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [hearingToDelete, setHearingToDelete] = React.useState<Hearing | null>(null);
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar' | 'history'>('list');
  const { toast } = useToast();

  const hearingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'hearings') : null, [firestore, refreshKey]);
  const { data: hearingsData, isLoading: isLoadingHearings } = useCollection<Hearing>(hearingsQuery);

  const processesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'processes') : null, [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);
  
  // OTIMIZAÇÃO: Memoize os mapas de busca O(1)
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  const clientsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const isLoading = isUserLoading || isLoadingHearings || isLoadingProcesses || isLoadingClients;
  
  const handleUpdateStatus = async (hearingId: string, status: HearingStatus) => {
      try {
          await updateHearingStatus(hearingId, status);
          toast({ title: 'Status atualizado!', description: 'A alteração foi sincronizada com sua agenda.' });
          setRefreshKey(prev => prev + 1);
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Erro', description: e.message });
      }
  };

  // OTIMIZAÇÃO: Filtros memoizados
  const todayHearings = React.useMemo(() => {
      if (!hearingsData) return [];
      return hearingsData
        .filter(h => isToday(h.date.toDate()) && h.status !== 'REALIZADA')
        .sort((a, b) => a.date.seconds - b.date.seconds);
  }, [hearingsData]);

  const weekDays = React.useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) days.push(addDays(today, i));
    return days;
  }, []);

  const historyHearings = React.useMemo(() => {
    if (!hearingsData) return [];
    return hearingsData
        .filter(h => h.status === 'REALIZADA')
        .sort((a, b) => b.date.seconds - a.date.seconds);
  }, [hearingsData]);

  return (
    <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <H1 className="text-white">Agenda de Audiências</H1>
                <p className="text-sm text-muted-foreground">Gestão integrada de compromissos judiciais.</p>
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 border-primary/20 text-primary hover:bg-primary/10" 
                    onClick={async () => {
                        setIsSyncing(true);
                        try {
                            const res = await syncHearings();
                            toast({ title: "Sincronização concluída", description: `${res.syncedCount} eventos atualizados.` });
                            setRefreshKey(k => k + 1);
                        } catch (e: any) {
                            toast({ variant: 'destructive', title: 'Erro', description: e.message });
                        } finally { setIsSyncing(false); }
                    }}
                    disabled={isSyncing}
                >
                    <RefreshCw className={cn("h-4 w-4 mr-2", (isLoading || isSyncing) && "animate-spin")} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </Button>
            </div>
        </div>

        {todayHearings.length > 0 && (
            <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 text-primary">
                        <Gavel className="h-5 w-5" />
                        <CardTitle className="text-lg text-white">Foco de Hoje: {todayHearings.length} Audiência(s)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {todayHearings.map(h => (
                        <div key={h.id} className="p-4 rounded-xl bg-[#0f172a] border border-border/50 shadow-sm space-y-3 relative group">
                            <div className="absolute top-2 right-2">
                                <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", statusConfig[h.status || 'PENDENTE'].color)}>
                                    {statusConfig[h.status || 'PENDENTE'].label}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center border border-primary/20">
                                    <span className="text-[10px] font-black leading-none text-white">{format(h.date.toDate(), 'HH:mm')}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm truncate text-white">{processesMap.get(h.processId)?.name || 'Processo'}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{h.type}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0 text-primary" />
                                <span className="truncate">{h.location}</span>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )}

        <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)} className="w-full">
            <TabsList className="bg-[#0f172a] p-1 border border-border/50 mb-6">
                <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><ListIcon className="h-4 w-4"/> Próximos 7 Dias</TabsTrigger>
                <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><History className="h-4 w-4"/> Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="list">
                <Card className="bg-[#0f172a] border-border/50 overflow-hidden">
                    <div className="divide-y divide-border/30">
                        {weekDays.map(day => {
                            const daily = hearingsData?.filter(h => isSameDay(h.date.toDate(), day) && h.status !== 'REALIZADA') || [];
                            if (daily.length === 0) return null;

                            return (
                                <div key={day.toISOString()} className="p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 border-primary/20 bg-primary/5">
                                            <span className="text-[10px] font-black uppercase text-primary">{format(day, 'MMM', { locale: ptBR })}</span>
                                            <span className="text-xl font-black text-white">{format(day, 'dd')}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white capitalize">{isToday(day) ? 'Hoje' : format(day, "EEEE", { locale: ptBR })}</h3>
                                            <p className="text-xs text-muted-foreground">{format(day, "d 'de' MMMM", { locale: ptBR })}</p>
                                        </div>
                                    </div>
                                    <div className="grid gap-3">
                                        {daily.map(h => {
                                            const p = processesMap.get(h.processId);
                                            const StatusIcon = statusConfig[h.status || 'PENDENTE'].icon;
                                            return (
                                                <div key={h.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border border-border/30 bg-black/20 hover:bg-black/40 transition-all">
                                                    <div className="flex items-center gap-2 min-w-[80px]">
                                                        <Clock className="h-4 w-4 text-primary" />
                                                        <span className="text-sm font-black text-white">{format(h.date.toDate(), 'HH:mm')}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/30 text-primary">{h.type}</Badge>
                                                            <span className="text-[10px] text-muted-foreground truncate">{h.location}</span>
                                                        </div>
                                                        <h4 className="font-bold text-base text-white truncate">{p?.name}</h4>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className={cn("gap-1.5 h-7 px-3", statusConfig[h.status || 'PENDENTE'].color)}>
                                                            <StatusIcon className="h-3 w-3" />
                                                            {statusConfig[h.status || 'PENDENTE'].label}
                                                        </Badge>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-white/50"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="bg-card border-border">
                                                                <DropdownMenuItem onSelect={() => handleUpdateStatus(h.id, 'REALIZADA')}>Marcar como Realizada</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleUpdateStatus(h.id, 'ADIADA')}>Marcar como Adiada</DropdownMenuItem>
                                                                <DropdownMenuItem className="text-rose-500" onSelect={() => handleUpdateStatus(h.id, 'CANCELADA')}>Cancelar</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            </TabsContent>

            <TabsContent value="history">
                <Card className="bg-[#0f172a] border-border/50">
                    <Table>
                        <TableHeader><TableRow className="border-border/50"><TableHead className="text-muted-foreground">Data</TableHead><TableHead className="text-muted-foreground">Processo</TableHead><TableHead className="text-muted-foreground">Local</TableHead><TableHead className="text-right text-muted-foreground">Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {historyHearings.map(h => (
                                <TableRow key={h.id} className="border-border/20">
                                    <TableCell className="text-white font-bold">{format(h.date.toDate(), 'dd/MM/yyyy HH:mm')}</TableCell>
                                    <TableCell className="text-white">{processesMap.get(h.processId)?.name}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs">{h.location}</TableCell>
                                    <TableCell className="text-right"><Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">REALIZADA</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
