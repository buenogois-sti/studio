'use client';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpRight, ArrowDownRight, PlusCircle, Loader2, Check, Download, Receipt, Users, RefreshCw, TrendingUp, BarChartIcon
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
  { value: 'PESSOAL', label: 'Pessoal', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'INFRAESTRUTURA', label: 'Infraestrutura & TI', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'PROCESSOS', label: 'Custas Processuais', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { value: 'MARKETING', label: 'Marketing & Captação', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
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
      <DialogTrigger asChild><Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"><PlusCircle className="h-4 w-4" /> Nova Receita</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card border-border">
        <DialogHeader><DialogTitle className="text-white">Registrar Receita</DialogTitle><DialogDescription className="text-slate-400">Lançar ganho de processo, acordo ou sentença.</DialogDescription></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="origin" render={({ field }) => (
                <FormItem><FormLabel className="text-white">Tipo de Receita</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger></FormControl><SelectContent className="bg-card border-border">{revenueOrigins.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem><FormLabel className="text-white">Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder="0,00" className="bg-background border-border" /></FormControl><FormMessage /></FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel className="text-white">Descrição</FormLabel><FormControl><Input {...field} placeholder="Ex: Honorários - Cliente XYZ" className="bg-background border-border" /></FormControl><FormMessage /></FormItem>
            )}/>
            <DialogFooter><Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground">{isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Lançar Receita'}</Button></DialogFooter>
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
      <DialogTrigger asChild><Button className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"><PlusCircle className="h-4 w-4" /> Nova Despesa</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card border-border">
        <DialogHeader><DialogTitle className="text-white">Registrar Despesa</DialogTitle><DialogDescription className="text-slate-400">Lançar gasto com centro de custo.</DialogDescription></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="origin" render={({ field }) => (
                <FormItem><FormLabel className="text-white">Tipo de Despesa</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger></FormControl><SelectContent className="bg-card border-border">{expenseOrigins.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="costCenter" render={({ field }) => (
                <FormItem><FormLabel className="text-white">Centro de Custo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger></FormControl><SelectContent className="bg-card border-border">{costCenters.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel className="text-white">Descrição</FormLabel><FormControl><Input {...field} placeholder="Detalhe do gasto" className="bg-background border-border" /></FormControl><FormMessage /></FormItem>
            )}/>
            <DialogFooter><Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground">{isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Lançar Despesa'}</Button></DialogFooter>
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
      <DialogTrigger asChild><Button size="sm" variant="ghost" title="Gerar recibo" className="text-primary hover:bg-primary/10"><Receipt className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle className="text-white">Gerar Recibo</DialogTitle><DialogDescription className="text-slate-400">Confirme para gerar o recibo de pagamento.</DialogDescription></DialogHeader>
        <div className="space-y-2 py-4 text-sm text-slate-300">
          <p><strong>Pagamento para:</strong> {payment.staffName}</p>
          <p><strong>Valor:</strong> {formatCurrency(payment.value)}</p>
          <p><strong>Referente a:</strong> {payment.referentTo}</p>
        </div>
        <DialogFooter><Button onClick={handleGenerateReceipt} className="gap-2 bg-primary text-primary-foreground"><Download className="h-4 w-4" /> Gerar Recibo</Button></DialogFooter>
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
    if (!titlesData) return { totalReceitas: 0, totalDespesas: 0 };
    return titlesData.reduce((acc, t) => {
      if (t.type === 'RECEITA' && t.status === 'PAGO') acc.totalReceitas += t.value;
      if (t.type === 'DESPESA' && t.status === 'PAGO') acc.totalDespesas += t.value;
      return acc;
    }, { totalReceitas: 0, totalDespesas: 0 });
  }, [titlesData]);

  const receitas = React.useMemo(() => titlesData?.filter(t => t.type === 'RECEITA') || [], [titlesData]);
  const despesas = React.useMemo(() => titlesData?.filter(t => t.type === 'DESPESA') || [], [titlesData]);
  
  const isLoading = isUserLoading || isLoadingTitles || isLoadingReimbursements || isLoadingPayments;

  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div><H1 className="text-white">Financeiro</H1><p className="text-sm text-muted-foreground">Controle estratégico de faturamento e despesas.</p></div>
        <div className="flex gap-2">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-end">
                <span className="text-[10px] font-black text-emerald-400 uppercase">Recebido (Mês)</span>
                <span className="text-lg font-black text-emerald-400">{formatCurrency(stats.totalReceitas)}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-end">
                <span className="text-[10px] font-black text-rose-400 uppercase">Pago (Mês)</span>
                <span className="text-lg font-black text-rose-400">{formatCurrency(stats.totalDespesas)}</span>
            </div>
        </div>
      </div>

      <Tabs defaultValue="receitas" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-5 bg-card border border-white/5 rounded-lg p-1 gap-1">
            <TabsTrigger value="receitas" className="rounded-md data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Receitas</TabsTrigger>
            <TabsTrigger value="despesas" className="rounded-md data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">Despesas</TabsTrigger>
            <TabsTrigger value="reembolsos" className="rounded-md data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">Reembolsos</TabsTrigger>
            <TabsTrigger value="prestadores" className="rounded-md data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">Equipe</TabsTrigger>
            <TabsTrigger value="relatorios" className="rounded-md data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="receitas" className="flex-1">
            <Card className="bg-card border-white/5">
                <CardHeader className="flex-row items-center justify-between">
                    <div><CardTitle className="text-lg text-white">Receitas do Escritório</CardTitle><CardDescription className="text-slate-400">Honorários e acordos processuais.</CardDescription></div>
                    <NovaReceitaDialog onTitleCreated={() => setRefreshKey(k => k+1)} />
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="text-muted-foreground">Descrição</TableHead><TableHead className="text-muted-foreground">Vencimento</TableHead><TableHead className="text-center text-muted-foreground">Status</TableHead><TableHead className="text-right text-muted-foreground">Valor</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full bg-white/5" /></TableCell></TableRow>) : receitas.map(r => (
                                <TableRow key={r.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="font-medium text-white">{r.description}</TableCell>
                                    <TableCell className="text-slate-400">{format(r.dueDate instanceof Timestamp ? r.dueDate.toDate() : new Date(r.dueDate), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="text-center"><Badge className={r.status === 'PAGO' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'} variant="outline">{r.status}</Badge></TableCell>
                                    <TableCell className="text-right font-bold text-emerald-400">{formatCurrency(r.value)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="despesas" className="flex-1">
            <Card className="bg-card border-white/5">
                <CardHeader className="flex-row items-center justify-between">
                    <div><CardTitle className="text-lg text-white">Fluxo de Despesas</CardTitle><CardDescription className="text-slate-400">Gastos operacionais e fixos.</CardDescription></div>
                    <NovaDespesaDialog onTitleCreated={() => setRefreshKey(k => k+1)} />
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="text-muted-foreground">Descrição</TableHead><TableHead className="text-muted-foreground">Centro de Custo</TableHead><TableHead className="text-muted-foreground">Data</TableHead><TableHead className="text-right text-muted-foreground">Valor</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full bg-white/5" /></TableCell></TableRow>) : despesas.map(d => (
                                <TableRow key={d.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="font-medium text-white">{d.description}</TableCell>
                                    <TableCell><Badge variant="outline" className="bg-slate-800 text-slate-300 border-white/5">{d.costCenter || 'N/A'}</Badge></TableCell>
                                    <TableCell className="text-slate-400">{format(d.dueDate instanceof Timestamp ? d.dueDate.toDate() : new Date(d.dueDate), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="text-right font-bold text-rose-400">{formatCurrency(d.value)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="prestadores" className="flex-1">
            <Card className="bg-card border-white/5">
                <CardHeader><CardTitle className="text-white">Pagamentos a Prestadores</CardTitle><CardDescription className="text-slate-400">Repasses e honorários da equipe.</CardDescription></CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="text-muted-foreground">Advogado</TableHead><TableHead className="text-muted-foreground">Referente</TableHead><TableHead className="text-center text-muted-foreground">Status</TableHead><TableHead className="text-right text-muted-foreground">Valor</TableHead><TableHead className="text-center text-muted-foreground">Recibo</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full bg-white/5" /></TableCell></TableRow>) : paymentsData?.map(p => {
                                const staff = staffData?.find(s => s.id === p.staffId);
                                return (
                                    <TableRow key={p.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                        <TableCell className="text-white font-medium">{staff?.firstName} {staff?.lastName}</TableCell>
                                        <TableCell className="text-slate-400">{p.referentTo}</TableCell>
                                        <TableCell className="text-center"><Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">{p.status}</Badge></TableCell>
                                        <TableCell className="text-right font-bold text-cyan-400">{formatCurrency(p.value)}</TableCell>
                                        <TableCell className="text-center"><GenerateReceiptDialog payment={{staffName: `${staff?.firstName} ${staff?.lastName}`, value: p.value, referentTo: p.referentTo, status: p.status}} /></TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}