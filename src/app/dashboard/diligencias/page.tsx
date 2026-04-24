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
  FolderKanban,
  Edit,
  Eye,
  Gavel,
  ShieldCheck,
  AlertTriangle,
  LocateFixed,
  FileText,
  ClipboardCheck,
  Zap
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
import { HearingReturnDialog } from '@/components/process/HearingReturnDialog';
import { HearingDetailsSheet } from '@/components/process/HearingDetailsSheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const statusConfig = {
  PENDENTE: { label: 'Pendente', icon: Clock, color: 'text-blue-500 bg-blue-500/10' },
  REALIZADA: { label: 'Realizada', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
  CANCELADA: { label: 'Cancelada', icon: X, color: 'text-rose-500 bg-rose-500/10' },
  ADIADA: { label: 'Adiada', icon: AlertCircle, color: 'text-amber-500 bg-amber-500/10' },
};

import { LegalAppraisalDialog } from '@/components/process/LegalAppraisalDialog';

export default function DiligenciasPage() {
  const { firestore, isUserLoading, user } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [selectedLawyerFilter, setSelectedLawyerFilter] = React.useState<string>('all');
  const [returnDiligence, setReturnDiligence] = React.useState<Hearing | null>(null);
  const [editingDiligence, setEditingDiligence] = React.useState<Hearing | null>(null);
  const [selectedDiligenceDetails, setSelectedDiligenceDetails] = React.useState<Hearing | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const userProfileRef = useMemoFirebase(
    () => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const staffQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'staff'), limit(50)) : null, [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);

  const diligenciasQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const base = collection(firestore, 'hearings');
    const operationalTypes = ['DILIGENCIA'];
    
    let q;
    if (selectedLawyerFilter !== 'all') {
      q = query(base, where('lawyerId', '==', selectedLawyerFilter), where('type', 'in', operationalTypes), orderBy('date', 'asc'));
    } else {
      q = query(base, where('type', 'in', operationalTypes), orderBy('date', 'asc'));
    }
    return q;
  }, [firestore, userProfile, refreshKey, selectedLawyerFilter]);

  const { data: diligenciasData, isLoading: isLoadingDiligencias, error: diligenciasError } = useCollection<Hearing>(diligenciasQuery);

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
      
      return matchesSearch;
    });
  }, [diligenciasData, searchTerm, processesMap]);

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
  
  const handleEdit = (d: Hearing) => {
    setEditingDiligence(d);
  };

  const handleViewDetails = (d: Hearing) => {
    setSelectedDiligenceDetails(d);
    setIsDetailsOpen(true);
  };

  const isLoading = isUserLoading || isProfileLoading || isLoadingDiligencias;

  if (diligenciasError) {
    const errorMsg = diligenciasError?.message || '';
    const autoIndexLink = errorMsg.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0];

    return (
      <div className="p-6">
        <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configuração de Banco de Dados Necessária</AlertTitle>
          <AlertDescription className="text-xs mt-2 space-y-4">
            <p>O sistema precisa de um índice no banco de dados para filtrar as diligências.</p>
            
            <div className="bg-black/20 p-4 rounded-lg space-y-4 border border-white/10">
              <p className="font-bold text-white uppercase text-[10px]">Ação recomendada:</p>
              
              <div className="space-y-3">
                {autoIndexLink ? (
                  <Button className="w-full bg-primary text-primary-foreground font-black uppercase text-[10px] h-10 shadow-lg shadow-primary/20" asChild>
                    <a href={autoIndexLink} target="_blank">
                      <RefreshCw className="h-3 w-3 mr-2" /> CRIAR ÍNDICE AUTOMATICAMENTE
                    </a>
                  </Button>
                ) : (
                  <p className="text-slate-400 italic">O link de criação automática aparecerá no console do seu navegador (F12).</p>
                )}

                <div className="space-y-1">
                  <p className="font-black text-white uppercase tracking-tighter text-[9px]">Instrução para Índice Manual:</p>
                  <code className="block bg-black/40 p-2 rounded text-[9px] text-primary">Coleção: hearings | Campos: type (ASC), date (ASC)</code>
                </div>
              </div>
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
          <H1 className="text-white text-3xl font-black">Atos Operacionais</H1>
          <p className="text-sm text-muted-foreground">Gestão de diligências externas e vistorias da banca.</p>
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
              <FolderKanban className="mr-2 h-4 w-4" /> Ir p/ Processos
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#0f172a] border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="h-12 w-12 text-primary" />
          </div>
          <CardContent className="p-5 flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Atos Pendentes</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{filteredDiligencias.filter(d => d.status === 'PENDENTE').length}</span>
              <span className="text-[10px] font-bold text-blue-400">Em andamento</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <ClipboardCheck className="h-12 w-12 text-emerald-400" />
          </div>
          <CardContent className="p-5 flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Concluídos</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{filteredDiligencias.filter(d => d.status === 'REALIZADA').length}</span>
              <span className="text-[10px] font-bold text-emerald-400">Resultados registrados</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertCircle className="h-12 w-12 text-rose-400" />
          </div>
          <CardContent className="p-5 flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Incidentes</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-500">{filteredDiligencias.filter(d => d.status === 'CANCELADA' || d.status === 'ADIADA').length}</span>
              <span className="text-[10px] font-bold">Ações canceladas</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
           <CardContent className="p-5 flex flex-col gap-1 relative z-10">
            <p className="text-[10px] font-black uppercase text-primary/80 tracking-widest">Revisão Pendente</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-primary">{filteredDiligencias.filter(d => d.supportStatus === 'REALIZADA').length}</span>
              <span className="text-[10px] font-bold text-primary animate-pulse">Aguardando Aval</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pendentes" className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-[#0f172a] p-1 border border-white/10 h-12">
            <TabsTrigger value="pendentes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
              Pendentes
            </TabsTrigger>
            <TabsTrigger value="todas" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
              Histórico
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 bg-[#0f172a] px-3 h-12 rounded-xl border border-white/10">
              <Filter className="h-4 w-4 text-primary" />
              <Select value={selectedLawyerFilter} onValueChange={setSelectedLawyerFilter}>
                <SelectTrigger className="w-[180px] h-8 bg-transparent border-none text-white focus:ring-0 p-0 text-xs font-bold">
                  <SelectValue placeholder="Responsável..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                  <SelectItem value="all" className="font-bold">🌍 Todos os Agentes</SelectItem>
                  {staffData?.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      ⚖️ {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <TabsContent value="pendentes" className="space-y-4 animate-in fade-in duration-300">
          <DiligenceList 
            data={filteredDiligencias.filter(d => d.status === 'PENDENTE')} 
            isLoading={isLoading} 
            onUpdateStatus={handleUpdateStatus}
            onReturn={(d: any) => setReturnDiligence(d)}
            onEdit={handleEdit}
            onViewDetails={handleViewDetails}
            isProcessing={isProcessing}
            processesMap={processesMap}
          />
        </TabsContent>

        <TabsContent value="todas" className="space-y-4 animate-in fade-in duration-300">
          <DiligenceList 
            data={filteredDiligencias} 
            isLoading={isLoading} 
            onUpdateStatus={handleUpdateStatus}
            onReturn={(d: any) => setReturnDiligence(d)}
            onEdit={handleEdit}
            onViewDetails={handleViewDetails}
            isProcessing={isProcessing}
            processesMap={processesMap}
            isHistoryTab={true}
          />
        </TabsContent>
      </Tabs>

      <HearingReturnDialog 
        hearing={returnDiligence} 
        open={!!returnDiligence} 
        onOpenChange={(o) => !o && setReturnDiligence(null)}
        onSuccess={() => setRefreshKey(k => k + 1)}
      />

      <LegalAppraisalDialog 
        appraisal={editingDiligence}
        open={!!editingDiligence}
        onOpenChange={(o) => !o && setEditingDiligence(null)}
        onSuccess={() => setRefreshKey(k => k + 1)}
      />

      <HearingDetailsSheet 
        hearing={selectedDiligenceDetails}
        process={selectedDiligenceDetails ? processesMap.get(selectedDiligenceDetails.processId) : undefined}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onEdit={handleEdit}
        onReport={setReturnDiligence}
      />
    </div>
  );
}

function DiligenceList({ data, isLoading, onReturn, onEdit, onViewDetails, isProcessing, processesMap, isHistoryTab }: any) {
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
        <p className="font-bold text-white uppercase tracking-widest text-[10px]">
          {isHistoryTab ? 'Nenhum histórico de diligências' : 'Nenhuma diligência pendente'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {data.map((d: Hearing) => {
        const process = processesMap.get(d.processId);
        const config = (statusConfig as any)[d.status] || statusConfig.PENDENTE;
        const StatusIcon = config.icon;

        return (
          <Card key={d.id} className={cn(
             "bg-[#0f172a] border-white/5 hover:border-primary/40 transition-all duration-300 group overflow-hidden relative",
             d.supportStatus === 'REALIZADA' && "ring-1 ring-primary/30 shadow-[0_0_20px_rgba(255,215,0,0.05)]"
          )}>
            {d.supportStatus === 'REALIZADA' && (
              <div className="absolute top-0 right-0 p-1 bg-primary text-black font-black text-[8px] uppercase tracking-tighter rounded-bl-lg z-20">
                Aguardando Revisão
              </div>
            )}
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 relative" onClick={() => onViewDetails(d)}>
              <div className="flex items-start gap-4 flex-1 cursor-pointer">
                <div className={cn(
                   "h-14 w-14 rounded-2xl flex flex-col items-center justify-center border-2 shrink-0 transition-all group-hover:scale-105",
                   d.status === 'REALIZADA' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-blue-500/10 border-blue-500/20"
                )}>
                  <span className="text-[10px] font-black text-blue-400 uppercase leading-none mb-0.5">{format(d.date.toDate(), 'MMM', { locale: ptBR })}</span>
                  <span className="text-2xl font-black text-white leading-none">{format(d.date.toDate(), 'dd')}</span>
                </div>
                <div className="min-w-0 space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[9px] font-black uppercase border-none px-2 h-5 bg-blue-500/10 text-blue-400">⚖️ DILIGÊNCIA</Badge>
                    {d.supportId && d.supportId !== 'none' && (
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-black uppercase border-primary/20 text-primary flex items-center gap-1.5 h-5 px-2",
                        d.supportStatus === 'REALIZADA' && "bg-primary/20 border-primary shadow-sm"
                      )}>
                        <Briefcase className="h-3 w-3" /> 
                        {d.supportStatus === 'REALIZADA' ? `REVISAR: ${d.supportName}` : d.supportName}
                      </Badge>
                    )}
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5 ml-1">
                      <Clock className="h-3.5 w-3.5 text-primary" /> {format(d.date.toDate(), 'HH:mm')}
                      {d.requiresLawyer && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary">
                          <ShieldCheck className="h-3 w-3" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">Advogado Necessário</span>
                        </div>
                      )}
                    </span>
                  </div>
                  <h4 className="font-black text-lg text-white group-hover:text-primary transition-colors truncate tracking-tight">{d.responsibleParty}</h4>
                  <div className="flex items-center gap-3">
                    <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1.5">
                      <FolderKanban className="h-3.5 w-3.5 text-primary/60" /> {process?.name || 'Vínculo Externo'}
                    </p>
                    <span className="text-slate-700">•</span>
                    <p className="text-[11px] text-slate-500 font-mono">{process?.processNumber || '---'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="hidden lg:flex flex-col items-end gap-1">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">📍 Local da diligência</p>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                    <LocateFixed className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate max-w-[250px]">{d.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={cn(
                    "flex items-center gap-2 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    config.color,
                    d.status === 'PENDENTE' && "shadow-lg shadow-blue-900/10"
                  )}>
                    <StatusIcon className="h-4 w-4" /> {config.label}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-white/20 hover:text-white hover:bg-white/5 rounded-full transition-all" disabled={isProcessing === d.id}>
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#020617] border-white/10 w-64 p-1 shadow-2xl">
                      <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-3 py-2">Fluxo Operacional</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewDetails(d)} className="font-black gap-3 py-3 text-blue-400 focus:bg-blue-500/10 cursor-pointer">
                        <Eye className="h-4 w-4" /> Ver Detalhes do Ato
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onReturn(d)} className="font-black gap-3 py-3 text-emerald-400 focus:bg-emerald-500/10 cursor-pointer">
                        <FileText className="h-4 w-4 text-emerald-500" /> Emitir Relatório Técnico
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(d)} className="font-black gap-3 py-3 text-primary focus:bg-primary/10 cursor-pointer">
                        <Edit className="h-4 w-4 text-primary" /> Alterar Dados / Converter
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem asChild className="font-black gap-3 py-3 text-white focus:bg-white/5 cursor-pointer">
                        <Link href={`/dashboard/processos?clientId=${process?.clientId}`}>
                          <Eye className="h-4 w-4 text-blue-400" /> Detalhes do Processo
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem className="text-rose-500 font-black gap-3 py-3 focus:bg-rose-500/10 cursor-pointer">
                        <X className="h-4 w-4" /> Cancelar Diligência
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
