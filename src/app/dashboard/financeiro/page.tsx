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
  ShieldCheck
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy, deleteDoc, doc, getDocs, where, limit } from 'firebase/firestore';
import type { FinancialTitle, Staff, Client, Process } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
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
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createFinancialTitle, updateFinancialTitleStatus, processLatePaymentRoutine } from '@/lib/finance-actions';
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
import { searchProcesses } from '@/lib/process-actions';

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
  ]),
  value: z.coerce.number().positive('Valor deve ser positivo'),
  dueDate: z.string().min(1, 'Data de vencimento obrigatória'),
  status: z.enum(['PENDENTE', 'PAGO', 'ATRASADO']).default('PENDENTE'),
  processId: z.string().optional(),
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

function NewTitleDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [processSearch, setProcessSearch] = React.useState('');
  const [processResults, setProcessResults] = React.useState<Process[]>([]);
  const [isSearchingProcess, setIsSearchingProcess] = React.useState(false);
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof titleFormSchema>>({
    resolver: zodResolver(titleFormSchema),
    defaultValues: {
      type: 'RECEITA',
      status: 'PENDENTE',
      value: 0,
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      processId: '',
      recurring: false,
      months: 1,
    }
  });

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
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const onSubmit = async (values: z.infer<typeof titleFormSchema>) => {
    setIsSaving(true);
    try {
      await createFinancialTitle({
        ...values,
        processId: selectedProcess?.id || undefined,
      });
      toast({ title: values.recurring ? 'Lançamentos Recorrentes Criados!' : 'Lançamento realizado!' });
      form.reset();
      setSelectedProcess(null);
      setProcessSearch('');
      onCreated();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) {
        setSelectedProcess(null);
        setProcessSearch('');
        form.reset();
      }
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground font-bold h-10 px-6 shadow-lg shadow-primary/20">
          <PlusCircle className="h-4 w-4" />
          Novo Lançamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl bg-[#020617] border-white/10 h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <DialogTitle className="text-xl font-black font-headline text-white">Novo Título Financeiro</DialogTitle>
          <DialogDescription className="text-slate-400">Lançamento manual de entrada ou saída para controle de caixa.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          <Form {...form}>
            <form id="new-title-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tipo de Operação *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-black/40 border-white/10 h-11 focus:border-primary transition-all">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                          <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground p-2">Escritório (Fixos)</DropdownMenuLabel>
                          <SelectItem value="ALUGUEL_CONTAS">🏢 Aluguel / Contas de Consumo</SelectItem>
                          <SelectItem value="SALARIOS_PROLABORE">👨‍⚖️ Salários / Pró-Labore</SelectItem>
                          <SelectItem value="INFRAESTRUTURA_TI">💻 TI / Software / Cloud</SelectItem>
                          
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground p-2">Jurídico (Variáveis)</DropdownMenuLabel>
                          <SelectItem value="HONORARIOS_CONTRATUAIS">⚖️ Honorários Contratuais</SelectItem>
                          <SelectItem value="SUCUMBENCIA">🏆 Honorários de Sucumbência</SelectItem>
                          <SelectItem value="ACORDO">🤝 Acordo / Liquidação</SelectItem>
                          <SelectItem value="CUSTAS_PROCESSUAIS">📄 Custas Judiciais</SelectItem>
                          
                          <DropdownMenuSeparator className="bg-white/5" />
                          <SelectItem value="OUTRAS_DESPESAS">📦 Outras Operações</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

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
                      <div className="min-w-0">
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
                      className="bg-black/40 border-white/10 pl-10 h-12 rounded-xl focus:border-primary transition-all" 
                      placeholder="Pesquisar processo para vincular..." 
                      value={processSearch}
                      onChange={(e) => setProcessSearch(e.target.value)}
                    />
                    {isSearchingProcess && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                    {processResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Descrição do Lançamento *</FormLabel>
                    <FormControl>
                      <Input className="h-12 bg-black/40 border-white/10 rounded-xl font-bold" placeholder="Ex: Honorários Contratuais 1ª Instância" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl bg-primary/5 border-2 border-primary/20">
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
                            className="bg-black/40 border-primary/20 pl-10 h-12 text-lg font-black text-white rounded-xl focus:border-primary" 
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

              {/* Seção de Recorrência */}
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
                        <p className="text-[10px] text-slate-500 italic mt-2">Serão gerados {field.value} títulos idênticos com vencimentos mensais.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 gap-3">
          <DialogClose asChild>
            <Button variant="ghost" type="button" className="text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12">
              Cancelar
            </Button>
          </DialogClose>
          <Button 
            type="submit" 
            form="new-title-form" 
            disabled={isSaving} 
            className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Confirmar Lançamento
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
  const { toast } = useToast();

  const titlesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'asc'), limit(300)) : null), [firestore, refreshKey]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'clients'), limit(100)) : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const processesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'processes'), limit(100)) : null), [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);
  
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

  const groupedReceitas = React.useMemo(() => {
    if (!titlesData) return [];
    const q = searchTerm.toLowerCase();
    const now = startOfDay(new Date());
    
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
      
      const isOverdue = t.status !== 'PAGO' && isBefore(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate as any), now);
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
          <NewTitleDialog onCreated={() => setRefreshKey(k => k + 1)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20 border-2 shadow-[0_0_20px_rgba(245,208,48,0.05)]">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest">Receita Real (Honorários 30%)</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-primary tabular-nums">{formatCurrency(stats.officeRevenue)}</p></CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/10">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Total Bruto Recebido</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-emerald-400 tabular-nums">{formatCurrency(stats.totalReceitas)}</p></CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/10">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Receitas Pendentes</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-amber-400 tabular-nums">{formatCurrency(stats.pendenteReceita)}</p></CardContent>
        </Card>
        <Card className="bg-rose-500/5 border-rose-500/10">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Total de Custos (Saídas)</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-rose-400 tabular-nums">{formatCurrency(stats.totalDespesas)}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receitas" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-[#0f172a] border border-white/5 rounded-lg p-1 gap-1 h-12">
            <TabsTrigger value="receitas" className="rounded-md data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 font-bold h-10">
              <ArrowUpRight className="h-4 w-4 mr-2" /> Receitas
            </TabsTrigger>
            <TabsTrigger value="despesas" className="rounded-md data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 font-bold h-10">
              <ArrowDownRight className="h-4 w-4 mr-2" /> Despesas
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
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 px-6">Descrição da Parcela</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500">Vencimento</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 text-center">Status</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 text-right">Valor Bruto</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 text-right px-6">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.titles.map(t => {
                        const isOverdue = t.status !== 'PAGO' && isBefore(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate as any), startOfDay(new Date()));
                        return (
                          <TableRow key={t.id} className={cn(
                            "border-white/5 hover:bg-white/5 transition-colors",
                            isOverdue && "bg-rose-500/[0.03]"
                          )}>
                            <TableCell className="px-6">
                              <span className={cn("font-bold text-xs", isOverdue ? "text-rose-400" : "text-slate-200")}>{t.description}</span>
                            </TableCell>
                            <TableCell className={cn("text-[10px] font-mono", isOverdue ? "text-rose-500 font-black" : "text-slate-400")}>
                              {format(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate as any), 'dd/MM/yyyy')}
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
                  <TableHead className="text-muted-foreground font-black uppercase text-[10px] px-6">Descrição da Saída</TableHead>
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
                ) : (titlesData?.filter(t => t.type === 'DESPESA').map(t => (
                  <TableRow key={t.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="px-6 font-bold text-white text-sm">{t.description}</TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {format(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate as any), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-2 h-6 border-none", t.status === 'PAGO' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400')}>
                        {t.status}
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )))}
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

      <ClientReceiptDialog 
        title={selectedReceiptTitle}
        client={selectedReceiptTitle ? clientsMap.get(selectedReceiptTitle.clientId || '') || null : null}
        process={selectedReceiptTitle ? processesMap.get(selectedReceiptTitle.processId || '') || null : null}
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
      />
    </div>
  );
}
