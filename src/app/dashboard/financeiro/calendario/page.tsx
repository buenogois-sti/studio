'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, Timestamp, getDocs, where, serverTimestamp } from 'firebase/firestore';
import type { FinancialTitle, Process, Client } from '@/lib/types';
import { FinanceCalendar } from '@/components/finance/FinanceCalendar';
import { H1 } from '@/components/ui/typography';
import { format, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createFinancialTitle, updateFinancialTitle, updateFinancialTitleStatus, deleteFinancialTitle, deleteFinancialTitleSeries, anticipateFinancialTitles } from '@/lib/finance-actions';
import { 
  ShieldCheck, 
  Loader2, 
  Search, 
  FolderKanban, 
  Scale, 
  X, 
  Bot,
  Flame,
  PlusCircle,
  CalendarDays,
  CheckCircle2, 
  History, 
  Trash2, 
  Edit,
  Calendar,
  Clock,
  Users
} from 'lucide-react';
import { searchProcesses } from '@/lib/process-actions';
import { EXPENSE_CATEGORIES, REVENUE_CATEGORIES } from '@/lib/financial-constants';
import { DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const titleFormSchema = z.object({
  description: z.string().min(3, 'Descrição obrigatória'),
  type: z.enum(['RECEITA', 'DESPESA']),
  origin: z.enum([
    'ACORDO',
    'SENTENCA',
    'HONORARIOS_CONTRATUAIS',
    'SUCUMBENCIA',
    'HONORARIOS_EXITO',
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
    'OUTRAS_RECEITAS',
    'INFRAESTRUTURA_IMOBILIARIA',
    'RECURSOS_HUMANOS',
    'LOGISTICA_VIAGENS',
    'DESPESAS_BANCARIAS',
    'RENDIMENTOS_INVESTIMENTOS'
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

// Nota: Reutilizei o TitleFormDialog aqui por simplicidade, 
// mas idealmente ele deveria estar em um arquivo separado.
function TitleFormDialog({ 
  open, 
  onOpenChange, 
  title, 
  onSuccess,
  onDelete,
  defaultDate,
}: { 
  open: boolean; 
  onOpenChange: (o: boolean) => void; 
  title?: FinancialTitle | null; 
  onSuccess: () => void;
  onDelete?: (title: FinancialTitle, series: boolean) => void;
  defaultDate?: string;
}) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [processSearch, setProcessSearch] = React.useState('');
  const [processResults, setProcessResults] = React.useState<Process[]>([]);
  const [isSearchingProcess, setIsSearchingProcess] = React.useState(false);
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null);
  const [recurrenceHistory, setRecurrenceHistory] = React.useState<FinancialTitle[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const isEdit = !!title;

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

    if (open && title?.recurrenceId && firestore) {
      setIsLoadingHistory(true);
      getDocs(query(collection(firestore, 'financial_titles'), where('recurrenceId', '==', title.recurrenceId), orderBy('dueDate', 'asc')))
        .then(snap => {
          setRecurrenceHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialTitle)));
        })
        .finally(() => setIsLoadingHistory(false));
    } else {
      setRecurrenceHistory([]);
    }
  }, [open, title, form, defaultDate, firestore]);

  const handleUpdateStatusQuick = async (id: string, status: 'PAGO' | 'PENDENTE') => {
    setIsSaving(true);
    try {
      await updateFinancialTitleStatus(id, status);
      toast({ title: `Título marcado como ${status.toLowerCase()}!` });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (series: boolean) => {
      if (!title || !onDelete) return;
      if (!confirm(series ? 'Excluir toda a série de recorrência?' : 'Excluir este lançamento específico?')) return;
      
      setIsDeleting(true);
      try {
          onDelete(title, series);
          onOpenChange(false);
      } finally {
          setIsDeleting(false);
      }
  };

  const handleAnticipate = async () => {
    if (!title?.recurrenceId) return;
    if (!confirm('Deseja liquidar todas as parcelas pendentes desta série?')) return;
    
    setIsSaving(true);
    try {
      const res = await anticipateFinancialTitles(title.recurrenceId);
      toast({ title: 'Série Antecipada!', description: `${res.count} títulos liquidados.` });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsSaving(false);
    }
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
        updatedAt: serverTimestamp() as any
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
      <DialogContent className={cn(
          "bg-[#020617] border-white/10 h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl transition-all duration-500",
          title?.recurrenceId ? "sm:max-w-5xl" : "sm:max-w-2xl"
      )}>
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0 flex flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-xl font-black font-headline text-white uppercase tracking-tight">
              {isEdit ? 'Editar Título Financeiro' : 'Novo Título Financeiro'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
               {isEdit ? 'Ajuste os dados do lançamento selecionado.' : 'Registro manual de movimentação de caixa.'}
            </DialogDescription>
          </div>
          {isEdit && title?.status !== 'PAGO' && (
              <Button 
                onClick={() => handleUpdateStatusQuick(title.id, 'PAGO')}
                disabled={isSaving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Liquidar Título
              </Button>
          )}
        </DialogHeader>
        
        <div className="flex-1 flex overflow-hidden">
        <ScrollArea className="flex-1 border-r border-white/5">
          <div className="p-6">
            <Form {...form}>
              <form id="title-calendar-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* 1. Categorização e Operação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tipo de Operação *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 h-11 focus:border-primary transition-all rounded-xl">
                              <SelectValue placeholder="Selecione tipo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white shadow-2xl">
                            <SelectItem value="RECEITA" className="focus:bg-emerald-500/10 focus:text-emerald-400">💰 Entrada (Receita)</SelectItem>
                            <SelectItem value="DESPESA" className="focus:bg-rose-500/10 focus:text-rose-400">💸 Saída (Despesa)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Grupo de Contas / Gestão *</FormLabel>
                        <Select onValueChange={(val) => {
                           field.onChange(val);
                           form.setValue('origin', val as any);
                           form.setValue('subcategory', ''); // Reset subcategory
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 h-11 focus:border-primary transition-all rounded-xl">
                              <SelectValue placeholder="Selecione Categoria..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white max-h-[400px]">
                            {Object.entries(form.watch('type') === 'RECEITA' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES).map(([key, cat]) => (
                                <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                {/* 2. Detalhamento e Valor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                             Subcategoria Detalhada <Badge variant="outline" className="text-[7px] h-4 bg-primary/10 text-primary border-primary/20">Dinâmico</Badge>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!form.watch('category')}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 h-11 focus:border-primary transition-all rounded-xl">
                              <SelectValue placeholder="Selecione detalhe..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white max-h-[350px]">
                            {((form.watch('type') === 'RECEITA' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES) as any)[form.watch('category') as string]?.subcategories.map((sub: string) => (
                                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                   control={form.control}
                   name="value"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Valor do Título (R$) *</FormLabel>
                       <FormControl>
                         <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-black text-sm">R$</span>
                           <Input 
                             className="bg-black/40 border-white/10 pl-10 h-11 text-base font-black text-white rounded-xl focus:border-primary shadow-inner" 
                             placeholder="0,00"
                             value={formatCurrencyValue(field.value)}
                             onChange={(e) => handleValueChange(e, field.onChange)}
                           />
                         </div>
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                </div>

                {/* 3. Datas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-white/5 border border-white/10">
                   <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data de Vencimento *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input type="date" className="bg-[#020617] border-white/10 h-11 pl-10 text-white rounded-xl" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="competenceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Mês de Competência</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input type="date" className="bg-[#020617] border-white/10 h-11 pl-10 text-white rounded-xl" {...field} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* 4. Favorecido e Pagamento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="beneficiaryName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Favorecido / Beneficiário</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input className="h-11 bg-black/40 border-white/10 rounded-xl pl-10" placeholder="Nome do favorecido..." {...field} />
                          </div>
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

                {/* 5. Descrição */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Descrição detalhada do Título *</FormLabel>
                      <FormControl>
                        <Input className="h-12 bg-black/40 border-white/10 rounded-xl font-bold" placeholder="Ex: Pagamento Aluguel Março/2026" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 6. Vínculo Processual */}
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

                {/* 8. Recorrência */}
                <div className="space-y-4 pt-2 pb-10">
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
                              disabled={isEdit}
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
              </form>
            </Form>
          </div>
        </ScrollArea>

        {title?.recurrenceId && (
            <div className="w-80 bg-black/20 overflow-hidden flex flex-col shrink-0 animate-in slide-in-from-right duration-500 border-l border-white/5">
                <div className="p-6 border-b border-white/5 bg-white/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <History className="h-3.5 w-3.5" /> Histórico de Recorrência
                    </h4>
                    <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Ciclagem de parcelas vinculadas</p>
                </div>
                {recurrenceHistory.some(h => h.status === 'PENDENTE') && (
                    <div className="px-4 py-2 border-b border-white/5 bg-primary/5">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={isSaving}
                            className="w-full text-primary hover:bg-primary/10 font-black uppercase text-[9px] tracking-widest gap-2 h-8"
                            onClick={handleAnticipate}
                        >
                            <Flame className="h-3 w-3" /> Antecipar Pendentes
                        </Button>
                    </div>
                )}
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-2">
                        {isLoadingHistory ? (
                            <div className="flex flex-col items-center justify-center p-12 gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
                                <span className="text-[9px] font-black text-slate-700 uppercase">Carregando série...</span>
                            </div>
                        ) : recurrenceHistory.map((h, i) => (
                            <button 
                                key={h.id}
                                disabled={h.id === title.id}
                                className={cn(
                                    "w-full text-left p-3 rounded-xl border transition-all group flex items-center justify-between",
                                    h.id === title.id 
                                        ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20" 
                                        : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                                )}
                            >
                                <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={cn(
                                            "text-[7px] font-black px-1 rounded uppercase",
                                            h.status === 'PAGO' ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"
                                        )}>
                                            {h.installmentIndex}/{h.totalInstallments}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase">
                                            {format(h.dueDate instanceof Timestamp ? h.dueDate.toDate() : new Date(h.dueDate), 'MMM/yyyy', { locale: ptBR })}
                                        </span>
                                    </div>
                                    <p className={cn(
                                        "text-[10px] font-black truncate",
                                        h.id === title.id ? "text-primary" : "text-white"
                                    )}>
                                        R$ {h.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                {h.status === 'PAGO' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t border-white/5 bg-black/40">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 mb-2">
                        <span>Progresso da Série</span>
                        <span className="text-white">{Math.round((recurrenceHistory.filter(h => h.status === 'PAGO').length / recurrenceHistory.length) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary transition-all duration-1000" 
                            style={{ width: `${(recurrenceHistory.filter(h => h.status === 'PAGO').length / recurrenceHistory.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        )}
        </div>
        
        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 gap-3">
          {isEdit && title && (
              <div className="mr-auto flex items-center gap-2 text-sm">
                  <Button 
                    variant="ghost" 
                    type="button" 
                    onClick={() => handleDelete(false)}
                    disabled={isSaving || isDeleting}
                    className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 font-bold uppercase text-[10px] h-12 px-4 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                  </Button>
                  {title.recurrenceId && (
                      <Button 
                        variant="ghost" 
                        type="button" 
                        onClick={() => handleDelete(true)}
                        disabled={isSaving || isDeleting}
                        className="text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 font-bold uppercase text-[10px] h-12 px-4 rounded-xl"
                      >
                         Excluir Série
                      </Button>
                  )}
              </div>
          )}
          <DialogClose asChild>
            <Button variant="ghost" type="button" className="text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12">
              Cancelar
            </Button>
          </DialogClose>
          <Button 
            type="submit" 
            form="title-calendar-form" 
            disabled={isSaving || isDeleting} 
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

export default function FinanceCalendarPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [titleToEdit, setTitleToEdit] = React.useState<FinancialTitle | null>(null);
  const [defaultDate, setDefaultDate] = React.useState<string | undefined>();

  const titlesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'asc'), limit(500)) : null), [firestore, refreshKey]);
  const { data: titlesData } = useCollection<FinancialTitle>(titlesQuery);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div>
              <H1 className="text-white">Calendário Financeiro</H1>
              <p className="text-sm text-muted-foreground">Visão geral do fluxo de caixa e agendamentos.</p>
            </div>
          </div>
        </div>
        <Button 
          className="gap-2 bg-primary text-primary-foreground font-bold h-10 px-6 shadow-lg shadow-primary/20"
          onClick={() => { setTitleToEdit(null); setDefaultDate(undefined); setIsFormOpen(true); }}
        >
          <PlusCircle className="h-4 w-4" />
          Novo Registro
        </Button>
      </div>

      <FinanceCalendar 
        titles={titlesData || []} 
        onTitleClick={(title) => {
          setTitleToEdit(title);
          setIsFormOpen(true);
        }}
        onNewTitle={(date) => {
          setTitleToEdit(null);
          setDefaultDate(format(date, 'yyyy-MM-dd'));
          setIsFormOpen(true);
        }}
      />

      <TitleFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        title={titleToEdit}
        onSuccess={() => setRefreshKey(k => k + 1)} 
        onDelete={async (title, series) => {
            try {
                if (series && (title.recurrenceId || title.financialEventId)) {
                    await deleteFinancialTitleSeries((title.recurrenceId || title.financialEventId)!);
                    toast({ title: 'Série de lançamentos excluída!' });
                } else {
                    await deleteFinancialTitle(title.id);
                    toast({ title: 'Lançamento excluído com sucesso!' });
                }
                setRefreshKey(k => k + 1);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Erro ao excluir', description: e.message });
            }
        }}
        defaultDate={defaultDate}
      />
    </div>
  );
}
