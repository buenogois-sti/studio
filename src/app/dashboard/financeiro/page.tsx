'use client';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  PlusCircle, 
  Loader2, 
  Check, 
  RefreshCw, 
  MoreVertical,
  Trash2,
  Calendar,
  AlertCircle,
  Users,
  Handshake,
  Printer,
  Wallet,
  CheckCircle2,
  Scale,
  FileText,
  DollarSign,
  BarChart3,
  Search,
  FolderKanban,
  X,
  Receipt,
  Download,
  Calculator,
  Info,
  ChevronDown,
  ChevronUp,
  LayoutList,
  AlertTriangle,
  Flame,
  MessageSquare,
  Gavel,
  History,
  CalendarDays,
  ShieldCheck,
  Bot,
  Edit,
  PieChart,
  Clock
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy, deleteDoc, doc, getDocs, where, limit } from 'firebase/firestore';
import type { FinancialTitle, Staff, Client, Process, BankAccount } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { searchProcesses } from '@/lib/process-actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EXPENSE_CATEGORIES, REVENUE_CATEGORIES } from '@/lib/financial-constants';
import { cn } from '@/lib/utils';
import { H1 } from '@/components/ui/typography';
import { useToast } from '@/components/ui/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogTrigger, 
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createFinancialTitle, updateFinancialTitleStatus, processLatePaymentRoutine, updateFinancialTitle, deleteFinancialTitle } from '@/lib/finance-actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';

const titleFormSchema = z.object({
  description: z.string().min(3, 'Descrição obrigatória'),
  type: z.enum(['RECEITA', 'DESPESA']),
  origin: z.enum([
    'ACORDO',
    'SENTENCA',
    'HONORARIOS_CONTRATUAIS',
    'SUCUMBENCIA',
    'CUSTAS_PROCESSUAIS',
    'HONORARIOS_PAGOS',
    'SALARIOS_PROLABORE',
    'ALUGUEL_CONTAS',
    'INFRAESTRUTURA_TI',
    'MARKETING_PUBLICIDADE',
    'IMPOSTOS_TAXAS',
    'MATERIAL_ESCRITORIO',
    'SERVICOS_TERCEIROS',
    'OUTRAS_DESPESAS',
    'PERICIA',
    'DESLOCAMENTO',
    'ADICIONAL',
    'ALVARA',
    'TRANSFERENCIAS_JUDICIAIS',
    'CONTAS_CONSUMO',
    'OUTRAS_RECEITAS'
  ]),
  value: z.coerce.number().positive('Valor deve ser positivo'),
  dueDate: z.string().min(1, 'Data de vencimento obrigatória'),
  competenceDate: z.string().optional(),
  status: z.enum(['PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO']).default('PENDENTE'),
  paymentMethod: z.enum(['PIX', 'BOLETO', 'CARTAO', 'TRANSFERENCIA', 'DINHEIRO']).optional(),
  beneficiaryName: z.string().optional(),
  beneficiaryDocument: z.string().optional(),
  notes: z.string().optional(),
  processId: z.string().optional(),
  clientId: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  recurring: z.boolean().default(false),
  months: z.coerce.number().min(1).max(24).default(1),
});

function ClientReceiptDialog({ 
  title, 
  client, 
  process, 
  open, 
  onOpenChange 
}: { 
  title: FinancialTitle | null; 
  client: Client | null; 
  process: Process | null;
  open: boolean; 
  onOpenChange: (open: boolean) => void 
}) {
  const [receiptMode, setReceiptMode] = React.useState<'REPASSE' | 'HONORARIOS'>('REPASSE');
  const [feePercentage, setFeePercentage] = React.useState(30);

  React.useEffect(() => {
    if (title?.origin === 'HONORARIOS_CONTRATUAIS' || title?.origin === 'SUCUMBENCIA') {
      setReceiptMode('HONORARIOS');
    } else {
      setReceiptMode('REPASSE');
    }
  }, [title]);

  if (!title || !client) return null;

  const paymentDate = title.paymentDate ? (title.paymentDate as any).toDate() : new Date();
  const grossValue = title.value;
  const feeValue = (grossValue * feePercentage) / 100;
  const netValue = grossValue - feeValue;

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl bg-slate-50 text-slate-900 p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Emissão de Recibo de Liquidação</DialogTitle>
          <DialogDescription>Documento oficial para prestação de contas com o cliente.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col lg:flex-row h-[90vh]">
          <div className="w-full lg:w-80 bg-slate-900 p-6 text-white shrink-0 print:hidden overflow-y-auto">
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Configurações do Recibo
                </h3>
                <p className="text-[10px] text-slate-400">Ajuste os valores para o cálculo da liquidação.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Modelo de Recibo</label>
                  <Select value={receiptMode} onValueChange={(v: any) => setReceiptMode(v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REPASSE">Repasse (Com Desconto)</SelectItem>
                      <SelectItem value="HONORARIOS">Apenas Honorários</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {receiptMode === 'REPASSE' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Honorários Contratuais (%)</label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={feePercentage} 
                          onChange={(e) => setFeePercentage(Number(e.target.value))}
                          className="bg-white/5 border-white/10 text-white pl-10 h-10"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">%</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">BRUTO:</span>
                        <span className="text-white">{formatCurrency(grossValue)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-rose-400">DESC. ({feePercentage}%):</span>
                        <span className="text-rose-400">-{formatCurrency(feeValue)}</span>
                      </div>
                      <Separator className="bg-primary/20" />
                      <div className="flex justify-between text-xs font-black">
                        <span className="text-primary">LÍQUIDO:</span>
                        <span className="text-primary">{formatCurrency(netValue)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8 space-y-4">
                <Button onClick={() => window.print()} className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20">
                  <Printer className="h-4 w-4 mr-2" /> Imprimir Recibo
                </Button>
                <DialogClose asChild>
                  <Button variant="ghost" className="w-full text-slate-400 hover:text-white text-[10px] font-bold uppercase">Fechar</Button>
                </DialogClose>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-white">
            <div className="p-12 min-h-full flex flex-col" id="receipt-print-area">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-900 p-2 rounded-xl print:bg-transparent">
                    <img src="/logo.png" alt="Bueno Gois" className="h-12 w-auto print:brightness-0" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Bueno Gois Advogados</h2>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1.5">Assessoria e Consultoria Jurídica</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-900 leading-none font-headline tracking-widest">RECIBO</div>
                  <div className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-tighter">ID OPERAÇÃO: {title.id.substring(0, 8).toUpperCase()}</div>
                </div>
              </div>

              <div className="flex-1 space-y-10">
                <div className="bg-slate-100 border-2 border-slate-200 p-8 rounded-3xl flex justify-between items-center">
                  <span className="text-sm font-black uppercase text-slate-500 tracking-widest">
                    {receiptMode === 'REPASSE' ? 'Valor Líquido da Liquidação' : 'Valor Total Recebido'}
                  </span>
                  <span className="text-4xl font-black text-slate-900">
                    {formatCurrency(receiptMode === 'REPASSE' ? netValue : grossValue)}
                  </span>
                </div>

                <div className="space-y-8 text-base leading-relaxed text-justify text-slate-800">
                  <p>
                    Recebemos de <strong className="text-slate-900 uppercase">Bueno Gois Advogados e Associados</strong>, 
                    inscrito sob o CNPJ <strong className="text-slate-900">12.345.678/0001-90</strong>, a importância supramencionada 
                    em favor de <strong className="text-slate-900 uppercase">{client.firstName} {client.lastName}</strong>, 
                    portador(a) do documento <strong className="text-slate-900">{client.document}</strong>.
                  </p>

                  {receiptMode === 'REPASSE' ? (
                    <div className="space-y-6">
                      <p>Referente à liquidação de valores no processo abaixo identificado, com a devida prestação de contas e desconto de honorários contratuais:</p>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase text-slate-500">Detalhamento da Liquidação</span>
                            <Badge variant="outline" className="border-slate-300 text-slate-600 text-[9px] font-black">EXTRATO</Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>(+) Valor Bruto Recebido (Acordo/Sentença)</span>
                              <span className="font-bold">{formatCurrency(grossValue)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-rose-600">
                              <span>(-) Honorários Advocatícios Contratuais ({feePercentage}%)</span>
                              <span className="font-bold">-{formatCurrency(feeValue)}</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between text-lg font-black text-slate-900">
                              <span>(=) VALOR LÍQUIDO DISPONIBILIZADO</span>
                              <span>{formatCurrency(netValue)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p>
                      Referente ao pagamento de <strong>Honorários Advocatícios</strong> por serviços prestados no acompanhamento 
                      do processo identificado abaixo, dando plena e total quitação pelo valor ora recebido.
                    </p>
                  )}
                  
                  {process && (
                    <div className="p-6 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-primary tracking-widest">Vínculo Processual</p>
                        <p className="font-bold text-base">{process.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">AUTOS Nº {process.processNumber || 'N/A'}</p>
                      </div>
                      <Scale className="h-10 w-10 text-white/10 shrink-0" />
                    </div>
                  )}

                  <p className="text-sm italic text-slate-500 border-l-4 border-slate-200 pl-4">
                    Pelo que firmo the presente recibo para que produza seus efeitos legais, dando plena, 
                    geral e irrevogável quitação do valor recebido nesta data.
                  </p>
                </div>

                <div className="pt-16 flex flex-col items-center gap-12">
                  <p className="text-sm font-bold text-slate-900">São Bernardo do Campo, {format(paymentDate || new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-20 w-full pt-10">
                    <div className="text-center space-y-2">
                      <div className="w-full border-t border-slate-900" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Bueno Gois Advogados</p>
                      <p className="text-[8px] text-slate-500 uppercase font-bold">Emitente / Outorgado</p>
                    </div>
                    <div className="text-center space-y-2">
                      <div className="w-full border-t border-slate-900" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{client.firstName} {client.lastName}</p>
                      <p className="text-[8px] text-slate-500 uppercase font-bold">Recebedor / Outorgante</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-20 pt-6 border-t border-slate-100 text-center space-y-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bueno Gois Advogados e Associados - OAB/SP 00.000</p>
                <p className="text-[8px] text-slate-400">Rua Marechal Deodoro, 1594 - Sala 2, São Bernardo do Campo / SP - (11) 98059-0128</p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TitleFormDialog({ 
  open, 
  onOpenChange, 
  title, 
  onSuccess,
  defaultDate,
}: { 
  open: boolean; 
  onOpenChange: (o: boolean) => void; 
  title?: FinancialTitle | null; 
  onSuccess: () => void;
  defaultDate?: string;
}) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [processSearch, setProcessSearch] = React.useState('');
  const [processResults, setProcessResults] = React.useState<Process[]>([]);
  const [isSearchingProcess, setIsSearchingProcess] = React.useState(false);
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const isEdit = !!title;

  const form = useForm<z.infer<typeof titleFormSchema>>({
    resolver: zodResolver(titleFormSchema),
    defaultValues: {
      description: '',
      type: 'RECEITA',
      origin: 'OUTRAS_DESPESAS',
      status: 'PENDENTE',
      value: 0,
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      competenceDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'PIX',
      beneficiaryName: '',
      beneficiaryDocument: '',
      notes: '',
      processId: '',
      clientId: '',
      category: '',
      subcategory: '',
      recurring: false,
      months: 1,
    }
  });

  React.useEffect(() => {
    if (open && title) {
      let dateVal: Date;
      if (title.dueDate instanceof Timestamp) {
        dateVal = title.dueDate.toDate();
      } else if (title.dueDate && typeof title.dueDate === 'object' && 'seconds' in title.dueDate) {
        dateVal = new Date((title.dueDate as any).seconds * 1000);
      } else {
        dateVal = new Date(title.dueDate as any);
      }

      const competenceVal = title.competenceDate ? (title.competenceDate instanceof Timestamp ? title.competenceDate.toDate() : new Date(title.competenceDate)) : null;

      form.reset({
        description: title.description || '',
        type: title.type || 'RECEITA',
        origin: title.origin as any || 'OUTRAS_DESPESAS',
        status: title.status || 'PENDENTE',
        value: title.value || 0,
        dueDate: format(dateVal, 'yyyy-MM-dd'),
        competenceDate: competenceVal ? format(competenceVal, 'yyyy-MM-dd') : format(dateVal, 'yyyy-MM-dd'),
        paymentMethod: title.paymentMethod || 'PIX',
        beneficiaryName: title.beneficiaryName || '',
        beneficiaryDocument: title.beneficiaryDocument || '',
        notes: title.notes || '',
        processId: title.processId || '',
        clientId: title.clientId || '',
        category: title.category || '',
        subcategory: title.subcategory || '',
        recurring: false,
        months: 1
      });
      
      if (title.processId && firestore) {
        getDocs(query(collection(firestore, 'processes'), where('id', '==', title.processId), limit(1)))
          .then(snap => {
            if (!snap.empty) setSelectedProcess({ id: snap.docs[0].id, ...snap.docs[0].data() } as Process);
          });
      }
    } else if (open && !title) {
      form.reset({
        description: '',
        type: 'RECEITA',
        origin: 'OUTRAS_DESPESAS',
        status: 'PENDENTE',
        value: 0,
        dueDate: defaultDate || format(new Date(), 'yyyy-MM-dd'),
        competenceDate: defaultDate || format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: 'PIX',
        beneficiaryName: '',
        beneficiaryDocument: '',
        notes: '',
        processId: '',
        clientId: '',
        category: '',
        subcategory: '',
        recurring: false,
        months: 1
      });
      setSelectedProcess(null);
    }
  }, [open, title, form, firestore, defaultDate]);

  React.useEffect(() => {
    if (processSearch.length < 2) {
      setProcessResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingProcess(true);
      try {
        const results = await searchProcesses(processSearch);
        setProcessResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingProcess(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [processSearch]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: number) => void) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = Number(rawValue) / 100;
    onChange(numericValue);
  };

  const formatCurrencyValue = (value: number) => {
    if (typeof value !== 'number') return '0,00';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const onSubmit = async (values: z.infer<typeof titleFormSchema>) => {
    setIsSaving(true);
    try {
      const payload: any = {
        ...values,
        dueDate: new Date(values.dueDate + 'T12:00:00'),
        competenceDate: values.competenceDate ? new Date(values.competenceDate + 'T12:00:00') : null,
        processId: selectedProcess?.id || '',
        clientId: selectedProcess?.clientId || '',
      };

      if (isEdit && title) {
        await updateFinancialTitle(title.id, payload);
        toast({ title: 'Lançamento Atualizado!' });
      } else {
        await createFinancialTitle(payload);
        toast({ title: values.recurring ? 'Lançamentos Recorrentes Criados!' : 'Lançamento realizado!' });
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao Lançar', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[#020617] border-white/10 h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <DialogTitle className="text-xl font-black font-headline text-white uppercase tracking-tight">
            {isEdit ? 'Editar Título Financeiro' : 'Novo Título Financeiro'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isEdit ? 'Ajuste os dados do lançamento selecionado.' : 'Lançamento manual de entrada ou saída para controle de caixa.'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Form {...form}>
              <form id="title-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tipo de Operação *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 h-11 focus:border-primary transition-all">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                            <SelectItem value="RECEITA">💰 Entrada (Receita)</SelectItem>
                            <SelectItem value="DESPESA">💸 Saída (Despesa)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="origin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Categoria / Origem *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 h-11 focus:border-primary transition-all">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white max-h-[400px]">
                            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground p-2">Escritório (Fixos)</DropdownMenuLabel>
                            <SelectItem value="ALUGUEL_CONTAS">🏢 Aluguel / Contas de Consumo</SelectItem>
                            <SelectItem value="SALARIOS_PROLABORE">👨‍⚖️ Salários / Pró-Labore</SelectItem>
                            <SelectItem value="INFRAESTRUTURA_TI">💻 TI / Software / Cloud</SelectItem>
                            <SelectItem value="MATERIAL_ESCRITORIO">📦 Material de Escritório</SelectItem>
                            <SelectItem value="IMPOSTOS_TAXAS">🏛️ Impostos e Taxas</SelectItem>
                            
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground p-2">Jurídico (Variáveis)</DropdownMenuLabel>
                            <SelectItem value="HONORARIOS_CONTRATUAIS">⚖️ Honorários Contratuais</SelectItem>
                            <SelectItem value="SUCUMBENCIA">🏆 Honorários de Sucumbência</SelectItem>
                            <SelectItem value="ACORDO">🤝 Acordo / Liquidação</SelectItem>
                            <SelectItem value="CUSTAS_PROCESSUAIS">📄 Custas Judiciais</SelectItem>
                            <SelectItem value="PERICIA">🔍 Perícia Técnica</SelectItem>
                            <SelectItem value="DESLOCAMENTO">🚗 Deslocamento/Diligência</SelectItem>
                            <SelectItem value="SERVICOS_TERCEIROS">🤝 Serviços de Terceiros</SelectItem>
                            
                            <DropdownMenuSeparator className="bg-white/5" />
                            <SelectItem value="OUTRAS_DESPESAS">📦 Outras Operações</SelectItem>
                            <SelectItem value="ADICIONAL">➕ Adicional / Extra</SelectItem>
                            <SelectItem value="ALVARA">📜 Alvará Judicial</SelectItem>
                            <SelectItem value="TRANSFERENCIAS_JUDICIAIS">🏦 Transf. Judiciais</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Grupo de Contas</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 h-11 focus:border-primary transition-all rounded-xl">
                              <SelectValue placeholder="Selecione Categoria..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                            {Object.entries(form.watch('type') === 'RECEITA' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES).map(([key, cat]) => (
                                <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Subcategoria Legal</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!form.watch('category')}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 h-11 focus:border-primary transition-all rounded-xl">
                              <SelectValue placeholder="Selecione Subcategoria..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                            {((form.watch('type') === 'RECEITA' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES) as any)[form.watch('category') as string]?.subcategories.map((sub: string) => (
                                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="beneficiaryName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Favorecido / Beneficiário</FormLabel>
                        <FormControl>
                          <Input className="h-11 bg-black/40 border-white/10 rounded-xl" placeholder="Nome do favorecido..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Meio de Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 h-11 rounded-xl">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                            <SelectItem value="PIX">PIX (Instantâneo)</SelectItem>
                            <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                            <SelectItem value="TRANSFERENCIA">Transferência / TED</SelectItem>
                            <SelectItem value="CARTAO">Cartão de Crédito</SelectItem>
                            <SelectItem value="DINHEIRO">Espécie (Dinheiro)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Descrição detalhada do Título *</FormLabel>
                      <FormControl>
                        <Input className="h-12 bg-black/40 border-white/10 rounded-xl font-bold" placeholder="Ex: Honorários Contratuais - Processo X" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <FolderKanban className="h-3.5 w-3.5 text-primary" /> Vínculo Processual (Opcional)
                  </FormLabel>
                  {selectedProcess ? (
                    <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 animate-in zoom-in-95">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                          <Scale className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white truncate">{selectedProcess.name}</p>
                          <p className="text-[10px] text-primary/60 font-mono tracking-widest">{selectedProcess.processNumber || 'Sem Nº CNJ'}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-white rounded-xl" onClick={() => setSelectedProcess(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input 
                        className="bg-black/40 border-white/10 pl-10 h-12 rounded-xl focus:border-primary transition-all text-sm" 
                        placeholder="Pesquisar processo para vincular..." 
                        value={processSearch}
                        onChange={(e) => setProcessSearch(e.target.value)}
                      />
                      {isSearchingProcess && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                      {processResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                          <ScrollArea className="max-h-[250px]">
                            {processResults.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-left p-4 hover:bg-white/5 transition-all border-b border-white/5 last:border-0 group"
                                onClick={() => {
                                  setSelectedProcess(p);
                                  setProcessResults([]);
                                  setProcessSearch('');
                                }}
                              >
                                <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">{p.processNumber || 'Nº não informado'}</p>
                              </button>
                            ))}
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
                   <FormField
                    control={form.control}
                    name="competenceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mês de Competência</FormLabel>
                        <FormControl>
                          <Input type="date" className="bg-transparent border-white/10 h-10 text-white rounded-xl" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status Inicial</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-transparent border-white/10 h-10 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10">
                            <SelectItem value="PENDENTE">⏳ Aguardando</SelectItem>
                            <SelectItem value="PAGO">✅ Liquidado</SelectItem>
                            <SelectItem value="ATRASADO">🔴 Vencido</SelectItem>
                            <SelectItem value="CANCELADO">🚫 Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl bg-primary/5 border-2 border-primary/20 shadow-lg shadow-primary/5">
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Valor do Título (R$) *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-black text-sm">R$</span>
                            <Input 
                              className="bg-black/40 border-primary/20 pl-10 h-12 text-lg font-black text-white rounded-xl focus:border-primary shadow-inner" 
                              type="text"
                              value={formatCurrencyValue(field.value)}
                              onChange={(e) => handleValueChange(e, field.onChange)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vencimento da Parcela *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input type="date" className="bg-black/40 border-white/10 h-12 pl-10 text-white rounded-xl" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Observações Internas (Opcional)</FormLabel>
                      <FormControl>
                        <Input className="h-20 bg-black/40 border-white/10 rounded-xl text-xs py-2" placeholder="Notas sobre este lançamento..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!isEdit && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/10">
                      <div className="space-y-0.5">
                        <FormLabel className="text-white font-black text-sm">Habilitar Recorrência?</FormLabel>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">O sistema gerará os próximos meses automaticamente</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="recurring"
                        render={({ field }) => (
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                              className="data-[state=checked]:bg-primary"
                            />
                          </FormControl>
                        )}
                      />
                    </div>

                    {form.watch('recurring') && (
                      <FormField
                        control={form.control}
                        name="months"
                        render={({ field }) => (
                          <FormItem className="animate-in slide-in-from-top-2 duration-500 bg-black/40 p-6 rounded-2xl border border-primary/20 shadow-inner">
                            <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                              <CalendarDays className="h-4 w-4" /> Duração da Recorrência (Meses)
                            </FormLabel>
                            <FormControl>
                              <div className="relative pt-2">
                                <Input 
                                  type="number" 
                                  min="2" 
                                  max="24" 
                                  className="h-12 bg-[#020617] border-primary/30 text-white text-lg font-black text-center pr-12" 
                                  {...field} 
                                />
                                <span className="absolute right-4 top-[60%] -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase">Meses</span>
                              </div>
                            </FormControl>
                            <div className="flex items-start gap-2 mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                              <Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <p className="text-[10px] text-slate-300 leading-relaxed uppercase font-bold">
                                A inteligência financeira criará lançamentos automáticos com vencimentos escalonados.
                              </p>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
              </form>
            </Form>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 gap-3">
          <DialogClose asChild>
            <Button variant="ghost" type="button" className="text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12">
              Cancelar
            </Button>
          </DialogClose>
          <Button 
            type="submit" 
            form="title-form" 
            disabled={isSaving} 
            className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {isEdit ? 'Salvar Alterações' : 'Confirmar Lançamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FinanceiroPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const [selectedReceiptTitle, setSelectedReceiptTitle] = React.useState<FinancialTitle | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [titleToEdit, setTitleToEdit] = React.useState<FinancialTitle | null>(null);
  const [titleToDelete, setTitleToEditDelete] = React.useState<FinancialTitle | null>(null);
  
  const { toast } = useToast();
  const now = React.useMemo(() => startOfDay(new Date()), []);

  const titlesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'asc'), limit(300)) : null), [firestore, refreshKey]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'clients'), limit(100)) : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const processesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'processes'), limit(100)) : null, [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);
  
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([
    { id: '1', name: 'Conta Principal', bankName: 'Itaú Personalité', type: 'CORRENTE', balance: 45280.50, color: '#ec4899', isActive: true },
    { id: '2', name: 'Reserva de Lucros', bankName: 'XP Investimentos', type: 'INVESTIMENTO', balance: 128400.00, color: '#f5d030', isActive: true },
    { id: '3', name: 'Caixa Pequeno', bankName: 'Caixa Interno', type: 'CORRENTE', balance: 1200.00, color: '#10b981', isActive: true },
  ]);

  const stats = React.useMemo(() => {
    if (!titlesData) return { totalReceitas: 0, totalDespesas: 0, pendenteReceita: 0, pendenteDespesa: 0, officeRevenue: 0 };
    return titlesData.reduce((acc, t) => {
      const val = t.value || 0;
      if (t.type === 'RECEITA') {
        if (t.status === 'PAGO') {
          acc.totalReceitas += val;
          acc.officeRevenue += (val * 0.3); 
        } else {
          acc.pendenteReceita += val;
        }
      } else {
        if (t.status === 'PAGO') acc.totalDespesas += val;
        else acc.pendenteDespesa += val;
      }
      return acc;
    }, { totalReceitas: 0, totalDespesas: 0, pendenteReceita: 0, pendenteDespesa: 0, officeRevenue: 0 });
  }, [titlesData]);

  const chartData = React.useMemo(() => {
    if (!titlesData) return [];
    const months: Record<string, { month: string, receita: number, despesa: number }> = {};
    
    titlesData.forEach(t => {
      const date = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate);
      const monthKey = format(date, 'MMM/yy', { locale: ptBR });
      if (!months[monthKey]) months[monthKey] = { month: monthKey, receita: 0, despesa: 0 };
      
      if (t.status === 'PAGO') {
        if (t.type === 'RECEITA') months[monthKey].receita += t.value;
        else months[monthKey].despesa += t.value;
      }
    });

    return Object.values(months).slice(-6);
  }, [titlesData]);

  const groupedReceitas = React.useMemo(() => {
    if (!titlesData) return [];
    const q = searchTerm.toLowerCase();
    const currentDate = startOfDay(new Date());
    
    const filtered = titlesData.filter(t => 
      t.type === 'RECEITA' && (
        t.description.toLowerCase().includes(q) ||
        processesMap.get(t.processId || '')?.name.toLowerCase().includes(q)
      )
    );

    const groups: Record<string, { process?: Process, titles: FinancialTitle[], total: number, paid: number, pending: number, hasOverdue: boolean }> = {};
    
    filtered.forEach(t => {
      const key = t.processId || 'standalone';
      if (!groups[key]) {
        groups[key] = { 
          process: t.processId ? processesMap.get(t.processId) : undefined, 
          titles: [], 
          total: 0, 
          paid: 0, 
          pending: 0,
          hasOverdue: false
        };
      }
      
      const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : (t.dueDate && typeof t.dueDate === 'object' && 'seconds' in t.dueDate) ? new Date((t.dueDate as any).seconds * 1000) : new Date(t.dueDate as any);
      const isOverdue = t.status !== 'PAGO' && isBefore(dueDate, currentDate);
      if (isOverdue) groups[key].hasOverdue = true;

      groups[key].titles.push(t);
      groups[key].total += t.value;
      if (t.status === 'PAGO') groups[key].paid += t.value;
      else groups[key].pending += t.value;
    });
    
    return Object.entries(groups).sort((a, b) => {
      if (a[1].hasOverdue && !b[1].hasOverdue) return -1;
      if (!a[1].hasOverdue && b[1].hasOverdue) return 1;
      if (a[0] === 'standalone') return 1;
      if (b[0] === 'standalone') return -1;
      return (b[1].titles[0]?.dueDate as any)?.seconds - (a[1].titles[0]?.dueDate as any)?.seconds;
    });
  }, [titlesData, searchTerm, processesMap]);

  const handleUpdateStatus = async (id: string, status: 'PAGO' | 'PENDENTE') => {
    setIsProcessing(id);
    try {
      await updateFinancialTitleStatus(id, status);
      toast({ title: `Título marcado como ${status.toLowerCase()}!` });
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRunLateRoutine = async (title: FinancialTitle) => {
    setIsProcessing(title.id);
    try {
      await processLatePaymentRoutine(title.id);
      toast({ title: 'Rotina de Inadimplência Iniciada!', description: 'O atraso foi registrado no processo e o advogado notificado.' });
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro na Rotina', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteTitle = async () => {
    if (!titleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteFinancialTitle(titleToDelete.id);
      toast({ title: 'Lançamento excluído com sucesso!' });
      setRefreshKey(k => k + 1);
      setTitleToEditDelete(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleGroup = (id: string) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedGroups(next);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isLoading = isUserLoading || isLoadingTitles;

  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <H1 className="text-white">Financeiro</H1>
          <p className="text-sm text-muted-foreground">Controle estratégico de faturamento e despesas operacionais.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full max-sm:w-full max-w-sm print:hidden">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar lançamentos..." 
              className="pl-8 bg-[#0f172a] border-border/50 text-white h-10" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <Button variant="outline" className="border-primary/20 text-primary h-10" asChild>
            <Link href="/dashboard/repasses">
              <Wallet className="mr-2 h-4 w-4" /> Ir para Repasses & Folha
            </Link>
          </Button>
          <Button 
            className="gap-2 bg-primary text-primary-foreground font-bold h-10 px-6 shadow-lg shadow-primary/20"
            onClick={() => { setTitleToEdit(null); setIsFormOpen(true); }}
          >
            <PlusCircle className="h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/20 border-2 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3 opacity-10"><Scale className="h-12 w-12" /></div>
              <CardHeader className="p-4 pb-1"><CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest">Lucro Operacional (30%)</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-primary tabular-nums">{formatCurrency(stats.officeRevenue)}</p></CardContent>
            </Card>
            <Card className="bg-emerald-500/5 border-emerald-500/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3 opacity-10"><ArrowUpRight className="h-12 w-12" /></div>
              <CardHeader className="p-4 pb-1"><CardTitle className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Realizado (Receitas)</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-emerald-400 tabular-nums">{formatCurrency(stats.totalReceitas)}</p></CardContent>
            </Card>
            <Card className="bg-rose-500/5 border-rose-500/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3 opacity-10"><ArrowDownRight className="h-12 w-12" /></div>
              <CardHeader className="p-4 pb-1"><CardTitle className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Realizado (Saídas)</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-rose-400 tabular-nums">{formatCurrency(stats.totalDespesas)}</p></CardContent>
            </Card>
            <Card className="bg-amber-500/5 border-amber-500/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3 opacity-10"><Clock className="h-12 w-12" /></div>
              <CardHeader className="p-4 pb-1"><CardTitle className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Provisionado (Entrada)</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-amber-400 tabular-nums">{formatCurrency(stats.pendenteReceita)}</p></CardContent>
            </Card>
          </div>

          <Card className="bg-[#0f172a] border-white/5 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Fluxo de Caixa Realizado</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Demonstrativo dos últimos 6 meses de operação</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-primary" /><span className="text-[9px] font-black uppercase text-slate-400">Receitas</span></div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-500" /><span className="text-[9px] font-black uppercase text-slate-400">Despesas</span></div>
              </div>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="month" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="receita" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorReceita)" />
                  <Area type="monotone" dataKey="despesa" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesa)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
            <CardHeader className="p-5 border-b border-white/5 bg-white/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" /> Disponibilidade Bancária
                </CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase h-5">Tempo Real</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {bankAccounts.map(account => (
                  <div key={account.id} className="p-5 flex items-center justify-between group hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center border border-white/10 shrink-0" style={{ backgroundColor: `${account.color}10`, color: account.color }}>
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{account.name}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{account.bankName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white tabular-nums">{formatCurrency(account.balance)}</p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase">{account.type}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-5 bg-black/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Patrimônio Líquido</span>
                  <span className="text-lg font-black text-primary">
                    {formatCurrency(bankAccounts.reduce((acc, a) => acc + a.balance, 0))}
                  </span>
                </div>
                <Button variant="ghost" className="w-full text-primary hover:text-primary/80 text-[10px] font-bold uppercase h-9 group">
                  Gerenciar Contas <ArrowUpRight className="ml-2 h-3 w-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/5 border-primary/20 border-2 p-5 text-center space-y-4">
              <PieChart className="h-8 w-8 text-primary mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-black text-white uppercase tracking-tighter">Meta Mensal Bueno Gois</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Atingimos 65% da faturamento planejado para Março.</p>
              </div>
              <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-full w-[65%] rounded-full shadow-[0_0_10px_rgba(245,208,48,0.5)]" />
              </div>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="receitas" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-[#0f172a] border border-white/5 rounded-lg p-1 gap-1 h-12">
            <TabsTrigger value="receitas" className="rounded-md data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 font-bold h-10">
              <ArrowUpRight className="h-4 w-4 mr-2" /> Contas a Receber
            </TabsTrigger>
            <TabsTrigger value="despesas" className="rounded-md data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 font-bold h-10">
              <ArrowDownRight className="h-4 w-4 mr-2" /> Contas a Pagar
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="rounded-md data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 font-bold h-10">
              <BarChart3 className="h-4 w-4 mr-2" /> Painel BI
            </TabsTrigger>
        </TabsList>
        <TabsContent value="receitas" className="flex-1 mt-4 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full bg-[#0f172a] rounded-2xl" />)
          ) : groupedReceitas.map(([key, group]) => (
            <Card key={key} className={cn(
              "bg-[#0f172a] border-white/5 overflow-hidden group/card hover:border-primary/20 transition-all duration-300",
              group.hasOverdue && "border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.05)]"
            )}>
              <div 
                className="p-5 flex items-center justify-between cursor-pointer"
                onClick={() => toggleGroup(key)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                    group.hasOverdue ? "bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse" :
                    group.pending > 0 ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : 
                    "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  )}>
                    {group.hasOverdue ? <AlertTriangle className="h-6 w-6" /> : group.process ? <FolderKanban className="h-6 w-6" /> : <LayoutList className="h-6 w-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base leading-tight">
                        {group.process ? group.process.name : 'Lançamentos Avulsos'}
                      </h3>
                      {group.hasOverdue && (
                        <Badge className="bg-rose-600 text-white font-black text-[8px] uppercase tracking-widest h-4">🚨 Inadimplência</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{group.titles.length} Títulos vinculados</span>
                      {group.process?.processNumber && <span className="text-[10px] font-mono text-primary/60">{group.process.processNumber}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-right hidden md:block">
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">Total do Caso</p>
                    <p className="text-sm font-black text-white">{formatCurrency(group.total)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase text-emerald-500 tracking-tighter">Recebido (Bruto)</p>
                    <p className="text-sm font-black text-emerald-400">{formatCurrency(group.paid)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase text-primary tracking-tighter">Honorários (30%)</p>
                    <p className="text-sm font-black text-primary">{formatCurrency(group.paid * 0.3)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-white/20">
                    {expandedGroups.has(key) ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              {expandedGroups.has(key) && (
                <div className="border-t border-white/5 bg-black/20 animate-in slide-in-from-top-2 duration-300">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 px-6">Descrição / Subcategoria</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500">Agrupamento</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500">Vencimento</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 text-center">Status</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 text-right">Valor Bruto</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 text-right px-6">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.titles.map(t => {
                        const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : (t.dueDate && typeof t.dueDate === 'object' && 'seconds' in t.dueDate) ? new Date((t.dueDate as any).seconds * 1000) : new Date(t.dueDate as any);
                        const isOverdue = t.status !== 'PAGO' && isBefore(dueDate, now);
                        return (
                          <TableRow key={t.id} className={cn(
                            "border-white/5 hover:bg-white/5 transition-colors",
                            isOverdue && "bg-rose-500/[0.03]"
                          )}>
                            <TableCell className="px-6">
                              <div>
                                <span className={cn("font-bold text-xs block", isOverdue ? "text-rose-400" : "text-slate-200")}>{t.description}</span>
                                {t.subcategory && <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter block mt-0.5">{t.subcategory}</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[8px] font-black uppercase border-white/5 bg-white/5 text-slate-400">
                                {t.category ? (REVENUE_CATEGORIES[t.category as keyof typeof REVENUE_CATEGORIES]?.label || t.category) : 'Geral'}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("text-[10px] font-mono", isOverdue ? "text-rose-500 font-black" : "text-slate-400")}>
                              {format(dueDate, 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={cn(
                                "text-[8px] font-black uppercase h-5 px-2 border-none",
                                t.status === 'PAGO' ? 'bg-emerald-500/20 text-emerald-400' : 
                                isOverdue ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-400'
                              )}>
                                {isOverdue ? 'VENCIDO' : t.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-black text-white text-xs tabular-nums">
                              {formatCurrency(t.value)}
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <div className="flex justify-end gap-2">
                                {isOverdue && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 rounded-full animate-pulse">
                                        <Flame className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-card border-border shadow-2xl p-1 w-64">
                                      <DropdownMenuLabel className="text-[9px] font-black uppercase text-rose-500 px-2 py-1.5 tracking-widest">Rotina de Inadimplência</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => handleRunLateRoutine(t)} className="gap-2 cursor-pointer focus:bg-rose-500/10">
                                        <History className="h-4 w-4 text-rose-500" /> <span className="font-bold">Registrar no Processo</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          const phone = clientsMap.get(t.clientId || '')?.mobile?.replace(/\D/g, '');
                                          if (phone) window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá! Notamos um atraso no pagamento da parcela "${t.description}". Poderia nos enviar o comprovante?`)}`, '_blank');
                                        }} 
                                        className="gap-2 cursor-pointer focus:bg-emerald-500/10"
                                      >
                                        <MessageSquare className="h-4 w-4 text-emerald-500" /> <span className="font-bold">Notificar Cliente</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="bg-white/5" />
                                      <DropdownMenuItem onClick={() => {}} className="gap-2 cursor-pointer focus:bg-primary/10">
                                        <Gavel className="h-4 w-4 text-primary" /> <span className="font-bold">Iniciar Execução</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                {t.status === 'PAGO' && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-primary hover:bg-primary/10 rounded-full"
                                    onClick={() => { setSelectedReceiptTitle(t); setIsReceiptOpen(true); }}
                                    title="Emitir Recibo"
                                  >
                                    <Receipt className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white rounded-full">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-card border-border shadow-2xl p-1">
                                    {t.status !== 'PAGO' ? (
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(t.id, 'PAGO')} className="gap-2 cursor-pointer focus:bg-emerald-500/10">
                                        <Check className="h-4 w-4 text-emerald-500" /> <span className="font-bold">Marcar Recebido</span>
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(t.id, 'PENDENTE')} className="gap-2 cursor-pointer focus:bg-amber-500/10">
                                        <RefreshCw className="h-4 w-4 text-amber-500" /> <span className="font-bold text-amber-500">Estornar</span>
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator className="bg-white/5" />
                                    <DropdownMenuItem onClick={() => { setTitleToEdit(t); setIsFormOpen(true); }} className="gap-2 cursor-pointer">
                                      <Edit className="h-4 w-4 text-blue-400" /> <span className="font-bold">Editar</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTitleToEditDelete(t)} className="gap-2 cursor-pointer text-rose-500 focus:bg-rose-500/10">
                                      <Trash2 className="h-4 w-4" /> <span className="font-bold">Excluir</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          ))}
          {groupedReceitas.length === 0 && !isLoading && (
            <div className="text-center py-20 bg-[#0f172a] rounded-3xl border-2 border-dashed border-white/5 opacity-40">
              <Calculator className="h-12 w-12 mx-auto mb-4" />
              <p className="font-bold text-white uppercase tracking-widest text-[10px]">Nenhuma receita encontrada</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="despesas" className="flex-1 mt-4">
          <Card className="bg-[#0f172a] border-white/5 overflow-hidden shadow-xl">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-black uppercase text-[10px] px-6">Descrição / Subcategoria</TableHead>
                  <TableHead className="text-muted-foreground font-black uppercase text-[10px]">Agrupamento</TableHead>
                  <TableHead className="text-muted-foreground font-black uppercase text-[10px]">Vencimento</TableHead>
                  <TableHead className="text-center text-muted-foreground font-black uppercase text-[10px]">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground font-black uppercase text-[10px]">Valor</TableHead>
                  <TableHead className="text-right text-muted-foreground font-black uppercase text-[10px] px-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full bg-white/5" /></TableCell></TableRow>
                  ))
                ) : (titlesData?.filter(t => t.type === 'DESPESA').map(t => {
                  const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : (t.dueDate && typeof t.dueDate === 'object' && 'seconds' in t.dueDate) ? new Date((t.dueDate as any).seconds * 1000) : new Date(t.dueDate as any);
                  const isOverdue = t.status !== 'PAGO' && isBefore(dueDate, now);
                  return (
                    <TableRow key={t.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="px-6">
                        <div>
                          <p className="font-bold text-white text-sm">{t.description}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1 flex items-center gap-2">
                            {t.subcategory && <span className="text-primary/70">{t.subcategory}</span>}
                            <span>• {t.beneficiaryName || 'Sem favorecido'}</span>
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[8px] font-black uppercase border-white/5 bg-white/5 text-slate-400">
                          {t.category ? (EXPENSE_CATEGORIES[t.category as keyof typeof EXPENSE_CATEGORIES]?.label || t.category) : 'Outros'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 font-mono">
                        {format(dueDate, 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase px-2 h-6 border-none", 
                          t.status === 'PAGO' ? 'bg-emerald-500/20 text-emerald-400' : 
                          isOverdue ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-400'
                        )}>
                          {isOverdue ? 'VENCIDO' : t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-rose-400 text-sm tabular-nums">
                        {formatCurrency(t.value)}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/30 hover:text-white rounded-full">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border p-1">
                            {t.status !== 'PAGO' ? (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(t.id, 'PAGO')} className="gap-2 cursor-pointer focus:bg-emerald-500/10">
                                <Check className="mr-2 h-4 w-4 text-emerald-500" /> <span className="font-bold">Confirmar Saída</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(t.id, 'PENDENTE')} className="gap-2 cursor-pointer focus:bg-amber-500/10">
                                <RefreshCw className="mr-2 h-4 w-4 text-amber-500" /> <span className="font-bold">Estornar Saída</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={() => { setTitleToEdit(t); setIsFormOpen(true); }} className="gap-2 cursor-pointer">
                              <Edit className="h-4 w-4 text-blue-400" /> <span className="font-bold">Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTitleToEditDelete(t)} className="gap-2 cursor-pointer text-rose-500 focus:bg-rose-500/10">
                              <Trash2 className="h-4 w-4" /> <span className="font-bold">Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                }))}

              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="relatorios" className="flex-1 mt-4">
          <Card className="bg-[#0f172a] border-white/5 p-12 text-center rounded-3xl border-2 border-dashed border-white/10 opacity-60">
            <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2">Relatórios Gerenciais de Elite</h3>
            <p className="text-muted-foreground text-xs font-medium mb-6 max-w-sm mx-auto">Acesse a página de BI para análise completa de faturamento, lucro líquido e produtividade da equipe.</p>
            <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/10 font-bold px-8 h-11" asChild>
              <Link href="/dashboard/relatorios">Acessar Painel BI <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      <TitleFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        title={titleToEdit}
        onSuccess={() => setRefreshKey(k => k + 1)} 
      />

      <ClientReceiptDialog 
        title={selectedReceiptTitle}
        client={selectedReceiptTitle ? clientsMap.get(selectedReceiptTitle.clientId || '') || null : null}
        process={selectedReceiptTitle ? processesMap.get(selectedReceiptTitle.processId || '') || null : null}
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
      />

      <AlertDialog open={!!titleToDelete} onOpenChange={(o) => !o && setTitleToEditDelete(null)}>
        <AlertDialogContent className="bg-[#0f172a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja remover este lançamento? Esta ação é irreversível e afetará os cálculos de faturamento do escritório.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="bg-transparent border-white/10 text-slate-400">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTitle} disabled={isDeleting} className="bg-rose-600 text-white hover:bg-rose-700 border-none font-bold">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
