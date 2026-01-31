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
} from 'lucide-react';
import { useSession } from 'next-auth/react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import type { Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { syncClientToDrive } from '@/lib/drive';


export default function ClientsPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);
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
  
  const isLoading = status === 'loading' || isLoadingClients;

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
    const clientRef = doc(firestore, 'clients', clientToDelete.id);
    try {
        await deleteDoc(clientRef);
        toast({ title: 'Cliente excluído!', description: `O cliente ${clientToDelete.firstName} foi removido.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    } finally {
        setClientToDelete(null);
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
            description: `Pasta e planilha para ${clientName} foram criadas com sucesso no Google Drive.`
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
      <div className="grid flex-1 items-start gap-4 auto-rows-max">
        <div className="flex items-center gap-4">
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
            Clientes
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
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
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Exportar</span>
            </Button>
            <Button size="sm" className="h-8 gap-1" onClick={handleAddNew}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Adicionar Cliente</span>
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar clientes..." className="pl-8 w-full" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-[100px] sm:table-cell">
                    <span className="sr-only">Avatar</span>
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead className="hidden md:table-cell">Status do Drive</TableHead>
                  <TableHead className="hidden md:table-cell">Data de Cadastro</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                          <TableCell className="hidden sm:table-cell">
                              <Skeleton className="h-10 w-10 rounded-full" />
                          </TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                      </TableRow>
                  ))
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="hidden sm:table-cell">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={client.avatar} alt={`${client.firstName} ${client.lastName}`} data-ai-hint="company logo" />
                          <AvatarFallback>{client.firstName?.charAt(0) ?? 'C'}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{`${client.firstName} ${client.lastName}`}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{client.document}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {client.driveFolderId ? (
                            <Badge variant="secondary" className='bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'>Sincronizado</Badge>
                        ) : (
                            <Badge variant="outline">Não Sincronizado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(client.createdAt)}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Mostrando <strong>1-{clients.length}</strong> de <strong>{clients.length}</strong> clientes
            </div>
            <Pagination className="ml-auto mr-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardFooter>
        </Card>
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

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente
              &quot;{clientToDelete?.firstName} {clientToDelete?.lastName}&quot; e removerá seus dados de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
