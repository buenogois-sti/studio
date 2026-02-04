'use client';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpRight, ArrowDownRight, PlusCircle, Loader2, Check, Download, FileText, TrendingDown, 
  AlertTriangle, Receipt, Users, Briefcase, RefreshCw, TrendingUp, Clock, BarChartIcon
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy } from 'firebase/firestore';
import type { FinancialTitle, Staff } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { H1 } from '@/components/ui/typography';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createFinancialTitle } from '@/lib/finance-actions';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Textarea } from '@/components/ui/textarea';

const titleSchema = z.object({
  processId: z.string().optional(),
  description: z.string().min(3),
  type: z.enum(['RECEITA', 'DESPESA']),
  origin: z.string().min(1),
  costCenter: z.string().optional(),
  value: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
  status: z.enum(['PENDENTE', 'PAGO', 'ATRASADO']).default('PENDENTE'),
});

type TitleFormValues = z.infer<typeof titleSchema>;

const formatCurrency = (amount: number) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const costCenters = [
  { value: 'PESSOAL', label: 'Pessoal', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'INFRAESTRUTURA', label: 'Infraestrutura & TI', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { value: 'PROCESSOS', label: 'Custas Processuais', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { value: 'MARKETING', label: 'Marketing & Captação', color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
];

const revenueOrigins = [
  { value: 'HONORARIOS', label: 'Honorários Contratuais' },
  { value: 'ACORDO', label: 'Acordo' },
  { value: 'SENTENCA', label: 'Sentença' },
  { value: 'SUCUMBENCIA', label: 'Sucumbência' },
];

const expenseOrigins = [
  { value: 'SALARIOS', label: 'Salários/Pró-labore' },
  { value: 'CUSTAS', label: 'Custas Processuais' },
  { value: 'ALUGUEL', label: 'Aluguel' },
  { value: 'CONTAS', label: 'Contas Fixas' },
  { value: 'TI', label: 'Infraestrutura TI' },
  { value: 'MATERIAL', label: 'Material de Escritório' },
  { value: 'PUBLICIDADE', label: 'Publicidade' },
  { value: 'VIAGENS', label: 'Viagens' },
  { value: 'OUTROS', label: 'Outros' },
];

const reimbursementSchema = z.object({
  staffId: z.string().min(1, 'Selecione um membro'),
  description: z.string().min(3, 'Descrição obrigatória'),
  value: z.coerce.number().positive('Valor deve ser positivo'),
  reason: z.string().min(5, 'Motivo obrigatório'),
  requestDate: z.coerce.date(),
  status: z.enum(['SOLICITADO', 'APROVADO', 'REEMBOLSADO']).default('SOLICITADO'),
});

type ReimbursementFormValues = z.infer<typeof reimbursementSchema>;

const paymentSchema = z.object({
  staffId: z.string().min(1, 'Selecione o prestador'),
  description: z.string().min(3, 'Descrição do pagamento'),
  referentTo: z.string().min(3, 'Referente a (ex: Processo, Repasse)'),
  value: z.coerce.number().positive('Valor deve ser positivo'),
  paymentDate: z.coerce.date(),
  status: z.enum(['PENDENTE', 'PAGO', 'ATRASADO']).default('PENDENTE'),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

function NovaReceitaDialog({ onTitleCreated }: { onTitleCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<TitleFormValues>({
    resolver: zodResolver(titleSchema),
    defaultValues: { type: 'RECEITA', status: 'PENDENTE', origin: 'HONORARIOS', dueDate: new Date() }
  });

  async function onSubmit(values: TitleFormValues) {
    setIsSaving(true);
    try {
      await createFinancialTitle(values as any);
      toast({ title: 'Receita lançada!' });
      form.reset();
      onTitleCreated();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally { setIsSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2 bg-emerald-600 hover:bg-emerald-700"><PlusCircle className="h-4 w-4" /> Nova Receita</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Registrar Receita</DialogTitle><DialogDescription>Lançar ganho de processo, acordo ou sentença.</DialogDescription></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="origin" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Receita</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{revenueOrigins.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder="0,00" /></FormControl><FormMessage /></FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field} placeholder="Ex: Honorários - Cliente XYZ" /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem><FormLabel>Data de Recebimento</FormLabel><FormControl><Input type="date" value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(e.target.valueAsDate)} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="PENDENTE">Pendente</SelectItem><SelectItem value="PAGO">Recebido</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )}/>
            </div>
            <DialogFooter><Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Lançar Receita'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function NovaDespesaDialog({ onTitleCreated }: { onTitleCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<TitleFormValues>({
    resolver: zodResolver(titleSchema),
    defaultValues: { type: 'DESPESA', status: 'PENDENTE', origin: 'SALARIOS', costCenter: 'PESSOAL', dueDate: new Date() }
  });

  async function onSubmit(values: TitleFormValues) {
    setIsSaving(true);
    try {
      await createFinancialTitle(values as any);
      toast({ title: 'Despesa lançada!' });
      form.reset();
      onTitleCreated();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally { setIsSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2 bg-rose-600 hover:bg-rose-700"><PlusCircle className="h-4 w-4" /> Nova Despesa</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Registrar Despesa</DialogTitle><DialogDescription>Lançar gasto com centro de custo.</DialogDescription></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="origin" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Despesa</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{expenseOrigins.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="costCenter" render={({ field }) => (
                <FormItem><FormLabel>Centro de Custo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{costCenters.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder="0,00" /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem><FormLabel>Data</FormLabel><FormControl><Input type="date" value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(e.target.valueAsDate)} /></FormControl><FormMessage /></FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field} placeholder="Detalhe do gasto" /></FormControl><FormMessage /></FormItem>
            )}/>
            <DialogFooter><Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Lançar Despesa'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function NovoReembolsoDialog({ staff, onReimbursementCreated }: { staff: Staff[] | undefined; onReimbursementCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const form = useForm<ReimbursementFormValues>({
    resolver: zodResolver(reimbursementSchema),
    defaultValues: { status: 'SOLICITADO', requestDate: new Date() }
  });

  async function onSubmit(values: ReimbursementFormValues) {
    setIsSaving(true);
    try {
      if (!firestore) throw new Error('Firebase não inicializado');
      await addDoc(collection(firestore, 'reimbursements'), {
        ...values,
        requestDate: Timestamp.fromDate(values.requestDate as Date),
        createdAt: Timestamp.now()
      });
      toast({ title: 'Reembolso registrado com sucesso!' });
      form.reset();
      onReimbursementCreated();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally { setIsSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2 bg-blue-600 hover:bg-blue-700"><PlusCircle className="h-4 w-4" /> Novo Reembolso</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Registrar Reembolso</DialogTitle><DialogDescription>Registrar gasto a ser reembolsado a um membro da equipe.</DialogDescription></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="staffId" render={({ field }) => (
              <FormItem><FormLabel>Membro da Equipe</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{staff?.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder="0,00" /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="requestDate" render={({ field }) => (
                <FormItem><FormLabel>Data da Despesa</FormLabel><FormControl><Input type="date" value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(e.target.valueAsDate)} /></FormControl><FormMessage /></FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descrição do Gasto</FormLabel><FormControl><Input {...field} placeholder="Ex: Material de escritório" /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem><FormLabel>Motivo/Justificativa</FormLabel><FormControl><Textarea {...field} placeholder="Descreva por que o gasto foi necessário" className="resize-none" /></FormControl><FormMessage /></FormItem>
            )}/>
            <DialogFooter><Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Registrar Reembolso'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function NovoPagamentoDialog({ staff, onPaymentCreated }: { staff: Staff[] | undefined; onPaymentCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { status: 'PENDENTE', paymentDate: new Date() }
  });

  async function onSubmit(values: PaymentFormValues) {
    setIsSaving(true);
    try {
      if (!firestore) throw new Error('Firebase não inicializado');
      await addDoc(collection(firestore, 'payments'), {
        ...values,
        paymentDate: Timestamp.fromDate(values.paymentDate as Date),
        createdAt: Timestamp.now()
      });
      toast({ title: 'Pagamento registrado com sucesso!' });
      form.reset();
      onPaymentCreated();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally { setIsSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2 bg-cyan-600 hover:bg-cyan-700"><PlusCircle className="h-4 w-4" /> Registrar Pagamento</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Registrar Pagamento a Prestador</DialogTitle><DialogDescription>Registrar pagamento de honorários ou repasse a advogado/prestador.</DialogDescription></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="staffId" render={({ field }) => (
              <FormItem><FormLabel>Advogado / Prestador</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{staff?.filter(s => s.role === 'lawyer' || s.role === 'partner').map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="referentTo" render={({ field }) => (
                <FormItem><FormLabel>Referente a</FormLabel><FormControl><Input {...field} placeholder="Ex: Processo ABC-123" /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder="0,00" /></FormControl><FormMessage /></FormItem>
              )}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="paymentDate" render={({ field }) => (
                <FormItem><FormLabel>Data do Pagamento</FormLabel><FormControl><Input type="date" value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(e.target.valueAsDate)} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="PENDENTE">Pendente</SelectItem><SelectItem value="PAGO">Pago</SelectItem><SelectItem value="ATRASADO">Atrasado</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field} placeholder="Detalhe do pagamento" /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Observações (opcional)</FormLabel><FormControl><Textarea {...field} placeholder="Notas adicionais" className="resize-none h-20" /></FormControl><FormMessage /></FormItem>
            )}/>
            <DialogFooter><Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Registrar Pagamento'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function GenerateReceiptDialog({ payment }: { payment: any }) {
  const [open, setOpen] = React.useState(false);

  const handleGenerateReceipt = async () => {
    try {
      const receiptNumber = `REC-${Date.now()}`;
      const receiptContent = `
RECIBO DE PAGAMENTO
${'='.repeat(50)}
Número do Recibo: ${receiptNumber}
Data: ${format(new Date(), 'dd/MM/yyyy')}

Pagamento para: ${payment.staffName}
Referente a: ${payment.referentTo}
Valor: ${formatCurrency(payment.value)}
Status: ${payment.status}

Assinado digitalmente em ${format(new Date(), 'dd/MM/yyyy HH:mm')}
${'='.repeat(50)}`;
      
      const blob = new Blob([receiptContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibo-${receiptNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setOpen(false);
    } catch (error) {
      console.error('Erro ao gerar recibo:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="ghost" title="Gerar recibo"><Receipt className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Gerar Recibo</DialogTitle><DialogDescription>Confirme para gerar o recibo de pagamento.</DialogDescription></DialogHeader>
        <div className="space-y-2 py-4 text-sm">
          <p><strong>Pagamento para:</strong> {payment.staffName}</p>
          <p><strong>Valor:</strong> {formatCurrency(payment.value)}</p>
          <p><strong>Referente a:</strong> {payment.referentTo}</p>
          <p><strong>Data:</strong> {format(new Date(), 'dd/MM/yyyy')}</p>
        </div>
        <DialogFooter><Button onClick={handleGenerateReceipt} className="gap-2"><Download className="h-4 w-4" /> Gerar Recibo</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FinanceiroPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const titlesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'desc')) : null), [firestore, refreshKey]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);
  
  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);

  const reimbursementsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'reimbursements'), orderBy('requestDate', 'desc')) : null), [firestore, refreshKey]);
  const { data: reimbursementsData, isLoading: isLoadingReimbursements } = useCollection<any>(reimbursementsQuery);

  const paymentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'payments'), orderBy('paymentDate', 'desc')) : null), [firestore, refreshKey]);
  const { data: paymentsData, isLoading: isLoadingPayments } = useCollection<any>(paymentsQuery);

  const stats = React.useMemo(() => {
    if (!titlesData) return { 
      totalReceitas: 0, totalDespesas: 0, pendingReceitas: 0, pendingDespesas: 0, 
      totalOverdue: 0, margemBruta: 0, margemLiquida: 0, por_centro: {} 
    };

    const result = titlesData.reduce((acc, t) => {
      if (t.type === 'RECEITA') {
        acc.totalReceitas += t.value;
        if (t.status === 'PENDENTE') acc.pendingReceitas += t.value;
      } else {
        acc.totalDespesas += t.value;
        if (t.status === 'PENDENTE') acc.pendingDespesas += t.value;
        if (t.costCenter) {
          acc.por_centro[t.costCenter] = (acc.por_centro[t.costCenter] || 0) + t.value;
        }
      }
      
      if (t.status === 'ATRASADO') acc.totalOverdue += t.value;
      
      return acc;
    }, { totalReceitas: 0, totalDespesas: 0, pendingReceitas: 0, pendingDespesas: 0, totalOverdue: 0, margemBruta: 0, margemLiquida: 0, por_centro: {} as Record<string, number> });

    result.margemBruta = result.totalReceitas - result.totalDespesas;
    result.margemLiquida = result.totalReceitas > 0 ? (result.margemBruta / result.totalReceitas * 100) : 0;

    return result;
  }, [titlesData]);

  const receitas = titlesData?.filter(t => t.type === 'RECEITA') || [];
  const despesas = titlesData?.filter(t => t.type === 'DESPESA') || [];
  
  const despesasPorCentro = React.useMemo(() => {
    return Object.entries(stats.por_centro).map(([center, value]) => {
      const config = costCenters.find(c => c.value === center);
      return { name: config?.label || center, value, color: config?.color };
    });
  }, [stats.por_centro]);

  const isLoading = isUserLoading || isLoadingTitles || isLoadingReimbursements || isLoadingPayments;
  const COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#64748b'];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/50">
        <div><H1>Financeiro</H1><p className="text-sm text-muted-foreground">Controle de ganhos, gastos, reembolsos e pagamentos.</p></div>
        <Button variant="outline" size="sm" className="gap-2 hover:bg-slate-100 transition-colors w-fit"><Download className="h-4 w-4" /> Exportar</Button>
      </div>

      <Tabs defaultValue="receitas" className="animate-in fade-in duration-700 flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-5 bg-slate-900/50 backdrop-blur-sm border border-slate-700/30 rounded-lg p-1 gap-1"><TabsTrigger value="receitas" className="rounded-md data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/20 text-slate-300 hover:text-emerald-400 transition-colors text-xs md:text-sm"><span className="hidden md:inline">Receitas</span><span className="md:hidden">Rec</span></TabsTrigger><TabsTrigger value="despesas" className="rounded-md data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 data-[state=active]:shadow-lg data-[state=active]:shadow-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors text-xs md:text-sm"><span className="hidden md:inline">Despesas</span><span className="md:hidden">Des</span></TabsTrigger><TabsTrigger value="reembolsos" className="rounded-md data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/20 text-slate-300 hover:text-blue-400 transition-colors text-xs md:text-sm"><span className="hidden md:inline">Reembolsos</span><span className="md:hidden">Ree</span></TabsTrigger><TabsTrigger value="prestadores" className="rounded-md data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 text-slate-300 hover:text-cyan-400 transition-colors text-xs md:text-sm"><span className="hidden md:inline">Prestadores</span><span className="md:hidden">Pres</span></TabsTrigger><TabsTrigger value="relatorios" className="rounded-md data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 text-slate-300 hover:text-purple-400 transition-colors text-xs md:text-sm"><span className="hidden md:inline">Relatórios</span><span className="md:hidden">Rel</span></TabsTrigger></TabsList>

        <TabsContent value="receitas" className="animate-in fade-in duration-500 flex-1"><Card className="border-emerald-500/20 bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm h-full flex flex-col"><CardHeader className="border-b border-emerald-500/10 pb-4 bg-gradient-to-r from-emerald-500/10 to-transparent"><div className="flex items-center justify-between"><div><CardTitle className="text-lg text-emerald-400 flex items-center gap-2"><ArrowUpRight className="h-5 w-5" /> Receitas Registradas</CardTitle><CardDescription className="text-slate-400 text-xs mt-1">Ganhos por processos, acordos e sentenças</CardDescription></div><NovaReceitaDialog onTitleCreated={() => setRefreshKey(k => k+1)} /></div></CardHeader><CardContent className="p-0 flex-1 flex flex-col"><Table><TableHeader><TableRow className="bg-slate-800/50 border-b border-slate-700/30 hover:bg-slate-800/50"><TableHead className="text-xs font-semibold text-slate-300">Descrição</TableHead><TableHead className="text-xs font-semibold text-slate-300">Tipo</TableHead><TableHead className="text-xs font-semibold text-slate-300">Data</TableHead><TableHead className="text-xs font-semibold text-slate-300 text-center">Status</TableHead><TableHead className="text-xs font-semibold text-slate-300 text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{isLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full bg-slate-700/50" /></TableCell></TableRow>) : receitas.length > 0 ? receitas.map((r, idx) => <TableRow key={r.id} className="border-b border-slate-700/20 hover:bg-emerald-500/5 animate-in fade-in duration-300" style={{animationDelay: `${idx * 30}ms`}}><TableCell className="font-medium text-sm text-slate-200">{r.description}</TableCell><TableCell><Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-300 border-emerald-500/20">{revenueOrigins.find(o => o.value === r.origin)?.label}</Badge></TableCell><TableCell className="text-sm text-slate-400">{format(r.dueDate instanceof Timestamp ? r.dueDate.toDate() : new Date(r.dueDate), 'dd/MM/yyyy')}</TableCell><TableCell className="text-center"><Badge className={r.status === 'PAGO' ? 'bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30'} variant="outline"><Check className="h-3 w-3 mr-1" /> {r.status}</Badge></TableCell><TableCell className="text-right font-bold text-emerald-400 text-sm">{formatCurrency(r.value)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500 text-sm">Nenhuma receita registrada</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>

        <TabsContent value="despesas" className="animate-in fade-in duration-500 flex-1"><Card className="border-rose-500/20 bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm h-full flex flex-col"><CardHeader className="border-b border-rose-500/10 pb-4 bg-gradient-to-r from-rose-500/10 to-transparent"><div className="flex items-center justify-between"><div><CardTitle className="text-lg text-rose-400 flex items-center gap-2"><ArrowDownRight className="h-5 w-5" /> Despesas por Centro</CardTitle><CardDescription className="text-slate-400 text-xs mt-1">Gastos organizados por departamento/categoria</CardDescription></div><NovaDespesaDialog onTitleCreated={() => setRefreshKey(k => k+1)} /></div></CardHeader><CardContent className="p-0 flex-1 flex flex-col"><Table><TableHeader><TableRow className="bg-slate-800/50 border-b border-slate-700/30 hover:bg-slate-800/50"><TableHead className="text-xs font-semibold text-slate-300">Descrição</TableHead><TableHead className="text-xs font-semibold text-slate-300">Tipo</TableHead><TableHead className="text-xs font-semibold text-slate-300">Centro de Custo</TableHead><TableHead className="text-xs font-semibold text-slate-300">Data</TableHead><TableHead className="text-xs font-semibold text-slate-300 text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{isLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full bg-slate-700/50" /></TableCell></TableRow>) : despesas.length > 0 ? despesas.map((d, idx) => {const centerConfig = costCenters.find(c => c.value === d.costCenter); return <TableRow key={d.id} className="border-b border-slate-700/20 hover:bg-rose-500/5 animate-in fade-in duration-300" style={{animationDelay: `${idx * 30}ms`}}><TableCell className="font-medium text-sm text-slate-200">{d.description}</TableCell><TableCell><Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-300 border-rose-500/20">{expenseOrigins.find(o => o.value === d.origin)?.label}</Badge></TableCell><TableCell><Badge className="text-xs border-0 bg-slate-700/50 text-slate-200">{centerConfig?.label}</Badge></TableCell><TableCell className="text-sm text-slate-400">{format(d.dueDate instanceof Timestamp ? d.dueDate.toDate() : new Date(d.dueDate), 'dd/MM/yyyy')}</TableCell><TableCell className="text-right font-bold text-rose-400 text-sm">{formatCurrency(d.value)}</TableCell></TableRow>;}) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500 text-sm">Nenhuma despesa registrada</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>

        <TabsContent value="reembolsos" className="animate-in fade-in duration-500 flex-1"><Card className="border-blue-500/20 bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm h-full flex flex-col"><CardHeader className="border-b border-blue-500/10 pb-4 bg-gradient-to-r from-blue-500/10 to-transparent"><div className="flex items-center justify-between"><div><CardTitle className="text-lg text-blue-400 flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Reembolsos</CardTitle><CardDescription className="text-slate-400 text-xs mt-1">Gastos avulsos a reembolsar para advogados</CardDescription></div><NovoReembolsoDialog staff={staffData} onReimbursementCreated={() => setRefreshKey(k => k+1)} /></div></CardHeader><CardContent className="p-0 flex-1 flex flex-col"><Table><TableHeader><TableRow className="bg-slate-800/50 border-b border-slate-700/30 hover:bg-slate-800/50"><TableHead className="text-xs font-semibold text-slate-300">Membro</TableHead><TableHead className="text-xs font-semibold text-slate-300">Motivo</TableHead><TableHead className="text-xs font-semibold text-slate-300">Data</TableHead><TableHead className="text-xs font-semibold text-slate-300 text-center">Status</TableHead><TableHead className="text-xs font-semibold text-slate-300 text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{isLoadingReimbursements ? [...Array(2)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full bg-slate-700/50" /></TableCell></TableRow>) : reimbursementsData && reimbursementsData.length > 0 ? reimbursementsData.map((r, idx) => {const staff = staffData?.find(s => s.id === r.staffId); return <TableRow key={r.id} className="border-b border-slate-700/20 hover:bg-blue-500/5 animate-in fade-in duration-300" style={{animationDelay: `${idx * 30}ms`}}><TableCell className="font-medium text-sm text-slate-200">{staff?.firstName} {staff?.lastName}</TableCell><TableCell className="text-sm text-slate-400">{r.reason}</TableCell><TableCell className="text-sm text-slate-400">{format(r.requestDate instanceof Timestamp ? r.requestDate.toDate() : new Date(r.requestDate), 'dd/MM/yyyy')}</TableCell><TableCell className="text-center"><Badge className={r.status === 'REEMBOLSADO' ? 'bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30' : r.status === 'APROVADO' ? 'bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30' : 'bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30'} variant="outline">{r.status}</Badge></TableCell><TableCell className="text-right font-bold text-blue-400 text-sm">{formatCurrency(r.value)}</TableCell></TableRow>;}) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500 text-sm">Nenhum reembolso registrado</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>

        <TabsContent value="prestadores" className="animate-in fade-in duration-500 flex-1"><Card className="border-cyan-500/20 bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm h-full flex flex-col"><CardHeader className="border-b border-cyan-500/10 pb-4 bg-gradient-to-r from-cyan-500/10 to-transparent"><div className="flex items-center justify-between"><div><CardTitle className="text-lg text-cyan-400 flex items-center gap-2"><Users className="h-5 w-5" /> Pagamento a Prestadores</CardTitle><CardDescription className="text-slate-400 text-xs mt-1">Honorários, repasses e pagamentos a advogados</CardDescription></div><NovoPagamentoDialog staff={staffData} onPaymentCreated={() => setRefreshKey(k => k+1)} /></div></CardHeader><CardContent className="p-0 flex-1 flex flex-col"><Table><TableHeader><TableRow className="bg-slate-800/50 border-b border-slate-700/30 hover:bg-slate-800/50"><TableHead className="text-xs font-semibold text-slate-300">Advogado</TableHead><TableHead className="text-xs font-semibold text-slate-300">Referente a</TableHead><TableHead className="text-xs font-semibold text-slate-300">Data Pagamento</TableHead><TableHead className="text-xs font-semibold text-slate-300 text-center">Status</TableHead><TableHead className="text-xs font-semibold text-slate-300 text-right">Valor</TableHead><TableHead className="text-xs font-semibold text-slate-300 text-center">Ação</TableHead></TableRow></TableHeader><TableBody>{isLoadingPayments ? [...Array(2)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full bg-slate-700/50" /></TableCell></TableRow>) : paymentsData && paymentsData.length > 0 ? paymentsData.map((p, idx) => {const staff = staffData?.find(s => s.id === p.staffId); return <TableRow key={p.id} className="border-b border-slate-700/20 hover:bg-cyan-500/5 animate-in fade-in duration-300" style={{animationDelay: `${idx * 30}ms`}}><TableCell className="font-medium text-sm text-slate-200">{staff?.firstName} {staff?.lastName}</TableCell><TableCell className="text-sm text-slate-400">{p.referentTo}</TableCell><TableCell className="text-sm text-slate-400">{format(p.paymentDate instanceof Timestamp ? p.paymentDate.toDate() : new Date(p.paymentDate), 'dd/MM/yyyy')}</TableCell><TableCell className="text-center"><Badge className={p.status === 'PAGO' ? 'bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30' : p.status === 'ATRASADO' ? 'bg-red-500/20 text-red-300 text-xs border border-red-500/30' : 'bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30'} variant="outline">{p.status}</Badge></TableCell><TableCell className="text-right font-bold text-cyan-400 text-sm">{formatCurrency(p.value)}</TableCell><TableCell className="text-center"><GenerateReceiptDialog payment={{staffName: `${staff?.firstName} ${staff?.lastName}`, value: p.value, referentTo: p.referentTo, status: p.status}} /></TableCell></TableRow>;}) : <TableRow><TableCell colSpan={6} className="h-24 text-center text-slate-500 text-sm">Nenhum pagamento registrado</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>

        <TabsContent value="relatorios" className="animate-in fade-in duration-500 flex-1"><div className="grid gap-4 h-full"><Card className="border-purple-500/20 bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm"><CardHeader className="bg-gradient-to-r from-purple-500/10 to-transparent"><CardTitle className="text-lg text-purple-400 flex items-center gap-2"><BarChartIcon className="h-5 w-5" /> Relatórios Estratégicos</CardTitle><CardDescription className="text-slate-400 text-xs mt-1">Análises financeiras do período</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 pt-6"><Button variant="outline" className="h-16 flex flex-col justify-center gap-1.5 bg-slate-800/30 border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/40 text-slate-200 hover:text-purple-300 transition-colors"><FileText className="h-5 w-5" /> <span className="text-xs font-medium">DRE Mensal</span></Button><Button variant="outline" className="h-16 flex flex-col justify-center gap-1.5 bg-slate-800/30 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40 text-slate-200 hover:text-blue-300 transition-colors"><BarChartIcon className="h-5 w-5" /> <span className="text-xs font-medium">Margem por Caso</span></Button><Button variant="outline" className="h-16 flex flex-col justify-center gap-1.5 bg-slate-800/30 border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300 transition-colors"><Users className="h-5 w-5" /> <span className="text-xs font-medium">Produtividade</span></Button><Button variant="outline" className="h-16 flex flex-col justify-center gap-1.5 bg-slate-800/30 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/40 text-slate-200 hover:text-amber-300 transition-colors"><TrendingUp className="h-5 w-5" /> <span className="text-xs font-medium">Fluxo de Caixa</span></Button></CardContent></Card></div></TabsContent>
      </Tabs>
    </div>
  );
}
