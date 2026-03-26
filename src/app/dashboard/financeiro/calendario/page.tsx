'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { FinancialTitle, Process, Client } from '@/lib/types';
import { FinanceCalendar } from '@/components/finance/FinanceCalendar';
import { H1 } from '@/components/ui/typography';
import { format, startOfDay } from 'date-fns';
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
import { createFinancialTitle, updateFinancialTitle } from '@/lib/finance-actions';
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
  CalendarDays
} from 'lucide-react';
import { searchProcesses } from '@/lib/process-actions';
import { EXPENSE_CATEGORIES, REVENUE_CATEGORIES } from '@/lib/financial-constants';
import { DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

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

// Nota: Reutilizei o TitleFormDialog aqui por simplicidade, 
// mas idealmente ele deveria estar em um arquivo separado.
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
  }, [open, title, form, defaultDate]);

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
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Form {...form}>
              <form id="title-calendar-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tipo de Operação *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 h-11">
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
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Origem *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 h-11">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white max-h-[400px]">
                             <SelectItem value="ACORDO">🤝 Acordo / Liquidação</SelectItem>
                             <SelectItem value="HONORARIOS_CONTRATUAIS">⚖️ Honorários Contratuais</SelectItem>
                             <SelectItem value="OUTRAS_DESPESAS">📦 Outras Operações</SelectItem>
                             <SelectItem value="ALUGUEL_CONTAS">🏢 Aluguel / Contas</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Valor (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" className="h-11 bg-black/40 border-white/10" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vencimento</FormLabel>
                        <FormControl>
                          <Input type="date" className="h-11 bg-black/40 border-white/10" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Descrição detalhada *</FormLabel>
                      <FormControl>
                        <Input className="h-12 bg-black/40 border-white/10" placeholder="Ex: Honorários Contratuais" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
            form="title-calendar-form" 
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

export default function FinanceCalendarPage() {
  const { firestore } = useFirebase();
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
        defaultDate={defaultDate}
      />
    </div>
  );
}
