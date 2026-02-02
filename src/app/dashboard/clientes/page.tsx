'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  MoreVertical,
  PlusCircle,
  Search,
  File,
  ListFilter,
  Loader2,
  FolderKanban,
  LayoutGrid,
  List,
  Copy,
  MessageSquare,
  Mail,
  ExternalLink,
  Trash2,
  Edit,
  DollarSign,
  FileUp,
  X
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

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import type { Client, Process } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { syncClientToDrive } from '@/lib/drive';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { VCFImportDialog } from '@/components/client/VCFImportDialog';


export default function ClientsPage() {
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid');
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isVCFDialogOpen, setIsVCFDialogOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
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

  const filteredClients = React.useMemo(() => {
    if (!searchTerm.trim()) {
        return clients;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return clients.filter(client => {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      const document = client.document?.toLowerCase() || '';
      const email = client.email?.toLowerCase() || '';
      const mobile = client.mobile?.replace(/\D/g, '') || '';
      const phone = client.phone?.replace(/\D/g, '') || '';
      
      return (
        fullName.includes(lowercasedFilter) || 
        document.includes(lowercasedFilter) || 
        email.includes(lowercasedFilter) ||
        mobile.includes(lowercasedFilter.replace(/\D/g, '')) ||
        phone.includes(lowercasedFilter.replace(/\D/g, ''))
      );
    });
  }, [clients, searchTerm]);


  const formatDate = (date: Timestamp | string | undefined) => {
    if (!date) return '';
    if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('pt-BR');
    }
    if ((date as any).toDate) {
        return (date as any).toDate().toLocaleDateString('pt-BR');
    }
    return '';
  }
  
  const isLoading = status === 'loading' || isLoadingClients || isLoadingProcesses;

  const handleAddNew = () => {
    setEditingClient(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsSheetOpen(true);
  };

  const handleDeleteTrigger = (client: Client) => {
    setClientToDelete(client);
  };

  const confirmDelete = async () => {
    if (!firestore || !clientToDelete) return;
    setIsDeleting(true);
    try {
        const clientRef = doc(firestore, 'clients', clientToDelete.id);
        await deleteDoc(clientRef);
        toast({ title: 'Cliente excluído!', description: `O cliente ${clientToDelete.firstName} foi removido.` });
        setClientToDelete(null);
    } catch (error: any) {
        console.error("Erro ao excluir cliente:", error);
        toast({ 
          variant: 'destructive', 
          title: 'Erro ao excluir', 
          description: error.message || 'Ocorreu um erro ao tentar excluir o cliente. Verifique suas permissões.' 
        });
    } finally {
        setIsDeleting(false);
    }
  };

  const onFormSave = () => {
    setIsSheetOpen(false);
    setEditingClient(null);
  }
  
  const handleSyncClient = async (client: Client) => {
    if (!session) {
        toast({ variant: 'destructive', title: 'Erro de Autenticação', description: 'Sessão de usuário não encontrada.' });
        return;
    }
    const clientName = `${client.firstName} ${client.lastName}`;
    setIsSyncing(client.id);
    try {
        await syncClientToDrive(client.id, clientName);
        toast({
            title: "Sincronização Concluída!",
            description: `Pasta, planilha e kit de documentos para ${clientName} foram criados no Google Drive.`
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Erro na Sincronização',
            description: error.message || 'Não foi possível criar os arquivos no Google Drive.'
        });
    } finally {
        setIsSyncing(null);
    }
  };

  const copyToClipboard = (text: string | undefined, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} copiado!`,
      description: `O valor "${text}" foi copiado para a área de transferência.`,
    });
  };

  const renderClientActions = (client: Client) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleEdit(client)}>
          <Edit className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/processos?clientId=${client.id}`}>
            <FolderKanban className="mr-2 h-4 w-4" /> Ver Processos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {client.driveFolderId ? (
            <>
            <DropdownMenuItem asChild>
                <Link href={`/dashboard/clientes/${client.id}/documentos`}>
                  <File className="mr-2 h-4 w-4" /> Gerenciar Documentos
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
                onSelect={() => window.open(`https://drive.google.com/drive/folders/${client.driveFolderId}`, '_blank')}
            >
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir no Drive
            </DropdownMenuItem>
            </>
        ) : (
            <DropdownMenuItem onClick={() => handleSyncClient(client)} disabled={isSyncing === client.id}>
                {isSyncing === client.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Loader2 className="mr-2 h-4 w-4" />}
                Sincronizar com Drive
            </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTrigger(client)}>
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="grid flex-1 items-start gap-6 auto-rows-max">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className='flex items-center gap-2'>
            <h1 className="text-2xl font-bold tracking-tight font-headline">
              Clientes
            </h1>
            {!isLoading && <Badge variant="secondary">{filteredClients.length}</Badge>}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome, CPF, E-mail ou Celular..."
                className="pl-8 pr-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="hidden sm:block">
              <TabsList>
                <TabsTrigger value="grid"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="table"><List className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </Tabs>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filtro</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked>Todos</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Com Processo Ativo</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Sem Processo</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-1" onClick={() => setIsVCFDialogOpen(true)}>
                <FileUp className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Importar VCF</span>
              </Button>
              <Button size="sm" className="h-9 gap-1" onClick={handleAddNew}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Novo Cliente</span>
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="w-full space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                   <Skeleton className="h-4 w-full" />
                   <Skeleton className="h-4 w-full" />
                   <Separator />
                   <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredClients.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredClients.map((client) => {
                const clientProcesses = processes.filter(p => p.clientId === client.id);
                const pixKey = client.bankInfo?.pixKey;

                return (
                  <Card key={client.id} className="flex flex-col group hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                              <h3 className="font-semibold text-lg leading-tight truncate">{`${client.firstName} ${client.lastName}`}</h3>
                              <p className="text-sm text-muted-foreground truncate">{client.document}</p>
                          </div>
                          {renderClientActions(client)}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="justify-start gap-2 h-8" asChild disabled={!client.mobile}>
                          <a href={`https://wa.me/${client.mobile?.replace(/\D/g, '')}`} target="_blank">
                            <MessageSquare className="h-3.5 w-3.5 text-green-500" />
                            <span className="truncate">{client.mobile || 'Sem cel.'}</span>
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start gap-2 h-8" asChild disabled={!client.email}>
                          <a href={`mailto:${client.email}`}>
                            <Mail className="h-3.5 w-3.5 text-blue-500" />
                            <span className="truncate">{client.email}</span>
                          </a>
                        </Button>
                      </div>

                      {pixKey && (
                        <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between group/pix">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <DollarSign className="h-4 w-4 text-amber-500 shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Chave PIX</span>
                              <span className="text-sm font-medium truncate">{pixKey}</span>
                            </div>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 opacity-0 group-hover/pix:opacity-100 transition-opacity"
                                  onClick={() => copyToClipboard(pixKey, 'Chave PIX')}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar PIX</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}

                      <Separator />
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Processos ({clientProcesses.length})</h4>
                          <Link href={`/dashboard/processos?clientId=${client.id}`} className="text-xs text-primary hover:underline font-medium">Ver todos</Link>
                        </div>
                        <div className="space-y-1.5">
                            {clientProcesses.length > 0 ? (
                                clientProcesses.slice(0, 2).map(proc => (
                                    <div key={proc.id} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/30 border border-transparent hover:border-muted-foreground/20 transition-colors">
                                        <FolderKanban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="flex-1 truncate font-medium">{proc.name}</span>
                                        <Badge variant="outline" className="text-[10px] px-1.5 h-4 uppercase">{proc.status}</Badge>
                                    </div>
                                ))
                            ) : (
                                <div className="text-[11px] text-muted-foreground text-center py-2 px-2 border border-dashed rounded-md bg-muted/10">Nenhum processo ativo.</div>
                            )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-3 pb-3 bg-muted/10">
                      <div className="w-full flex items-center justify-between">
                           <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                              Desde: {formatDate(client.createdAt)}
                          </div>
                          {client.driveFolderId ? (
                               <Badge variant="secondary" className='bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-[10px] h-5'>Sincronizado</Badge>
                          ) : (
                               <Badge variant="outline" className='border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/5 text-[10px] h-5'>Pendente Drive</Badge>
                          )}
                      </div>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[300px]">Cliente</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead className="hidden md:table-cell">E-mail</TableHead>
                      <TableHead className="hidden lg:table-cell">Celular</TableHead>
                      <TableHead>Chave PIX</TableHead>
                      <TableHead className="hidden xl:table-cell">Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id} className="group">
                        <TableCell>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{`${client.firstName} ${client.lastName}`}</span>
                            <div className="flex items-center gap-1 md:hidden">
                              <Badge variant="outline" className="text-[10px] h-4">{client.document}</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{client.document}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {client.email}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">
                          {client.mobile || '-'}
                        </TableCell>
                        <TableCell>
                          {client.bankInfo?.pixKey ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs truncate max-w-[120px]">{client.bankInfo.pixKey}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                                onClick={() => copyToClipboard(client.bankInfo?.pixKey, 'Chave PIX')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Não inf.</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                          {formatDate(client.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild disabled={!client.mobile}>
                                    <a href={`https://wa.me/${client.mobile?.replace(/\D/g, '')}`} target="_blank">
                                      <MessageSquare className="h-4 w-4 text-green-500" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>WhatsApp</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {renderClientActions(client)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        ) : (
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm min-h-[400px] bg-muted/5">
                <div className="flex flex-col items-center gap-2 text-center p-8">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Search className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight">Nenhum Cliente Encontrado</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        {searchTerm 
                            ? `Sua busca por "${searchTerm}" não retornou resultados. Tente um termo diferente ou limpe o filtro.`
                            : "Ainda não há clientes cadastrados em seu sistema."
                        }
                    </p>
                    <div className="mt-6 flex gap-2">
                         {searchTerm && (
                             <Button variant="outline" onClick={() => setSearchTerm('')}>Limpar Busca</Button>
                        )}
                        <Button variant="outline" onClick={() => setIsVCFDialogOpen(true)}>
                            <FileUp className="mr-2 h-4 w-4" />
                            Importar VCF
                        </Button>
                        <Button onClick={handleAddNew}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Novo Cliente
                        </Button>
                    </div>
                </div>
            </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={(open) => {
          if (!open) {
            setEditingClient(null);
          }
          setIsSheetOpen(open);
        }}>
        <SheetContent className="sm:max-w-4xl w-full">
          <SheetHeader>
            <SheetTitle>{editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</SheetTitle>
            <SheetDescription>
              {editingClient ? 'Altere os dados do cliente abaixo.' : 'Preencha os dados para cadastrar um novo cliente no escritório.'}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <ClientForm onSave={onFormSave} client={editingClient} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <VCFImportDialog 
        open={isVCFDialogOpen} 
        onOpenChange={setIsVCFDialogOpen} 
        onImportSuccess={() => {
          // Re-fetch handled by real-time useCollection
        }} 
      />

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !isDeleting && !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente
              <strong> &quot;{clientToDelete?.firstName} {clientToDelete?.lastName}&quot;</strong> e todos os seus registros associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)} disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isDeleting ? 'Excluindo...' : 'Excluir Cliente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
