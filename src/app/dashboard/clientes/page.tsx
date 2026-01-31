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
} from 'lucide-react';
import { useSession } from 'next-auth/react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClientForm } from '@/components/client/ClientForm';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import type { Client, Process } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { syncClientToDrive } from '@/lib/drive';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';


export default function ClientsPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState<string | null>(null);
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


  const formatDate = (date: Timestamp | string | undefined) => {
    if (!date) return '';
    if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('pt-BR');
    }
    if (date.toDate) {
        return date.toDate().toLocaleDateString('pt-BR');
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
    const clientRef = doc(firestore, 'clients', clientToDelete.id);
    try {
        await deleteDoc(clientRef);
        toast({ title: 'Cliente excluído!', description: `O cliente ${clientToDelete.firstName} foi removido.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    } finally {
        setClientToDelete(null);
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


  return (
    <>
      <div className="grid flex-1 items-start gap-6 auto-rows-max">
        <div className="flex items-center gap-4">
          <div className='flex items-center gap-2'>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
              Clientes
            </h1>
            {!isLoading && <Badge variant="secondary">{clients.length}</Badge>}
          </div>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar clientes..." className="pl-8" />
            </div>
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
                <DropdownMenuCheckboxItem checked>Ativos</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Arquivados</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" className="h-9 gap-1" onClick={handleAddNew}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Adicionar Cliente</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="w-full space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                   <Skeleton className="h-4 w-full" />
                   <Skeleton className="h-4 w-full" />
                   <Separator />
                   <Skeleton className="h-8 w-full" />
                   <Skeleton className="h-8 w-full" />
                </CardContent>
                <CardFooter>
                   <Skeleton className="h-6 w-24" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {clients.map((client) => {
              const clientProcesses = processes.filter(p => p.clientId === client.id);

              return (
                <Card key={client.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border">
                                <AvatarImage src={client.avatar} alt={`${client.firstName} ${client.lastName}`} data-ai-hint="person portrait" />
                                <AvatarFallback>{client.firstName?.charAt(0) ?? 'C'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-semibold text-lg">{`${client.firstName} ${client.lastName}`}</h3>
                                <p className="text-sm text-muted-foreground">{client.document}</p>
                            </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(client)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/processos?clientId=${client.id}`}>Ver Processos</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {client.driveFolderId ? (
                                <>
                                <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/clientes/${client.id}/documentos`}>Gerenciar Documentos</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => window.open(`https://drive.google.com/drive/folders/${client.driveFolderId}`, '_blank')}
                                >
                                    Abrir no Drive
                                </DropdownMenuItem>
                                </>
                            ) : (
                                <DropdownMenuItem onClick={() => handleSyncClient(client)} disabled={isSyncing === client.id}>
                                    {isSyncing === client.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Sincronizar com Drive
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTrigger(client)}>
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">{client.email}</p>
                        <p className="text-muted-foreground">{client.mobile || 'Sem celular cadastrado'}</p>
                    </div>

                    <Separator />
                    
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Processos ({clientProcesses.length})</h4>
                      <div className="space-y-2">
                          {clientProcesses.length > 0 ? (
                              clientProcesses.slice(0, 3).map(proc => (
                                  <div key={proc.id} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-muted/50">
                                      <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span className="flex-1 truncate font-medium">{proc.name}</span>
                                      <Badge variant={
                                          proc.status === 'Ativo' ? 'secondary' : proc.status === 'Arquivado' ? 'outline' : 'default'
                                      } className={cn('shrink-0', {
                                          'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700': proc.status === 'Ativo',
                                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700': proc.status === 'Pendente',
                                      })}>
                                          {proc.status}
                                      </Badge>
                                  </div>
                              ))
                          ) : (
                              <div className="text-sm text-muted-foreground text-center py-4 px-2 border border-dashed rounded-lg">Nenhum processo encontrado.</div>
                          )}
                          {clientProcesses.length > 3 && (
                              <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs mt-2">
                                <Link href={`/dashboard/processos?clientId=${client.id}`}>Ver todos os {clientProcesses.length} processos</Link>
                              </Button>
                          )}
                      </div>
                    </div>

                  </CardContent>
                  <CardFooter className="border-t pt-3 pb-3">
                    <div className="w-full flex items-center justify-between">
                         <div className="text-xs text-muted-foreground">
                            Cadastro: {formatDate(client.createdAt)}
                        </div>
                        {client.driveFolderId ? (
                             <Badge variant="secondary" className='bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'>Sincronizado</Badge>
                        ) : (
                             <Badge variant="outline">Pendente Sincronização</Badge>
                        )}
                    </div>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl w-full">
          <SheetHeader>
            <SheetTitle>{editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</SheetTitle>
            <SheetDescription>
              {editingClient ? 'Altere os dados do cliente abaixo.' : 'Preencha os dados para cadastrar um novo cliente.'}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <ClientForm onSave={onFormSave} client={editingClient} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !isDeleting && !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente
              &quot;{clientToDelete?.firstName} {clientToDelete?.lastName}&quot; e removerá seus dados de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)} disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
