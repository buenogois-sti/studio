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
  TrendingUp,
  FilePlus2,
  ChevronDown,
  ChevronUp,
  Calendar,
  RefreshCw,
  Timer,
  UserCheck
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
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { Process, Client, Staff, Hearing } from '@/lib/types';
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
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  'Ativo': { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  'Pendente': { label: 'Pendente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: ShieldAlert },
  'Arquivado': { label: 'Arquivado', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: Archive },
};

export default function ProcessosPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = React.useState(false);
  const [isDraftingOpen, setIsDraftingOpen] = React.useState(false);
  const [isHearingOpen, setIsHearingOpen] = React.useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = React.useState(false);
  const [editingProcess, setEditingProcess] = React.useState<Process | null>(null);
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null);
  const [processToDelete, setProcessToDelete] = React.useState<Process | null>(null);
  const [isSyncing, setIsSyncing] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [eventProcess, setEventProcess] = React.useState<Process | null>(null);
  const [expandedProcessId, setExpandedProcessId] = React.useState<string | null>(null);

  const { firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const clientIdFilter = searchParams.get('clientId');

  const processesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'processes') : null), [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const hearingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'hearings') : null), [firestore]);
  const { data: hearingsData } = useCollection<Hearing>(hearingsQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);

  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);
  
  // OTIMIZAÇÃO: Mapas memoizados para busca O(1) de dependências
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

  // OTIMIZAÇÃO: Filtro memoizado
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

  const handleSyncProcess = React.useCallback(async (process: Process) => {
    setIsSyncing(process.id);
    try {
      await syncProcessToDrive(process.id);
      toast({ title: 'Sincronização Concluída!' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSyncing(null);
    }
  }, [toast]);

  const isLoading = isUserLoading || isLoadingProcesses;

  return (
    <div className="grid flex-1 items-start gap-6 auto-rows-max">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline text-white">Processos</h1>
          <p className="text-sm text-muted-foreground">Gestão jurídica estratégica.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar..." className="pl-8 pr-8 bg-[#0f172a] border-border/50 text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => { setEditingProcess(null); setIsSheetOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Processo
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full bg-card/50" />)
        ) : filteredProcesses.map((p) => {
            const client = clientsMap.get(p.clientId);
            const leadLawyer = p.leadLawyerId ? staffMap.get(p.leadLawyerId) : null;
            const statusInfo = STATUS_CONFIG[p.status || 'Ativo'];
            const processHearings = hearingsByProcessMap.get(p.id) || [];
            const isExpanded = expandedProcessId === p.id;

            return (
              <Card key={p.id} className="border-none shadow-sm overflow-hidden bg-[#0f172a] hover:bg-card/80 transition-all">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-white">{p.name}</h3>
                          <Button variant="ghost" size="icon" onClick={() => setExpandedProcessId(isExpanded ? null : p.id)} className="h-6 w-6 text-white/50">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {p.processNumber && <Badge variant="secondary" className="bg-white/10 text-slate-300 font-mono text-[10px]">{p.processNumber}</Badge>}
                          <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/30 text-primary">{p.legalArea}</Badge>
                          {leadLawyer && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/20">
                              <UserCheck className="h-3 w-3" /> Dr(a). {leadLawyer.firstName} {leadLawyer.lastName}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn("gap-1.5 h-6 text-[9px] font-black uppercase", statusInfo.color)}>
                          <statusInfo.icon className="h-3 w-3" /> {statusInfo.label}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-white/50"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-60 bg-card border-border">
                            <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsTimelineOpen(true); }}><History className="mr-2 h-4 w-4 text-primary" /> Timeline</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsDeadlineOpen(true); }}><Timer className="mr-2 h-4 w-4 text-rose-400" /> Lançar Prazo</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsHearingOpen(true); }}><Gavel className="mr-2 h-4 w-4 text-amber-400" /> Marcar Audiência</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsDraftingOpen(true); }}><FilePlus2 className="mr-2 h-4 w-4 text-emerald-400" /> Gerar Rascunho</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setEventProcess(p)}><DollarSign className="mr-2 h-4 w-4 text-blue-400" /> Evento Financeiro</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => { setEditingProcess(p); setIsSheetOpen(true); }}><FileText className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {client && <span className="font-bold text-slate-300">Cliente: {client.firstName} {client.lastName}</span>}
                      {processHearings.length > 0 && (
                        <Link href="/dashboard/audiencias" className="flex items-center gap-1.5 text-amber-400 font-bold hover:underline">
                          <Calendar className="h-3.5 w-3.5" /> <span>Audiência em {format(processHearings[0].date.toDate(), 'dd/MM/yy')}</span>
                        </Link>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-2 rounded-xl border border-border/30 bg-white/5 p-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground">Vara / Tribunal</p>
                            <p className="text-slate-200">{p.courtBranch || 'N/A'} - {p.court || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground">Valor Causa</p>
                            <p className="text-blue-400 font-bold">{(p.caseValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/30 mt-2">
                      {p.driveFolderId ? (
                        <a href={`https://drive.google.com/drive/folders/${p.driveFolderId}`} target="_blank" className="text-emerald-400 font-bold text-[10px] uppercase flex items-center gap-1.5 hover:bg-emerald-500/10 px-2 py-1 rounded transition-all">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Drive OK
                        </a>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase text-amber-400 px-2" onClick={() => handleSyncProcess(p)} disabled={isSyncing === p.id}>
                          {isSyncing === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <RefreshCw className="h-3 w-3 mr-1.5" />} Pendente Drive
                        </Button>
                      )}
                      <span className="text-[9px] text-muted-foreground font-bold uppercase">Criado: {format(p.createdAt.toDate(), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
        })}
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
