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
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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

import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, Timestamp, doc } from 'firebase/firestore';
import type { Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { createClientFolderAndSheet } from '@/lib/drive';

const clientSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  document: z.string().min(11, { message: 'O documento deve ser um CPF ou CNPJ válido.' }),
  phone: z.string().optional(),
});

function ClientForm({
  onSave,
  client,
}: {
  onSave: () => void;
  client?: Client | null;
}) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      document: '',
      phone: '',
    },
  });

  React.useEffect(() => {
    if (client) {
      form.reset(client);
    } else {
      form.reset({ name: '', email: '', document: '', phone: '' });
    }
  }, [client, form]);

  async function onSubmit(values: z.infer<typeof clientSchema>) {
    if (!firestore || !user) return;
    setIsSaving(true);
    
    try {
      if (client?.id) {
        // Update existing client
        const clientRef = doc(firestore, 'clients', client.id);
        updateDocumentNonBlocking(clientRef, { ...values, updatedAt: serverTimestamp() });
        toast({ title: 'Cliente atualizado!', description: `Os dados de ${values.name} foram salvos.` });
      } else {
        // Add new client with Drive/Sheet automation, passing the user ID for auth
        const { folderId, sheetId } = await createClientFolderAndSheet(values.name, user.uid);

        if (!folderId || !sheetId) {
            throw new Error('Falha ao criar pasta ou planilha no Google Drive.');
        }

        const clientsCollection = collection(firestore, 'clients');
        addDocumentNonBlocking(clientsCollection, {
          ...values,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          avatar: `https://picsum.photos/seed/c${Math.random()}/40/40`,
          driveFolderId: folderId,
          sheetId: sheetId,
        });
        toast({ title: 'Cliente cadastrado!', description: `${values.name} foi adicionado e os arquivos no Drive foram criados.` });
      }
      onSave();
    } catch (error: any) {
        console.error("Failed to save client or create drive assets:", error);
        toast({ 
          variant: 'destructive', 
          title: 'Erro na automação do Drive', 
          description: error.message || 'Não foi possível criar os arquivos no Google Drive. Verifique as permissões e configurações.'
        });
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
        <fieldset disabled={isSaving} className="space-y-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nome Completo / Razão Social</FormLabel>
                <FormControl>
                    <Input placeholder="Ex: Innovatech Soluções" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                    <Input placeholder="Ex: contato@innovatech.com" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="document"
            render={({ field }) => (
                <FormItem>
                <FormLabel>CPF / CNPJ</FormLabel>
                <FormControl>
                    <Input placeholder="Ex: 12.345.678/0001-99" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Telefone (Opcional)</FormLabel>
                <FormControl>
                    <Input placeholder="Ex: (11) 99999-9999" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </fieldset>
        <div className="pt-4 flex justify-end gap-2">
           <Button type="button" variant="outline" onClick={onSave} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Salvando...' : (client ? 'Salvar Alterações' : 'Salvar Cliente')}
            </Button>
        </div>
      </form>
    </Form>
  );
}

export default function ClientsPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);
  const alertDialogTitleId = React.useId();
  const alertDialogDescriptionId = React.useId();
  
  const { firestore, isUserLoading } = useFirebase();

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
    if (date.toDate) { // It's a Firestore Timestamp
        return date.toDate().toLocaleDateString('pt-BR');
    }
    return '';
  }
  
  const isLoading = isUserLoading || isLoadingClients;

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

  const confirmDelete = () => {
    if (!firestore || !clientToDelete) return;
    const clientRef = doc(firestore, 'clients', clientToDelete.id);
    deleteDocumentNonBlocking(clientRef);
    setClientToDelete(null);
  };

  const onFormSave = () => {
    setIsSheetOpen(false);
    setEditingClient(null);
  }

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
                  <TableHead className="hidden md:table-cell">Email</TableHead>
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
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                      </TableRow>
                  ))
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="hidden sm:table-cell">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={client.avatar} alt={client.name} data-ai-hint="company logo" />
                          <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{client.document}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{client.email}</TableCell>
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
                                <Link href={`/dashboard/clientes/${client.id}/documentos`}>Gerenciar Documentos</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>Ver Processos</DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                if (client.driveFolderId) {
                                  window.open(
                                    `https://drive.google.com/drive/folders/${client.driveFolderId}`,
                                    '_blank'
                                  );
                                }
                              }}
                              disabled={!client.driveFolderId}
                            >
                              Abrir no Drive
                            </DropdownMenuItem>
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
        <SheetContent className="sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>{editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</SheetTitle>
            <SheetDescription>
              {editingClient ? 'Altere os dados do cliente abaixo.' : 'Preencha os dados para cadastrar um novo cliente.'}
            </SheetDescription>
          </SheetHeader>
          <ClientForm onSave={onFormSave} client={editingClient} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent aria-labelledby={alertDialogTitleId} aria-describedby={alertDialogDescriptionId}>
          <AlertDialogHeader>
            <AlertDialogTitle id={alertDialogTitleId}>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription id={alertDialogDescriptionId}>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente
              &quot;{clientToDelete?.name}&quot; e removerá seus dados de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
