
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
  RefreshCw
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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

// Componente de Card Memoizado para evitar re-renders massivos
const ClientCard = React.memo(({ 
  client, 
  processesCount, 
  integrity, 
  statusInfo, 
  isSyncing, 
  onSync, 
  onDetails, 
  onEdit, 
  onDelete, 
  onDeactivate 
}: {
  client: Client;
  processesCount: number;
  integrity: number;
  statusInfo: any;
  isSyncing: boolean;
  onSync: (c: Client) => void;
  onDetails: (c: Client) => void;
  onEdit: (c: Client) => void;
  onDelete: (c: Client) => void;
  onDeactivate: (c: Client) => void;
}) => (
  <Card className="relative flex flex-col group hover:shadow-2xl transition-all duration-300 bg-[#0f172a] border-white/5 overflow-hidden">
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
              <h3 className="font-black text-lg text-white group-hover:text-primary transition-colors cursor-pointer line-clamp-1" onClick={() => onDetails(client)}>{`${client.firstName} ${client.lastName}`}</h3>
              <p className="text-[10px] text-slate-500 font-mono tracking-tighter">{client.document || 'DOC. NÃO INFORMADO'}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 text-white/20"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10">
                <DropdownMenuItem onClick={() => onDetails(client)} className="font-bold"><UserCheck className="mr-2 h-4 w-4" /> Ver Ficha de Elite</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(client)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => onDeactivate(client)} className="text-amber-400"><UserMinus className="mr-2 h-4 w-4" /> Arquivar</DropdownMenuItem>
                <DropdownMenuItem className="text-rose-500 font-bold" onClick={() => onDelete(client)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </CardHeader>
    <CardContent className="flex-grow space-y-5 pt-0">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-10 text-[10px] font-black uppercase border-emerald-500/20 text-emerald-400 bg-emerald-500/5 rounded-xl" asChild disabled={!client.mobile}>
          <a href={`https://wa.me/${client.mobile?.replace(/\D/g, '')}`} target="_blank"><MessageSquare className="h-3.5 w-3.5 mr-2" /> WhatsApp</a>
        </Button>
        <Button variant="outline" size="sm" className="flex-1 h-10 text-[10px] font-black uppercase border-blue-500/20 text-blue-400 bg-blue-500/5 rounded-xl" asChild disabled={!client.email}>
          <a href={`mailto:${client.email}`}><Mail className="h-3.5 w-3.5 mr-2" /> E-mail</a>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 p-3 rounded-2xl bg-black/20 border border-white/5">
        <div><p className="text-[8px] font-black text-slate-500 uppercase">Processos</p><p className="text-sm font-black text-white">{processesCount}</p></div>
        <div className="text-right border-l border-white/5"><p className="text-[8px] font-black text-slate-500 uppercase">Integridade</p><p className="text-sm font-black text-white">{integrity}%</p></div>
      </div>
    </CardContent>
    <CardFooter className="border-t border-white/5 bg-black/40 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 opacity-50"><Info className="h-3 w-3" /><span className="text-[8px] font-black uppercase">Ref: {client.id.substring(0, 8)}</span></div>
        {client.driveFolderId ? (
          <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase text-emerald-400 rounded-full gap-1.5" asChild><a href={`https://drive.google.com/drive/folders/${client.driveFolderId}`} target="_blank"><FolderOpen className="h-3 w-3" /> Abrir Pasta</a></Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase text-amber-400 rounded-full gap-1.5" onClick={() => onSync(client)} disabled={isSyncing}>{isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} {isSyncing ? 'Sincronizando' : 'Criar Drive'}</Button>
        )}
    </CardFooter>
  </Card>
));
ClientCard.displayName = 'ClientCard';

export default function ClientsPage() {
  const searchParams = useSearchParams();
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
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Client[] | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<ClientStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { data: session } = useSession();

  const clientsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'clients'), orderBy('updatedAt', 'desc'), limit(100)) : null), [firestore]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const processesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'processes'), limit(200)) : null), [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);

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
      } catch (err) { console.error(err); } finally { setIsSearching(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredClients = React.useMemo(() => {
    let result = searchResults || clientsData || [];
    if (statusFilter !== 'all') result = result.filter(c => c.status === statusFilter);
    else if (!searchTerm) result = result.filter(c => c.status !== 'inactive');
    return result;
  }, [clientsData, searchResults, statusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / ITEMS_PER_PAGE));
  const paginatedClients = React.useMemo(() => filteredClients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [filteredClients, currentPage]);

  const processesByClientMap = React.useMemo(() => {
    const map = new Map<string, number>();
    if (!processesData) return map;
    processesData.forEach(p => map.set(p.clientId, (map.get(p.clientId) || 0) + 1));
    return map;
  }, [processesData]);

  const clientIntegrityMap = React.useMemo(() => {
    const map = new Map<string, number>();
    paginatedClients.forEach(client => {
      const commonFields = [client.firstName, client.document, client.email, client.mobile, client.address?.street, client.address?.zipCode, client.bankInfo?.pixKey];
      const filled = commonFields.filter(f => !!f).length;
      map.set(client.id, Math.round((filled / commonFields.length) * 100));
    });
    return map;
  }, [paginatedClients]);

  const handleSyncClient = React.useCallback(async (client: Client) => {
    if (isSyncing) return;
    setIsSyncing(client.id);
    try {
        const result = await syncClientToDrive(client.id, `${client.firstName} ${client.lastName}`);
        if (result.success) toast({ title: "Sincronização Concluída!" });
        else toast({ variant: 'destructive', title: 'Erro na Sincronização' });
    } catch (error: any) { toast({ variant: 'destructive', title: 'Erro de conexão' }); } finally { setIsSyncing(null); }
  }, [isSyncing, toast]);

  const isLoading = isLoadingClients || isSearching;

  return (
    <div className="grid flex-1 items-start gap-6 auto-rows-max animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline text-white">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gestão estratégica de contatos Bueno Gois.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar..." className="pl-8 bg-[#0f172a] border-border/50 text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            {isSearching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />}
          </div>
          <Button onClick={() => { setEditingClient(null); setIsSheetOpen(true); }} className="bg-primary text-primary-foreground font-bold h-10"><PlusCircle className="mr-2 h-4 w-4" /> Novo</Button>
        </div>
      </div>

      {isLoading && !paginatedClients.length ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-sm font-black uppercase text-muted-foreground">Otimizando Dados...</p></div>
      ) : paginatedClients.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedClients.map((client) => (
            <ClientCard 
              key={client.id}
              client={client}
              processesCount={processesByClientMap.get(client.id) || 0}
              integrity={clientIntegrityMap.get(client.id) || 0}
              statusInfo={STATUS_CONFIG[client.status || 'active']}
              isSyncing={isSyncing === client.id}
              onSync={handleSyncClient}
              onDetails={(c) => { setSelectedClientForDetails(c); setIsDetailsOpen(true); }}
              onEdit={(c) => { setEditingClient(c); setIsSheetOpen(true); }}
              onDelete={setClientToDelete}
              onDeactivate={setClientToDeactivate}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-3xl border-2 border-dashed border-white/5 bg-black/20 py-20 text-center text-slate-500 italic">Nenhum cliente localizado.</div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-6 mt-8">
          <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="h-9 px-4 text-[10px] font-black uppercase"><ChevronLeft className="h-4 w-4 mr-2" /> Anterior</Button>
          <span className="text-xs font-black text-white">Página {currentPage} / {totalPages}</span>
          <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="h-9 px-4 text-[10px] font-black uppercase">Próxima <ChevronRight className="h-4 w-4 ml-2" /></Button>
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-5xl bg-[#020617] border-border"><SheetHeader><SheetTitle className="text-white text-2xl font-black font-headline">{editingClient ? 'Editar Cadastro' : 'Novo Cliente'}</SheetTitle><SheetDescription className="text-slate-400">Preencha os dados conforme documentação oficial.</SheetDescription></SheetHeader><ClientForm onSave={() => setIsSheetOpen(false)} client={editingClient} /></SheetContent>
      </Sheet>

      <ClientDetailsSheet client={selectedClientForDetails} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
    </div>
  );
}
