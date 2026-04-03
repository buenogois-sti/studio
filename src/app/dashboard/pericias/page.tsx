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
  Users,
  Search,
  Phone,
  User,
  Eye,
  Edit,
  Video,
  ExternalLink,
  ChevronDown
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
  addDays,
  startOfDay,
  subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, limit, orderBy, Timestamp } from 'firebase/firestore';
import type { Hearing as Appraisal, Process, HearingStatus as AppraisalStatus, UserProfile, Staff } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { updateHearingStatus as updateAppraisalStatus } from '@/lib/hearing-actions';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { H1 } from '@/components/ui/typography';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { LegalAppraisalDialog } from '@/components/process/LegalAppraisalDialog';
import { HearingReturnDialog } from '@/components/process/HearingReturnDialog';
import { useSession } from 'next-auth/react';

const statusConfig: Record<AppraisalStatus, { label: string; icon: any; color: string }> = {
    PENDENTE: { label: 'Pendente', icon: Clock3, color: 'text-blue-500 bg-blue-500/10' },
    REALIZADA: { label: 'Realizada', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
    CANCELADA: { label: 'Cancelada', icon: XCircle, color: 'text-rose-500 bg-rose-500/10' },
    ADIADA: { label: 'Adiada', icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10' },
};

function AppraisalDetailsDialog({ 
  appraisal, 
  process, 
  open, 
  onOpenChange 
}: { 
  appraisal: Appraisal | null, 
  process?: Process, 
  open: boolean, 
  onOpenChange: (o: boolean) => void 
}) {
  if (!appraisal) return null;
  const config = statusConfig[appraisal.status || 'PENDENTE'];
  const Icon = config.icon;

  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${appraisal.locationName ? `${appraisal.locationName}, ` : ''}${appraisal.location}${appraisal.locationNumber ? `, ${appraisal.locationNumber}` : ''}${appraisal.cep ? `, ${appraisal.cep}` : ''}`)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#020617] border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className={cn("gap-1.5 h-6 px-2 text-[10px] font-black uppercase tracking-widest", config.color)}>
              <Icon className="h-3 w-3" /> {config.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-black uppercase border-primary/30 text-primary">
              PERÍCIA JUDICIAL
            </Badge>
          </div>
          <DialogTitle className="text-xl font-black font-headline leading-tight">
            {process?.name || appraisal.processName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Data e Hora</p>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Clock className="h-4 w-4 text-primary" />
                {format(appraisal.date.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Advogado Resp.</p>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <User className="h-4 w-4 text-emerald-400" />
                {appraisal.lawyerName}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-[9px] font-black uppercase text-primary mb-1">Perito Judicial</p>
              <p className="text-sm font-black text-white leading-tight">{appraisal.expertName || 'Não informado'}</p>
              {appraisal.expertPhone && <p className="text-[10px] font-bold text-primary/70 mt-1">{appraisal.expertPhone}</p>}
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Presença Advogado</p>
              <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full", appraisal.requiresLawyer ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                <p className="text-sm font-black text-white">{appraisal.requiresLawyer ? 'OBRIGATÓRIA' : 'SOMENTE CLIENTE'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Local da Perícia
            </p>
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="space-y-1">
                {appraisal.locationName && <p className="text-sm font-black text-primary leading-tight uppercase tracking-tight">{appraisal.locationName}</p>}
                <p className="text-sm font-bold text-white leading-relaxed">
                  {appraisal.location}
                  {appraisal.locationNumber && <>, № {appraisal.locationNumber}</>}
                  {appraisal.locationComplement && <span className="text-slate-400 font-medium ml-1">({appraisal.locationComplement})</span>}
                </p>
              </div>
              {appraisal.cep && <p className="text-xs text-slate-400 font-medium">CEP: {appraisal.cep}</p>}
              <a 
                href={googleMapsLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-primary hover:text-primary/80 transition-colors pt-1"
              >
                <ExternalLink className="h-3 w-3" /> Ver no Google Maps
              </a>
            </div>
          </div>

          {appraisal.locationObservations && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Building className="h-3.5 w-3.5 text-primary" /> Observações do Local
              </p>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200">
                {appraisal.locationObservations}
              </div>
            </div>
          )}

          {appraisal.notes && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <History className="h-3.5 w-3.5 text-primary" /> Orientações Técnicas
              </p>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 italic text-sm text-slate-300 leading-relaxed">
                "{appraisal.notes}"
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-white/5 pt-6 bg-white/5 p-6 rounded-b-lg">
          <DialogClose asChild><Button variant="ghost" className="w-full text-slate-400 uppercase text-[10px] font-black tracking-widest h-12">Fechar</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

export default function PericiasPage() {
  const { firestore, isUserLoading, user } = useFirebase();
  const { data: session } = useSession();
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar' | 'history'>('calendar');
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(new Date());
  const [detailsAppraisal, setDetailsAppraisal] = React.useState<Appraisal | null>(null);
  const [editingAppraisal, setEditingAppraisal] = React.useState<Appraisal | null>(null);
  const [returnAppraisal, setReturnAppraisal] = React.useState<Appraisal | null>(null);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const appraisalsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const base = collection(firestore, 'hearings'); // Unified collection
    return query(base, where('type', '==', 'PERICIA'), orderBy('date', 'asc'), limit(200));
  }, [firestore, userProfile]);

  const { data: appraisalsData, isLoading: isLoadingAppraisals } = useCollection<Appraisal>(appraisalsQuery);

  const processesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'processes'), limit(100)) : null, [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  const handleUpdateStatus = async (appraisal: Appraisal, status: AppraisalStatus) => {
      if (isProcessing) return;
      if (status === 'REALIZADA' && !appraisal.hasFollowUp) {
          setReturnAppraisal(appraisal);
          return;
      }
      setIsProcessing(appraisal.id);
      try {
          await updateAppraisalStatus(appraisal.id, status);
          toast({ title: 'Status atualizado!' });
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Erro', description: e.message });
      } finally {
          setIsProcessing(null);
      }
  };

  const monthDays = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const appraisalsForSelectedDay = React.useMemo(() => {
    if (!appraisalsData || !selectedDay) return [];
    return appraisalsData.filter(a => isSameDay(a.date.toDate(), selectedDay));
  }, [appraisalsData, selectedDay]);

  const weekDays = React.useMemo(() => {
    const days = [];
    const today = startOfDay(new Date());
    for (let i = -7; i < 21; i++) days.push(addDays(today, i));
    return days;
  }, []);

  const isLoading = isUserLoading || isLoadingAppraisals;

  return (
    <div className="flex flex-col gap-8 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <div className="flex items-center gap-3">
                    <H1 className="text-white text-3xl font-black">Perícias Judiciais</H1>
                    <Badge className="bg-primary text-primary-foreground font-black text-[10px] animate-pulse">NOVO MÓDULO</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Calendário estratégico de diligências periciais do escritório.</p>
            </div>
            <Button variant="outline" className="h-11 border-white/10 text-slate-300 hover:bg-white/5" onClick={() => setCurrentDate(new Date())}>
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} /> Sincronizar Pauta
            </Button>
        </div>

        <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)} className="w-full">
            <TabsList className="bg-[#0f172a] p-1 border border-white/10 mb-6 h-12">
                <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
                  <CalendarDays className="h-4 w-4"/> Calendário
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
                  <ListIcon className="h-4 w-4"/> Próximas Perícias
                </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="animate-in fade-in duration-300">
              <div className="grid lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-8 bg-[#0f172a] border-white/5 p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                      {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <div className="flex gap-2">
                       <Button variant="outline" size="icon" className="h-9 w-9 bg-white/5 border-white/10" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                       <Button variant="outline" size="icon" className="h-9 w-9 bg-white/5 border-white/10" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map(d => (
                      <div key={d} className="text-center text-[9px] font-black uppercase text-slate-500 pb-4">{d}</div>
                    ))}
                    {monthDays.map((day, i) => {
                      const daily = appraisalsData?.filter(a => isSameDay(a.date.toDate(), day)) || [];
                      const isSelected = selectedDay && isSameDay(day, selectedDay);
                      const isTodayDay = isToday(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);

                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDay(day)}
                          className={cn(
                            "relative aspect-square p-2 flex flex-col items-center justify-center border border-white/5 transition-all rounded-xl",
                            !isCurrentMonth && "opacity-20",
                            isSelected ? "bg-primary/20 border-primary/50" : "hover:bg-white/5",
                            isTodayDay && !isSelected && "bg-white/5 border-primary/20"
                          )}
                        >
                          <span className={cn("text-xs font-bold", isTodayDay ? "text-primary" : "text-white/80")}>{format(day, 'd')}</span>
                          {daily.length > 0 && <div className="absolute bottom-2 h-1 w-1 bg-primary rounded-full animate-pulse" />}
                        </button>
                      )
                    })}
                  </div>
                </Card>

                <div className="lg:col-span-4">
                  <Card className="bg-[#0f172a] border-white/5 h-full flex flex-col">
                    <CardHeader className="border-b border-white/5 py-4 bg-white/5 rounded-t-lg shrink-0">
                      <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center justify-between">
                        {selectedDay ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                      <ScrollArea className="h-[450px]">
                        <div className="p-4 space-y-4">
                          {appraisalsForSelectedDay.length > 0 ? (
                            appraisalsForSelectedDay.map(a => (
                              <div key={a.id} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3 group hover:border-primary/30 transition-all cursor-pointer" onClick={() => setDetailsAppraisal(a)}>
                                <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-2">
                                      <Clock className="h-3 w-3 text-primary" />
                                      <span className="text-xs font-black text-white">{format(a.date.toDate(), 'HH:mm')}</span>
                                   </div>
                                   <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-none", statusConfig[a.status].color)}>
                                      {statusConfig[a.status].label}
                                   </Badge>
                                </div>
                                <div>
                                   <p className="text-[9px] font-black uppercase text-slate-500 mb-0.5">{a.lawyerName}</p>
                                   <p className="text-xs font-bold text-slate-200 line-clamp-1">{processesMap.get(a.processId)?.name || a.processName}</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                   <User className="h-3 w-3 text-emerald-400" /> {a.expertName || 'Perito não informado'}
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                   <MapPin className="h-3 w-3 text-rose-400" /> {a.location}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-20 text-center opacity-20"><Search className="h-10 w-10 mx-auto mb-2" /><p className="text-[9px] font-black uppercase tracking-widest">Sem perícias neste dia</p></div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list" className="animate-in fade-in duration-300">
               <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
                  <div className="divide-y divide-white/5">
                      {weekDays.map(day => {
                          const daily = appraisalsData?.filter(a => isSameDay(a.date.toDate(), day) && a.status !== 'CANCELADA') || [];
                          if (daily.length === 0) return null;

                          return (
                              <div key={day.toISOString()} className="p-6">
                                  <div className="flex items-center gap-4 mb-6">
                                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20">
                                          <span className="text-[9px] font-black uppercase text-primary">{format(day, 'MMM', { locale: ptBR })}</span>
                                          <span className="text-xl font-black text-white">{format(day, 'dd')}</span>
                                      </div>
                                      <div>
                                          <h3 className="text-base font-black text-white capitalize">{isToday(day) ? 'Hoje' : format(day, "EEEE", { locale: ptBR })}</h3>
                                          <p className="text-xs text-slate-500">{format(day, "d 'de' MMMM", { locale: ptBR })}</p>
                                      </div>
                                  </div>
                                  <div className="grid gap-4">
                                      {daily.map(a => (
                                          <div key={a.id} className="flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl bg-black/40 border border-white/5 group hover:border-primary/20 transition-all">
                                              <div className="flex items-center gap-2 min-w-[80px]">
                                                  <Clock className="h-4 w-4 text-primary" />
                                                  <span className="text-sm font-black text-white">{format(a.date.toDate(), 'HH:mm')}</span>
                                              </div>
                                              <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-1">
                                                     <Badge variant="outline" className="text-[8px] font-black border-primary/30 text-primary">DR(A). {a.lawyerName?.toUpperCase()}</Badge>
                                                     <Badge variant="outline" className="text-[8px] font-black border-emerald-500/30 text-emerald-400">PERITO: {a.expertName?.toUpperCase()}</Badge>
                                                  </div>
                                                  <h4 className="font-bold text-white group-hover:text-primary transition-colors cursor-pointer" onClick={() => setDetailsAppraisal(a)}>
                                                      {processesMap.get(a.processId)?.name || a.processName}
                                                  </h4>
                                                  <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1">
                                                      <MapPin className="h-3 w-3 text-rose-500" /> {a.location}
                                                  </p>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                  <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                          <Button variant="ghost" size="icon" className="text-white/20 hover:text-white"><MoreVertical className="h-5 w-5" /></Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 w-52">
                                                          <DropdownMenuItem onClick={() => setDetailsAppraisal(a)} className="font-bold gap-2"><Eye className="h-4 w-4 text-blue-400" /> Ver Detalhes</DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => setEditingAppraisal(a)} className="font-bold gap-2"><Edit className="h-4 w-4 text-primary" /> Editar Perícia</DropdownMenuItem>
                                                          <DropdownMenuSeparator className="bg-white/5" />
                                                          <DropdownMenuItem onClick={() => handleUpdateStatus(a, 'REALIZADA')} className="font-bold gap-2 text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Concluir Perícia</DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => handleUpdateStatus(a, 'CANCELADA')} className="font-bold gap-2 text-rose-500"><XCircle className="h-4 w-4" /> Cancelar</DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                  </DropdownMenu>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )
                      })}
                  </div>
               </Card>
            </TabsContent>
        </Tabs>

        <AppraisalDetailsDialog appraisal={detailsAppraisal} process={detailsAppraisal ? processesMap.get(detailsAppraisal.processId) : undefined} open={!!detailsAppraisal} onOpenChange={o => !o && setDetailsAppraisal(null)} />
        <LegalAppraisalDialog appraisal={editingAppraisal} process={editingAppraisal ? processesMap.get(editingAppraisal.processId) : undefined} open={!!editingAppraisal} onOpenChange={o => !o && setEditingAppraisal(null)} />
        <HearingReturnDialog hearing={returnAppraisal} open={!!returnAppraisal} onOpenChange={o => !o && setReturnAppraisal(null)} />
    </div>
  );
}
