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
  ChevronLeft,
  ChevronRight,
  Gavel,
  History,
  Search,
  CalendarDays
} from 'lucide-react';
import { 
  format, 
  addDays, 
  isToday, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Hearing, Process, HearingStatus } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { updateHearingStatus, syncHearings } from '@/lib/hearing-actions';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { H1 } from '@/components/ui/typography';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar' | 'history'>('list');
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(new Date());
  const { toast } = useToast();

  const hearingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'hearings') : null, [firestore, refreshKey]);
  const { data: hearingsData, isLoading: isLoadingHearings } = useCollection<Hearing>(hearingsQuery);

  const processesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'processes') : null, [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);
  
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  const handleUpdateStatus = async (hearingId: string, status: HearingStatus) => {
      try {
          await updateHearingStatus(hearingId, status);
          toast({ title: 'Status atualizado!', description: 'A alteração foi sincronizada com sua agenda.' });
          setRefreshKey(prev => prev + 1);
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Erro', description: e.message });
      }
  };

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
        .filter(h => h.status !== 'PENDENTE')
        .sort((a, b) => b.date.seconds - a.date.seconds);
  }, [hearingsData]);

  // Lógica do Calendário Mensal
  const monthDays = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const hearingsForSelectedDay = React.useMemo(() => {
    if (!hearingsData || !selectedDay) return [];
    return hearingsData.filter(h => isSameDay(h.date.toDate(), selectedDay));
  }, [hearingsData, selectedDay]);

  const isLoading = isUserLoading || isLoadingHearings;

  return (
    <div className="flex flex-col gap-8 pb-10">
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

        {todayHearings.length > 0 && viewMode !== 'calendar' && (
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
                <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <ListIcon className="h-4 w-4"/> Próximos 7 Dias
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <CalendarDays className="h-4 w-4"/> Calendário Mensal
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <History className="h-4 w-4"/> Histórico
                </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="animate-in fade-in duration-300">
                <Card className="bg-[#0f172a] border-border/50 overflow-hidden">
                    <div className="divide-y divide-border/30">
                        {weekDays.map(day => {
                            const daily = hearingsData?.filter(h => isSameDay(h.date.toDate(), day) && h.status === 'PENDENTE') || [];
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

            <TabsContent value="calendar" className="animate-in fade-in duration-300">
              <div className="grid lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-8 bg-[#0f172a] border-border/50 p-6">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">
                      {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase" onClick={() => setCurrentDate(new Date())}>
                        Hoje
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                      <div key={d} className="text-center text-[10px] font-black uppercase text-muted-foreground pb-4">{d}</div>
                    ))}
                    {monthDays.map((day, i) => {
                      const dailyHearings = hearingsData?.filter(h => isSameDay(h.date.toDate(), day)) || [];
                      const isSelected = selectedDay && isSameDay(day, selectedDay);
                      const isTodayDay = isToday(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);

                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDay(day)}
                          className={cn(
                            "relative aspect-square p-2 flex flex-col items-center justify-start border border-border/20 transition-all group",
                            !isCurrentMonth && "opacity-20",
                            isSelected ? "bg-primary/10 border-primary/50" : "hover:bg-white/5",
                            isTodayDay && !isSelected && "bg-white/5"
                          )}
                        >
                          <span className={cn(
                            "text-sm font-bold",
                            isTodayDay ? "text-primary underline decoration-2 underline-offset-4" : "text-white/80",
                            isSelected && "text-primary"
                          )}>
                            {format(day, 'd')}
                          </span>
                          
                          <div className="mt-auto flex flex-wrap justify-center gap-0.5">
                            {dailyHearings.slice(0, 3).map(h => (
                              <div key={h.id} className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                h.status === 'REALIZADA' ? "bg-emerald-500" : "bg-primary"
                              )} />
                            ))}
                            {dailyHearings.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Card>

                <div className="lg:col-span-4 space-y-4">
                  <Card className="bg-[#0f172a] border-border/50 flex flex-col h-full min-h-[400px]">
                    <CardHeader className="border-b border-border/30 pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">
                          {selectedDay ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
                        </CardTitle>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {hearingsForSelectedDay.length} Eventos
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                      <ScrollArea className="h-[500px]">
                        <div className="p-4 space-y-3">
                          {hearingsForSelectedDay.length > 0 ? (
                            hearingsForSelectedDay.map(h => (
                              <div key={h.id} className="p-3 rounded-xl border border-border/30 bg-black/20 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-white">{format(h.date.toDate(), 'HH:mm')}</span>
                                  <Badge variant="outline" className={cn("text-[8px] font-black uppercase", statusConfig[h.status || 'PENDENTE'].color)}>
                                    {h.status}
                                  </Badge>
                                </div>
                                <p className="text-xs font-bold text-slate-200 truncate">{processesMap.get(h.processId)?.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-primary" /> {h.location}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                              <CalendarIcon className="h-10 w-10 mb-2" />
                              <p className="text-xs font-bold uppercase">Sem compromissos</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="animate-in fade-in duration-300">
                <Card className="bg-[#0f172a] border-border/50 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/30 text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-border/50">
                          <tr>
                            <th className="px-6 py-4">Data/Hora</th>
                            <th className="px-6 py-4">Processo</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Local</th>
                            <th className="px-6 py-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {historyHearings.map(h => {
                              const config = statusConfig[h.status];
                              const StatusIcon = config.icon;
                              return (
                                <tr key={h.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 text-white font-bold whitespace-nowrap">
                                      {format(h.date.toDate(), 'dd/MM/yyyy HH:mm')}
                                    </td>
                                    <td className="px-6 py-4 text-slate-300 truncate max-w-[250px]">
                                      {processesMap.get(h.processId)?.name || 'Processo não encontrado'}
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge variant="outline" className="text-[10px] font-black uppercase bg-white/5 border-white/10">
                                        {h.type}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground text-xs truncate max-w-[200px]">
                                      {h.location}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <Badge variant="outline" className={cn("gap-1.5 h-7 px-3 text-[9px] font-black uppercase tracking-widest", config.color)}>
                                          <StatusIcon className="h-3 w-3" />
                                          {config.label}
                                      </Badge>
                                    </td>
                                </tr>
                              );
                          })}
                          {historyHearings.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-32 text-center text-muted-foreground italic bg-black/10">
                                <History className="h-10 w-10 mx-auto mb-4 opacity-20" />
                                <p className="font-bold uppercase tracking-widest text-[10px]">Nenhuma audiência no histórico operacional</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
