'use client';
import * as React from 'react';
import {
  MoreVertical,
  PlusCircle,
  Search,
  Loader2,
  X,
  DollarSign,
  ExternalLink,
  FolderOpen,
  History,
  FileText,
  Copy,
  Gavel,
  ShieldAlert,
  Archive,
  CheckCircle2,
  TrendingUp,
  FilePlus2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  Info
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

import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { Process, Client, UserProfile, Hearing } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { FinancialEventDialog } from '@/components/process/FinancialEventDialog';
import { ProcessTimelineSheet } from '@/components/process/ProcessTimelineSheet';
import { ProcessForm } from '@/components/process/ProcessForm';
import { DocumentDraftingDialog } from '@/components/process/DocumentDraftingDialog';
import { QuickHearingDialog } from '@/components/process/QuickHearingDialog';
import { archiveProcess } from '@/lib/process-actions';
import { syncProcessToDrive } from '@/lib/drive';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  'Ativo': { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
  'Pendente': { label: 'Pendente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: ShieldAlert },
  'Arquivado': { label: 'Arquivado', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20', icon: Archive },
};

export default function ProcessosPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = React.useState(false);
  const [isDraftingOpen, setIsDraftingOpen] = React.useState(false);
  const [isHearingOpen, setIsHearingOpen] = React.useState(false);
  const [editingProcess, setEditingProcess] = React.useState<Process | null>(null);
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null);
  const [processToDelete, setProcessToDelete] = React.useState<Process | null>(null);
  const [processToArchive, setProcessToArchive] = React.useState<Process | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [eventProcess, setEventProcess] = React.useState<Process | null>(null);
  const [expandedProcessId, setExpandedProcessId] = React.useState<string | null>(null);

  const { firestore, isUserLoading } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const clientIdFilter = searchParams.get('clientId');

  const userProfileRef = useMemoFirebase(
    () => (firestore && session?.user?.id ? doc(firestore, 'users', session.user.id) : null),
    [firestore, session?.user?.id]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const userRole = userProfile?.role;

  const processesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'processes') : null), [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const hearingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'hearings') : null), [firestore]);
  const { data: hearingsData } = useCollection<Hearing>(hearingsQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);
  
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const filteredProcesses = React.useMemo(() => {
    if (!processesData) return [];
    return processesData.filter(p => {
        const matchesSearch = 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.processNumber?.includes(searchTerm) ||
          p.opposingParties?.some(party => (typeof party === 'string' ? party : party.name)?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesClient = !clientIdFilter || p.clientId === clientIdFilter;
        return matchesSearch && matchesClient;
    });
  }, [processesData, searchTerm, clientIdFilter]);

  const stats = React.useMemo(() => {
    if (!processesData) return { active: 0, pending: 0, totalValue: 0 };
    return processesData.reduce((acc, p) => {
        if (p.status === 'Ativo') acc.active++;
        if (p.status === 'Pendente') acc.pending++;
        acc.totalValue += (p.caseValue || 0);
        return acc;
    }, { active: 0, pending: 0, totalValue: 0 });
  }, [processesData]);

  const handleSyncProcess = async (process: Process) => {
    setIsSyncing(process.id);
    try {
      await syncProcessToDrive(process.id);
      toast({ title: 'Sincronização Concluída!', description: 'As pastas do processo foram criadas no Google Drive.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na Sincronização', description: error.message });
    } finally {
      setIsSyncing(null);
    }
  };

  const handleArchive = async () => {
    if (!processToArchive) return;
    setIsArchiving(true);
    try {
      const res = await archiveProcess(processToArchive.id);
      if (res.success) {
        toast({ title: 'Processo Arquivado', description: 'O caso foi movido para o arquivo morto.' });
        setProcessToArchive(null);
      } else {
        throw new Error(res.error);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao arquivar', description: error.message });
    } finally {
      setIsArchiving(false);
    }
  };

  const confirmDelete = async () => {
    if (!firestore || !processToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'processes', processToDelete.id));
      toast({ title: 'Processo excluído!' });
      setProcessToDelete(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally { setIsDeleting(false); }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Número do processo na área de transferência." });
  };

  const formatCurrency = (value?: number) =>
    typeof value === 'number'
      ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—';

  const isLoading = isUserLoading || isLoadingProcesses;

  return (
    <div className="grid flex-1 items-start gap-6 auto-rows-max">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline">Processos Judiciais</h1>
          <p className="text-sm text-muted-foreground">Gestão estratégica de {filteredProcesses?.length || 'seus'} casos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar..." 
              className="pl-8 pr-8" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button size="sm" className="shadow-md" onClick={() => { setEditingProcess(null); setIsSheetOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Processo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-500/5 border-emerald-500/10">
              <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ativos</p>
                      <p className="text-xl font-black leading-none">{stats.active}</p>
                  </div>
              </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/10">
              <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                      <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pendentes</p>
                      <p className="text-xl font-black leading-none">{stats.pending}</p>
                  </div>
              </CardContent>
          </Card>
          <Card className="bg-blue-500/5 border-blue-500/10">
              <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                      <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">VTM Estimado</p>
                      <p className="text-xl font-black leading-none">{stats.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
              </CardContent>
          </Card>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : filteredProcesses.length > 0 ? (
          filteredProcesses.map((p) => {
            const client = clientsMap.get(p.clientId);
            const StatusInfo = STATUS_CONFIG[p.status || 'Ativo'];
            const isExpanded = expandedProcessId === p.id;
            const processHearings = hearingsData?.filter(h => h.processId === p.id) || [];

            return (
              <Card key={p.id} className="border-none shadow-sm overflow-hidden hover:shadow-md transition-all group">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-foreground">{p.name}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExpandedProcessId(isExpanded ? null : p.id)}
                            className="h-6 w-6"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {p.processNumber && (
                            <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                              {p.processNumber}
                              <button onClick={() => copyToClipboard(p.processNumber || '')} className="ml-1.5 opacity-50 hover:opacity-100"><Copy className="h-2.5 w-2.5" /></button>
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[9px] font-black uppercase">{p.legalArea}</Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn("gap-1.5 h-6 text-[9px] font-black uppercase tracking-wider", StatusInfo.color)}>
                          <StatusInfo.icon className="h-3 w-3" />
                          {StatusInfo.label}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-60">
                            <DropdownMenuLabel>Gestão do Processo</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => { setSelectedProcess(p); setIsTimelineOpen(true); }}>
                              <History className="mr-2 h-4 w-4 text-primary" /> Timeline de Andamentos
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => { setSelectedProcess(p); setIsHearingOpen(true); }}>
                              <Gavel className="mr-2 h-4 w-4 text-amber-500" /> Marcar Audiência
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => { setSelectedProcess(p); setIsDraftingOpen(true); }}>
                              <FilePlus2 className="mr-2 h-4 w-4 text-emerald-500" /> Gerar Rascunho (Drive)
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setEventProcess(p)}>
                                <DollarSign className="mr-2 h-4 w-4 text-blue-500" /> Evento Financeiro
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => { setEditingProcess(p); setIsSheetOpen(true); }}>
                              <FileText className="mr-2 h-4 w-4" /> Editar Cadastro
                            </DropdownMenuItem>
                            {p.status !== 'Arquivado' && (
                              <DropdownMenuItem onSelect={() => setProcessToArchive(p)} className="text-amber-600">
                                <Archive className="mr-2 h-4 w-4" /> Arquivar Processo
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => setProcessToDelete(p)}>
                                <X className="mr-2 h-4 w-4" /> Excluir permanentemente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {client && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">{client.firstName} {client.lastName}</span>
                          <span className="text-[10px] bg-muted px-1 rounded">{client.document}</span>
                        </div>
                      )}
                      
                      {processHearings.length > 0 && (
                        <Link href="/dashboard/audiencias" className="flex items-center gap-1.5 text-amber-600 font-bold hover:underline">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Audiência em {format(processHearings[0].date.toDate(), 'dd/MM/yy')}</span>
                        </Link>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-2 rounded-xl border bg-muted/5 p-4 grid gap-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-black uppercase text-muted-foreground">Vara / Tribunal</p>
                              <p className="text-sm font-medium">{p.courtBranch || 'Não informado'} - {p.court || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase text-muted-foreground">Valor da Causa</p>
                              <p className="text-sm font-bold text-blue-600">{formatCurrency(p.caseValue)}</p>
                            </div>
                          </div>
                          
                          {processHearings.length > 0 && (
                            <div className="space-y-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase text-amber-600">Audiências Agendadas</p>
                                <Button variant="link" size="sm" asChild className="h-auto p-0 text-[10px] font-bold text-amber-700 uppercase">
                                  <Link href="/dashboard/audiencias">Ver na Agenda</Link>
                                </Button>
                              </div>
                              {processHearings.map(h => (
                                <Link key={h.id} href="/dashboard/audiencias" className="flex items-center gap-3 text-xs hover:bg-amber-500/10 p-1.5 rounded-lg transition-colors">
                                  <div className="flex flex-col items-center justify-center h-10 w-10 rounded bg-white border border-amber-200 shrink-0">
                                    <span className="text-[8px] font-black uppercase text-muted-foreground">{format(h.date.toDate(), 'MMM', { locale: ptBR })}</span>
                                    <span className="text-base font-black text-amber-600">{format(h.date.toDate(), 'dd')}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 font-bold">
                                      <Clock className="h-3 w-3" /> {format(h.date.toDate(), 'HH:mm')}
                                      <span className="text-muted-foreground font-normal ml-1">• {h.type}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                                      <MapPin className="h-3 w-3" /> {h.location}
                                    </div>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t mt-2">
                      <div className="flex items-center gap-4">
                        {p.driveFolderId ? (
                          <a 
                            href={`https://drive.google.com/drive/folders/${p.driveFolderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 font-bold text-[10px] uppercase flex items-center gap-1.5 hover:bg-emerald-50 px-2 py-1 rounded transition-all"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Drive OK
                          </a>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[10px] font-bold uppercase text-amber-600 px-2 animate-pulse hover:animate-none" 
                            onClick={() => handleSyncProcess(p)} 
                            disabled={isSyncing === p.id}
                          >
                            {isSyncing === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <RefreshCw className="h-3 w-3 mr-1.5" />} Pendente Drive
                          </Button>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground font-bold uppercase">Criado: {format(p.createdAt.toDate(), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <FolderOpen className="h-12 w-12 mb-4" />
            <p className="font-bold">Nenhum processo encontrado</p>
            <Button variant="link" onClick={() => setIsSheetOpen(true)}>Criar primeiro processo</Button>
          </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) setEditingProcess(null); setIsSheetOpen(open); }}>
        <SheetContent className="sm:max-w-4xl w-full p-1 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="text-2xl font-black font-headline">{editingProcess ? 'Editar Processo' : 'Novo Processo'}</SheetTitle>
            <SheetDescription>Siga os 6 passos para um cadastro completo.</SheetDescription>
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
      <QuickHearingDialog process={selectedProcess} open={isHearingOpen} onOpenChange={setIsHearingOpen} onSuccess={() => {}} />
      <FinancialEventDialog process={eventProcess} open={!!eventProcess} onOpenChange={o => !o && setEventProcess(null)} onEventCreated={() => {}} />

      <AlertDialog open={!!processToArchive} onOpenChange={o => !o && setProcessToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Processo?</AlertDialogTitle>
            <AlertDialogDescription>O processo será marcado como encerrado e movido para o histórico morto. Esta ação pode ser revertida editando o cadastro.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isArchiving} className="bg-amber-600 hover:bg-amber-700">
                {isArchiving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Confirmar Arquivamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!processToDelete} onOpenChange={o => !o && setProcessToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Processo permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os dados do sistema serão removidos (os arquivos no Drive permanecerão intactos).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}