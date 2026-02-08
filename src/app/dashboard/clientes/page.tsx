
'use client';
import * as React from 'react';
import {
  MoreVertical,
  PlusCircle,
  Search,
  Loader2,
  LayoutGrid,
  List,
  MessageSquare,
  Mail,
  Trash2,
  Edit,
  X,
  UserCheck,
  CheckCircle2,
  Info,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  FolderOpen,
  UserMinus,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

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
import { collection, doc, deleteDoc, query, limit, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Client, Process, ClientStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { syncClientToDrive } from '@/lib/drive';
import { cn } from '@/lib/utils';
import { ClientDetailsSheet } from '@/components/client/ClientDetailsSheet';
import { searchClients } from '@/lib/client-actions';

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  lead: { label: 'Lead', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  inactive: { label: 'Inativo', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

const ITEMS_PER_PAGE = 9;

export default function ClientsPage() {
  const searchParams = useSearchParams();
  const urlSearchTerm = searchParams.get('searchTerm');

  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid');
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = React.useState<Client | null>(null);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);
  const [clientToDeactivate, setClientToDeactivate] = React.useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDeactivating, setIsDeactivating] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState(urlSearchTerm || '');
  const [searchResults, setSearchResults] = React.useState<Client[] | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<ClientStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { data: session, status } = useSession();

  const clientsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'clients'), orderBy('updatedAt', 'desc'), limit(100)) : null), [firestore]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const processesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'processes'), limit(200)) : null), [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchClients(searchTerm);
        setSearchResults(results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const filteredClients = React.useMemo(() => {
    let result = searchResults || clientsData || [];
    
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    } else if (!searchTerm) {
      result = result.filter(c => c.status !== 'inactive');
    }
    
    return result;
  }, [clientsData, searchResults, statusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / ITEMS_PER_PAGE));
  const paginatedClients = React.useMemo(() => {
    return filteredClients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredClients, currentPage]);

  const processesByClientMap = React.useMemo(() => {
    const map = new Map<string, number>();
    if (!processesData) return map;
    
    const visibleClientIds = new Set(paginatedClients.map(c => c.id));
    processesData.forEach(p => {
      if (visibleClientIds.has(p.clientId)) {
        map.set(p.clientId, (map.get(p.clientId) || 0) + 1);
      }
    });
    return map;
  }, [processesData, paginatedClients]);

  const clientIntegrityMap = React.useMemo(() => {
    const map = new Map<string, number>();
    paginatedClients.forEach(client => {
      const commonFields = [
        client.firstName, client.document, client.email,
        client.mobile, client.address?.street, client.address?.zipCode,
        client.bankInfo?.pixKey
      ];
      const filled = commonFields.filter(f => !!f).length;
      map.set(client.id, Math.round((filled / commonFields.length) * 100));
    });
    return map;
  }, [paginatedClients]);

  const handleAddNew = React.useCallback(() => { setEditingClient(null); setIsSheetOpen(true); }, []);
  const handleEdit = React.useCallback((client: Client) => { setEditingClient(client); setIsSheetOpen(true); }, []);
  const handleViewDetails = React.useCallback((client: Client) => { setSelectedClientForDetails(client); setIsDetailsOpen(true); }, []);

  const confirmDelete = async () => {
    if (!firestore || !clientToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
        await deleteDoc(doc(firestore, 'clients', clientToDelete.id));
        toast({ title: 'Cliente excluído!' });
        setClientToDelete(null);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally { setIsDeleting(false); }
  };

  const confirmDeactivate = async () => {
    if (!firestore || !clientToDeactivate || isDeactivating) return;
    setIsDeactivating(true);
    try {
        const clientRef = doc(firestore, 'clients', clientToDeactivate.id);
        await updateDoc(clientRef, {
            status: 'inactive',
            updatedAt: serverTimestamp()
        });
        toast({ 
            title: 'Cliente Desativado', 
            description: `${clientToDeactivate.firstName} foi movido para o Arquivo Digital.` 
        });
        setClientToDeactivate(null);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally { setIsDeactivating(false); }
  };

  const handleSyncClient = async (client: Client) => {
    if (!session || isSyncing) return;
    setIsSyncing(client.id);
    try {
        const result = await syncClientToDrive(client.id, `${client.firstName} ${client.lastName}`);
        if (result.success) {
          toast({ title: "Sincronização Concluída!" });
        } else {
          toast({ variant: 'destructive', title: 'Erro na Sincronização', description: result.error || 'Falha desconhecida.' });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro na Sincronização', description: error.message || 'Erro de conexão.' });
    } finally { setIsSyncing(null); }
  };

  const isLoading = status === 'loading' || isLoadingClients || isLoadingProcesses || isSearching;

  return (
    <div className="grid flex-1 items-start gap-6 auto-rows-max">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline text-white">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gestão estratégica de contatos e CRM Jurídico.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-sm:w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar..." className="pl-8 pr-8 bg-[#0f172a] border-border/50 text-white h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} disabled={isSearching} />
            {isSearching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />}
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="h-10 bg-[#0f172a] border-border/50">
              <TabsTrigger value="grid" className="px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="table" className="px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><List className="h-4 w-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={handleAddNew} className="bg-primary text-primary-foreground h-10 px-6 font-bold" disabled={isLoading}><PlusCircle className="mr-2 h-4 w-4" /> Novo</Button>
        </div>
      </div>

      {isLoading && !paginatedClients.length ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Carregando base de clientes...</p>
        </div>
      ) : paginatedClients.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedClients.map((client) => {
                const processesCount = processesByClientMap.get(client.id) || 0;
                const integrity = clientIntegrityMap.get(client.id) || 0;
                const statusInfo = STATUS_CONFIG[client.status || 'active'];
                const syncing = isSyncing === client.id;
                
                return (
                  <Card key={client.id} className="relative flex flex-col group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden bg-[#0f172a] border-white/5">
                    {/* Visual Integrity Indicator */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                        <div className={cn("h-full transition-all duration-1000", integrity < 50 ? "bg-rose-500" : integrity < 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${integrity}%` }} />
                    </div>

                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className={cn("text-[8px] font-black uppercase px-1.5 h-4.5 border-none", statusInfo.color)}>{statusInfo.label}</Badge>
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{client.clientType || 'Pessoa Física'}</span>
                              </div>
                              <h3 
                                className="font-black text-lg leading-tight text-white group-hover:text-primary transition-colors cursor-pointer line-clamp-1"
                                onClick={() => handleViewDetails(client)}
                              >
                                {`${client.firstName} ${client.lastName}`}
                              </h3>
                              <p className="text-[10px] text-slate-500 font-mono mt-1 tracking-tighter">{client.document || 'DOC. NÃO INFORMADO'}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-white/20 hover:text-white" disabled={syncing}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-[#0f172a] border-white/10 shadow-2xl">
                                <DropdownMenuItem onClick={() => handleViewDetails(client)} className="font-bold focus:bg-primary/10 focus:text-primary">
                                  <UserCheck className="mr-2 h-4 w-4" /> Ver Ficha de Elite
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(client)}>
                                  <Edit className="mr-2 h-4 w-4" /> Editar Cadastro
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5" />
                                <DropdownMenuItem onClick={() => setClientToDeactivate(client)} className="text-amber-400 focus:bg-amber-500/10">
                                  <UserMinus className="mr-2 h-4 w-4" /> Arquivar (Inativar)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5" />
                                <DropdownMenuItem className="text-rose-500 font-bold focus:bg-rose-500/10" onClick={() => setClientToDelete(client)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir Permanentemente
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-grow space-y-5 pt-0">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-10 text-[10px] font-black uppercase border-emerald-500/20 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl" 
                          asChild 
                          disabled={!client.mobile || syncing}
                        >
                          <a href={`https://wa.me/${client.mobile?.replace(/\D/g, '')}`} target="_blank">
                            <MessageSquare className="h-3.5 w-3.5 mr-2" /> WhatsApp
                          </a>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-10 text-[10px] font-black uppercase border-blue-500/20 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl" 
                          asChild 
                          disabled={!client.email || syncing}
                        >
                          <a href={`mailto:${client.email}`}>
                            <Mail className="h-3.5 w-3.5 mr-2" /> E-mail
                          </a>
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 p-3 rounded-2xl bg-black/20 border border-white/5">
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Processos</p>
                          <p className="text-sm font-black text-white flex items-center gap-1.5">
                            <FolderKanban className="h-3 w-3 text-primary" /> {processesCount}
                          </p>
                        </div>
                        <div className="space-y-0.5 text-right border-l border-white/5">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Integridade</p>
                          <p className={cn(
                            "text-sm font-black",
                            integrity < 80 ? "text-amber-400" : "text-emerald-400"
                          )}>{integrity}% <span className="text-[9px] text-slate-600">Info</span></p>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="border-t border-white/5 bg-black/40 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 opacity-50">
                          <Info className="h-3 w-3" />
                          <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">
                            Início: {typeof client.createdAt === 'string' ? new Date(client.createdAt).toLocaleDateString() : client.createdAt.toDate().toLocaleDateString()}
                          </span>
                        </div>
                        
                        {client.driveFolderId ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-full gap-1.5"
                            asChild
                          >
                            <a href={`https://drive.google.com/drive/folders/${client.driveFolderId}`} target="_blank">
                              <FolderOpen className="h-3 w-3" /> Abrir Pasta
                            </a>
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[9px] font-black uppercase text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-full gap-1.5" 
                            onClick={() => handleSyncClient(client)} 
                            disabled={syncing}
                          >
                            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} 
                            {syncing ? 'Sincronizando' : 'Criar Drive'}
                          </Button>
                        )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-[#0f172a] border-white/5 overflow-hidden shadow-xl">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent bg-white/5">
                      <TableHead className="w-[350px] text-slate-500 font-black uppercase text-[10px] tracking-widest px-6">Identificação do Cliente</TableHead>
                      <TableHead className="text-center text-slate-500 font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                      <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Documento</TableHead>
                      <TableHead className="text-right text-slate-500 font-black uppercase text-[10px] tracking-widest px-6">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClients.map((client) => (
                      <TableRow key={client.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs">
                              {client.firstName.charAt(0)}{client.lastName?.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-white group-hover:text-primary transition-colors">{`${client.firstName} ${client.lastName}`}</span>
                              <span className="text-[10px] text-slate-500 lowercase">{client.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", STATUS_CONFIG[client.status || 'active'].color)}>
                            {STATUS_CONFIG[client.status || 'active'].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{client.document}</TableCell>
                        <TableCell className="text-right px-6">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleViewDetails(client)} 
                              className="text-primary hover:bg-primary/10 rounded-full"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-6 mt-12 py-4 border-t border-white/5">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} 
                disabled={currentPage === 1 || isLoading} 
                className="bg-[#0f172a] border-white/5 text-white hover:bg-primary/10 hover:text-primary transition-all px-4 h-9 text-[10px] font-black uppercase"
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white bg-primary/10 px-3 py-1 rounded">Página {currentPage}</span>
                <span className="text-xs text-slate-500 font-bold">/ {totalPages}</span>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} 
                disabled={currentPage === totalPages || isLoading} 
                className="bg-[#0f172a] border-white/5 text-white hover:bg-primary/10 hover:text-primary transition-all px-4 h-9 text-[10px] font-black uppercase"
              >
                Próxima <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </>
      ) : (
           <div className="flex flex-1 items-center justify-center rounded-3xl border-2 border-dashed border-white/5 bg-black/20 min-h-[400px]">
              <div className="flex flex-col items-center gap-4 text-center p-8">
                  <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center">
                    <FolderKanban className="h-10 w-10 text-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Base de Clientes Vazia</h3>
                    <p className="text-xs text-slate-500 max-w-xs">Adicione os contatos do escritório para iniciar a gestão estratégica.</p>
                  </div>
                  <Button onClick={handleAddNew} className="bg-primary text-primary-foreground font-black px-8 h-12 uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20">
                    <PlusCircle className="mr-2 h-4 w-4" /> Cadastrar Primeiro Cliente
                  </Button>
              </div>
          </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) setEditingClient(null); setIsSheetOpen(open); }}>
        <SheetContent className="sm:max-w-4xl w-full p-0 flex flex-col bg-[#020617] border-border">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="text-white text-2xl font-black font-headline">{editingClient ? 'Editar Cadastro' : 'Novo Cliente'}</SheetTitle>
            <SheetDescription className="text-slate-400">Certifique-se de preencher RG e CPF para habilitar a automação de documentos.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="pr-6 pb-8">
              <ClientForm onSave={() => { setIsSheetOpen(false); setEditingClient(null); }} client={editingClient} />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ClientDetailsSheet client={selectedClientForDetails} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />

      <AlertDialog open={!!clientToDeactivate} onOpenChange={(open) => !isDeactivating && !open && setClientToDeactivate(null)}>
        <AlertDialogContent className="bg-[#0f172a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-amber-400" />
              Desativar Cliente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Isso marcará <strong>{clientToDeactivate?.firstName} {clientToDeactivate?.lastName}</strong> como inativo. 
              O registro será movido para o <strong>Arquivo Digital</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-transparent border-white/10 text-slate-400 hover:text-white" disabled={isDeactivating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} disabled={isDeactivating} className="bg-amber-600 text-white hover:bg-amber-700 font-bold border-none">
              {isDeactivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Desativação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !isDeleting && !open && setClientToDelete(null)}>
        <AlertDialogContent className="bg-[#0f172a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir Registro?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              A exclusão é irreversível e removerá todos os vínculos financeiros e processuais deste cliente no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-transparent border-white/10 text-slate-400 hover:text-white" disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-rose-600 text-white hover:bg-rose-700 font-bold border-none">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
