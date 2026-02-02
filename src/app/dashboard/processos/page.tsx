'use client';
import * as React from 'react';
import {
  MoreVertical,
  PlusCircle,
  Search,
  File,
  ListFilter,
  Loader2,
  Check,
  X,
  DollarSign,
  ExternalLink,
  FolderOpen
} from 'lucide-react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { H2 } from '@/components/ui/typography';
import { Textarea } from '@/components/ui/textarea';
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

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  serverTimestamp,
  Timestamp,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import type { Process, Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { searchClients, getClientById } from '@/lib/client-actions';
import { ClientForm } from '@/components/client/ClientForm';
import { cn } from '@/lib/utils';
import { syncProcessToDrive } from '@/lib/drive';
import { FinancialEventDialog } from '@/components/process/FinancialEventDialog';

const processSchema = z.object({
  clientId: z.string().min(1, { message: 'Selecione um cliente.' }),
  name: z.string().min(3, { message: 'O nome do processo é obrigatório.' }),
  processNumber: z.string().optional(),
  court: z.string().optional(),
  courtBranch: z.string().optional(),
  caseValue: z.coerce.number().optional(),
  opposingParties: z
    .array(z.object({ value: z.string().min(1, { message: 'O nome não pode ser vazio.' }) }))
    .optional(),
  description: z.string().optional(),
  status: z.enum(['Ativo', 'Arquivado', 'Pendente']),
});

function ClientSearch({
  onSelect,
  onAddNew,
}: {
  onSelect: (client: Client) => void;
  onAddNew: () => void;
}) {
  const [search, setSearch] = React.useState('');
  const [results, setResults] = React.useState<Client[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const clients = await searchClients(search);
        setResults(clients);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao Buscar Clientes',
          description: error.message || 'Não foi possível completar a busca.',
        });
      } finally {
        setIsLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, toast]);

  return (
    <Command className="rounded-lg border bg-background shadow-sm">
      <CommandInput
        placeholder="Buscar cliente por nome ou CPF..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {isLoading && <CommandEmpty>Buscando...</CommandEmpty>}
        {!isLoading && !results.length && search.length > 1 && (
          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
        )}
        <CommandGroup>
          {results.map((client) => (
            <CommandItem
              key={client.id}
              value={`${client.firstName} ${client.lastName} ${client.document}`}
              onSelect={() => onSelect(client)}
            >
              <div className="flex flex-col">
                <span>{client.firstName} {client.lastName}</span>
                <span className="text-xs text-muted-foreground">{client.document}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup>
          <CommandItem onSelect={onAddNew} className="text-primary cursor-pointer">
            <PlusCircle className="mr-2 h-4 w-4" />
            Cadastrar novo cliente
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function ProcessForm({
  onSave,
  process,
}: {
  onSave: () => void;
  process?: Process | null;
}) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isClientSheetOpen, setIsClientSheetOpen] = React.useState(false);

  const form = useForm<z.infer<typeof processSchema>>({
    resolver: zodResolver(processSchema),
    defaultValues: process
      ? {
          ...process,
          caseValue: process.caseValue ?? undefined,
          opposingParties: process.opposingParties?.map((p) => ({ value: p })) ?? [],
        }
      : {
          clientId: '',
          name: '',
          processNumber: '',
          court: '',
          courtBranch: '',
          caseValue: undefined,
          opposingParties: [],
          description: '',
          status: 'Pendente',
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'opposingParties',
  });
  const [newParty, setNewParty] = React.useState('');
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);

  React.useEffect(() => {
    if (process?.clientId && !selectedClient) {
      const fetchClient = async () => {
        try {
          const client = await getClientById(process.clientId);
          if (client) {
            setSelectedClient(client);
            form.setValue('clientId', client.id);
          }
        } catch (error: any) {
          console.error("Failed to fetch client for process:", error);
        }
      };
      fetchClient();
    }
  }, [process, form, selectedClient]);

  const handleNewClientSaved = (newClient: Client) => {
    setSelectedClient(newClient);
    form.setValue('clientId', newClient.id);
    setIsClientSheetOpen(false);
  };

  async function onSubmit(values: z.infer<typeof processSchema>) {
    if (!firestore) return;
    setIsSaving(true);

    try {
      const processData = {
        ...values,
        opposingParties: values.opposingParties?.map((p) => p.value),
      };

      let processId = process?.id;

      if (processId) {
        await updateDoc(doc(firestore, 'processes', processId), {
          ...processData,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Processo atualizado!' });
      } else {
        const docRef = await addDoc(collection(firestore, 'processes'), {
          ...processData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        processId = docRef.id;
        toast({ title: 'Processo cadastrado!' });

        // Auto-sync with Drive if client is synced
        if (selectedClient?.driveFolderId && session) {
            try {
                await syncProcessToDrive(processId);
                toast({ title: "Drive Sincronizado!", description: `Estrutura de pastas criada no Drive.` });
            } catch (e) {
                console.warn("Drive auto-sync failed:", e);
            }
        }
      }
      onSave();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao Salvar', description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ScrollArea className="h-[calc(100vh-10rem)] p-4">
            <div className="space-y-8">
              <section>
                <H2>1. Cliente do Processo</H2>
                 <div className="mt-4">
                  {selectedClient ? (
                    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
                      <div className="flex-grow">
                        <p className="font-semibold">{`${selectedClient.firstName} ${selectedClient.lastName}`}</p>
                        <p className="text-sm text-muted-foreground">{selectedClient.document}</p>
                      </div>
                      <Button variant="outline" onClick={() => {
                        setSelectedClient(null);
                        form.setValue('clientId', '', { shouldValidate: true });
                      }}>Alterar</Button>
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <ClientSearch
                            onSelect={(client) => {
                              setSelectedClient(client);
                              field.onChange(client.id);
                            }}
                            onAddNew={() => setIsClientSheetOpen(true)}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </section>

              <section>
                <H2>2. Dados do Processo</H2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome do Processo *</FormLabel>
                        <FormControl><Input placeholder="Ex: Reclamação Trabalhista vs Empresa X" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                            <SelectItem value="Ativo">Ativo</SelectItem>
                            <SelectItem value="Arquivado">Arquivado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="processNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº do Processo</FormLabel>
                        <FormControl><Input placeholder="0000000-00.0000.0.00.0000" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>
              
              <section>
                <H2>3. Parte Contrária</H2>
                <div className="space-y-2 mt-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`opposingParties.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl><Input placeholder="Nome da parte" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <Input placeholder="Adicionar parte..." value={newParty} onChange={(e) => setNewParty(e.target.value)} />
                    <Button type="button" onClick={() => { if (newParty.trim()) { append({ value: newParty.trim() }); setNewParty(''); } }}>Adicionar</Button>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
          <SheetFooter className="pt-4 pr-4">
            <Button type="button" variant="outline" onClick={onSave} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Salvando...' : 'Salvar Processo'}
            </Button>
          </SheetFooter>
        </form>
      </Form>

      <Sheet open={isClientSheetOpen} onOpenChange={setIsClientSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Adicionar Novo Cliente</SheetTitle>
            <SheetDescription>O cliente será selecionado automaticamente após o cadastro.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <ClientForm onSave={() => setIsClientSheetOpen(false)} onSaveSuccess={handleNewClientSaved} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function ProcessosPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingProcess, setEditingProcess] = React.useState<Process | null>(null);
  const [processToDelete, setProcessToDelete] = React.useState<Process | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState<string | null>(null);
  const [eventProcess, setEventProcess] = React.useState<Process | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [clientFilterName, setClientFilterName] = React.useState<string | null>(null);

  const { firestore, isUserLoading } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();

  const processesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'processes') : null),
    [firestore]
  );
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const clientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clients') : null),
    [firestore]
  );
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map((c) => [c.id, `${c.firstName} ${c.lastName}`])), [clientsData]);

  const isLoading = isUserLoading || isLoadingProcesses || isLoadingClients;
  
  const clientIdFilter = searchParams.get('clientId');

  React.useEffect(() => {
      if (clientIdFilter) {
          getClientById(clientIdFilter).then(client => {
              if (client) setClientFilterName(`${client.firstName} ${client.lastName}`);
          });
      } else {
          setClientFilterName(null);
      }
  }, [clientIdFilter]);

  const filteredProcesses = React.useMemo(() => {
    if (!processesData) return [];
    let data = [...processesData];
    
    if (clientIdFilter) data = data.filter(p => p.clientId === clientIdFilter);
    
    if (statusFilter !== 'all') {
        data = data.filter(p => p.status === statusFilter);
    }

    if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        data = data.filter(p => {
            const clientName = clientsMap.get(p.clientId)?.toLowerCase() || '';
            const processName = p.name.toLowerCase();
            const processNumber = p.processNumber?.toLowerCase() || '';
            return processName.includes(query) || processNumber.includes(query) || clientName.includes(query);
        });
    }
    return data;
  }, [processesData, clientIdFilter, searchTerm, statusFilter, clientsMap]);

  const handleSyncProcess = async (process: Process) => {
    if (!session) return;
    setIsSyncing(process.id);
    try {
        await syncProcessToDrive(process.id);
        toast({ title: "Sincronização Concluída!" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro na Sincronização', description: error.message });
    } finally {
        setIsSyncing(null);
    }
  };

  const confirmDelete = async () => {
    if (!firestore || !processToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'processes', processToDelete.id));
      toast({ title: 'Processo excluído!' });
      setProcessToDelete(null);
    } catch (error: any) {
      console.error("Erro ao excluir processo:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao excluir', 
        description: error.message || 'Não foi possível excluir o processo. Verifique suas permissões.' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="grid flex-1 items-start gap-4 auto-rows-max">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
             {clientFilterName ? `Processos de ${clientFilterName}` : 'Processos'}
          </h1>
          
          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
             <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Processo, Nº ou Cliente..." 
                    className="pl-8 pr-8 h-9" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-muted-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Filtrar Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="Ativo">Ativos</SelectItem>
                  <SelectItem value="Pendente">Pendentes</SelectItem>
                  <SelectItem value="Arquivado">Arquivados</SelectItem>
                </SelectContent>
              </Select>

            <Button size="sm" className="h-9 gap-1" onClick={() => { setEditingProcess(null); setIsSheetOpen(true); }}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Novo Processo</span>
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Gerenciador de Processos</CardTitle>
            <CardDescription>Visualize e gerencie todos os processos jurídicos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Processo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Nº do Processo</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Drive</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProcesses.length > 0 ? (
                  filteredProcesses.map((process) => (
                    <TableRow key={process.id}>
                      <TableCell className="font-medium">{process.name}</TableCell>
                      <TableCell>{clientsMap.get(process.clientId) || 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell">{process.processNumber || 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={process.status === 'Ativo' ? 'secondary' : 'outline'}>{process.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {process.driveFolderId ? (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Sincronizado</Badge>
                        ) : (
                            <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingProcess(process); setIsSheetOpen(true); }}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEventProcess(process)}><DollarSign className="mr-2 h-4 w-4" />Financeiro</DropdownMenuItem>
                             <DropdownMenuSeparator />
                             {process.driveFolderId ? (
                                <DropdownMenuItem onSelect={() => window.open(`https://drive.google.com/drive/folders/${process.driveFolderId}`, '_blank')}>
                                    <FolderOpen className="mr-2 h-4 w-4" />Abrir Pasta
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onClick={() => handleSyncProcess(process)} disabled={isSyncing === process.id}>
                                    <ExternalLink className="mr-2 h-4 w-4" />Sincronizar
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setProcessToDelete(process)}>Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum processo encontrado com esses filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) setEditingProcess(null); setIsSheetOpen(open); }}>
        <SheetContent className="w-full sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle>{editingProcess ? 'Editar Processo' : 'Adicionar Novo Processo'}</SheetTitle>
            <SheetDescription>Preencha os dados do processo abaixo.</SheetDescription>
          </SheetHeader>
          <ProcessForm onSave={() => setIsSheetOpen(false)} process={editingProcess} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!processToDelete} onOpenChange={(open) => !isDeleting && !open && setProcessToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Esta ação excluirá permanentemente o processo "{processToDelete?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FinancialEventDialog process={eventProcess} open={!!eventProcess} onOpenChange={(open) => { if (!open) setEventProcess(null); }} onEventCreated={() => {}} />
    </>
  );
}
