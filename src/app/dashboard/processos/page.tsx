
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
  FolderKanban
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, query, limit } from 'firebase/firestore';
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

const STATUS_CONFIG = {
  'Ativo': { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  'Pendente': { label: 'Pendente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: ShieldAlert },
  'Arquivado': { label: 'Arquivado', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: Archive },
};

const ITEMS_PER_PAGE = 5;

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
  const [eventProcess, setEventProcess] = React.useState<Process | null>(null);
  const [expandedProcessId, setExpandedProcessId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

  const { firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const clientIdFilter = searchParams.get('clientId');

  const processesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'processes'), limit(100)) : null), [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const hearingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'hearings') : null), [firestore]);
  const { data: hearingsData } = useCollection<Hearing>(hearingsQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);

  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);

  const financialEventsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'financial_events') : null), [firestore]);
  const { data: financialEventsData } = useCollection<FinancialEvent>(financialEventsQuery);
  
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);
  const staffMap = React.useMemo(() => new Map(staffData?.map(s => [s.id, s])), [staffData]);

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
    if (!processesData) return [];
    return processesData.filter(p => {
        const matchesSearch = 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.processNumber?.includes(searchTerm);
        const matchesClient = !clientIdFilter || p.clientId === clientIdFilter;
        return matchesSearch && matchesClient;
    });
  }, [processesData, searchTerm, clientIdFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProcesses.length / ITEMS_PER_PAGE));
  const paginatedProcesses = React.useMemo(() => {
    return filteredProcesses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredProcesses, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, clientIdFilter]);

  const handleSyncProcess = React.useCallback(async (process: Process) => {
    if (isSyncing) return;
    setIsSyncing(process.id);
    try {
      await syncProcessToDrive(process.id);
      toast({ title: 'Sincronização Concluída!' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na Sincronização', description: error.message });
    } finally {
      setIsSyncing(null);
    }
  }, [toast, isSyncing]);

  const isLoading = isUserLoading || isLoadingProcesses;

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
            <Input placeholder="Pesquisar por CNPJ ou Título..." className="pl-8 pr-8 bg-[#0f172a] border-border/50 text-white h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Button size="sm" className="bg-primary text-primary-foreground h-10 px-6 font-bold" onClick={() => { setEditingProcess(null); setIsSheetOpen(true); }} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Processo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 min-h-[400px]">
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
              <Card key={p.id} className="border-none shadow-xl overflow-hidden bg-[#0f172a] hover:bg-card/80 transition-all duration-300 group">
                <CardContent className="p-0">
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-xl text-white group-hover:text-primary transition-colors cursor-pointer" onClick={() => setExpandedProcessId(isExpanded ? null : p.id)}>
                            {p.name}
                          </h3>
                          <Badge variant="outline" className={cn("gap-1.5 h-6 text-[9px] font-black uppercase tracking-widest", statusInfo.color)}>
                            <statusInfo.icon className="h-3 w-3" /> {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {p.processNumber && <Badge variant="secondary" className="bg-white/5 text-slate-400 font-mono text-[10px] py-0 px-2 h-5 border border-white/5">{p.processNumber}</Badge>}
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-primary/80">
                            <Gavel className="h-3 w-3" /> {p.legalArea}
                          </div>
                          {leadLawyer && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <UserCheck className="h-3 w-3" /> Dr(a). {leadLawyer.firstName} {leadLawyer.lastName}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setExpandedProcessId(isExpanded ? null : p.id)} className="h-9 w-9 text-white/30 hover:text-white hover:bg-white/5">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-white/30 hover:text-white hover:bg-white/5"><MoreVertical className="h-5 w-5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 bg-card border-border shadow-2xl p-1">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5 tracking-widest">Ações Operacionais</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsTimelineOpen(true); }} className="gap-2 cursor-pointer focus:bg-primary/10">
                              <History className="h-4 w-4 text-primary" /> <span className="font-bold">Linha do Tempo (Timeline)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsDeadlineOpen(true); }} className="gap-2 cursor-pointer focus:bg-rose-500/10">
                              <Timer className="h-4 w-4 text-rose-400" /> <span className="font-bold">Lançar Prazo Fatal</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsHearingOpen(true); }} className="gap-2 cursor-pointer focus:bg-amber-500/10">
                              <Gavel className="h-4 w-4 text-amber-400" /> <span className="font-bold">Agendar Audiência</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsDraftingOpen(true); }} className="gap-2 cursor-pointer focus:bg-emerald-500/10">
                              <FilePlus2 className="h-4 w-4 text-emerald-400" /> <span className="font-bold">Gerar Documento (IA)</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onSelect={() => setEventProcess(p)} className="gap-2 cursor-pointer focus:bg-blue-500/10">
                              <DollarSign className="h-4 w-4 text-blue-400" /> <span className="font-bold">Registrar Evento Financeiro</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={() => { setEditingProcess(p); setIsSheetOpen(true); }} className="gap-2 cursor-pointer">
                              <FileText className="h-4 w-4 text-slate-400" /> <span className="font-bold">Editar Dados do Caso</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4 border-y border-white/5">
                      <Link 
                        href={`/dashboard/clientes?searchTerm=${client?.firstName}`} 
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all group/link"
                      >
                        <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-blue-400 group-hover/link:scale-110 transition-transform" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Parte Principal</p>
                          <p className="text-xs font-bold text-slate-200 truncate group-hover/link:text-primary underline decoration-primary/20 underline-offset-4 decoration-2">
                            {client ? `${client.firstName} ${client.lastName}` : 'Sem Cliente'}
                          </p>
                        </div>
                      </Link>

                      <Link 
                        href="/dashboard/audiencias" 
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-xl transition-all group/link",
                          processHearings.length > 0 ? "hover:bg-amber-500/10" : "opacity-40 grayscale pointer-events-none"
                        )}
                      >
                        <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Calendar className="h-4 w-4 text-amber-400 group-hover/link:scale-110 transition-transform" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Audiência Próxima</p>
                          <p className="text-xs font-bold text-amber-400 truncate group-hover/link:underline">
                            {processHearings.length > 0 ? format(processHearings[0].date.toDate(), 'dd/MM/yyyy') : 'Nenhuma'}
                          </p>
                        </div>
                      </Link>

                      <Link 
                        href="/dashboard/financeiro" 
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-xl transition-all group/link",
                          processAgreement ? "hover:bg-emerald-500/10" : "opacity-40 grayscale pointer-events-none"
                        )}
                      >
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Handshake className="h-4 w-4 text-emerald-400 group-hover/link:scale-110 transition-transform" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Status Financeiro</p>
                          <p className="text-xs font-black text-emerald-400 uppercase tracking-tight group-hover/link:underline">
                            {processAgreement ? 'Acordo Firmado' : 'Em Cobrança'}
                          </p>
                        </div>
                      </Link>

                      <Link 
                        href="/dashboard/prazos" 
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-rose-500/10 transition-all group/link"
                      >
                        <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                          <Timer className="h-4 w-4 text-rose-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Obrigações</p>
                          <p className="text-xs font-bold text-slate-300 group-hover/link:text-rose-400 uppercase tracking-widest text-[10px]">Ver Prazos</p>
                        </div>
                      </Link>
                    </div>

                    {isExpanded && (
                      <div className="rounded-xl border border-white/5 bg-black/40 p-5 animate-in slide-in-from-top-2 duration-300 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                          <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest flex items-center gap-1.5"><Building className="h-3 w-3" /> Juízo Responsável</p>
                            <p className="text-slate-200 font-medium leading-relaxed">{p.courtBranch || 'N/A'}<br />{p.court || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Valor da Causa</p>
                            <p className="text-blue-400 font-black text-lg">{(p.caseValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest flex items-center gap-1.5"><Users className="h-3 w-3" /> Parte Contrária</p>
                            <div className="space-y-1">
                              {p.opposingParties?.map((op, i) => (
                                <p key={i} className="text-slate-300 font-bold truncate">{op.name}</p>
                              ))}
                              {(!p.opposingParties || p.opposingParties.length === 0) && <p className="text-slate-500 italic">Não informado</p>}
                            </div>
                          </div>
                        </div>
                        
                        {p.description && (
                          <div className="pt-4 border-t border-white/5">
                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-widest flex items-center gap-1.5"><Info className="h-3 w-3" /> Estratégia do Caso</p>
                            <p className="text-xs text-slate-400 leading-relaxed italic">{p.description}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-4">
                        {p.driveFolderId ? (
                          <a href={`https://drive.google.com/drive/folders/${p.driveFolderId}`} target="_blank" className="text-emerald-400 font-black text-[9px] uppercase flex items-center gap-1.5 hover:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 transition-all">
                            <CheckCircle2 className="h-3 w-3" /> Drive OK
                          </a>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase text-amber-400 px-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-full" onClick={() => handleSyncProcess(p)} disabled={isSyncing === p.id}>
                            {isSyncing === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <RefreshCw className="h-3 w-3 mr-1.5" />} 
                            {isSyncing === p.id ? 'Sincronizando...' : 'Gerar Pasta no Drive'}
                          </Button>
                        )}
                        {p.courtWebsite && (
                          <a href={p.courtWebsite} target="_blank" className="text-blue-400 font-black text-[9px] uppercase flex items-center gap-1.5 hover:bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 transition-all">
                            <ExternalLink className="h-3 w-3" /> Portal Tribunal
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Protocolado em: {p.createdAt ? format(p.createdAt.toDate(), 'dd/MM/yyyy') : '---'}</span>
                        <span className="text-[8px] text-slate-600 font-mono">UID: {p.id.substring(0, 8)}</span>
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
          <div className="flex items-center justify-center gap-6 mt-8 py-4 border-t border-white/5">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setCurrentPage(prev => Math.max(prev - 1, 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              disabled={currentPage === 1 || isLoading} 
              className="bg-[#0f172a] border-border/50 text-white hover:bg-primary/10 hover:text-primary transition-all px-4"
            >
              <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white bg-primary/10 px-2.5 py-1 rounded-md">Página {currentPage}</span>
              <span className="text-sm text-muted-foreground font-medium">de {totalPages}</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setCurrentPage(prev => Math.min(prev + 1, totalPages));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              disabled={currentPage === totalPages || isLoading} 
              className="bg-[#0f172a] border-border/50 text-white hover:bg-primary/10 hover:text-primary transition-all px-4"
            >
              Próxima <ChevronRight className="h-4 w-4 ml-2" />
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
    </div>
  );
}
