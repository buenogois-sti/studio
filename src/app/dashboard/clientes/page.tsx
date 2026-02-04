'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  MoreVertical,
  PlusCircle,
  Search,
  Loader2,
  FolderKanban,
  LayoutGrid,
  List,
  MessageSquare,
  Mail,
  Trash2,
  Edit,
  FileUp,
  X,
  UserCheck,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useSession } from 'next-auth/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClientForm } from '@/components/client/ClientForm';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { Client, Process, ClientStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { syncClientToDrive } from '@/lib/drive';
import { cn } from '@/lib/utils';
import { VCFImportDialog } from '@/components/client/VCFImportDialog';
import { ClientDetailsSheet } from '@/components/client/ClientDetailsSheet';

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  lead: { label: 'Lead', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  inactive: { label: 'Inativo', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

export default function ClientsPage() {
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid');
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isVCFDialogOpen, setIsVCFDialogOpen] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = React.useState<Client | null>(null);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<ClientStatus | 'all'>('all');
  
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { data: session, status } = useSession();

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const clients = clientsData || [];

  const processesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'processes') : null), [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);
  const processes = processesData || [];

  // OTIMIZAÇÃO O(1): Mapa de contagem de processos por cliente (memoizado)
  const processesByClientMap = React.useMemo(() => {
    const map = new Map<string, number>();
    processes.forEach(p => {
      map.set(p.clientId, (map.get(p.clientId) || 0) + 1);
    });
    return map;
  }, [processes]);

  // OTIMIZAÇÃO: Cálculo de integridade memoizado para evitar lag de renderização
  const clientIntegrityMap = React.useMemo(() => {
    const map = new Map<string, number>();
    clients.forEach(client => {
      const fields = [
        client.firstName, client.lastName, client.document, client.email,
        client.mobile, client.rg, client.ctps, client.pis,
        client.address?.street, client.address?.zipCode,
        client.bankInfo?.pixKey
      ];
      const filled = fields.filter(f => !!f).length;
      map.set(client.id, Math.round((filled / fields.length) * 100));
    });
    return map;
  }, [clients]);

  // OTIMIZAÇÃO: Filtro e busca memoizados
  const filteredClients = React.useMemo(() => {
    let result = clients;
    if (statusFilter !== 'all') result = result.filter(c => c.status === statusFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(c => 
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.document?.includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [clients, searchTerm, statusFilter]);

  const handleAddNew = React.useCallback(() => { setEditingClient(null); setIsSheetOpen(true); }, []);
  const handleEdit = React.useCallback((client: Client) => { setEditingClient(client); setIsSheetOpen(true); }, []);
  const handleViewDetails = React.useCallback((client: Client) => { setSelectedClientForDetails(client); setIsDetailsOpen(true); }, []);

  const confirmDelete = async () => {
    if (!firestore || !clientToDelete) return;
    setIsDeleting(true);
    try {
        await deleteDoc(doc(firestore, 'clients', clientToDelete.id));
        toast({ title: 'Cliente excluído!' });
        setClientToDelete(null);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally { setIsDeleting(false); }
  };

  const handleSyncClient = async (client: Client) => {
    if (!session) return;
    setIsSyncing(client.id);
    try {
        await syncClientToDrive(client.id, `${client.firstName} ${client.lastName}`);
        toast({ title: "Sincronização Concluída!" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro na Sincronização', description: error.message });
    } finally { setIsSyncing(null); }
  };

  const isLoading = status === 'loading' || isLoadingClients || isLoadingProcesses;

  return (
    <>
      <div className="grid flex-1 items-start gap-6 auto-rows-max">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight font-headline text-white">Clientes</h1>
            <p className="text-sm text-muted-foreground">Gestão estratégica de contatos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar..." className="pl-8 pr-8 bg-card border-border/50 text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-white/50"><X className="h-4 w-4" /></button>}
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="h-9 bg-card border-border/50">
                <TabsTrigger value="grid" className="px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="table" className="px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><List className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={() => setIsVCFDialogOpen(true)} className="border-primary/20 text-primary hover:bg-primary/10"><FileUp className="mr-2 h-4 w-4" /> VCF</Button>
            <Button size="sm" onClick={handleAddNew} className="bg-primary text-primary-foreground hover:bg-primary/90"><PlusCircle className="mr-2 h-4 w-4" /> Novo</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full bg-card/50" />)}
          </div>
        ) : filteredClients.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredClients.map((client) => {
                const processesCount = processesByClientMap.get(client.id) || 0;
                const integrity = clientIntegrityMap.get(client.id) || 0;
                const statusInfo = STATUS_CONFIG[client.status || 'active'];
                return (
                  <Card key={client.id} className="relative flex flex-col group hover:shadow-xl transition-all duration-300 overflow-hidden bg-[#0f172a] border-border/50">
                    <div className="absolute top-0 left-0 w-full h-1 bg-muted">
                        <div className={cn("h-full transition-all duration-1000", integrity < 50 ? "bg-rose-500" : integrity < 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${integrity}%` }} />
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                              <Badge variant="outline" className={cn("text-[9px] font-bold uppercase mb-1", statusInfo.color)}>{statusInfo.label}</Badge>
                              <h3 className="font-bold text-lg leading-tight truncate text-white">{`${client.firstName} ${client.lastName}`}</h3>
                              <p className="text-xs text-muted-foreground font-mono">{client.document}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 text-white/50"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                                <DropdownMenuItem onClick={() => handleViewDetails(client)}><UserCheck className="mr-2 h-4 w-4 text-primary" /> Ficha Completa</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(client)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem asChild><Link href={`/dashboard/processos?clientId=${client.id}`}><FolderKanban className="mr-2 h-4 w-4" /> Processos</Link></DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setClientToDelete(client)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4 pt-0 text-slate-300">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px] border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10" asChild disabled={!client.mobile}>
                          <a href={`https://wa.me/${client.mobile?.replace(/\D/g, '')}`} target="_blank"><MessageSquare className="h-3.5 w-3.5 mr-2" /> WhatsApp</a>
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px] border-blue-500/20 text-blue-400 hover:bg-blue-500/10" asChild disabled={!client.email}>
                          <a href={`mailto:${client.email}`}><Mail className="h-3.5 w-3.5 mr-2" /> E-mail</a>
                        </Button>
                      </div>
                      <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground tracking-widest pt-2">
                          <span>{processesCount} Processo(s)</span>
                          <span className="text-primary">{integrity}% Info</span>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-border/30 bg-black/20 py-3 flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground font-bold uppercase">Cadastrado: {typeof client.createdAt === 'string' ? client.createdAt.split('T')[0] : client.createdAt.toDate().toLocaleDateString()}</span>
                        
                        {client.driveFolderId ? (
                          <a 
                            href={`https://drive.google.com/drive/folders/${client.driveFolderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 font-bold text-[9px] uppercase flex items-center gap-1 hover:bg-emerald-500/10 px-2 py-1 rounded-md transition-all"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Drive OK
                          </a>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-[9px] font-bold uppercase text-amber-400 p-0 px-2" 
                            onClick={() => handleSyncClient(client)} 
                            disabled={isSyncing === client.id}
                          >
                            {isSyncing === client.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Info className="h-3 w-3 mr-1" />} Pendente Drive
                          </Button>
                        )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-[#0f172a] border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="border-border/50 hover:bg-transparent"><TableHead className="w-[300px] text-muted-foreground">Cliente</TableHead><TableHead className="text-center text-muted-foreground">Status</TableHead><TableHead className="text-muted-foreground">Documento</TableHead><TableHead className="text-right text-muted-foreground">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id} className="border-border/30 hover:bg-white/5">
                        <TableCell>
                          <div className="flex flex-col"><span className="font-bold text-sm text-white">{`${client.firstName} ${client.lastName}`}</span><span className="text-[10px] text-muted-foreground">{client.email}</span></div>
                        </TableCell>
                        <TableCell className="text-center"><Badge variant="outline" className={cn("text-[9px] font-bold uppercase", STATUS_CONFIG[client.status || 'active'].color)}>{STATUS_CONFIG[client.status || 'active'].label}</Badge></TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{client.document}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleViewDetails(client)} className="text-primary hover:text-primary/80"><UserCheck className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        ) : (
             <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-card/50 min-h-[400px]">
                <div className="flex flex-col items-center gap-4 text-center p-8">
                    <Search className="h-10 w-10 text-muted-foreground/30" />
                    <h3 className="text-xl font-bold text-white">Nenhum cliente por aqui</h3>
                    <Button onClick={handleAddNew} className="bg-primary text-primary-foreground"><PlusCircle className="mr-2 h-4 w-4" /> Cadastrar Cliente</Button>
                </div>
            </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) setEditingClient(null); setIsSheetOpen(open); }}>
        <SheetContent className="sm:max-w-4xl w-full p-0 flex flex-col bg-[#020617] border-border">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="text-white">{editingClient ? 'Editar Cadastro' : 'Novo Cliente'}</SheetTitle>
            <SheetDescription className="text-slate-400">Mantenha a integridade dos dados para automação.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="pr-6 pb-8">
              <ClientForm onSave={() => { setIsSheetOpen(false); setEditingClient(null); }} client={editingClient} />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ClientDetailsSheet client={selectedClientForDetails} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
      <VCFImportDialog open={isVCFDialogOpen} onOpenChange={setIsVCFDialogOpen} onImportSuccess={() => {}} />

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !isDeleting && !open && setClientToDelete(null)}>
        <AlertDialogContent className="bg-[#0f172a] border-border"><AlertDialogHeader><AlertDialogTitle className="text-white">Excluir Cliente?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Isso removerá os dados de <strong>{clientToDelete?.firstName} {clientToDelete?.lastName}</strong> permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="bg-transparent border-border text-white hover:bg-white/5" disabled={isDeleting}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Exclusão'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
