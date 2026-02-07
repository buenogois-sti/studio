
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, differenceInDays } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Loader2, 
  AlertTriangle, 
  FileText, 
  CalendarDays,
  Scale,
  ChevronDown,
  ChevronUp,
  Calculator,
  Zap,
  Sparkles,
  Bot
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import type { Process, LegalDeadline } from '@/lib/types';
import { createLegalDeadline, updateLegalDeadline } from '@/lib/deadline-actions';
import { countBusinessDays, addBusinessDays, addCalendarDays, cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { parseLegalPublication } from '@/ai/flows/parse-publication-flow';

const deadlineSchema = z.object({
  type: z.string().min(1, 'O tipo de prazo é obrigatório.'),
  startDate: z.string().min(1, 'A data inicial é obrigatória.'),
  endDate: z.string().min(1, 'A data fatal é obrigatória.'),
  countingMethod: z.enum(['useful', 'calendar']).default('useful'),
  publicationText: z.string().optional(),
  observations: z.string().optional(),
});

interface LegalDeadlineDialogProps {
  process: Process | null;
  deadline?: LegalDeadline | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const COMMON_DEADLINES = [
  'Contestação',
  'Recurso Ordinário',
  'Recurso de Revista',
  'Réplica à Contestação',
  'Manifestação sobre Laudo',
  'Agravo de Instrumento',
  'Embargos de Declaração',
  'Manifestação de Cálculos',
  'Contrarrazões',
  'Alegações Finais',
  'Manifestação Geral',
  'Personalizado'
];

export function LegalDeadlineDialog({ process, deadline, open, onOpenChange, onSuccess }: LegalDeadlineDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isParsingAI, setIsParsingAI] = React.useState(false);
  const [customType, setCustomType] = React.useState(false);
  const [calcDays, setCalcDays] = React.useState<number | "">("");
  const { toast } = useToast();

  const isEdit = !!deadline;

  const form = useForm<z.infer<typeof deadlineSchema>>({
    resolver: zodResolver(deadlineSchema),
    defaultValues: {
      type: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      countingMethod: 'useful',
      publicationText: '',
      observations: '',
    }
  });

  React.useEffect(() => {
    if (deadline && open) {
      form.reset({
        type: deadline.type,
        startDate: format(deadline.startDate.toDate(), 'yyyy-MM-dd'),
        endDate: format(deadline.endDate.toDate(), 'yyyy-MM-dd'),
        countingMethod: deadline.isBusinessDays ? 'useful' : 'calendar',
        publicationText: deadline.publicationText || '',
        observations: deadline.observations || '',
      });
      if (!COMMON_DEADLINES.includes(deadline.type)) {
        setCustomType(true);
      }
    } else if (!deadline && open) {
      form.reset({
        type: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: '',
        countingMethod: 'useful',
        publicationText: '',
        observations: '',
      });
      setCustomType(false);
      setCalcDays("");
    }
  }, [deadline, open, form]);

  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');
  const countingMethod = form.watch('countingMethod');
  const publicationText = form.watch('publicationText');

  const businessDays = React.useMemo(() => countBusinessDays(startDate, endDate), [startDate, endDate]);
  const calendarDays = React.useMemo(() => {
    if (!startDate || !endDate) return 0;
    try {
      const diff = differenceInDays(new Date(endDate), new Date(startDate));
      return diff < 0 ? 0 : diff;
    } catch (e) { return 0; }
  }, [startDate, endDate]);

  const handleAIParse = async () => {
    if (!publicationText || publicationText.length < 20) {
      toast({ variant: 'destructive', title: 'Texto curto demais', description: 'Cole o conteúdo da publicação para a IA analisar.' });
      return;
    }

    setIsParsingAI(true);
    try {
      const result = await parseLegalPublication({ text: publicationText });
      if (result) {
        form.setValue('type', result.deadlineType, { shouldValidate: true });
        form.setValue('countingMethod', result.isBusinessDays ? 'useful' : 'calendar');
        setCalcDays(result.daysCount);
        
        // Auto-calcula a data fatal se houver data de início
        if (startDate) {
          const start = new Date(startDate);
          const finalDate = result.isBusinessDays ? addBusinessDays(start, result.daysCount) : addCalendarDays(start, result.daysCount);
          form.setValue('endDate', format(finalDate, 'yyyy-MM-dd'));
        }

        toast({ title: 'Análise Concluída!', description: `A IA identificou um prazo de ${result.daysCount} dias para ${result.deadlineType}.` });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro na IA', description: 'Não foi possível interpretar a publicação.' });
    } finally {
      setIsParsingAI(false);
    }
  };

  const handleApplyCalculation = () => {
    if (calcDays === "" || !startDate) {
      toast({
        variant: 'destructive',
        title: 'Dados incompletos',
        description: 'Informe a quantidade de dias e a data de publicação.',
      });
      return;
    }
    
    const start = new Date(startDate);
    let result: Date;
    
    if (countingMethod === 'useful') {
      result = addBusinessDays(start, Number(calcDays));
    } else {
      result = addCalendarDays(start, Number(calcDays));
    }
    
    form.setValue('endDate', format(result, 'yyyy-MM-dd'), { shouldValidate: true, shouldDirty: true });
    toast({
      title: 'Vencimento Calculado',
      description: `O prazo de ${calcDays} dias foi aplicado com sucesso.`,
    });
  };

  const onSubmit = async (values: z.infer<typeof deadlineSchema>) => {
    if (!process) return;
    setIsSaving(true);
    try {
      const finalCount = values.countingMethod === 'useful' ? businessDays : calendarDays;
      
      if (isEdit && deadline) {
        await updateLegalDeadline(deadline.id, {
          ...values,
          daysCount: finalCount,
          isBusinessDays: values.countingMethod === 'useful',
        });
        toast({ title: 'Prazo Atualizado!' });
      } else {
        await createLegalDeadline({
          processId: process.id,
          type: values.type,
          startDate: values.startDate,
          endDate: values.endDate,
          daysCount: finalCount,
          isBusinessDays: values.countingMethod === 'useful',
          publicationText: values.publicationText,
          observations: values.observations,
        });
        toast({ title: 'Prazo Lançado!' });
      }
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
            <Clock className="h-6 w-6 text-primary" />
            {isEdit ? 'Editar Prazo Judicial' : 'Lançar Prazo Judicial'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure o compromisso fatal para: <span className="font-bold text-white">{process?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel className="text-white flex items-center gap-2 font-bold">
                    <FileText className="h-4 w-4 text-primary" /> Texto da Publicação / Despacho
                </FormLabel>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={handleAIParse}
                  disabled={isParsingAI || !publicationText}
                  className="h-8 border-primary/30 text-primary hover:bg-primary/10 text-[10px] font-black uppercase tracking-widest gap-2"
                >
                  {isParsingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                  Analisar com IA
                </Button>
              </div>
              <FormField
                control={form.control}
                name="publicationText"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="Cole aqui o texto oficial do Diário da Justiça para que a IA ajude no preenchimento..." 
                        className="min-h-[120px] bg-background border-border resize-none text-[11px] leading-relaxed font-mono" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-bold">Tipo de Prazo *</FormLabel>
                    {!customType ? (
                      <Select 
                        onValueChange={(val) => {
                          if (val === 'Personalizado') setCustomType(true);
                          else field.onChange(val);
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background border-border h-11">
                            <SelectValue placeholder="Selecione o tipo..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-border">
                          {COMMON_DEADLINES.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Digite o tipo..." 
                          className="bg-background border-border h-11" 
                          {...field} 
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setCustomType(false)}
                          className="text-[10px] uppercase font-bold"
                        >Voltar</Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2">
                <div className={cn(
                  "p-3 rounded-xl border flex flex-col items-center justify-center transition-all",
                  countingMethod === 'useful' ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(245,208,48,0.1)]" : "bg-muted/30 border-border opacity-50"
                )}>
                  <span className="text-[9px] font-black uppercase text-primary mb-1">Dias Úteis</span>
                  <div className="flex items-center gap-1.5">
                    <Scale className="h-3 w-3 text-primary" />
                    <span className="text-xl font-black text-white">{businessDays}</span>
                  </div>
                </div>
                <div className={cn(
                  "p-3 rounded-xl border flex flex-col items-center justify-center transition-all",
                  countingMethod === 'calendar' ? "bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "bg-muted/30 border-border opacity-50"
                )}>
                  <span className="text-[9px] font-black uppercase text-blue-400 mb-1">Corridos</span>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3 text-blue-400" />
                    <span className="text-xl font-black text-white">{calendarDays}</span>
                  </div>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="countingMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-white font-bold">Metodologia de Contagem</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col sm:flex-row gap-4"
                    >
                      <div className="flex items-center space-x-2 bg-muted/20 p-3 rounded-lg flex-1 border border-border/50">
                        <RadioGroupItem value="useful" id="useful" />
                        <Label htmlFor="useful" className="text-xs cursor-pointer">
                          <strong>Dias Úteis</strong> (CPC/CLT)
                          <p className="text-[10px] text-muted-foreground">Exclui sábados e domingos</p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 bg-muted/20 p-3 rounded-lg flex-1 border border-border/50">
                        <RadioGroupItem value="calendar" id="calendar" />
                        <Label htmlFor="calendar" className="text-xs cursor-pointer">
                          <strong>Dias Corridos</strong> (Material)
                          <p className="text-[10px] text-muted-foreground">Conta todos os dias</p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em]">
                  <Calculator className="h-3.5 w-3.5" /> Calculadora de Vencimento
                </div>
                {isParsingAI && <span className="text-[9px] text-primary animate-pulse font-bold">Aguardando IA...</span>}
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Duração do Prazo (Dias)</Label>
                  <Input 
                    type="number" 
                    placeholder="Ex: 5, 15, 30..." 
                    className="h-11 bg-background border-border"
                    value={calcDays}
                    onChange={(e) => setCalcDays(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-11 px-6 border-primary/30 text-primary hover:bg-primary/10 font-black uppercase text-[10px]"
                  onClick={handleApplyCalculation}
                >
                  <Zap className="h-3.5 w-3.5 mr-2" /> Aplicar Prazo
                </Button>
              </div>
              <p className="text-[9px] text-slate-500 italic">O cálculo excluirá o dia da publicação e seguirá a metodologia acima.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-bold">Data da Publicação *</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-background border-border h-11 text-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-rose-400 font-black flex items-center gap-1.5 uppercase text-[11px]">
                      <AlertTriangle className="h-4 w-4" /> Data Fatal (Vencimento) *
                    </FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-background border-rose-500/30 h-11 text-white focus:border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.05)]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white font-bold">Observações Estratégicas</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações internas sobre o cumprimento deste prazo..." 
                      className="bg-background border-border resize-none text-sm" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 gap-2 border-t border-border/50 mt-6">
              <DialogClose asChild>
                <Button variant="ghost" type="button" className="text-slate-400 hover:text-white">Cancelar</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSaving} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] px-8 h-11"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
                {isEdit ? 'Salvar Alterações' : 'Confirmar Lançamento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
