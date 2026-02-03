'use client';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

const allOrigins = [
  'ACORDO', 'SENTENCA', 'HONORARIOS_CONTRATUAIS', 'SUCUMBENCIA', 'CUSTAS_PROCESSUAIS', 'HONORARIOS_PAGOS',
  'SALARIOS_PROLABORE', 'ALUGUEL_CONTAS', 'INFRAESTRUTURA_TI', 'MARKETING_PUBLICIDADE', 
  'IMPOSTOS_TAXAS', 'MATERIAL_ESCRITORIO', 'SERVICOS_TERCEIROS', 'OUTRAS_DESPESAS'
] as const;

const titleSchema = z.object({
  processId: z.string().optional(),
  description: z.string().min(3, 'A descrição é obrigatória.'),
  type: z.enum(['RECEITA', 'DESPESA']),
  origin: z.string().min(1, 'Selecione a origem.'),
  value: z.coerce.number().positive('O valor deve ser maior que zero.'),
  dueDate: z.coerce.date({ required_error: 'A data de vencimento é obrigatória.' }),
  paymentDate: z.coerce.date().optional(),
  status: z.enum(['PENDENTE', 'PAGO', 'ATRASADO']).default('PENDENTE'),
  paidToStaffId: z.string().optional(),
  notes: z.string().optional(),
});

type TitleFormValues = z.infer<typeof titleSchema>;

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

function NewTitleDialog({ onTitleCreated, staffData }: { onTitleCreated: () => void; staffData: Staff[] | null }) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<TitleFormValues>({
    resolver: zodResolver(titleSchema),
    defaultValues: { type: 'RECEITA', status: 'PENDENTE', origin: 'HONORARIOS_CONTRATUAIS', dueDate: new Date() }
  });

  async function onSubmit(values: TitleFormValues) {
    setIsSaving(true);
    try {
      // Type casting to bypass Zod schema to action mismatch
      await createFinancialTitle(values as any);
      toast({ title: 'Título Lançado!' });
      form.reset();
      onTitleCreated();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally { setIsSaving(false); }
  }

  const watchedType = form.watch('type');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="h-9 gap-1 shadow-lg"><PlusCircle className="h-4 w-4" /> Novo Lançamento</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Lançar Movimentação</DialogTitle><DialogDescription>Cadastre uma nova receita ou despesa.</DialogDescription></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="RECEITA">Receita</SelectItem><SelectItem value="DESPESA">Despesa</SelectItem></SelectContent></Select></FormItem>
                )}/>
                <FormField control={form.control} name="origin" render={({ field }) => (
                    <FormItem><FormLabel>Categoria</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{watchedType === 'RECEITA' ? revenueOrigins.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>) : expenseOrigins.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></FormItem>
                )}/>
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)}/>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="value" render={({ field }) => (<FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>)}/>
                <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem><FormLabel>Vencimento</FormLabel><FormControl><Input type="date" value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(e.target.valueAsDate)} /></FormControl></FormItem>)}/>
            </div>
            <DialogFooter><Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : 'Lançar'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function FinanceiroPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const titlesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'desc')) : null), [firestore, refreshKey]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);
  
  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);

  const stats = React.useMemo(() => {
    if (!titlesData) return { monthlyRevenue: 0, monthlyExpenses: 0, pendingReceivables: 0, totalOverdue: 0 };
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);

    return titlesData.reduce((acc, t) => {
        const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate);
        const paymentDate = t.paymentDate instanceof Timestamp ? t.paymentDate.toDate() : (t.paymentDate ? new Date(t.paymentDate as any) : null);
        const refDate = paymentDate || dueDate;

        if (t.status === 'PAGO' && isAfter(refDate, startOfCurrentMonth)) {
            if (t.type === 'RECEITA') acc.monthlyRevenue += t.value;
            else acc.monthlyExpenses += t.value;
        }
        if (t.type === 'RECEITA' && t.status === 'PENDENTE') acc.pendingReceivables += t.value;
        if (t.status === 'PENDENTE' && isBefore(dueDate, now)) acc.totalOverdue += t.value;

        return acc;
    }, { monthlyRevenue: 0, monthlyExpenses: 0, pendingReceivables: 0, totalOverdue: 0 });
  }, [titlesData]);

  const chartData = React.useMemo(() => {
    const data: any[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        data.push({ month: format(d, 'MMM', { locale: ptBR }), key: format(d, 'yyyy-MM'), receita: 0, despesa: 0 });
    }
    titlesData?.forEach(t => {
        if (t.status === 'PAGO' && t.paymentDate) {
            const date = t.paymentDate instanceof Timestamp ? t.paymentDate.toDate() : new Date(t.paymentDate as any);
            const key = format(date, 'yyyy-MM');
            const month = data.find(m => m.key === key);
            if (month) {
                if (t.type === 'RECEITA') month.receita += t.value;
                else month.despesa += t.value;
            }
        }
    });
    return data;
  }, [titlesData]);

  const isLoading = isUserLoading || isLoadingTitles;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><H1>Painel Financeiro</H1><p className="text-sm text-muted-foreground">Gestão de faturamento e custos.</p></div>
        <NewTitleDialog onTitleCreated={() => setRefreshKey(k => k+1)} staffData={staffData} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-emerald-500/5"><CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase">Recebido (Mês)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div></CardContent></Card>
        <Card className="bg-rose-500/5"><CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase">Pago (Mês)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stats.monthlyExpenses)}</div></CardContent></Card>
        <Card className="bg-blue-500/5"><CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase">Previsão Entrada</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.pendingReceivables)}</div></CardContent></Card>
        <Card className="bg-amber-500/5"><CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase">Total Atrasado</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalOverdue)}</div></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Fluxo de Caixa</CardTitle></CardHeader><CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="receita" name="Receitas" fill="#10b981" /><Bar dataKey="despesa" name="Despesas" fill="#ef4444" /></BarChart>
        </ResponsiveContainer>
      </CardContent></Card>

      <Tabs defaultValue="all">
        <TabsList><TabsTrigger value="all">Geral</TabsTrigger><TabsTrigger value="repasse">Repasses</TabsTrigger></TabsList>
        <TabsContent value="all">
            <Card><CardContent className="p-0">
                <Table><TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                <TableBody>
                    {isLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) : 
                    titlesData?.map(t => (
                        <TableRow key={t.id}><TableCell>{t.description}</TableCell><TableCell>{format(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate), 'dd/MM/yyyy')}</TableCell><TableCell className={cn("text-right font-bold", t.type === 'RECEITA' ? "text-emerald-600" : "text-rose-600")}>{t.type === 'RECEITA' ? '+' : '-'} {formatCurrency(t.value)}</TableCell></TableRow>
                    ))}
                </TableBody></Table>
            </CardContent></Card>
        </TabsContent>
        <TabsContent value="repasse">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {staffData?.filter(s => s.role === 'lawyer').map(s => <StaffCreditCard key={s.id} staffMember={s} />)}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
