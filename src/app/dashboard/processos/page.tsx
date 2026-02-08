
'use client';
import * as React from 'react';
import {
  MoreVertical,
  PlusCircle,
  Search,
  Loader2,
  X,
  DollarSign,
  History,
  FileText,
  Gavel,
  ShieldAlert,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calendar,
  RefreshCw,
  Timer,
  UserCheck,
  User,
  ExternalLink,
  Info,
  Building,
  Users,
  FilePlus2,
  ChevronLeft,
  ChevronRight,
  Handshake,
  FolderKanban,
  TrendingUp,
  Scale,
  FolderOpen,
  ArchiveX
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, query, limit, orderBy, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import type { Process, Client, Staff, Hearing, FinancialEvent } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { FinancialEventDialog } from '@/components/process/FinancialEventDialog';
import { ProcessTimelineSheet } from '@/components/process/ProcessTimelineSheet';
import { ProcessForm } from '@/components/process/ProcessForm';
import { DocumentDraftingDialog } from '@/components/process/DocumentDraftingDialog';
import { QuickHearingDialog } from '@/components/process/QuickHearingDialog';
import { LegalDeadlineDialog } from '@/components/process/LegalDeadlineDialog';
import { syncProcessToDrive } from '@/lib/drive';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format } from 'date-fns';
import { searchProcesses } from '@/lib/process-actions';
import { v4 as uuidv4 } from 'uuid';

const STATUS_CONFIG = {
  'Ativo': { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  'Pendente': { label: 'Pendente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: ShieldAlert },
  'Arquivado': { label: 'Arquivado', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: Archive },
};

const ITEMS_PER_PAGE = 8;

export default function ProcessosPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = React.useState(false);
  const [isDraftingOpen, setIsDraftingOpen] = React.useState(false);
  const [isHearingOpen, setIsHearingOpen] = React.useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = React.useState(false);
  const [editingProcess, setEditingProcess] = React.useState<Process | null>(null);
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null);
  const [isSyncing, setIsSyncing] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Process[] | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [eventProcess, setEventProcess] = React.useState<Process | null>(null);
  const [expandedProcessId, setExpandedProcessId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [processToArchive, setProcessToArchive] = React.useState<Process | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);

  const { firestore, isUserLoading } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const clientIdFilter = searchParams.get('clientId');

  const processesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'processes'), orderBy('updatedAt', 'desc'), limit(100)) : null), [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const hearingsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'hearings'), limit(100)) : null), [firestore]);
  const { data: hearingsData } = useCollection<Hearing>(hearingsQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'clients'), limit(100)) : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);

  const staffQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'staff'), limit(50)) : null), [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);

  const financialEventsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_events'), limit(100)) : null), [firestore]);
  const { data: financialEventsData } = useCollection<FinancialEvent>(financialEventsQuery);
  
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);
  const staffMap = React.useMemo(() => new Map(staffData?.map(s => [s.id, s])), [staffData]);

  const stats = React.useMemo(() => {
    if (!processesData) return { total: 0, active: 0, totalValue: 0, avgValue: 0 };
    const total = processesData.length;
    const active = processesData.filter(p => p.status === 'Ativo').length;
    const totalValue = processesData.reduce((sum, p) => sum + (p.caseValue || 0), 0);
    const avgValue = total > 0 ? totalValue / total : 0;
    return { total, active, totalValue, avgValue };
  }, [processesData]);

  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchProcesses(searchTerm);
        setSearchResults(results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const hearingsByProcessMap = React.useMemo(() => {
    const map = new Map<string, Hearing[]>();
    hearingsData?.forEach(h => {
      if (!map.has(h.processId)) map.set(h.processId, []);
      map.get(h.processId)?.push(h);
    });
    return map;
  }, [hearingsData]);

  const agreementsByProcessMap = React.useMemo(() => {
    const map = new Map<string, FinancialEvent>();
    financialEventsData?.forEach(e => {
      if (e.type === 'ACORDO') map.set(e.processId, e);
    });
    return map;
  }, [financialEventsData]);

  const filteredProcesses = React.useMemo(() => {
    let result = searchResults || processesData || [];
    result = result.filter(p => p.status !== 'Arquivado');
    if (clientIdFilter) result = result.filter(p => p.clientId === clientIdFilter);
    return result;
  }, [processesData, searchResults, clientIdFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProcesses.length / ITEMS_PER_PAGE));
  const paginatedProcesses = React.useMemo(() => {
    return filteredProcesses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredProcesses, currentPage]);

  const handleSyncProcess = React.useCallback(async (process: Process) => {
    if (isSyncing) return;
    setIsSyncing(process.id);
    try {
      const result = await syncProcessToDrive(process.id);
      if (result.success) {
        toast({ title: 'Sincronização Concluída!' });
      } else {
        toast({ variant: 'destructive', title: 'Erro na Sincronização', description: result.error || 'Falha desconhecida.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na Sincronização', description: error.message || 'Erro de conexão.' });
    } finally {
      setIsSyncing(null);
    }
  }, [toast, isSyncing]);

  const handleArchive = async () => {
    if (!processToArchive || !firestore || isArchiving) return;
    setIsArchiving(true);
    try {
      const processRef = doc(firestore, 'processes', processToArchive.id);
      
      const timelineEvent = {
        id: uuidv4(),
        type: 'system',
        description: `PROCESSO ARQUIVADO: Encerrado por ${session?.user?.name || 'Usuário'}. Movido para o Arquivo Digital.`,
        date: Timestamp.now(),
        authorName: session?.user?.name || 'Sistema'
      };

      await updateDoc(processRef, {
        status: 'Arquivado',
        updatedAt: Timestamp.now(),
        timeline: arrayUnion(timelineEvent)
      });

      toast({ 
        title: 'Processo Arquivado!', 
        description: `"${processToArchive.name}" foi movido para o arquivo.` 
      });
      setProcessToArchive(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao arquivar', description: error.message });
    } finally {
      setIsArchiving(false);
    }
  };

  const isLoading = isUserLoading || isLoadingProcesses || isSearching;

  return (
    <div className="grid flex-1 items-start gap-6 auto-rows-max">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline text-white">Processos</h1>
          <p className="text-sm text-muted-foreground">Gestão jurídica estratégica e acompanhamento em tempo real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-sm:w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar..." 
              className="pl-8 pr-8 bg-[#0f172a] border-border/50 text-white h-10" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
            {isSearching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />}
          </div>
          <Button size="sm" className="bg-primary text-primary-foreground h-10 px-6 font-bold" onClick={() => { setEditingProcess(null); setIsSheetOpen(true); }} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Processo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#0f172a] border-white/5 shadow-sm">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Processos Ativos</CardTitle>
            <FolderKanban className="h-3 w-3 text-primary" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-lg font-black text-white">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0f172a] border-white/5 shadow-sm">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Valor em Risco</CardTitle>
            <DollarSign className="h-3 w-3 text-emerald-400" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-lg font-black text-white">{stats.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0f172a] border-white/5 shadow-sm">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Ticket Médio</CardTitle>
            <TrendingUp className="h-3 w-3 text-blue-400" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-lg font-black text-white">{stats.avgValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0f172a] border-white/5 shadow-sm">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Eficiência</CardTitle>
            <Scale className="h-3 w-3 text-amber-400" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-lg font-black text-white">{((stats.active / (stats.total || 1)) * 100).toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 min-h-[400px]">
        {isLoading && !paginatedProcesses.length ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Carregando processos...</p>
          </div>
        ) : paginatedProcesses.length > 0 ? (
          paginatedProcesses.map((p) => {
            const client = clientsMap.get(p.clientId);
            const leadLawyer = p.leadLawyerId ? staffMap.get(p.leadLawyerId) : null;
            const statusInfo = STATUS_CONFIG[p.status || 'Ativo'];
            const processHearings = hearingsByProcessMap.get(p.id) || [];
            const processAgreement = agreementsByProcessMap.get(p.id);
            const isExpanded = expandedProcessId === p.id;

            return (
              <Card key={p.id} className="border-none shadow-md overflow-hidden bg-[#0f172a] hover:bg-white/[0.02] transition-all duration-300 group">
                <CardContent className="p-0">
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors cursor-pointer truncate max-w-[400px]" onClick={() => setExpandedProcessId(isExpanded ? null : p.id)}>
                            {p.name}
                          </h3>
                          <Badge variant="outline" className={cn("gap-1 h-5 px-1.5 text-[8px] font-black uppercase tracking-widest", statusInfo.color)}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {p.processNumber && <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 rounded">{p.processNumber}</span>}
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase text-primary/70">
                            <Scale className="h-3 w-3" /> {p.legalArea}
                          </div>
                          {leadLawyer && (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 uppercase">
                              <UserCheck className="h-3 w-3" /> Dr(a). {leadLawyer.firstName}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => setExpandedProcessId(isExpanded ? null : p.id)} className="h-8 w-8 text-white/20 hover:text-white">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 bg-[#0f172a] border-white/10 shadow-2xl p-1">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 px-2 py-1.5 tracking-widest">Gestão do Caso</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsTimelineOpen(true); }} className="gap-2 focus:bg-white/5">
                              <History className="h-4 w-4 text-primary" /> <span className="font-bold">Timeline do Processo</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsDeadlineOpen(true); }} className="gap-2 focus:bg-white/5">
                              <Timer className="h-4 w-4 text-rose-400" /> <span className="font-bold">Lançar Prazo Fatal</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsHearingOpen(true); }} className="gap-2 focus:bg-white/5">
                              <Gavel className="h-4 w-4 text-amber-400" /> <span className="font-bold">Agendar Audiência</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsDraftingOpen(true); }} className="gap-2 focus:bg-white/5">
                              <FilePlus2 className="h-4 w-4 text-emerald-400" /> <span className="font-bold">Gerar Documento (IA)</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onSelect={() => setEventProcess(p)} className="gap-2 focus:bg-white/5">
                              <DollarSign className="h-4 w-4 text-blue-400" /> <span className="font-bold">Evento Financeiro</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={() => { setEditingProcess(p); setIsSheetOpen(true); }} className="gap-2 focus:bg-white/5">
                              <FileText className="h-4 w-4 text-slate-400" /> <span className="font-bold">Editar Dados</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setProcessToArchive(p)} className="gap-2 text-rose-500 focus:bg-rose-500/10">
                              <ArchiveX className="h-4 w-4" /> <span className="font-bold">Arquivar Caso</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-white/5">
                      <Link href={`/dashboard/clientes?searchTerm=${client ? `${client.firstName} ${client.lastName}` : ''}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-all group/link">
                        <div className="h-7 w-7 rounded bg-blue-500/10 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-black uppercase text-slate-500 tracking-tighter">Cliente</p>
                          <p className="text-[10px] font-bold text-slate-300 truncate group-hover/link:text-primary">
                            {client ? `${client.firstName} ${client.lastName}` : 'Sem Cliente'}
                          </p>
                        </div>
                      </Link>

                      <Link href="/dashboard/audiencias" className={cn("flex items-center gap-2 p-2 rounded-lg transition-all group/link", processHearings.length > 0 ? "hover:bg-amber-500/10" : "opacity-30")}>
                        <div className="h-7 w-7 rounded bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Calendar className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-black uppercase text-slate-500 tracking-tighter">Audiência</p>
                          <p className="text-[10px] font-bold text-amber-400 truncate">
                            {processHearings.length > 0 ? format(processHearings[0].date.toDate(), 'dd/MM/yyyy') : 'Nenhuma'}
                          </p>
                        </div>
                      </Link>

                      <Link href="/dashboard/financeiro" className={cn("flex items-center gap-2 p-2 rounded-lg transition-all group/link", processAgreement ? "hover:bg-emerald-500/10" : "opacity-30")}>
                        <div className="h-7 w-7 rounded bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Handshake className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-black uppercase text-slate-500 tracking-tighter">Acordo</p>
                          <p className="text-[10px] font-black text-emerald-400 uppercase">
                            {processAgreement ? 'Firmado' : 'Em Cobrança'}
                          </p>
                        </div>
                      </Link>

                      <Link href="/dashboard/prazos" className="flex items-center gap-2 p-2 rounded-lg hover:bg-rose-500/10 transition-all group/link">
                        <div className="h-7 w-7 rounded bg-rose-500/10 flex items-center justify-center shrink-0">
                          <Timer className="h-3.5 w-3.5 text-rose-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-black uppercase text-slate-500 tracking-tighter">Prazos</p>
                          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Ver Guia</p>
                        </div>
                      </Link>
                    </div>

                    {isExpanded && (
                      <div className="rounded-xl bg-white/[0.03] p-4 animate-in slide-in-from-top-2 duration-300 space-y-4 border border-white/5 mt-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-1 tracking-widest flex items-center gap-1.5"><Building className="h-3 w-3" /> Juízo</p>
                            <p className="text-slate-300 font-medium leading-tight">{p.courtBranch || '---'}<br />{p.court || '---'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-1 tracking-widest flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Valor Causa</p>
                            <p className="text-blue-400 font-black text-base">{(p.caseValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-1 tracking-widest flex items-center gap-1.5"><Users className="h-3 w-3" /> Réus</p>
                            <div className="space-y-0.5">
                              {p.opposingParties?.slice(0, 2).map((op, i) => (
                                <p key={i} className="text-slate-300 font-bold truncate text-[10px]">{op.name}</p>
                              ))}
                              {(!p.opposingParties || p.opposingParties.length === 0) && <p className="text-slate-600 italic">Nenhum</p>}
                            </div>
                          </div>
                        </div>
                        
                        {p.description && (
                          <div className="pt-3 border-t border-white/5">
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-1 tracking-widest">Estratégia</p>
                            <p className="text-[11px] text-slate-400 leading-relaxed italic line-clamp-2">{p.description}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        {p.driveFolderId ? (
                          <a href={`https://drive.google.com/drive/folders/${p.driveFolderId}`} target="_blank" className="text-emerald-400 font-black text-[8px] uppercase flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-all">
                            <FolderOpen className="h-3 w-3" /> Drive
                          </a>
                        ) : (
                          <button className="text-amber-400 font-black text-[8px] uppercase flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-all" onClick={() => handleSyncProcess(p)} disabled={isSyncing === p.id}>
                            {isSyncing === p.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />} Drive
                          </button>
                        )}
                        {p.courtWebsite && (
                          <a href={p.courtWebsite} target="_blank" className="text-blue-400 font-black text-[8px] uppercase flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-all">
                            <ExternalLink className="h-3 w-3" /> Portal
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Protocolo: {p.createdAt ? format(p.createdAt.toDate(), 'dd/MM/yy') : '---'}</span>
                        <span className="text-[8px] text-slate-700 font-mono">#{p.id.substring(0, 6)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-20 bg-[#0f172a] rounded-2xl border-2 border-dashed border-white/5 opacity-40">
            <FolderKanban className="h-12 w-12 mx-auto mb-4" />
            <p className="font-bold text-white uppercase tracking-widest text-[10px]">Nenhum processo encontrado</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-6 mt-4 py-4 border-t border-white/5">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setCurrentPage(prev => Math.max(prev - 1, 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              disabled={currentPage === 1 || isLoading} 
              className="bg-[#0f172a] border-border/50 text-white hover:bg-primary/10 hover:text-primary h-8 px-3 text-[10px] font-black uppercase"
            >
              <ChevronLeft className="h-3 w-3 mr-1" /> Anterior
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-white bg-primary/10 px-2 py-0.5 rounded">Pág {currentPage}</span>
              <span className="text-[10px] text-muted-foreground font-medium">/ {totalPages}</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setCurrentPage(prev => Math.min(prev + 1, totalPages));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              disabled={currentPage === totalPages || isLoading} 
              className="bg-[#0f172a] border-border/50 text-white hover:bg-primary/10 hover:text-primary h-8 px-3 text-[10px] font-black uppercase"
            >
              Próxima <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) setEditingProcess(null); setIsSheetOpen(open); }}>
        <SheetContent className="sm:max-w-4xl w-full p-1 flex flex-col bg-[#020617] border-border">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="text-white text-2xl font-black font-headline">{editingProcess ? 'Editar Processo' : 'Novo Processo'}</SheetTitle>
            <SheetDescription className="text-slate-400">Siga as etapas para um cadastro completo.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="pb-8">
              <ProcessForm onSave={() => setIsSheetOpen(false)} process={editingProcess} />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ProcessTimelineSheet process={selectedProcess} open={isTimelineOpen} onOpenChange={setIsTimelineOpen} />
      <DocumentDraftingDialog process={selectedProcess} open={isDraftingOpen} onOpenChange={setIsDraftingOpen} />
      <QuickHearingDialog process={selectedProcess} open={isHearingOpen} onOpenChange={setIsHearingOpen} />
      <LegalDeadlineDialog process={selectedProcess} open={isDeadlineOpen} onOpenChange={setIsDeadlineOpen} />
      <FinancialEventDialog process={eventProcess} open={!!eventProcess} onOpenChange={o => !o && setEventProcess(null)} onEventCreated={() => {}} />

      <AlertDialog open={!!processToArchive} onOpenChange={(open) => !isArchiving && !open && setProcessToArchive(null)}>
        <AlertDialogContent className="bg-[#0f172a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-400" />
              Confirmar Arquivamento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja arquivar o processo <strong>{processToArchive?.name}</strong>? 
              <br /><br />
              Esta ação removerá o caso da listagem ativa e o moverá para o <strong>Arquivo Digital</strong>. O histórico e os documentos no Drive permanecerão intactos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isArchiving} className="bg-transparent border-white/10 text-slate-400">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isArchiving} className="bg-amber-600 text-white hover:bg-amber-700 font-bold border-none">
              {isArchiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
              Confirmar Arquivamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
