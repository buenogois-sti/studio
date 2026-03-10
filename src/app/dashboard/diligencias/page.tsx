'use client';

import * as React from 'react';
import {
  Briefcase,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  MoreVertical,
  Loader2,
  Calendar,
  ExternalLink,
  History,
  User,
  Filter,
  RefreshCw,
  Video,
  X,
  PlusCircle,
  AlertCircle,
  FolderKanban
} from 'lucide-react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { H1 } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

const statusConfig = {
  PENDENTE: { label: 'Pendente', icon: Clock, color: 'text-blue-500 bg-blue-500/10' },
  REALIZADA: { label: 'Realizada', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
  CANCELADA: { label: 'Cancelada', icon: X, color: 'text-rose-500 bg-rose-500/10' },
  ADIADA: { label: 'Adiada', icon: AlertCircle, color: 'text-amber-500 bg-amber-500/10' },
};

export default function DiligenciasPage() {
  const { firestore, isUserLoading, user } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [selectedLawyerFilter, setSelectedLawyerFilter] = React.useState<string>('all');

  const userProfileRef = useMemoFirebase(
    () => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const staffQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'staff'), limit(50)) : null, [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);

  const diligenciasQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const base = collection(firestore, 'hearings');
    const q = query(base, where('type', '==', 'DILIGENCIA'), orderBy('date', 'asc'));
    return q;
  }, [firestore, userProfile, refreshKey]);

  const { data: diligenciasData, isLoading: isLoadingDiligencias } = useCollection<Hearing>(diligenciasQuery);

  const processesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'processes') : null, [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  const filteredDiligencias = React.useMemo(() => {
    if (!diligenciasData) return [];
    return diligenciasData.filter(d => {
      const process = processesMap.get(d.processId);
      const matchesSearch = 
        d.responsibleParty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        process?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLawyer = selectedLawyerFilter === 'all' || d.lawyerId === selectedLawyerFilter;
      
      return matchesSearch && matchesLawyer;
    });
  }, [diligenciasData, searchTerm, selectedLawyerFilter, processesMap]);

  const handleUpdateStatus = async (id: string, status: HearingStatus) => {
    setIsProcessing(id);
    try {
      await updateHearingStatus(id, status);
      toast({ title: 'Status atualizado!' });
      setRefreshKey(prev => prev + 1);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const isLoading = isUserLoading || isLoadingDiligencias;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <H1 className="text-white text-3xl font-black">Agenda de Diligências</H1>
          <p className="text-sm text-muted-foreground">Gestão de tarefas externas, vistorias e despachos da equipe.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar diligência..." 
              className="pl-8 pr-8 h-10 bg-card border-border/50 text-white" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <Button 
            variant="outline"
            asChild
            className="h-10 border-primary/20 text-primary hover:bg-primary/5 font-bold"
          >
            <Link href="/dashboard/processos">
              <FolderKanban className="mr-2 h-4 w-4" /> Acessar Processos
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#0f172a] border-white/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Pendentes</p>
              <p className="text-2xl font-black text-white">{filteredDiligencias.filter(d => d.status === 'PENDENTE').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f172a] border-white/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Concluídas</p>
              <p className="text-2xl font-black text-white">{filteredDiligencias.filter(d => d.status === 'REALIZADA').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pendentes" className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-[#0f172a] p-1 border border-white/10 h-12">
            <TabsTrigger value="pendentes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
              Ativas
            </TabsTrigger>
            <TabsTrigger value="todas" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
              Histórico
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <Select value={selectedLawyerFilter} onValueChange={setSelectedLawyerFilter}>
              <SelectTrigger className="w-[200px] h-10 bg-[#0f172a] border-white/10 text-white">
                <SelectValue placeholder="Filtrar responsável..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                <SelectItem value="all">Todos os Colaboradores</SelectItem>
                {staffData?.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="pendentes" className="space-y-4 animate-in fade-in duration-300">
          <DiligenceList 
            data={filteredDiligencias.filter(d => d.status === 'PENDENTE')} 
            isLoading={isLoading} 
            onUpdateStatus={handleUpdateStatus}
            isProcessing={isProcessing}
            processesMap={processesMap}
          />
        </TabsContent>

        <TabsContent value="todas" className="space-y-4 animate-in fade-in duration-300">
          <DiligenceList 
            data={filteredDiligencias} 
            isLoading={isLoading} 
            onUpdateStatus={handleUpdateStatus}
            isProcessing={isProcessing}
            processesMap={processesMap}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DiligenceList({ data, isLoading, onUpdateStatus, isProcessing, processesMap }: any) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full bg-white/5 rounded-2xl" />)}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-20 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 opacity-40">
        <Briefcase className="h-12 w-12 mx-auto mb-4" />
        <p className="font-bold text-white uppercase tracking-widest text-[10px]">Nenhuma diligência encontrada</p>
        <p className="text-[9px] text-slate-500 uppercase mt-2">Agende uma nova diligência diretamente no menu do processo</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {data.map((d: Hearing) => {
        const process = processesMap.get(d.processId);
        const config = (statusConfig as any)[d.status];
        const StatusIcon = config.icon;

        return (
          <Card key={d.id} className="bg-[#0f172a] border-white/5 hover:border-primary/20 transition-all duration-300 group">
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-blue-400 uppercase leading-none">{format(d.date.toDate(), 'MMM', { locale: ptBR })}</span>
                  <span className="text-xl font-black text-white leading-none">{format(d.date.toDate(), 'dd')}</span>
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border-none px-1.5 h-4.5">DILIGÊNCIA</Badge>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {format(d.date.toDate(), 'HH:mm')}
                    </span>
                  </div>
                  <h4 className="font-bold text-white group-hover:text-primary transition-colors truncate">{d.responsibleParty}</h4>
                  <p className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1.5">
                    <FolderKanban className="h-3 w-3 text-primary" /> {process?.name || 'Processo não encontrado'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden lg:flex flex-col items-end">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Localização</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate max-w-[200px]">{d.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={cn("gap-1.5 h-8 px-3 text-[10px] font-black uppercase tracking-widest", config.color)}>
                    <StatusIcon className="h-3.5 w-3.5" /> {config.label}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-white/20 hover:text-white" disabled={isProcessing === d.id}>
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 w-56">
                      <DropdownMenuItem onClick={() => onUpdateStatus(d.id, 'REALIZADA')} className="font-bold gap-2 text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" /> Marcar Concluída
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="font-bold gap-2 text-white">
                        <Link href={`/dashboard/processos?clientId=${process?.clientId}`}>
                          <ExternalLink className="h-4 w-4 text-primary" /> Ver Processo
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem className="text-rose-500 font-bold gap-2">
                        <X className="h-4 w-4" /> Cancelar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
