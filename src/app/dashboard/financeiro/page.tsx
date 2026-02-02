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
  DollarSign,
  PlusCircle,
  File,
  Loader2,
  MoreVertical,
  Check,
  Calendar as CalendarIcon,
  User,
  FileText,
  TrendingUp,
  AlertCircle,
  Search,
  X
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
import { format, startOfMonth, subMonths, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { createFinancialTitle, updateFinancialTitleStatus } from '@/lib/finance-actions';
import { searchProcesses } from '@/lib/process-actions';
import { StaffCreditCard } from '@/components/finance/StaffCreditCard';
import { Textarea } from '@/components/ui/textarea';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const operationalExpenseOrigins = [
  'SALARIOS_PROLABORE', 'ALUGUEL_CONTAS', 'INFRAESTRUTURA_TI', 'MARKETING_PUBLICIDADE', 
  'IMPOSTOS_TAXAS', 'MATERIAL_ESCRITORIO', 'SERVICOS_TERCEIROS', 'OUTRAS_DESPESAS'
] as const;

const processLinkedRevenueOrigins = [
    'ACORDO', 'SENTENCA', 'HONORARIOS_CONTRATUAIS', 'SUCUMBENCIA'
] as const;

const processLinkedExpenseOrigins = [ 'CUSTAS_PROCESSUAIS', 'HONORARIOS_PAGOS' ] as const;

const allOriginsArray = [...processLinkedRevenueOrigins, ...processLinkedExpenseOrigins, ...operationalExpenseOrigins] as [string, ...string[]];

const titleSchema = z.object({
  processId: z.string().optional(),
  description: z.string().min(3, 'A descrição é obrigatória.'),
  type: z.enum(['RECEITA', 'DESPESA'], { required_error: 'Selecione o tipo.'}),
  origin: z.enum(allOriginsArray, { required_error: 'Selecione a origem.'}),
  value: z.coerce.number().positive('O valor deve ser um número positivo.'),
  dueDate: z.coerce.date({ required_error: 'A data de vencimento é obrigatória.' }),
  paymentDate: z.coerce.date().optional(),
  status: z.enum(['PENDENTE', 'PAGO', 'ATRASADO']).default('PENDENTE'),
  paidToStaffId: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
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

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const revenueOrigins = [
    { value: 'HONORARIOS_CONTRATUAIS', label: 'Honorários Contratuais' },
    { value: 'ACORDO', label: 'Acordo' },
    { value: 'SENTENCA', label: 'Sentença' },
    { value: 'SUCUMBENCIA', label: 'Sucumbência' },
];

const expenseOrigins = [
    { value: 'CUSTAS_PROCESSUAIS', label: 'Custas Processuais' },
    { value: 'HONORARIOS_PAGOS', label: 'Pagamento de Honorários (Equipe)' },
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
          className="w-full justify-between font-normal h-11"
        >
          <span className="truncate">
            {selectedProcess ? selectedProcess.name : "Vincular a um processo..."}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
                  <div className="flex flex-col">
                    <span className="font-medium">{process.name}</span>
                    <span className="text-xs text-muted-foreground">{process.processNumber || 'Sem número'}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
      dueDate: new Date(),
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
  const watchedStatus = form.watch('status');
  
  const requiresProcess = !operationalExpenseOrigins.includes(watchedOrigin as any);

  React.useEffect(() => {
    if (watchedType) {
        form.setValue('origin', watchedType === 'RECEITA' ? 'HONORARIOS_CONTRATUAIS' : 'CUSTAS_PROCESSUAIS');
        form.setValue('processId', undefined);
        setSelectedProcess(null);
        form.setValue('paidToStaffId', undefined);
    }
  }, [watchedType, form]);

  React.useEffect(() => {
    if (!requiresProcess) {
      setSelectedProcess(null);
      form.setValue('processId', undefined);
    }
  }, [requiresProcess, form]);

  async function onSubmit(values: z.infer<typeof titleSchema>) {
    setIsSaving(true);
    try {
      const payload: any = { 
        ...values,
        paymentDate: values.status === 'PAGO' ? (values.paymentDate || new Date()) : undefined
      };
      
      if (!requiresProcess) delete payload.processId;
      if (payload.origin !== 'HONORARIOS_PAGOS') delete payload.paidToStaffId;

      await createFinancialTitle(payload);

      toast({
        title: 'Título Lançado!',
        description: 'A movimentação financeira foi registrada com sucesso.',
      });

      form.reset();
      setSelectedProcess(null);
      onTitleCreated();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Lançar',
        description: error.message || 'Não foi possível salvar o título.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 gap-1 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="h-4 w-4" />
          <span>Novo Lançamento</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Lançar Movimentação Financeira
          </DialogTitle>
          <DialogDescription>Cadastre uma nova receita ou despesa para o controle do escritório.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-muted/30 border border-border/50">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Tipo de Movimento *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="RECEITA" className="text-green-600 font-medium">⬆ Receita (Entrada)</SelectItem>
                          <SelectItem value="DESPESA" className="text-red-600 font-medium">⬇ Despesa (Saída)</SelectItem>
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
                      <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Categoria / Origem *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger></FormControl>
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

            <div className="space-y-4">
                {watchedOrigin === 'HONORARIOS_PAGOS' && (
                    <FormField
                        control={form.control}
                        name="paidToStaffId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2"><User className="h-4 w-4" /> Beneficiário (Advogado/Estagiário) *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Selecione o membro da equipe..." /></SelectTrigger></FormControl>
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
                        <FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4" /> Processo Associado *</FormLabel>
                        <ProcessSearch 
                            selectedProcess={selectedProcess}
                            onSelect={(process) => {
                                setSelectedProcess(process);
                                field.onChange(process.id);
                                if (!form.getValues('description')) {
                                    form.setValue('description', `${allOriginLabels.get(form.getValues('origin'))} - ${process.name}`);
                                }
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
                        <FormLabel>Descrição do Lançamento *</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Honorários de Êxito - Processo X" className="h-11" {...field} />
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
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                                    <Input
                                        type="text"
                                        placeholder="0,00"
                                        className="h-11 pl-10 text-lg font-semibold"
                                        {...field}
                                        value={formatCurrencyForDisplay(field.value)}
                                        onChange={(e) => handleCurrencyChange(e, field)}
                                    />
                                </div>
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
                        <FormLabel>Status Atual *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                            <SelectContent>
                            <SelectItem value="PENDENTE">🕒 Pendente (Aberto)</SelectItem>
                            <SelectItem value="PAGO">✅ Pago (Liquido)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Vencimento *</FormLabel>
                        <FormControl>
                            <Input
                            type="date"
                            className="h-11"
                            {...field}
                            value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => field.onChange(e.target.valueAsDate)}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {watchedStatus === 'PAGO' && (
                        <FormField
                        control={form.control}
                        name="paymentDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel className="flex items-center gap-2 text-green-600"><Check className="h-4 w-4" /> Data do Pagamento</FormLabel>
                            <FormControl>
                                <Input
                                type="date"
                                className="h-11 border-green-200 bg-green-50/30"
                                {...field}
                                value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                                onChange={(e) => field.onChange(e.target.valueAsDate)}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    )}
                </div>

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Observações / Notas Internas</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Informações adicionais para o financeiro..." className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <DialogFooter className="gap-2 border-t pt-6">
                <DialogClose asChild>
                    <Button type="button" variant="ghost" disabled={isSaving}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" className="px-8" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? "Gravando..." : "Confirmar Lançamento"}
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
      onAction();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar status', description: error.message });
    }
  };

  const getAssociatedName = (title: FinancialTitle) => {
    if (operationalExpenseOrigins.includes(title.origin as any)) return 'Escritório (Administrativo)';
    
    if (title.processId) {
      const process = processesMap.get(title.processId);
      if (process && process.clientId) {
        return clientsMap.get(process.clientId) || 'Cliente não encontrado';
      }
    }
    return 'Geral';
  };

  const getStatusVariant = (status: 'PAGO' | 'PENDENTE' | 'ATRASADO') => {
    switch (status) {
      case 'PAGO': return 'secondary';
      case 'PENDENTE': return 'default';
      case 'ATRASADO': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton className="h-16 w-full" />)}
      </div>
    );
  }

  if (titles.length === 0) {
     return (
        <div className="text-center text-muted-foreground py-20 flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p>Nenhuma movimentação encontrada.</p>
        </div>
     )
  }

  return (
    <div className="rounded-md border overflow-hidden">
        <Table>
        <TableHeader className="bg-muted/50">
            <TableRow>
            <TableHead className="font-bold">Título / Detalhes</TableHead>
            <TableHead className="hidden sm:table-cell font-bold">Categoria</TableHead>
            <TableHead className="hidden md:table-cell font-bold text-center">Status</TableHead>
            <TableHead className="hidden md:table-cell font-bold">Vencimento</TableHead>
            <TableHead className="text-right font-bold">Valor</TableHead>
            <TableHead className="w-[50px]"></TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {titles.map((title) => {
            const isRevenue = title.type === 'RECEITA';
            const dueDate = (title.dueDate instanceof Timestamp) ? title.dueDate.toDate() : (title.dueDate instanceof Date ? title.dueDate : new Date(title.dueDate));
            const isOverdue = title.status === 'PENDENTE' && isBefore(dueDate, new Date());
            const effectiveStatus = isOverdue ? 'ATRASADO' : title.status;

            return (
                <TableRow key={title.id} className="group hover:bg-muted/30">
                <TableCell>
                    <div className="font-semibold text-sm leading-none mb-1">{title.description}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {getAssociatedName(title)}
                    </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-[10px] font-normal border-muted-foreground/20">
                        {originLabels.get(title.origin) || title.origin.replace(/_/g, ' ')}
                    </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-center">
                    <Badge variant={getStatusVariant(effectiveStatus)} className="text-[10px] h-5 px-2 uppercase tracking-tight">
                    {effectiveStatus === 'PENDENTE' ? '🕒 ' : effectiveStatus === 'PAGO' ? '✅ ' : '⚠ '}
                    {effectiveStatus}
                    </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                    <div className={cn("text-xs font-medium", isOverdue && "text-destructive font-bold")}>
                        {format(dueDate, 'dd/MM/yyyy')}
                    </div>
                    {title.status === 'PAGO' && title.paymentDate && (
                        <div className="text-[10px] text-emerald-600 font-medium">Pago em {format(title.paymentDate.toDate(), 'dd/MM/yyyy')}</div>
                    )}
                </TableCell>
                <TableCell className={cn('text-right font-mono font-bold', isRevenue ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                    {isRevenue ? '+' : '-'} {formatCurrency(title.value)}
                </TableCell>
                <TableCell>
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Ações Financeiras</DropdownMenuLabel>
                        {title.status !== 'PAGO' && (
                        <DropdownMenuItem onSelect={() => handleUpdateStatus(title.id, 'PAGO')} className="text-emerald-600">
                            <Check className="mr-2 h-4 w-4" /> Marcar como Pago
                        </DropdownMenuItem>
                        )}
                        {title.status === 'PAGO' && (
                        <DropdownMenuItem onSelect={() => handleUpdateStatus(title.id, 'PENDENTE')}>
                            Reverter para Aberto
                        </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Ver Comprovante</DropdownMenuItem>
                        <DropdownMenuItem>Editar Lançamento</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
                </TableRow>
            );
            })}
        </TableBody>
        </Table>
    </div>
  );
}

export default function FinanceiroPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [searchTerm, setSearchTerm] = React.useState('');

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

  const originLabels = React.useMemo(() => allOriginLabels, []);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const stats = React.useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);

    return titles.reduce((acc, t) => {
        const titleDate = t.paymentDate ? t.paymentDate.toDate() : (t.dueDate instanceof Timestamp ? t.dueDate.toDate() : (t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate)));
        const isInCurrentMonth = isAfter(titleDate, startOfCurrentMonth);

        if (t.status === 'PAGO' && isInCurrentMonth) {
            if (t.type === 'RECEITA') acc.monthlyRevenue += t.value;
            if (t.type === 'DESPESA') acc.monthlyExpenses += t.value;
        }
        
        if (t.type === 'RECEITA' && t.status === 'PENDENTE') {
            acc.pendingReceivables += t.value;
        }

        const dueDateObj = (t.dueDate instanceof Timestamp) ? t.dueDate.toDate() : (t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate));
        if (t.status === 'PENDENTE' && isBefore(dueDateObj, now)) {
            acc.totalOverdue += t.value;
        }

        return acc;
    }, { monthlyRevenue: 0, monthlyExpenses: 0, pendingReceivables: 0, totalOverdue: 0 });
  }, [titles]);

  const chartData = React.useMemo(() => {
    const months: Array<{ month: string, key: string, receita: number, despesa: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        months.push({
            month: format(d, 'MMM', { locale: ptBR }),
            key: format(d, 'yyyy-MM'),
            receita: 0,
            despesa: 0,
        });
    }

    titles.forEach(t => {
        if (t.status === 'PAGO' && t.paymentDate) {
            const date = t.paymentDate.toDate();
            const key = format(date, 'yyyy-MM');
            const monthData = months.find(m => m.key === key);
            if (monthData) {
                if (t.type === 'RECEITA') monthData.receita += t.value;
                else monthData.despesa += t.value;
            }
        }
    });

    return months;
  }, [titles]);

  const filteredTitles = React.useMemo(() => {
    if (!searchTerm.trim()) return titles;
    const queryStr = searchTerm.toLowerCase();
    return titles.filter(t => 
        t.description.toLowerCase().includes(queryStr) || 
        (t.processId && processesMap.get(t.processId)?.name.toLowerCase().includes(queryStr))
    );
  }, [titles, searchTerm, processesMap]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <H1>Painel Financeiro</H1>
            <p className="text-sm text-muted-foreground">Gestão estratégica de faturamento e custos.</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar títulos..."
                className="pl-8 w-[200px] h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5">
                    <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
           </div>
           <Button variant="outline" size="sm" className="h-9 gap-1 hidden md:flex">
            <File className="h-4 w-4" />
            <span>Relatórios</span>
          </Button>
          <NewTitleDialog onTitleCreated={handleRefresh} staffData={staffData} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : (
        <>
            <Card className="border-l-4 border-l-emerald-500 bg-emerald-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Recebido (Mês)</CardTitle>
                    <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight">{formatCurrency(stats.monthlyRevenue)}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Entradas já confirmadas</p>
                </CardContent>
            </Card>
            <Card className="border-l-4 border-l-rose-500 bg-rose-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Pago (Mês)</CardTitle>
                    <ArrowDownRight className="h-5 w-5 text-rose-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight">{formatCurrency(stats.monthlyExpenses)}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Custos liquidados</p>
                </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500 bg-blue-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Previsão Entrada</CardTitle>
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight text-blue-600">{formatCurrency(stats.pendingReceivables)}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Títulos em aberto</p>
                </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Atrasado</CardTitle>
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight text-amber-600">{formatCurrency(stats.totalOverdue)}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Vencidos e não pagos</p>
                </CardContent>
            </Card>
        </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Fluxo de Caixa (Últimos 6 meses)
                </CardTitle>
                <CardDescription>Comparativo mensal de receitas e despesas liquidadas.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] w-full pt-4">
                {isLoading ? <Skeleton className="h-full w-full" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis 
                                dataKey="month" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={(value) => `R$${value}`}
                            />
                            <Tooltip 
                                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                formatter={(value: number) => [formatCurrency(value), '']}
                            />
                            <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                            <Bar dataKey="receita" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                            <Bar dataKey="despesa" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Distribuição de Receita</CardTitle>
                <CardDescription>Origem dos honorários recebidos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? <Skeleton className="h-48 w-full" /> : (
                    revenueOrigins.map(origin => {
                        const total = titles
                            .filter(t => t.type === 'RECEITA' && t.origin === origin.value)
                            .reduce((sum, t) => sum + t.value, 0);
                        const percentage = stats.monthlyRevenue > 0 ? (total / stats.monthlyRevenue) * 100 : 0;
                        
                        return (
                            <div key={origin.value} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{origin.label}</span>
                                    <span className="font-bold">{formatCurrency(total)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all duration-500" 
                                        style={{ width: `${Math.min(percentage, 100)}%` }} 
                                    />
                                </div>
                            </div>
                        )
                    })
                )}
            </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 w-full sm:w-auto">
          <TabsTrigger value="overview" className="flex-1 sm:flex-none">Geral</TabsTrigger>
          <TabsTrigger value="revenues" className="flex-1 sm:flex-none">A Receber</TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 sm:flex-none">A Pagar</TabsTrigger>
          <TabsTrigger value="staff_fees" className="flex-1 sm:flex-none">Repasses Equipe</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Últimas Movimentações</CardTitle>
                <CardDescription>Fluxo completo de caixa do escritório.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <Loader2 className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Sincronizar
              </Button>
            </CardHeader>
            <CardContent>
              <FinancialTitlesTable titles={filteredTitles.slice(0, 20)} clientsMap={clientsMap} processesMap={processesMap} isLoading={isLoading} onAction={handleRefresh} originLabels={originLabels} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="revenues">
          <Card>
            <CardHeader>
              <CardTitle>Contas a Receber</CardTitle>
              <CardDescription>Todos os honorários e entradas previstas.</CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialTitlesTable titles={filteredTitles.filter(t => t.type === 'RECEITA')} clientsMap={clientsMap} processesMap={processesMap} isLoading={isLoading} onAction={handleRefresh} originLabels={originLabels} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Contas a Pagar</CardTitle>
              <CardDescription>Custos operacionais e obrigações do escritório.</CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialTitlesTable titles={filteredTitles.filter(t => t.type === 'DESPESA')} clientsMap={clientsMap} processesMap={processesMap} isLoading={isLoading} onAction={handleRefresh} originLabels={originLabels} />
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="staff_fees">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton className="h-56 w-full" />)
                ) : (
                    staffData && staffData
                        .filter(s => s.role === 'lawyer' || s.role === 'intern')
                        .map(member => <StaffCreditCard key={member.id} staffMember={member} />)
                )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
