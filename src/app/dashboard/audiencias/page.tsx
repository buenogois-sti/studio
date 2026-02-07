
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
  Building,
  ArrowRightCircle,
  AlertCircle,
  Users,
  User,
  Filter,
  Activity
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
import { collection, query, where, doc, limit, orderBy, Timestamp } from 'firebase/firestore';
import type { Hearing, Process, HearingStatus, UserProfile, Staff } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { updateHearingStatus } from '@/lib/hearing-actions';
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
import { HearingReturnDialog } from '@/components/process/HearingReturnDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusConfig: Record<HearingStatus, { label: string; icon: any; color: string }> = {
    PENDENTE: { label: 'Pendente', icon: Clock3, color: 'text-blue-500 bg-blue-500/10' },
    REALIZADA: { label: 'Realizada', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
    CANCELADA: { label: 'Cancelada', icon: XCircle, color: 'text-rose-500 bg-rose-500/10' },
    ADIADA: { label: 'Adiada', icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10' },
};

export default function AudienciasPage() {
  const { firestore, isUserLoading, user } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar' | 'history'>('list');
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(new Date());
  const [selectedLawyerFilter, setSelectedLawyerFilter] = React.useState<string>('all');
  const [returnHearing, setReturnHearing] = React.useState<Hearing | null>(null);
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const staffQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'staff'), limit(50)) : null, [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);
  const lawyers = staffData?.filter(s => s.role === 'lawyer' || s.role === 'partner') || [];

  const hearingsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const base = collection(firestore, 'hearings');
    
    // OTIMIZAÇÃO: Filtro de data para não carregar audiências muito antigas (limitado a 3 meses atrás)
    const threeMonthsAgo = Timestamp.fromDate(subMonths(new Date(), 3));

    if (userProfile.role === 'admin' || userProfile.role === 'assistant') {
      if (selectedLawyerFilter !== 'all') {
        return query(base, where('lawyerId', '==', selectedLawyerFilter), where('date', '>=', threeMonthsAgo), orderBy('date', 'asc'), limit(100));
      }
      return query(base, where('date', '>=', threeMonthsAgo), orderBy('date', 'asc'), limit(200));
    }
    
    return query(base, where('lawyerId', '==', userProfile.id), where('date', '>=', threeMonthsAgo), orderBy('date', 'asc'), limit(100));
  }, [firestore, userProfile, selectedLawyerFilter, refreshKey]);

  const { data: hearingsData, isLoading: isLoadingHearings, error: hearingsError } = useCollection<Hearing>(hearingsQuery);

  const processesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'processes'), limit(100)) : null, [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  const handleUpdateStatus = React.useCallback(async (hearing: Hearing, status: HearingStatus) => {
      if (status === 'REALIZADA' && !hearing.hasFollowUp) {
          setReturnHearing(hearing);
          return;
      }
      try {
          await updateHearingStatus(hearing.id, status);
          toast({ title: 'Status atualizado!', description: 'A alteração foi sincronizada com a pauta.' });
          setRefreshKey(prev => prev + 1);
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Erro', description: e.message });
      }
  }, [toast]);

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

  const pendingReturns = React.useMemo(() => {
    if (!hearingsData) return [];
    return hearingsData.filter(h => h.status === 'REALIZADA' && !h.hasFollowUp);
  }, [hearingsData]);

  const isLoading = isUserLoading || isProfileLoading || isLoadingHearings;

  if (hearingsError) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configuração Necessária (Firestore Index)</AlertTitle>
          <AlertDescription className="text-xs mt-2 space-y-4">
            <p>O Firebase requer um índice composto para esta visualização filtrada.</p>
            <div className="bg-black/20 p-4 rounded-lg space-y-2 border border-white/10 font-mono text-[10px]">
              <p>Coleção: 'hearings'</p>
              <p>Campos: 'lawyerId' (ASC) e 'date' (ASC)</p>
            </div>
            <Button variant="outline" size="sm" className="mt-2 text-[10px] uppercase font-bold border-rose-500/30" asChild>
              <a href="https://console.firebase.google.com" target="_blank">Abrir Console Firebase</a>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <H1 className="text-white text-3xl font-black">Pauta de Audiências</H1>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.role === 'lawyer' ? 'Seus compromissos judiciais agendados.' : 'Visão global e distribuição de pauta do escritório.'}
                </p>
            </div>
            
            <div className="flex items-center gap-3">
                {(userProfile?.role === 'admin' || userProfile?.role === 'assistant') && (
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 animate-in fade-in">
                    <Filter className="h-3.5 w-3.5 text-primary" />
                    <Select value={selectedLawyerFilter} onValueChange={setSelectedLawyerFilter}>
                      <SelectTrigger className="border-none bg-transparent h-7 text-xs font-bold w-[180px] focus:ring-0 shadow-none">
                        <SelectValue placeholder="Filtrar Advogado..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                        <SelectItem value="all">Todas as Agendas</SelectItem>
                        {lawyers.map(l => (
                          <SelectItem key={l.id} value={l.id}>Dr(a). {l.firstName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 border-white/10 text-slate-300 hover:bg-white/5" 
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    disabled={isLoading}
                >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                    Atualizar Pauta
                </Button>
            </div>
        </div>

        {pendingReturns.length > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5 animate-in slide-in-from-top-4 duration-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-bold text-amber-200">Retornos Jurídicos Pendentes</p>
                  <p className="text-xs text-amber-400/70">Existem {pendingReturns.length} audiência(s) realizada(s) aguardando o seguimento jurídico.</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-bold"
                onClick={() => setViewMode('history')}
              >
                Processar Retornos
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)} className="w-full">
            <TabsList className="bg-[#0f172a] p-1 border border-white/10 mb-6 h-12">
                <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
                  <ListIcon className="h-4 w-4"/> Próximos Compromissos
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
                  <CalendarDays className="h-4 w-4"/> Calendário Mensal
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
                  <History className="h-4 w-4"/> Histórico de Atos
                </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="animate-in fade-in duration-300">
                <Card className="bg-[#0f172a] border-white/5 overflow-hidden shadow-2xl">
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
                                            <h3 className="text-lg font-black text-white capitalize">{isToday(day) ? 'Hoje' : format(day, "EEEE", { locale: ptBR })}</h3>
                                            <p className="text-xs text-slate-400 font-medium">{format(day, "d 'de' MMMM", { locale: ptBR })}</p>
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
                                                                <Users className="h-2.5 w-2.5" /> Dr(a). {h.lawyerName || 'Não atribuído'}
                                                            </Badge>
                                                        </div>
                                                        <h4 className="font-black text-lg text-white truncate group-hover:text-primary transition-colors">{p?.name}</h4>
                                                        <p className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1.5"><MapPin className="h-3 w-3 text-primary" /> {h.location}</p>
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
                                                            <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 w-56 p-1">
                                                                <DropdownMenuItem onClick={() => handleUpdateStatus(h, 'REALIZADA')} className="font-bold gap-2 text-white hover:bg-emerald-500/10">
                                                                    <ArrowRightCircle className="h-4 w-4 text-emerald-500" /> Marcar Realizada
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleUpdateStatus(h, 'ADIADA')} className="font-bold gap-2 text-white">
                                                                    <Clock3 className="h-4 w-4 text-amber-500" /> Adiar Audiência
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-rose-500 font-bold gap-2" onClick={() => handleUpdateStatus(h, 'CANCELADA')}>
                                                                    <XCircle className="h-4 w-4" /> Cancelar
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
                    </div>
                </Card>
            </TabsContent>

            <TabsContent value="calendar" className="animate-in fade-in duration-300">
              <div className="grid lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-8 bg-[#0f172a] border-white/5 p-6 shadow-2xl">
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
                                h.status === 'REALIZADA' ? "bg-emerald-500" : 
                                h.status === 'CANCELADA' ? "bg-rose-500" : "bg-primary"
                              )} />
                            ))}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Card>

                <div className="lg:col-span-4 space-y-4">
                  <Card className="bg-[#0f172a] border-white/5 flex flex-col h-full min-h-[400px] shadow-2xl overflow-hidden">
                    <CardHeader className="border-b border-white/5 pb-4 bg-white/5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                          {selectedDay ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
                        </CardTitle>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black">
                          {hearingsForSelectedDay.length} Ato(s)
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                      <ScrollArea className="h-[550px]">
                        <div className="p-4 space-y-4">
                          {hearingsForSelectedDay.length > 0 ? (
                            hearingsForSelectedDay.map(h => (
                              <div key={h.id} className="p-4 rounded-2xl border border-white/5 bg-black/30 space-y-3 hover:border-primary/20 transition-all group">
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
                                    <p className="text-[9px] text-primary font-bold uppercase flex items-center gap-1.5"><Users className="h-3 w-3" /> Dr(a). {h.lawyerName}</p>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                                  <MapPin className="h-3 w-3 text-primary shrink-0" /> {h.location}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center py-32 text-center opacity-20">
                              <CalendarIcon className="h-12 w-12 mb-3" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Sem atos agendados</p>
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
                <Card className="bg-[#0f172a] border-white/5 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 border-b border-white/5">
                          <tr>
                            <th className="px-6 py-5">Data/Hora</th>
                            <th className="px-6 py-5">Processo / Advogado</th>
                            <th className="px-6 py-5">Status Final</th>
                            <th className="px-6 py-5">Retorno Jurídico</th>
                            <th className="px-6 py-5 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {historyHearings.map(h => {
                              const config = statusConfig[h.status];
                              const StatusIcon = config.icon;
                              const isPendingReturn = h.status === 'REALIZADA' && !h.hasFollowUp;

                              return (
                                <tr key={h.id} className={cn("hover:bg-white/[0.02] transition-colors group", isPendingReturn && "bg-amber-500/[0.03]")}>
                                    <td className="px-6 py-5 text-white font-black whitespace-nowrap">
                                      {format(h.date.toDate(), 'dd/MM/yy HH:mm')}
                                    </td>
                                    <td className="px-6 py-5">
                                      <div className="flex flex-col">
                                        <span className="text-slate-300 font-bold group-hover:text-primary transition-colors truncate max-w-[200px]">
                                          {processesMap.get(h.processId)?.name}
                                        </span>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[9px] text-slate-500 uppercase font-black">{h.type}</span>
                                          <span className="text-[9px] text-primary/60 font-black uppercase">• {h.lawyerName}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-5">
                                      <Badge variant="outline" className={cn("gap-1.5 h-7 px-3 text-[9px] font-black uppercase tracking-widest", config.color)}>
                                          <StatusIcon className="h-3 w-3" />
                                          {config.label}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-5">
                                      {h.hasFollowUp ? (
                                        <div className="flex items-center gap-2 text-emerald-500">
                                          <CheckCircle2 className="h-4 w-4" />
                                          <span className="text-[10px] font-black uppercase">Processado</span>
                                        </div>
                                      ) : h.status === 'REALIZADA' ? (
                                        <div className="flex items-center gap-2 text-amber-500">
                                          <AlertCircle className="h-4 w-4" />
                                          <span className="text-[10px] font-black uppercase animate-pulse">Pendente</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-600">---</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                      {isPendingReturn ? (
                                        <Button 
                                          size="sm" 
                                          className="bg-amber-600 hover:bg-amber-500 text-white font-black uppercase text-[9px] h-8 shadow-lg shadow-amber-900/20"
                                          onClick={() => setReturnHearing(h)}
                                        >
                                          Dar Retorno
                                        </Button>
                                      ) : (
                                        <Button variant="ghost" size="icon" className="text-white/20"><MoreVertical className="h-4 w-4" /></Button>
                                      )}
                                    </td>
                                </tr>
                              );
                          })}
                        </tbody>
                      </table>
                    </div>
                </Card>
            </TabsContent>
        </Tabs>

        <HearingReturnDialog 
          hearing={returnHearing} 
          open={!!returnHearing} 
          onOpenChange={(o) => !o && setReturnHearing(null)}
          onSuccess={() => setRefreshKey(k => k + 1)}
        />
    </div>
  );
}
