
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  History, 
  Loader2, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Handshake,
  TrendingUp,
  X
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import type { Hearing, HearingType } from '@/lib/types';
import { processHearingReturn } from '@/lib/hearing-actions';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const returnSchema = z.object({
  resultNotes: z.string().min(10, 'Descreva detalhadamente o que ocorreu no ato.'),
  nextStepType: z.string().optional(),
  nextStepDeadline: z.string().optional(),
  createLegalDeadline: z.boolean().default(false),
  scheduleNewHearing: z.boolean().default(false),
  newHearingType: z.enum(['UNA', 'CONCILIACAO', 'INSTRUCAO', 'JULGAMENTO', 'PERICIA', 'ATENDIMENTO', 'OUTRA']).optional(),
  newHearingDate: z.string().optional(),
  newHearingTime: z.string().optional(),
  dateNotSet: z.boolean().default(false),
  hasAgreement: z.boolean().default(false),
  agreementValue: z.coerce.number().min(0).optional(),
  agreementInstallments: z.coerce.number().min(1).optional(),
  agreementFirstDueDate: z.string().optional(),
});

const NEXT_STEP_PRESETS = [
  "Manifestação sobre documentos",
  "Manifestação sobre laudo pericial",
  "Réplica à contestação",
  "Contrarrazões de recurso",
  "Alegações finais (Razões Finais)",
  "Cumprimento de Sentença"
];

interface HearingReturnDialogProps {
  hearing: Hearing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function HearingReturnDialog({ hearing, open, onOpenChange, onSuccess }: HearingReturnDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof returnSchema>>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      resultNotes: '',
      nextStepType: 'Manifestação sobre documentos',
      nextStepDeadline: '',
      createLegalDeadline: false,
      scheduleNewHearing: false,
      newHearingType: 'UNA',
      dateNotSet: false,
      hasAgreement: false,
      agreementValue: 0,
      agreementInstallments: 1,
      agreementFirstDueDate: '',
    }
  });

  const onSubmit = async (values: z.infer<typeof returnSchema>) => {
    if (!hearing) return;
    setIsSaving(true);
    try {
      await processHearingReturn(hearing.id, values);
      toast({ title: 'Retorno Processado!', description: 'O andamento foi registrado e as pendências agendadas.' });
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar retorno', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    field.onChange(num);
  };

  if (!hearing) return null;

  const isPericia = hearing.type === 'PERICIA';
  const showNewHearingFields = form.watch('scheduleNewHearing');
  const hasAgreement = form.watch('hasAgreement');
  const dateNotSet = form.watch('dateNotSet');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-[#020617] border-white/10 text-white h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0 relative">
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl uppercase tracking-tighter">
            <History className="h-6 w-6 text-primary" />
            {isPericia ? 'Andamento de Perícia Técnica' : 'Retorno de Ato Judicial'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Registre o desfecho e defina a próxima iteração do processo para: <span className="text-white font-bold">{hearing.processName || 'Processo'}</span>
          </DialogDescription>
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <Form {...form}>
            <form id="hearing-return-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-8">
              
              <section className="space-y-4">
                <FormField
                  control={form.control}
                  name="resultNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" /> Síntese do Ato *
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={isPericia 
                            ? "O que foi analisado pelo perito? Houve concordância dos assistentes? Quais quesitos foram chaves?" 
                            : "Resuma a ata, propostas de acordo, testemunhas ouvidas e ordens do juiz..."}
                          className="min-h-[140px] bg-black/40 border-primary/40 border-2 rounded-xl resize-none text-sm leading-relaxed focus:border-primary transition-all placeholder:text-slate-600" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <div className="grid gap-6">
                {/* ACORDO SECTION */}
                <section className={cn(
                  "p-6 rounded-3xl border-2 transition-all duration-500 overflow-hidden relative",
                  hasAgreement ? "bg-emerald-500/[0.03] border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.05)]" : "bg-white/[0.02] border-white/5"
                )}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border transition-all", hasAgreement ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-slate-500")}>
                        <Handshake className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase text-white tracking-widest">Resultado de Acordo</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Sinalize se houve conciliação</p>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="hasAgreement"
                      render={({ field }) => (
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500" />
                        </FormControl>
                      )}
                    />
                  </div>

                  {hasAgreement && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-500">
                      <FormField
                        control={form.control}
                        name="agreementValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-emerald-500">Valor Bruto (R$)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-500">R$</span>
                                <Input 
                                  className="h-11 bg-black/40 border-emerald-500/20 pl-10 text-white font-black tabular-nums" 
                                  placeholder="0,00"
                                  value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(field.value || 0)}
                                  onChange={(e) => handleCurrencyChange(e, field)}
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="agreementInstallments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500">Parcelas</FormLabel>
                            <FormControl><Input type="number" min="1" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="agreementFirstDueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500">1º Vencimento</FormLabel>
                            <FormControl><Input type="date" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </section>

                {/* SEGUIMENTO SECTION */}
                <section className="p-6 rounded-3xl bg-[#0f172a]/40 border-2 border-white/5 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-black uppercase text-primary tracking-widest">Seguimento Jurídico (Iteração)</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="createLegalDeadline"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <div 
                                className={cn(
                                  "h-5 w-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all",
                                  field.value ? "bg-primary border-primary" : "border-white/20"
                                )}
                                onClick={() => field.onChange(!field.value)}
                              >
                                {field.value && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground stroke-[3]" />}
                              </div>
                            </FormControl>
                            <Label className="text-xs font-bold text-slate-200 cursor-pointer" onClick={() => field.onChange(!field.value)}>Lançar Prazo Fatal (Diário)</Label>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="scheduleNewHearing"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <div 
                                className={cn(
                                  "h-5 w-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all",
                                  field.value ? "bg-primary border-primary" : "border-white/20"
                                )}
                                onClick={() => field.onChange(!field.value)}
                              >
                                {field.value && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground stroke-[3]" />}
                              </div>
                            </FormControl>
                            <Label className="text-xs font-bold text-slate-200 cursor-pointer" onClick={() => field.onChange(!field.value)}>Reagendar / Novo Ato Judicial</Label>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="nextStepDeadline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">Data p/ Próxima Ação</FormLabel>
                          <FormControl><Input type="date" className="h-11 bg-black/40 border-white/10 font-bold" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-primary/[0.03] rounded-2xl border border-primary/20">
                      <div className="space-y-0.5">
                        <Label htmlFor="date-not-set" className="text-xs font-black uppercase text-primary tracking-widest">Data não designada em ata?</Label>
                        <p className="text-[9px] text-slate-500 font-medium">Marque se o juiz não definiu o próximo ato no momento.</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="dateNotSet"
                        render={({ field }) => (
                          <FormControl>
                            <Switch id="date-not-set" checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" />
                          </FormControl>
                        )}
                      />
                    </div>

                    {dateNotSet && (
                      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3 animate-in slide-in-from-top-2">
                        <Info className="h-4 w-4 text-amber-500 shrink-0" />
                        <p className="text-[10px] text-amber-400 italic">O andamento será registrado apenas como nota estratégica. Verifique os autos posteriormente.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 flex flex-row gap-3">
          <Button 
            variant="ghost" 
            type="button" 
            className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary font-black uppercase text-[10px] tracking-widest h-12 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            form="hearing-return-form"
            disabled={isSaving} 
            className="flex-[2] bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl shadow-xl shadow-primary/20"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Finalizar e Atualizar Agenda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
