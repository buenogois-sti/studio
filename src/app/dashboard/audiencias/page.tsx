'use client';

import * as React from 'react';
import {
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
  CalendarDays,
  Building
} from 'lucide-react';
import { 
  format, 
  isToday, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  addMonths, 
  subMonths,
  addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Hearing, Process, HearingStatus, UserProfile } from '@/lib/types';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const statusConfig: Record<HearingStatus, { label: string; icon: any; color: string }> = {
    PENDENTE: { label: 'Pendente', icon: Clock3, color: 'text-blue-500 bg-blue-500/10' },
    REALIZADA: { label: 'Realizada', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
    CANCELADA: { label: 'Cancelada', icon: XCircle, color: 'text-rose-500 bg-rose-500/10' },
    ADIADA: { label: 'Adiada', icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10' },
};

export default function AudienciasPage() {
  const { firestore, isUserLoading, user } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar' | 'history'>('list');
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(new Date());
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const hearingsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const base = collection(firestore, 'hearings');
    
    // Regra: Advogado vê as dele. Admin/Secretaria vê de todos.
    if (userProfile.role === 'lawyer') {
      return query(base, where('lawyerId', '==', userProfile.id));
    }
    return base;
  }, [firestore, userProfile, refreshKey]);

  const { data: hearingsData, isLoading: isLoadingHearings, error: hearingsError } = useCollection<Hearing>(hearingsQuery);

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

  const monthDays = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const hearingsForSelectedDay = React.useMemo(() => {
    if (!hearingsData || !selectedDay) return [];
    return hearingsData.filter(h => isSameDay(h.date.toDate(), selectedDay));
  }, [hearingsData, selectedDay]);

  const isLoading = isUserLoading || isProfileLoading || isLoadingHearings;

  if (hearingsError) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro de Consulta</AlertTitle>
          <AlertDescription className="text-xs mt-2 space-y-4">
            <p>Não foi possível carregar a agenda. Se você for um advogado, o Firebase exige um índice para filtrar por responsável.</p>
            <div className="bg-black/20 p-4 rounded-lg space-y-2 border border-white/10">
              <p className="font-bold text-white uppercase tracking-tighter text-[10px]">Ação Necessária (Admin):</p>
              <p className="text-slate-300 text-xs">Crie um índice para a coleção <strong>hearings</strong> com o campo <strong>lawyerId</strong>.</p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <H1 className="text-white text-3xl font-black">Agenda de Audiências</H1>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.role === 'lawyer' ? 'Seus compromissos judiciais agendados.' : 'Visão global de pauta do escritório.'}
                </p>
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
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Agenda'}
                </Button>
            </div>
        </div>

        {todayHearings.length > 0 && viewMode !== 'calendar' && (
            <Card className="border-2 border-primary/20 bg-primary/5 shadow-[0_0_30px_rgba(245,208,48,0.05)]">
                <CardHeader className="pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2 text-primary">
                        <Gavel className="h-5 w-5" />
                        <CardTitle className="text-lg text-white font-black uppercase tracking-tight">Foco de Hoje: {todayHearings.length} Audiência(s)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-4">
                    {todayHearings.map(h => (
                        <div key={h.id} className="p-4 rounded-xl bg-[#0f172a] border border-white/5 shadow-sm space-y-3 relative group hover:border-primary/30 transition-all">
                            <div className="absolute top-2 right-2">
                                <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", statusConfig[h.status || 'PENDENTE'].color)}>
                                    {statusConfig[h.status || 'PENDENTE'].label}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center border border-primary/20">
                                    <span className="text-[10px] font-black leading-none text-white">{format(h.date.toDate(), 'HH:mm')}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm truncate text-white">{processesMap.get(h.processId)?.name || 'Processo'}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 h-4 border-primary/30 text-primary">{h.type}</Badge>
                                        <span className="text-[9px] text-slate-400 truncate flex items-center gap-1"><Building className="h-2.5 w-2.5" /> {h.courtBranch}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-black/20 p-2 rounded-lg border border-white/5">
                                <MapPin className="h-3 w-3 shrink-0 text-primary" />
                                <span className="truncate font-medium">{h.location}</span>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )}

        <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)} className="w-full">
            <TabsList className="bg-[#0f172a] p-1 border border-white/10 mb-6 h-12">
                <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
                  <ListIcon className="h-4 w-4"/> Próximos 7 Dias
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
                  <CalendarDays className="h-4 w-4"/> Calendário Mensal
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
                  <History className="h-4 w-4"/> Histórico de Atas
                </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="animate-in fade-in duration-300">
                <Card className="bg-[#0f172a] border-white/10 overflow-hidden shadow-2xl">
                    <div className="divide-y divide-white/5">
                        {weekDays.map(day => {
                            const daily = hearingsData?.filter(h => isSameDay(h.date.toDate(), day) && h.status === 'PENDENTE') || [];
                            if (daily.length === 0) return null;

                            return (
                                <div key={day.toISOString()} className="p-6">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-2 border-primary/20 bg-primary/5">
                                            <span className="text-[10px] font-black uppercase text-primary">{format(day, 'MMM', { locale: ptBR })}</span>
                                            <span className="text-2xl font-black text-white">{format(day, 'dd')}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white capitalize">{isToday(day) ? 'Foco Hoje' : format(day, "EEEE", { locale: ptBR })}</h3>
                                            <p className="text-xs text-slate-400 font-medium">{format(day, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                                        </div>
                                    </div>
                                    <div className="grid gap-4">
                                        {daily.map(h => {
                                            const p = processesMap.get(h.processId);
                                            const StatusIcon = statusConfig[h.status || 'PENDENTE'].icon;
                                            return (
                                                <div key={h.id} className="flex flex-col md:flex-row md:items-center gap-6 p-5 rounded-2xl border border-white/5 bg-black/20 hover:bg-black/40 hover:border-primary/20 transition-all duration-300 group">
                                                    <div className="flex items-center gap-3 min-w-[100px] border-r border-white/5 pr-4">
                                                        <Clock className="h-4 w-4 text-primary" />
                                                        <span className="text-base font-black text-white tabular-nums">{format(h.date.toDate(), 'HH:mm')}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                                            <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/30 text-primary px-2">{h.type}</Badge>
                                                            <Badge variant="outline" className="text-[9px] font-black uppercase border-white/10 text-slate-400 flex items-center gap-1">
                                                                <Building className="h-2.5 w-2.5" /> {h.courtBranch || 'Vara não informada'}
                                                            </Badge>
                                                        </div>
                                                        <h4 className="font-black text-lg text-white truncate group-hover:text-primary transition-colors">{p?.name}</h4>
                                                        <p className="text-[10px] text-slate-500 font-mono mt-1">{h.location}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline" className={cn("gap-1.5 h-8 px-4 text-[10px] font-black uppercase tracking-widest", statusConfig[h.status || 'PENDENTE'].color)}>
                                                            <StatusIcon className="h-3.5 w-3.5" />
                                                            {statusConfig[h.status || 'PENDENTE'].label}
                                                        </Badge>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="text-white/30 hover:text-white rounded-xl h-10 w-10"><MoreVertical className="h-5 w-5" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="bg-card border-border w-56 p-1">
                                                                <DropdownMenuItem onClick={() => handleUpdateStatus(h.id, 'REALIZADA')} className="font-bold gap-2">
                                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Marcar como Realizada
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleUpdateStatus(h.id, 'ADIADA')} className="font-bold gap-2">
                                                                    <Clock3 className="h-4 w-4 text-amber-500" /> Marcar como Adiada
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-rose-500 font-bold gap-2" onClick={() => handleUpdateStatus(h.id, 'CANCELADA')}>
                                                                    <XCircle className="h-4 w-4" /> Cancelar Audiência
                                                                </DropdownMenuItem>
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
                        {hearingsData && hearingsData.filter(h => h.status === 'PENDENTE').length === 0 && (
                            <div className="flex flex-col items-center justify-center py-32 opacity-30">
                                <CalendarDays className="h-16 w-16 mb-4" />
                                <p className="font-black uppercase tracking-widest">Sem audiências pendentes nos próximos 7 dias</p>
                            </div>
                        )}
                    </div>
                </Card>
            </TabsContent>

            <TabsContent value="calendar" className="animate-in fade-in duration-300">
              <div className="grid lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-8 bg-[#0f172a] border-white/10 p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-10">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                      {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <div className="flex gap-3">
                      <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white/5 border-white/10" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-10 px-6 text-[10px] font-black uppercase rounded-xl border-white/10" onClick={() => setCurrentDate(new Date())}>
                        Hoje
                      </Button>
                      <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white/5 border-white/10" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                      <div key={d} className="text-center text-[10px] font-black uppercase text-slate-500 pb-6 tracking-widest">{d}</div>
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
                            "relative aspect-square p-2 flex flex-col items-center justify-start border border-white/5 transition-all group rounded-xl",
                            !isCurrentMonth && "opacity-10",
                            isSelected ? "bg-primary/10 border-primary/40 shadow-inner" : "hover:bg-white/5",
                            isTodayDay && !isSelected && "bg-white/5 border-primary/20"
                          )}
                        >
                          <span className={cn(
                            "text-sm font-bold",
                            isTodayDay ? "text-primary underline decoration-2 underline-offset-4" : "text-white/80",
                            isSelected && "text-primary"
                          )}>
                            {format(day, 'd')}
                          </span>
                          
                          <div className="mt-auto flex flex-wrap justify-center gap-1 pb-1">
                            {dailyHearings.slice(0, 3).map(h => (
                              <div key={h.id} className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                h.status === 'REALIZADA' ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : 
                                h.status === 'CANCELADA' ? "bg-rose-500" : "bg-primary shadow-[0_0_5px_rgba(245,208,48,0.5)]"
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
                  <Card className="bg-[#0f172a] border-white/10 flex flex-col h-full min-h-[400px] shadow-2xl overflow-hidden">
                    <CardHeader className="border-b border-white/5 pb-4 bg-white/5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                          {selectedDay ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
                        </CardTitle>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black">
                          {hearingsForSelectedDay.length} Evento(s)
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                      <ScrollArea className="h-[550px]">
                        <div className="p-4 space-y-4">
                          {hearingsForSelectedDay.length > 0 ? (
                            hearingsForSelectedDay.map(h => (
                              <div key={h.id} className="p-4 rounded-2xl border border-white/5 bg-black/30 space-y-3 hover:border-primary/20 transition-all">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-primary" />
                                    <span className="text-xs font-black text-white">{format(h.date.toDate(), 'HH:mm')}</span>
                                  </div>
                                  <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest", statusConfig[h.status || 'PENDENTE'].color)}>
                                    {h.status}
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-200 leading-tight truncate">{processesMap.get(h.processId)?.name}</p>
                                    <p className="text-[9px] text-primary font-bold uppercase flex items-center gap-1.5"><Building className="h-3 w-3" /> {h.courtBranch || 'Vara não informada'}</p>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                                  <MapPin className="h-3 w-3 text-primary shrink-0" /> {h.location}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center py-32 text-center opacity-20">
                              <CalendarIcon className="h-12 w-12 mb-3" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Sem compromissos para este dia</p>
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
                <Card className="bg-[#0f172a] border-white/10 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 border-b border-white/5">
                          <tr>
                            <th className="px-6 py-5">Data/Hora</th>
                            <th className="px-6 py-5">Processo</th>
                            <th className="px-6 py-5">Vara / Juízo</th>
                            <th className="px-6 py-5">Tipo</th>
                            <th className="px-6 py-5 text-right">Status Final</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {historyHearings.map(h => {
                              const config = statusConfig[h.status];
                              const StatusIcon = config.icon;
                              return (
                                <tr key={h.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-5 text-white font-black whitespace-nowrap">
                                      {format(h.date.toDate(), 'dd/MM/yyyy HH:mm')}
                                    </td>
                                    <td className="px-6 py-5 text-slate-300 truncate max-w-[250px] font-bold group-hover:text-primary transition-colors">
                                      {processesMap.get(h.processId)?.name || 'Processo não encontrado'}
                                    </td>
                                    <td className="px-6 py-5">
                                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                        <Building className="h-3 w-3 text-slate-600" />
                                        <span className="truncate max-w-[200px]">{h.courtBranch || 'N/A'}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-5">
                                      <Badge variant="outline" className="text-[10px] font-black uppercase bg-white/5 border-white/10 text-slate-400">
                                        {h.type}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-5 text-right">
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
                              <td colSpan={5} className="px-6 py-40 text-center text-muted-foreground italic bg-black/10">
                                <History className="h-16 w-16 mx-auto mb-6 opacity-10" />
                                <p className="font-black uppercase tracking-[0.3em] text-[10px]">Nenhuma pauta finalizada no histórico</p>
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
