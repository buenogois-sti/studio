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
  SheetFooter
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from '@/components/ui/scroll-area';
import { H2 } from '@/components/ui/typography';

import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, Timestamp, doc } from 'firebase/firestore';
import type { Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { syncClientToDrive } from '@/lib/drive';

const clientSchema = z.object({
  clientType: z.string().min(1, { message: 'Selecione o tipo de cliente.' }),
  firstName: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  lastName: z.string().min(2, { message: 'O sobrenome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  document: z.string().min(11, { message: 'O documento deve ser um CPF ou CNPJ válido.' }),
  motherName: z.string().optional(),
  rg: z.string().optional(),
  ctps: z.string().optional(),
  pis: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  emergencyContact: z.string().optional(),
  legalArea: z.string().optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_zipCode: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  bankName: z.string().optional(),
  agency: z.string().optional(),
  account: z.string().optional(),
  pixKey: z.string().optional(),
});


const legalAreas = ['Trabalhista', 'Cível', 'Criminal', 'Família', 'Previdenciário', 'Tributário', 'Outro'];
const clientTypes = ['Pessoa Física', 'Pessoa Jurídica'];

function ClientForm({
  onSave,
  client,
}: {
  onSave: () => void;
  client?: Client | null;
}) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      clientType: '',
      firstName: '',
      lastName: '',
      email: '',
      document: '',
      motherName: '',
      rg: '',
      ctps: '',
      pis: '',
      phone: '',
      mobile: '',
      emergencyContact: '',
      legalArea: '',
      address_street: '',
      address_number: '',
      address_complement: '',
      address_zipCode: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
      bankName: '',
      agency: '',
      account: '',
      pixKey: '',
    },
  });

  const handleCepSearch = React.useCallback(async () => {
    const cep = form.getValues('address_zipCode');
    if (!cep || cep.replace(/\D/g, '').length !== 8) {
        toast({
            variant: 'destructive',
            title: 'CEP Inválido',
            description: 'Por favor, insira um CEP com 8 dígitos.',
        });
        return;
    }

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('Falha na resposta da API');
        const data = await response.json();
        if (data.erro) {
            toast({
                variant: 'destructive',
                title: 'CEP não encontrado',
            });
        } else {
            form.setValue('address_street', data.logradouro, { shouldValidate: true });
            form.setValue('address_neighborhood', data.bairro, { shouldValidate: true });
            form.setValue('address_city', data.localidade, { shouldValidate: true });
            form.setValue('address_state', data.uf, { shouldValidate: true });
            toast({ title: 'Endereço encontrado!' });
        }
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao buscar CEP',
            description: 'Não foi possível conectar à API de CEP.',
        });
    }
  }, [form, toast]);


  React.useEffect(() => {
    if (client) {
      const flatClientData: any = {
        ...client,
        address_street: client.address?.street,
        address_number: client.address?.number,
        address_complement: client.address?.complement,
        address_zipCode: client.address?.zipCode,
        address_neighborhood: client.address?.neighborhood,
        address_city: client.address?.city,
        address_state: client.address?.state,
        bankName: client.bankInfo?.bankName,
        agency: client.bankInfo?.agency,
        account: client.bankInfo?.account,
        pixKey: client.bankInfo?.pixKey,
      };
      delete flatClientData.address;
      delete flatClientData.bankInfo;
      form.reset(flatClientData);
    } else {
      form.reset({
        clientType: '',
        firstName: '',
        lastName: '',
        email: '',
        document: '',
        motherName: '',
        rg: '',
        ctps: '',
        pis: '',
        phone: '',
        mobile: '',
        emergencyContact: '',
        legalArea: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_zipCode: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        bankName: '',
        agency: '',
        account: '',
        pixKey: '',
      });
    }
  }, [client, form]);

  async function onSubmit(values: z.infer<typeof clientSchema>) {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
      const { 
        address_street, address_number, address_complement, address_zipCode, 
        address_neighborhood, address_city, address_state,
        bankName, agency, account, pixKey,
        ...restOfValues
      } = values;

      const clientData = {
        ...restOfValues,
        address: {
          street: address_street,
          number: address_number,
          complement: address_complement,
          zipCode: address_zipCode,
          neighborhood: address_neighborhood,
          city: address_city,
          state: address_state,
        },
        bankInfo: {
          bankName,
          agency,
          account,
          pixKey,
        }
      };

      const displayName = `${clientData.firstName} ${clientData.lastName}`;

      if (client?.id) {
        const clientRef = doc(firestore, 'clients', client.id);
        updateDocumentNonBlocking(clientRef, { ...clientData, updatedAt: serverTimestamp() });
        toast({ title: 'Cliente atualizado!', description: `Os dados de ${displayName} foram salvos.` });
      } else {
        const clientsCollection = collection(firestore, 'clients');
        addDocumentNonBlocking(clientsCollection, {
          ...clientData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          avatar: `https://picsum.photos/seed/c${Math.random()}/40/40`,
        });
        toast({ title: 'Cliente cadastrado!', description: `${displayName} foi adicionado com sucesso.` });
      }
      onSave();
    } catch (error: any) {
        console.error("Failed to save client:", error);
        toast({ 
          variant: 'destructive', 
          title: 'Erro ao Salvar', 
          description: error.message || 'Não foi possível salvar os dados do cliente.'
        });
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 px-1 py-4">
        <fieldset disabled={isSaving} className="space-y-6">
          
          <section>
            <H2>Dados Pessoais</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                control={form.control}
                name="clientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cliente *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar tipo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF / CNPJ *</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Primeiro nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sobrenome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Sobrenome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="motherName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome da Mãe</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo da mãe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RG</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000-0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ctps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTPS</FormLabel>
                    <FormControl>
                      <Input placeholder="Nº da Carteira de Trabalho" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="pis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIS/PASEP</FormLabel>
                    <FormControl>
                      <Input placeholder="Nº do PIS/PASEP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalArea"
                render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área Jurídica</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              {legalAreas.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                )}
                />
            </div>
          </section>

          <section>
            <H2>Contato & Endereço</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                            <Input placeholder="contato@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celular / WhatsApp *</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
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
                    <FormLabel>Telefone Fixo</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 0000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Contato de Emergência (Recado)</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome e telefone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
                <FormField
                    control={form.control}
                    name="address_zipCode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                                <Input placeholder="00000-000" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="button" onClick={handleCepSearch} disabled={isSaving}>Buscar</Button>
              </div>

              <FormField
                  control={form.control}
                  name="address_street"
                  render={({ field }) => (
                      <FormItem className="md:col-span-2">
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                          <Input placeholder="Rua, avenida, etc" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
               <FormField
                control={form.control}
                name="address_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_complement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input placeholder="Apto, sala, etc" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Centro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="São Paulo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input placeholder="SP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section>
              <H2>Dados Bancários</H2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Banco</FormLabel>
                              <FormControl><Input placeholder="Nome do banco" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="agency"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Agência</FormLabel>
                              <FormControl><Input placeholder="0000" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="account"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Conta Corrente</FormLabel>
                              <FormControl><Input placeholder="00000-0" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="pixKey"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Chave PIX</FormLabel>
                              <FormControl><Input placeholder="CPF, e-mail, telefone, etc." {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
              </div>
          </section>

        </fieldset>

        <SheetFooter className="pt-4">
           <Button type="button" variant="outline" onClick={onSave} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Salvando...' : (client ? 'Salvar Alterações' : 'Salvar Cliente')}
            </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

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

  const confirmDelete = () => {
    if (!firestore || !clientToDelete) return;
    const clientRef = doc(firestore, 'clients', clientToDelete.id);
    deleteDocumentNonBlocking(clientRef);
    toast({ title: 'Cliente excluído!', description: `O cliente ${clientToDelete.firstName} foi removido.` });
    setClientToDelete(null);
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
                            <DropdownMenuItem disabled>Ver Processos</DropdownMenuItem>
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
