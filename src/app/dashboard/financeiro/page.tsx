'use client';
import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  DollarSign,
  PlusCircle,
  File,
  Loader2,
  MoreVertical,
  Check
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy } from 'firebase/firestore';
import type { Client, FinancialTitle, Process, Staff } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { H1 } from '@/components/ui/typography';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { createFinancialTitle, updateFinancialTitleStatus } from '@/lib/finance-actions';
import { searchProcesses } from '@/lib/process-actions';
import { StaffCreditCard } from '@/components/finance/StaffCreditCard';


const operationalExpenseOrigins = [
  'SALARIOS_PROLABORE', 'ALUGUEL_CONTAS', 'INFRAESTRUTURA_TI', 'MARKETING_PUBLICIDADE', 
  'IMPOSTOS_TAXAS', 'MATERIAL_ESCRITORIO', 'SERVICOS_TERCEIROS', 'OUTRAS_DESPESAS'
] as const;

const processLinkedRevenueOrigins = [
    'ACORDO', 'SENTENCA', 'HONORARIOS_CONTRATUAIS', 'SUCUMBENCIA'
] as const;

const processLinkedExpenseOrigins = [ 'CUSTAS_PROCESSUAIS', 'HONORARIOS_PAGOS' ] as const;

const allOrigins = [...processLinkedRevenueOrigins, ...processLinkedExpenseOrigins, ...operationalExpenseOrigins];

const titleSchema = z.object({
  processId: z.string().optional(),
  description: z.string().min(3, 'A descrição é obrigatória.'),
  type: z.enum(['RECEITA', 'DESPESA'], { required_error: 'Selecione o tipo.'}),
  origin: z.enum(allOrigins, { required_error: 'Selecione a origem.'}),
  value: z.coerce.number().positive('O valor deve ser um número positivo.'),
  dueDate: z.coerce.date({ required_error: 'A data de vencimento é obrigatória.' }),
  status: z.enum(['PENDENTE', 'PAGO', 'ATRASADO']).default('PENDENTE'),
  paidToStaffId: z.string().optional(),
}).refine((data) => {
    // If origin is NOT an operational expense, processId is required.
    if (![...operationalExpenseOrigins].includes(data.origin as any)) {
        return !!data.processId;
    }
    return true;
}, {
    message: "É obrigatório selecionar um processo para esta origem.",
    path: ["processId"],
}).refine((data) => {
    if (data.origin === 'HONORARIOS_PAGOS') {
        return !!data.paidToStaffId;
    }
    return true;
}, {
    message: 'É obrigatório selecionar o beneficiário.',
    path: ['paidToStaffId'],
});


const formatDate = (date: Timestamp | string | undefined | Date) => {
  if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : (date instanceof Timestamp) ? date.toDate() : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
};

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// --- ProcessSearch Component ---
function ProcessSearch({ onSelect, selectedProcess }: { onSelect: (process: Process) => void; selectedProcess: Process | null }) {
  const [search, setSearch] = React.useState('');
  const [results, setResults] = React.useState<Process[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const processes = await searchProcesses(search);
        setResults(processes);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao Buscar Processos', description: error.message });
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
          {selectedProcess ? selectedProcess.name : "Selecione um processo..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder="Buscar processo por nome ou número..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && <CommandEmpty>Buscando...</CommandEmpty>}
            <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
            <CommandGroup>
              {results.map((process) => (
                <CommandItem
                  key={process.id}
                  value={process.name}
                  onSelect={() => {
                    onSelect(process);
                    setOpen(false);
                  }}
                >
                   <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedProcess?.id === process.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {process.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const revenueOrigins = [
    { value: 'HONORARIOS_CONTRATUAIS', label: 'Honorários Contratuais' },
    { value: 'ACORDO', label: 'Acordo' },
    { value: 'SENTENCA', label: 'Sentença' },
    { value: 'SUCUMBENCIA', label: 'Sucumbência' },
];

const expenseOrigins = [
    { value: 'CUSTAS_PROCESSUAIS', label: 'Custas Processuais' },
    { value: 'HONORARIOS_PAGOS', label: 'Pagamento de Honorários' },
    { value: 'SALARIOS_PROLABORE', label: 'Salários e Pró-labore' },
    { value: 'ALUGUEL_CONTAS', label: 'Aluguel e Contas Fixas' },
    { value: 'INFRAESTRUTURA_TI', label: 'Infraestrutura e TI' },
    { value: 'MARKETING_PUBLICIDADE', label: 'Marketing e Publicidade' },
    { value: 'IMPOSTOS_TAXAS', label: 'Impostos e Taxas' },
    { value: 'MATERIAL_ESCRITORIO', label: 'Material de Escritório' },
    { value: 'SERVICOS_TERCEIROS', label: 'Serviços de Terceiros' },
    { value: 'OUTRAS_DESPESAS', label: 'Outras Despesas' },
];

const allOriginLabels = new Map([...revenueOrigins, ...expenseOrigins].map(o => [o.value, o.label]));


// --- NewTitleDialog Component ---
function NewTitleDialog({ onTitleCreated, staffData }: { onTitleCreated: () => void; staffData: Staff[] | null }) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null);

  const form = useForm<z.infer<typeof titleSchema>>({
    resolver: zodResolver(titleSchema),
    defaultValues: {
      type: 'RECEITA',
      status: 'PENDENTE',
      origin: 'HONORARIOS_CONTRATUAIS',
    }
  });

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: { onChange: (value: number | undefined) => void }) => {
    const { value } = e.target;
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') {
        field.onChange(undefined);
        return;
    }
    const numberValue = Number(digitsOnly) / 100;
    field.onChange(numberValue);
  };

  const formatCurrencyForDisplay = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) {
        return '';
    }
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
  };


  const watchedType = form.watch('type');
  const watchedOrigin = form.watch('origin');
  
  const requiresProcess = !operationalExpenseOrigins.includes(watchedOrigin as any);

  React.useEffect(() => {
    // Reset dependent fields when type changes
    form.setValue('origin', watchedType === 'RECEITA' ? 'HONORARIOS_CONTRATUAIS' : 'CUSTAS_PROCESSUAIS');
    form.setValue('processId', undefined);
    setSelectedProcess(null);
    form.setValue('paidToStaffId', undefined, { shouldValidate: false });
  }, [watchedType, form]);

  React.useEffect(() => {
    // If an operational expense is selected, clear process info
    if (!requiresProcess) {
      setSelectedProcess(null);
      form.setValue('processId', undefined, { shouldValidate: true });
    }
  }, [requiresProcess, form]);


  const onSubmit = async (values: z.infer<typeof titleSchema>>) => {
    setIsSaving(true);
    try {
      const payload: any = { ...values };
      if (!requiresProcess) {
        delete payload.processId; // Ensure it's not sent
      }
      if (payload.origin !== 'HONORARIOS_PAGOS') {
        delete payload.paidToStaffId;
      }

      await createFinancialTitle(payload);

      toast({
        title: 'Título Criado!',
        description: 'O novo título financeiro foi adicionado ao sistema.',
      });

      form.reset();
      setSelectedProcess(null);
      onTitleCreated();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Criar Título',
        description: error.message || 'Não foi possível salvar o título.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-1">
          <PlusCircle className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Novo Título</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lançar Novo Título Financeiro</DialogTitle>
          <DialogDescription>Preencha os dados para criar uma nova receita ou despesa.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="RECEITA">Receita</SelectItem>
                          <SelectItem value="DESPESA">Despesa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origem *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                           {watchedType === 'RECEITA' ? 
                             revenueOrigins.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>) :
                             expenseOrigins.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)
                           }
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             {watchedOrigin === 'HONORARIOS_PAGOS' && (
                <FormField
                    control={form.control}
                    name="paidToStaffId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Beneficiário (Advogado) *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o advogado..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {staffData?.filter(s => s.role === 'lawyer' || s.role === 'intern').map(staff => (
                                        <SelectItem key={staff.id} value={staff.id}>{staff.firstName} {staff.lastName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
             )}
             {requiresProcess && (
                <FormField
                  control={form.control}
                  name="processId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Processo Associado *</FormLabel>
                      <ProcessSearch 
                          selectedProcess={selectedProcess}
                          onSelect={(process) => {
                              setSelectedProcess(process);
                              field.onChange(process.id);
                              form.setValue('description', `${allOriginLabels.get(form.getValues('origin')) || 'Lançamento'} - ${process.name}`);
                          }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
             )}
             <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: Honorários iniciais" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Valor (R$) *</FormLabel>
                        <FormControl>
                            <Input
                              type="text"
                              placeholder="0,00"
                              {...field}
                              value={formatCurrencyForDisplay(field.value)}
                              onChange={(e) => handleCurrencyChange(e, field)}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Vencimento *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                          onChange={(e) => field.onChange(e.target.valueAsDate)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? "Salvando..." : "Salvar Título"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


function FinancialTitlesTable({
  titles,
  clientsMap,
  processesMap,
  isLoading,
  onAction,
  originLabels,
}: {
  titles: FinancialTitle[];
  clientsMap: Map<string, string>;
  processesMap: Map<string, Process>;
  isLoading: boolean;
  onAction: () => void;
  originLabels: Map<string, string>;
}) {
  const { toast } = useToast();

  const handleUpdateStatus = async (titleId: string, status: 'PAGO' | 'PENDENTE' | 'ATRASADO') => {
    try {
      await updateFinancialTitleStatus(titleId, status);
      toast({ title: 'Status atualizado com sucesso!' });
      onAction(); // Refresh data
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar status', description: error.message });
    }
  };

  const getAssociatedName = (title: FinancialTitle) => {
    if (operationalExpenseOrigins.includes(title.origin as any)) return 'Escritório';
    
    if (title.processId) {
      const process = processesMap.get(title.processId);
      if (process && process.clientId) {
        return clientsMap.get(process.clientId) || 'Cliente não encontrado';
      }
    }
    return 'N/A';
  };

  const getStatusVariant = (status: 'PAGO' | 'PENDENTE' | 'ATRASADO') => {
    switch (status) {
      case 'PAGO':
        return 'secondary';
      case 'PENDENTE':
        return 'default';
      case 'ATRASADO':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (titles.length === 0) {
     return (
        <div className="text-center text-muted-foreground py-16">
            Nenhum título financeiro encontrado nesta categoria.
        </div>
     )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descrição</TableHead>
          <TableHead className="hidden sm:table-cell">Origem</TableHead>
          <TableHead className="hidden md:table-cell">Status</TableHead>
          <TableHead className="hidden md:table-cell">Vencimento</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="w-[50px]"><span className="sr-only">Ações</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {titles.map((title) => {
          const isRevenue = title.type === 'RECEITA';
          const dueDate = (title.dueDate as Timestamp).toDate();
          // Client-side check for overdue status to provide immediate visual feedback
          const isOverdue = title.status === 'PENDENTE' && dueDate < new Date();
          const effectiveStatus = isOverdue ? 'ATRASADO' : title.status;

          return (
            <TableRow key={title.id}>
              <TableCell>
                <div className="font-medium">{title.description}</div>
                <div className="text-sm text-muted-foreground hidden md:block">
                  {getAssociatedName(title)}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline">{originLabels.get(title.origin) || title.origin.replace(/_/g, ' ')}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant={getStatusVariant(effectiveStatus)} className="capitalize">
                  {effectiveStatus.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className={cn("font-medium", isOverdue && "text-destructive")}>{formatDate(dueDate)}</div>
                {title.status === 'PAGO' && title.paymentDate && <div className="text-xs text-muted-foreground">Pago: {formatDate(title.paymentDate)}</div>}
              </TableCell>
              <TableCell className={cn('text-right font-semibold', isRevenue ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                {isRevenue ? '+' : '-'} {formatCurrency(title.value)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    {title.status !== 'PAGO' && (
                      <DropdownMenuItem onSelect={() => handleUpdateStatus(title.id, 'PAGO')}>
                        Marcar como Pago
                      </DropdownMenuItem>
                    )}
                    {title.status === 'PAGO' && (
                      <DropdownMenuItem onSelect={() => handleUpdateStatus(title.id, 'PENDENTE')}>
                        Marcar como Pendente
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function FinanceiroPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const titlesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'desc')) : null),
    [firestore, refreshKey]
  );
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore, refreshKey]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore, refreshKey]);
  const { data: staffData, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);

  const processesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'processes') : null), [firestore, refreshKey]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const isLoading = isUserLoading || isLoadingTitles || isLoadingClients || isLoadingStaff || isLoadingProcesses;
  const titles = titlesData || [];
  
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, `${c.firstName} ${c.lastName}`])), [clientsData]);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  const originLabels = React.useMemo(() => {
    return allOriginLabels;
  }, []);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const { monthlyRevenue, monthlyExpenses, pendingReceivables } = React.useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return titles.reduce((acc, t) => {
        const paymentDateValue = t.paymentDate as Timestamp | string | undefined;
        if(t.status === 'PAGO' && paymentDateValue) {
            const paymentDate = typeof paymentDateValue === 'string' ? new Date(paymentDateValue) : paymentDateValue.toDate();
            if (paymentDate >= startOfMonth) {
                if (t.type === 'RECEITA') acc.monthlyRevenue += t.value;
                if (t.type === 'DESPESA') acc.monthlyExpenses += t.value;
            }
        }
        if (t.type === 'RECEITA' && t.status === 'PENDENTE') {
            acc.pendingReceivables += t.value;
        }
        return acc;
    }, { monthlyRevenue: 0, monthlyExpenses: 0, pendingReceivables: 0 });
  }, [titles]);
  
  const monthlyBalance = monthlyRevenue - monthlyExpenses;

  const receitas = React.useMemo(() => titles.filter((t) => t.type === 'RECEITA'), [titles]);
  const despesas = React.useMemo(() => titles.filter((t) => t.type === 'DESPESA'), [titles]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <H1>Painel Financeiro</H1>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 gap-1 hidden sm:flex">
            <File className="h-4 w-4" />
            <span className="whitespace-nowrap">Exportar</span>
          </Button>
          <NewTitleDialog onTitleCreated={handleRefresh} staffData={staffData} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita (Mês)</CardTitle>
                    <ArrowUpRight className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(monthlyRevenue)}</div>
                    <p className="text-xs text-muted-foreground">+20.1% vs. mês anterior</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
                    <ArrowDownRight className="h-5 w-5 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(monthlyExpenses)}</div>
                    <p className="text-xs text-muted-foreground">+12.4% vs. mês anterior</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo (Mês)</CardTitle>
                    <Scale className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", monthlyBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                        {formatCurrency(monthlyBalance)}
                    </div>
                     <p className="text-xs text-muted-foreground">Resultado líquido do mês</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(pendingReceivables)}</div>
                    <p className="text-xs text-muted-foreground">Total de pendências de clientes</p>
                </CardContent>
            </Card>
        </>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="revenues">Receitas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="staff_fees">Repasses da Equipe</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Últimos Títulos Financeiros</CardTitle>
              <CardDescription>Visualize as movimentações mais recentes do seu escritório.</CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialTitlesTable titles={titles.slice(0, 10)} clientsMap={clientsMap} processesMap={processesMap} isLoading={isLoading} onAction={handleRefresh} originLabels={originLabels} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="revenues">
          <Card>
            <CardHeader>
              <CardTitle>Contas a Receber</CardTitle>
              <CardDescription>Visualize todos os honorários, acordos e pagamentos recebidos.</CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialTitlesTable titles={receitas} clientsMap={clientsMap} processesMap={processesMap} isLoading={isLoading} onAction={handleRefresh} originLabels={originLabels} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Contas a Pagar</CardTitle>
              <CardDescription>Visualize todas as custas, despesas e pagamentos efetuados.</CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialTitlesTable titles={despesas} clientsMap={clientsMap} processesMap={processesMap} isLoading={isLoading} onAction={handleRefresh} originLabels={originLabels} />
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="staff_fees">
          <Card>
            <CardHeader>
              <CardTitle>Honorários da Equipe</CardTitle>
              <CardDescription>Resumo dos valores a receber por cada membro da equipe que participa de honorários.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 w-full" />)
                ) : (
                    staffData && staffData
                        .filter(s => s.role === 'lawyer' || s.role === 'intern')
                        .map(member => <StaffCreditCard key={member.id} staffMember={member} />)
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
