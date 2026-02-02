'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  MoreVertical,
  PlusCircle,
  Search,
  ListFilter,
  Loader2,
  FolderKanban,
  LayoutGrid,
  List,
  MessageSquare,
  Mail,
  ExternalLink,
  Trash2,
  Edit,
  FileUp,
  X,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useSession } from 'next-auth/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClientForm } from '@/components/client/ClientForm';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import type { Client, Process, ClientStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { syncClientToDrive } from '@/lib/drive';
import { cn } from '@/lib/utils';
import { VCFImportDialog } from '@/components/client/VCFImportDialog';
import { ClientDetailsSheet } from '@/components/client/ClientDetailsSheet';

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  lead: { label: 'Lead/Consulta', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  inactive: { label: 'Inativo', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
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

  const clientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clients') : null),
    [firestore]
  );
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const clients = clientsData || [];

  const processesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'processes') : null),
    [firestore]
  );
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);
  const processes = processesData || [];

  const processesByClientMap = React.useMemo(() => {
    const map = new Map<string, Process[]>();
    processes.forEach(p => {
      if (!map.has(p.clientId)) {
        map.set(p.clientId, []);
      }
      map.get(p.clientId)?.push(p);
    });
    return map;
  }, [processes]);

  const calculateIntegrity = (client: Client) => {
    const fields = [
      client.firstName, client.lastName, client.document, client.email,
      client.mobile, client.rg, client.ctps, client.pis,
      client.address?.street, client.address?.zipCode,
      client.bankInfo?.pixKey
    ];
    const filled = fields.filter(f => !!f).length;
    return Math.round((filled / fields.length) * 100);
  };

  const filteredClients = React.useMemo(() => {
    let result = clients;

    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const lowercasedFilter = searchTerm.toLowerCase();
      const cleanSearch = lowercasedFilter.replace(/\D/g, '');
      
      result = result.filter(client => {
        const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
        const document = client.document?.toLowerCase() || '';
        const email = client.email?.toLowerCase() || '';
        const mobile = client.mobile?.replace(/\D/g, '') || '';
        
        return (
          fullName.includes(lowercasedFilter) || 
          document.includes(lowercasedFilter) || 
          email.includes(lowercasedFilter) ||
          (cleanSearch && mobile.includes(cleanSearch))
        );
      });
    }
    return result;
  }, [clients, searchTerm, statusFilter]);


  const formatDate = React.useCallback((date: Timestamp | string | undefined) => {
    if (!date) return '';
    if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('pt-BR');
    }
    if ((date as any).toDate) {
        return (date as any).toDate().toLocaleDateString('pt-BR');
    }
    return '';
  }, []);
  
  const isLoading = status === 'loading' || isLoadingClients || isLoadingProcesses;

  const handleAddNew = () => {
    setEditingClient(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsSheetOpen(true);
  };

  const handleViewDetails = (client: Client) => {
    setSelectedClientForDetails(client);
    setIsDetailsOpen(true);
  };

  const confirmDelete = async () => {
    if (!firestore || !clientToDelete) return;
    setIsDeleting(true);
    try {
        const clientRef = doc(firestore, 'clients', clientToDelete.id);
        await deleteDoc(clientRef);
        toast({ title: 'Cliente excluído!' });
        setClientToDelete(null);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    } finally {
        setIsDeleting(false);
    }
  };

  const handleSyncClient = async (client: Client) => {
    if (!session) return;
    const clientName = `${client.firstName} ${client.lastName}`;
    setIsSyncing(client.id);
    try {
        await syncClientToDrive(client.id, clientName);
        toast({ title: "Sincronização Concluída!" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro na Sincronização', description: error.message });
    } finally {
        setIsSyncing(null);
    }
  };

  const renderClientActions = (client: Client) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleViewDetails(client)}>
          <UserCheck className="mr-2 h-4 w-4 text-primary" /> Ficha Cadastral
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEdit(client)}>
          <Edit className="mr-2 h-4 w-4" /> Editar Dados
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/processos?clientId=${client.id}`}>
            <FolderKanban className="mr-2 h-4 w-4" /> Ver Processos
          </Link>
        </DropdownMenuItem>
        {client.driveFolderId && (
            <DropdownMenuItem onSelect={() => window.open(`https://drive.google.com/drive/folders/${client.driveFolderId}`, '_blank')}>
                <ExternalLink className="mr-2 h-4 w-4" /> Pasta no Drive
            </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => setClientToDelete(client)}>
          <Trash2 className="mr-2 h-4 w-4" /> Excluir Cliente
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="grid flex-1 items-start gap-6 auto-rows-max">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight font-headline">Clientes</h1>
            <p className="text-sm text-muted-foreground">Gestão de contatos e integridade documental.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                className="pl-8 pr-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="h-9">
                <TabsTrigger value="grid" className="px-3"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="table" className="px-3"><List className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </Tabs>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={statusFilter === 'all'} onSelect={() => setStatusFilter('all')}>Todos</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === 'active'} onSelect={() => setStatusFilter('active')}>Ativos</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === 'lead'} onSelect={() => setStatusFilter('lead')}>Leads/Consultas</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === 'inactive'} onSelect={() => setStatusFilter('inactive')}>Inativos</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" className="h-9" onClick={() => setIsVCFDialogOpen(true)}>
              <FileUp className="mr-2 h-4 w-4" /> Importar VCF
            </Button>
            <Button size="sm" className="h-9" onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
          </div>
        ) : filteredClients.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredClients.map((client) => {
                const clientProcesses = processesByClientMap.get(client.id) || [];
                const integrity = calculateIntegrity(client);
                const statusInfo = STATUS_CONFIG[client.status || 'active'];

                return (
                  <Card key={client.id} className="relative flex flex-col group hover:shadow-xl hover:border-primary/30 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-muted">
                        <div className={cn(
                            "h-full transition-all duration-1000",
                            integrity < 50 ? "bg-rose-500" : integrity < 80 ? "bg-amber-500" : "bg-emerald-500"
                        )} style={{ width: `${integrity}%` }} />
                    </div>
                    
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={cn("text-[9px] font-bold uppercase py-0 px-1.5 h-4", statusInfo.color)}>
                                    {statusInfo.label}
                                </Badge>
                                {integrity < 70 && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /></TooltipTrigger>
                                            <TooltipContent>Cadastro Incompleto ({integrity}%)</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                              </div>
                              <h3 className="font-bold text-lg leading-tight truncate">{`${client.firstName} ${client.lastName}`}</h3>
                              <p className="text-xs text-muted-foreground font-mono">{client.document}</p>
                          </div>
                          {renderClientActions(client)}
                      </div>
                    </CardHeader>

                    <CardContent className="flex-grow space-y-4 pt-0">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-8 gap-2 text-[11px]" asChild disabled={!client.mobile}>
                          <a href={`https://wa.me/${client.mobile?.replace(/\D/g, '')}`} target="_blank">
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-8 gap-2 text-[11px]" asChild disabled={!client.email}>
                          <a href={`mailto:${client.email}`}>
                            <Mail className="h-3.5 w-3.5 text-blue-500" /> E-mail
                          </a>
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Processos ({clientProcesses.length})</h4>
                            <span className="text-[10px] font-bold text-primary">{integrity}% Info</span>
                        </div>
                        
                        <div className="grid gap-1.5">
                            {clientProcesses.length > 0 ? (
                                clientProcesses.slice(0, 2).map(proc => (
                                    <Link key={proc.id} href={`/dashboard/processos?clientId=${client.id}`} className="flex items-center gap-2 text-[11px] p-2 rounded-lg bg-muted/30 border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all">
                                        <FolderKanban className="h-3 w-3 text-muted-foreground" />
                                        <span className="flex-1 truncate font-medium">{proc.name}</span>
                                        <Badge variant="outline" className="text-[8px] h-3.5 px-1 uppercase">{proc.status}</Badge>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-[10px] text-muted-foreground italic p-2 border border-dashed rounded-lg bg-muted/5">Nenhum processo ativo.</div>
                            )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="border-t bg-muted/10 py-3 flex items-center justify-between">
                        <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">
                            Desde {formatDate(client.createdAt)}
                        </div>
                        {client.driveFolderId ? (
                            <div className="flex items-center gap-1 text-emerald-600 font-bold text-[9px] uppercase">
                                <CheckCircle2 className="h-3 w-3" /> Sincronizado
                            </div>
                        ) : (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-[9px] font-bold uppercase text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 p-0 px-2"
                                onClick={() => handleSyncClient(client)}
                                disabled={isSyncing === client.id}
                            >
                                {isSyncing === client.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Info className="h-3 w-3 mr-1" />}
                                Pendente Drive
                            </Button>
                        )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[300px] font-bold">Cliente</TableHead>
                      <TableHead className="font-bold text-center">Status</TableHead>
                      <TableHead className="font-bold">Documento</TableHead>
                      <TableHead className="hidden md:table-cell font-bold">Integridade</TableHead>
                      <TableHead className="hidden lg:table-cell font-bold">Processos</TableHead>
                      <TableHead className="text-right font-bold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => {
                      const integrity = calculateIntegrity(client);
                      const statusInfo = STATUS_CONFIG[client.status || 'active'];
                      const count = processesByClientMap.get(client.id)?.length || 0;

                      return (
                        <TableRow key={client.id} className="group hover:bg-muted/30">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">{`${client.firstName} ${client.lastName}`}</span>
                              <span className="text-[10px] text-muted-foreground">{client.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                             <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", statusInfo.color)}>
                                {statusInfo.label}
                             </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{client.document}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2">
                                <Progress value={integrity} className="h-1.5 w-16" />
                                <span className="text-[10px] font-bold">{integrity}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="secondary" className="h-5 text-[10px] font-bold">{count} Casos</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500" asChild disabled={!client.mobile}>
                                    <a href={`https://wa.me/${client.mobile?.replace(/\D/g, '')}`} target="_blank"><MessageSquare className="h-4 w-4" /></a>
                                </Button>
                                {renderClientActions(client)}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        ) : (
             <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed bg-muted/5 min-h-[400px]">
                <div className="flex flex-col items-center gap-4 text-center p-8">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                      <Search className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold">Nenhum cliente por aqui</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">Ajuste seus filtros ou comece cadastrando seu primeiro cliente ou prospect.</p>
                    </div>
                    <div className="flex gap-2">
                         {searchTerm || statusFilter !== 'all' ? (
                             <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>Limpar Filtros</Button>
                        ) : (
                            <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Cadastrar Cliente</Button>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) setEditingClient(null); setIsSheetOpen(open); }}>
        <SheetContent className="sm:max-w-4xl w-full">
          <SheetHeader>
            <SheetTitle>{editingClient ? 'Editar Cadastro' : 'Novo Cliente'}</SheetTitle>
            <SheetDescription>Mantenha a integridade dos dados para automação de documentos.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <ClientForm onSave={() => { setIsSheetOpen(false); setEditingClient(null); }} client={editingClient} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ClientDetailsSheet client={selectedClientForDetails} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
      <VCFImportDialog open={isVCFDialogOpen} onOpenChange={setIsVCFDialogOpen} onImportSuccess={() => {}} />

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !isDeleting && !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Cliente?</AlertDialogTitle>
            <AlertDialogDescription>Isso removerá permanentemente os dados de <strong>{clientToDelete?.firstName} {clientToDelete?.lastName}</strong>. Os arquivos no Drive não serão excluídos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
