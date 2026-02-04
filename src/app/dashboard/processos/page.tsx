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
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { Process, Client, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { FinancialEventDialog } from '@/components/process/FinancialEventDialog';
import { ProcessTimelineSheet } from '@/components/process/ProcessTimelineSheet';
import { ProcessForm } from '@/components/process/ProcessForm';
import { DocumentDraftingDialog } from '@/components/process/DocumentDraftingDialog';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const STATUS_CONFIG = {
  'Ativo': { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
  'Pendente': { label: 'Pendente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: ShieldAlert },
  'Arquivado': { label: 'Arquivado', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20', icon: Archive },
};

export default function ProcessosPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = React.useState(false);
  const [isDraftingOpen, setIsDraftingOpen] = React.useState(false);
  const [editingProcess, setEditingProcess] = React.useState<Process | null>(null);
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null);
  const [processToDelete, setProcessToDelete] = React.useState<Process | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
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

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);
  
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const filteredProcesses = React.useMemo(() => {
    if (!processesData) return [];
    return processesData.filter(p => {
        const matchesSearch = 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.processNumber?.includes(searchTerm) ||
          p.opposingParties?.some(party => party.name?.toLowerCase().includes(searchTerm.toLowerCase()));
        
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

  const getForumName = (address?: string) => {
    if (!address) return 'Não informado';
    return address.split(',')[0]?.trim() || address;
  };

  const getMapsUrl = (address?: string) => {
    if (!address) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const isLoading = isUserLoading || isLoadingProcesses;

  return (
    <div className="grid flex-1 items-start gap-6 auto-rows-max">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline">Processos Judiciais</h1>
          <p className="text-sm text-muted-foreground">Gestão estratégica de {filteredProcesses?.length || 'seus'} casos, prazos e andamentos.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-3 duration-700 delay-100">
          <Card className="bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10 transition-all hover:shadow-md hover:scale-105 duration-300">
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
          <Card className="bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10 transition-all hover:shadow-md hover:scale-105 duration-300">
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
          <Card className="bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/10 transition-all hover:shadow-md hover:scale-105 duration-300">
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
          [...Array(5)].map((_, i) => (
            <Card key={i} className="border-none shadow-sm">
              <CardContent className="p-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredProcesses.length > 0 ? (
          filteredProcesses.map((p, idx) => {
            const client = clientsMap.get(p.clientId);
            const StatusInfo = STATUS_CONFIG[p.status || 'Ativo'];
            const isExpanded = expandedProcessId === p.id;

            return (
              <Card key={p.id} className="border-none shadow-sm overflow-hidden animate-in fade-in duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-foreground">{p.name}</h3>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setExpandedProcessId(isExpanded ? null : p.id)}
                            className="h-6 w-6"
                            aria-label={isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                          >
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        </div>

                        {p.processNumber && (
                          <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted/50 w-fit px-1.5 py-0.5 rounded border border-border/50">
                            <span>{p.processNumber}</span>
                            <button
                              onClick={() => copyToClipboard(p.processNumber || '')}
                              className="ml-1 hover:text-primary transition-colors"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          {p.court ? (
                            <a
                              href={getMapsUrl(p.court)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex"
                            >
                              <Badge variant="outline" className="text-[8px] h-4 px-1.5 uppercase font-black text-muted-foreground border-muted-foreground/20 hover:text-primary">
                                <Gavel className="h-2 w-2 mr-1" /> {getForumName(p.court)}
                              </Badge>
                            </a>
                          ) : (
                            <Badge variant="outline" className="text-[8px] h-4 px-1.5 uppercase font-black text-muted-foreground border-muted-foreground/20">
                              <Gavel className="h-2 w-2 mr-1" /> Não informado
                            </Badge>
                          )}
                          {p.clientRole && (
                            <Badge variant="outline" className="text-[8px] h-4 px-1.5 uppercase font-black text-muted-foreground border-muted-foreground/20">
                              {p.clientRole}
                            </Badge>
                          )}
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
                            <DropdownMenuItem onSelect={() => { setSelectedProcess(p); setIsDraftingOpen(true); }}>
                              <FilePlus2 className="mr-2 h-4 w-4 text-emerald-500" /> Gerar Rascunho (IA/Drive)
                            </DropdownMenuItem>
                            {(userRole === 'admin' || userRole === 'lawyer' || userRole === 'financial') && (
                              <DropdownMenuItem onSelect={() => setEventProcess(p)}>
                                  <DollarSign className="mr-2 h-4 w-4 text-blue-500" /> Registrar Evento Financeiro
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => { setEditingProcess(p); setIsSheetOpen(true); }}>
                              <FileText className="mr-2 h-4 w-4" /> Editar Cadastro
                            </DropdownMenuItem>
                            {p.driveFolderId && (
                                <DropdownMenuItem asChild>
                                    <a href={`https://drive.google.com/drive/folders/${p.driveFolderId}`} target="_blank">
                                        <FolderOpen className="mr-2 h-4 w-4" /> Abrir no Drive
                                    </a>
                                </DropdownMenuItem>
                            )}
                            {userRole === 'admin' && (
                              <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={() => setProcessToDelete(p)}>
                                      <X className="mr-2 h-4 w-4" /> Excluir Processo
                                  </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {client ? (
                        <Link href={`/dashboard/clientes?clientId=${client.id}`} className="hover:underline">
                          <span className="font-semibold text-foreground">{client.firstName} {client.lastName}</span>
                          <span className="ml-2 font-mono">{client.document}</span>
                        </Link>
                      ) : (
                        <span className="italic">Desconhecido</span>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-2 rounded-xl border border-border/60 bg-muted/10 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Resumo</p>
                          <div className="text-xs">
                            <div><span className="text-muted-foreground">Área:</span> {p.legalArea || '—'}</div>
                            <div><span className="text-muted-foreground">Valor:</span> {formatCurrency(p.caseValue)}</div>
                            <div><span className="text-muted-foreground">Número:</span> {p.processNumber || '—'}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Juízo</p>
                          <div className="text-xs">
                            <div><span className="text-muted-foreground">Tribunal:</span> {p.court || '—'}</div>
                            <div><span className="text-muted-foreground">Vara:</span> {p.courtBranch || '—'}</div>
                            <div><span className="text-muted-foreground">Endereço:</span> {p.courtAddress || '—'}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Ações rápidas</p>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setSelectedProcess(p); setIsTimelineOpen(true); }}>
                              <History className="mr-2 h-4 w-4" /> Histórico
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingProcess(p); setIsSheetOpen(true); }}>
                              <FileText className="mr-2 h-4 w-4" /> Editar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-none shadow-sm">
            <CardContent className="h-48 text-center flex flex-col items-center justify-center gap-3 opacity-50">
              <div className="h-16 w-16 rounded-xl bg-muted/50 flex items-center justify-center">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold mb-1">Nenhum processo encontrado</p>
                <p className="text-xs text-muted-foreground">Comece criando seu primeiro processo judicial</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setEditingProcess(null); setIsSheetOpen(true); }} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Criar Primeiro Processo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) setEditingProcess(null); setIsSheetOpen(open); }}>
        <SheetContent className="sm:max-w-4xl w-full p-1 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="text-2xl font-black font-headline">
                {editingProcess ? 'Editar Processo' : 'Novo Processo'}
            </SheetTitle>
            <SheetDescription>Centralize todos os dados do caso para automação e relatórios.</SheetDescription>
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
      <FinancialEventDialog 
        process={eventProcess} 
        open={!!eventProcess} 
        onOpenChange={o => !o && setEventProcess(null)} 
        onEventCreated={() => {}} 
      />

      <AlertDialog open={!!processToDelete} onOpenChange={o => !o && setProcessToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Processo?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação removerá permanentemente os dados do processo <strong>{processToDelete?.name}</strong>. 
                Os arquivos no Google Drive não serão afetados.
            </AlertDialogDescription>
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
