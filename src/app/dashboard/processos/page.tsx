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
  Users as UsersIcon,
  TrendingUp,
  FilePlus2
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { Process, Client } from '@/lib/types';
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

  const { firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const clientIdFilter = searchParams.get('clientId');

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
            p.opposingParties?.some(party => party.toLowerCase().includes(searchTerm.toLowerCase()));
        
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

  const isLoading = isUserLoading || isLoadingProcesses;

  return (
    <>
      <div className="grid flex-1 items-start gap-6 auto-rows-max">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight font-headline">Processos</h1>
            <p className="text-sm text-muted-foreground">Gestão estratégica de casos e andamentos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar..." className="pl-8 pr-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5"><X className="h-4 w-4 text-muted-foreground" /></button>}
            </div>
            <Button size="sm" onClick={() => { setEditingProcess(null); setIsSheetOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Novo Processo
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
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
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">VTM (Valor Total)</p>
                        <p className="text-xl font-black leading-none">{stats.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[350px] font-bold">Processo / Identificação</TableHead>
                  <TableHead className="font-bold">Cliente</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="text-right font-bold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProcesses.length > 0 ? (
                  filteredProcesses.map(p => {
                    const client = clientsMap.get(p.clientId);
                    const StatusInfo = STATUS_CONFIG[p.status || 'Ativo'];
                    
                    return (
                      <TableRow key={p.id} className="group hover:bg-muted/30">
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-sm leading-tight">{p.name}</span>
                            {p.processNumber && (
                                <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                                    <span>{p.processNumber}</span>
                                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => copyToClipboard(p.processNumber || '')}>
                                        <Copy className="h-2.5 w-2.5" />
                                    </Button>
                                </div>
                            )}
                            <div className='flex items-center gap-2 mt-1'>
                                <Badge variant="outline" className="text-[8px] h-3.5 px-1 uppercase font-bold text-muted-foreground border-muted-foreground/30">
                                    <Gavel className="h-2 w-2 mr-1" /> {p.court || 'Não informado'}
                                </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {client ? (
                            <Link href={`/dashboard/clientes?clientId=${client.id}`} className="hover:underline">
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{client.firstName} {client.lastName}</span>
                                    <span className="text-[10px] text-muted-foreground">{client.document}</span>
                                </div>
                            </Link>
                          ) : <span className="text-muted-foreground italic text-xs">Desconhecido</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("gap-1.5 h-6 text-[9px] font-black uppercase", StatusInfo.color)}>
                            <StatusInfo.icon className="h-3 w-3" />
                            {StatusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Gestão do Processo</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsTimelineOpen(true); }}>
                                <History className="mr-2 h-4 w-4 text-primary" /> Timeline de Andamentos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedProcess(p); setIsDraftingOpen(true); }}>
                                <FilePlus2 className="mr-2 h-4 w-4 text-emerald-500" /> Gerar Rascunho (IA/Drive)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEventProcess(p)}>
                                <DollarSign className="mr-2 h-4 w-4 text-blue-500" /> Registrar Evento Financeiro
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setEditingProcess(p); setIsSheetOpen(true); }}>
                                <FileText className="mr-2 h-4 w-4" /> Editar Cadastro
                              </DropdownMenuItem>
                              {p.driveFolderId && (
                                  <DropdownMenuItem asChild>
                                      <a href={`https://drive.google.com/drive/folders/${p.driveFolderId}`} target="_blank">
                                          <FolderOpen className="mr-2 h-4 w-4" /> Abrir no Drive
                                      </a>
                                  </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setProcessToDelete(p)}>
                                <X className="mr-2 h-4 w-4" /> Excluir Processo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                      Nenhum processo encontrado para esta busca.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Forms & Dialogs */}
      <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) setEditingProcess(null); setIsSheetOpen(open); }}>
        <SheetContent className="sm:max-w-4xl w-full p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle>{editingProcess ? 'Editar Processo' : 'Novo Processo'}</SheetTitle>
            <SheetDescription>Centralize todos os dados do caso para automação e relatórios.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="pr-6 pb-8">
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
    </>
  );
}
