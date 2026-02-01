'use client';
import * as React from 'react';
import {
  MoreVertical,
  PlusCircle,
  Search,
  File,
  ListFilter,
  Loader2,
  ChevronsUpDown,
  Check,
  X,
} from 'lucide-react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

function ClientSearchCombobox({
  value,
  onChange,
  onAddNew,
}: {
  value: Client | null;
  onChange: (client: Client | null) => void;
  onAddNew: () => void;
}) {
  const [open, setOpen] = React.useState(false);
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
        console.error('Failed to search for clients:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao Buscar Clientes',
          description: error.message || 'Não foi possível completar a busca. Tente novamente.',
        });
      } finally {
        setIsLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, toast]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? `${value.firstName} ${value.lastName}`
            : 'Selecione um cliente...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
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
                  onSelect={() => {
                    onChange(client);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value?.id === client.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>
                      {client.firstName} {client.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {client.document}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={onAddNew}
                className="text-primary cursor-pointer"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Cadastrar novo cliente...
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
  const [isSaving, setIsSaving] = React.useState(false);
  const [isClientSheetOpen, setIsClientSheetOpen] = React.useState(false);

  const form = useForm<z.infer<typeof processSchema>>({
    resolver: zodResolver(processSchema),
    defaultValues: process
      ? {
          ...process,
          caseValue: process.caseValue ?? undefined,
          opposingParties:
            process.opposingParties?.map((p) => ({ value: p })) ?? [],
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

  const [selectedClient, setSelectedClient] = React.useState<Client | null>(
    null
  );

  React.useEffect(() => {
    if (process?.clientId && !selectedClient) {
      // Fetch client if editing a process
      const fetchClient = async () => {
        try {
          const client = await getClientById(process.clientId);
          if (client) {
            setSelectedClient(client);
            form.setValue('clientId', client.id); // Also set the form value
          }
        } catch (error: any) {
          console.error("Failed to fetch client for process:", error);
          toast({
            variant: "destructive",
            title: "Erro ao Carregar Cliente",
            description: error.message || "Não foi possível carregar os dados do cliente associado a este processo."
          });
        }
      };
      fetchClient();
    }
     // Clear client on process change to null (new process)
    if (!process) {
        setSelectedClient(null);
    }
  }, [process, toast, form]);

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

      if (process?.id) {
        const processRef = doc(firestore, 'processes', process.id);
        await updateDoc(processRef, {
          ...processData,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: 'Processo atualizado!',
          description: `O processo "${values.name}" foi salvo.`,
        });
      } else {
        const processesCollection = collection(firestore, 'processes');
        await addDoc(processesCollection, {
          ...processData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({
          title: 'Processo cadastrado!',
          description: `O processo "${values.name}" foi adicionado com sucesso.`,
        });
      }
      onSave();
    } catch (error: any) {
      console.error('Failed to save process:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description:
          error.message || 'Não foi possível salvar os dados do processo.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ScrollArea className="h-[calc(100vh-10rem)] p-4">
            <div className="space-y-6">
              <section>
                <H2>Dados do Processo</H2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente *</FormLabel>
                        <ClientSearchCombobox
                          value={selectedClient}
                          onChange={(client) => {
                            setSelectedClient(client);
                            field.onChange(client?.id || '');
                          }}
                          onAddNew={() => setIsClientSheetOpen(true)}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome do Processo *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Reclamação Trabalhista vs Empresa X"
                            {...field}
                          />
                        </FormControl>
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
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
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
                        <FormLabel>Nº do Processo (se distribuído)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0000000-00.0000.0.00.0000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="court"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fórum</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: TRT-2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="courtBranch"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Vara</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: 80ª Vara do Trabalho de São Paulo"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="caseValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor da Causa</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="R$ 10.000,00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>
              <section>
                <H2>Parte Contrária</H2>
                <div className="space-y-2 mt-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`opposingParties.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Nome da pessoa ou empresa"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <Input
                      placeholder="Adicionar parte contrária"
                      value={newParty}
                      onChange={(e) => setNewParty(e.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (newParty.trim()) {
                          append({ value: newParty.trim() });
                          setNewParty('');
                        }
                      }}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              </section>
              <section>
                <H2>Observações</H2>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormControl>
                        <Textarea
                          placeholder="Detalhes, andamentos, links importantes..."
                          className="min-h-[150px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            </div>
          </ScrollArea>
          <SheetFooter className="pt-4 pr-4">
            <Button
              type="button"
              variant="outline"
              onClick={onSave}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving
                ? 'Salvando...'
                : process
                ? 'Salvar Alterações'
                : 'Salvar Processo'}
            </Button>
          </SheetFooter>
        </form>
      </Form>

      <Sheet open={isClientSheetOpen} onOpenChange={setIsClientSheetOpen}>
        <SheetContent className="sm:max-w-4xl w-full">
          <SheetHeader>
            <SheetTitle>Adicionar Novo Cliente</SheetTitle>
            <SheetDescription>
              Preencha os dados para cadastrar um novo cliente. Ele será
              selecionado automaticamente após o cadastro.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <ClientForm
              onSave={() => setIsClientSheetOpen(false)}
              onSaveSuccess={handleNewClientSaved}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function ProcessosPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingProcess, setEditingProcess] = React.useState<Process | null>(
    null
  );
  const [processToDelete, setProcessToDelete] = React.useState<Process | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState<string | null>(null);

  const { firestore, isUserLoading } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();

  const processesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'processes') : null),
    [firestore]
  );
  const { data: processesData, isLoading: isLoadingProcesses } =
    useCollection<Process>(processesQuery);

  const clientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clients') : null),
    [firestore]
  );
  const { data: clientsData, isLoading: isLoadingClients } =
    useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(
    () =>
      new Map(clientsData?.map((c) => [c.id, `${c.firstName} ${c.lastName}`])),
    [clientsData]
  );

  const isLoading = isUserLoading || isLoadingProcesses || isLoadingClients;

  const handleAddNew = () => {
    setEditingProcess(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (process: Process) => {
    setEditingProcess(process);
    setIsSheetOpen(true);
  };

  const handleDeleteTrigger = (process: Process) => {
    setProcessToDelete(process);
  };

  const confirmDelete = async () => {
    if (!firestore || !processToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'processes', processToDelete.id));
      toast({
        title: 'Processo excluído!',
        description: `O processo "${processToDelete.name}" foi removido.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    } finally {
      setProcessToDelete(null);
      setIsDeleting(false);
    }
  };

  const onFormSave = () => {
    setIsSheetOpen(false);
    setEditingProcess(null);
  };

  const handleSyncProcess = async (process: Process) => {
    if (!session) {
        toast({ variant: 'destructive', title: 'Erro de Autenticação', description: 'Sessão de usuário não encontrada.' });
        return;
    }
    setIsSyncing(process.id);
    try {
        await syncProcessToDrive(process.id);
        toast({
            title: "Sincronização Concluída!",
            description: `A pasta para o processo "${process.name}" foi criada no Google Drive.`
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Erro na Sincronização',
            description: error.message || 'Não foi possível criar a pasta do processo no Google Drive.'
        });
    } finally {
        setIsSyncing(null);
    }
  };

  const formatDate = (date: Timestamp | undefined) => {
    if (!date) return 'N/A';
    return date.toDate().toLocaleDateString('pt-BR');
  };

  return (
    <>
      <div className="grid flex-1 items-start gap-4 auto-rows-max">
        <div className="flex items-center gap-4">
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
            Processos
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Exportar
              </span>
            </Button>
            <Button size="sm" className="h-8 gap-1" onClick={handleAddNew}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Adicionar Processo
              </span>
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Gerenciador de Processos</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os processos jurídicos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Processo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Nº do Processo
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Status do Drive</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                       <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-6 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : processesData && processesData.length > 0 ? (
                  processesData.map((process) => (
                    <TableRow key={process.id}>
                      <TableCell className="font-medium">
                        {process.name}
                      </TableCell>
                      <TableCell>
                        {clientsMap.get(process.clientId) ||
                          'Cliente não encontrado'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {process.processNumber || 'Não distribuído'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant={
                            process.status === 'Ativo'
                              ? 'secondary'
                              : process.status === 'Arquivado'
                              ? 'outline'
                              : 'default'
                          }
                          className={cn({
                            'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300':
                              process.status === 'Ativo',
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300':
                              process.status === 'Pendente',
                          })}
                        >
                          {process.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {process.driveFolderId ? (
                            <Badge variant="secondary" className='bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'>Sincronizado</Badge>
                        ) : (
                            <Badge variant="outline">Não Sincronizado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(process)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>Ver Audiências</DropdownMenuItem>
                             <DropdownMenuSeparator />
                             {process.driveFolderId ? (
                                <DropdownMenuItem
                                    onSelect={() => window.open(`https://drive.google.com/drive/folders/${process.driveFolderId}`, '_blank')}
                                >
                                    Abrir Pasta no Drive
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onClick={() => handleSyncProcess(process)} disabled={isSyncing === process.id}>
                                    {isSyncing === process.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Sincronizar com Drive
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteTrigger(process)}
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum processo encontrado. Comece adicionando um novo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-4xl w-full">
          <SheetHeader>
            <SheetTitle>
              {editingProcess ? 'Editar Processo' : 'Adicionar Novo Processo'}
            </SheetTitle>
            <SheetDescription>
              {editingProcess
                ? 'Altere os dados do processo abaixo.'
                : 'Preencha os dados para cadastrar um novo processo.'}
            </SheetDescription>
          </SheetHeader>
          <ProcessForm onSave={onFormSave} process={editingProcess} />
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!processToDelete}
        onOpenChange={(open) => !isDeleting && !open && setProcessToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              processo &quot;{processToDelete?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
