
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
  AlertCircle,
  FileText,
  CalendarDays,
  Gavel,
  Timer,
  Plus,
  HelpCircle,
  DollarSign,
  TrendingUp,
  Scale,
  Handshake,
  ArrowUpRight
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Separator } from '../ui/separator';

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
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl uppercase tracking-tighter">
            <History className="h-6 w-6 text-primary" />
            {isPericia ? 'Andamento de Perícia Técnica' : 'Retorno de Ato Judicial'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Registre o desfecho e encadeie as próximas ações para: <span className="text-white font-bold">{hearing.processName || 'Processo'}</span>
          </DialogDescription>
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
                        <FileText className="h-3.5 w-3.5" /> Síntese dos Fatos em Audiência *
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={isPericia 
                            ? "O que foi analisado pelo perito? Houve concordância dos assistentes? Quais quesitos foram chaves?" 
                            : "Resuma a ata: Propostas de acordo, testemunhas ouvidas, confissões e ordens do magistrado..."}
                          className="min-h-[140px] bg-black/40 border-white/10 resize-none text-sm leading-relaxed focus:border-primary transition-all" 
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
                      <div className="md:col-span-3 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">A inteligência Bueno Gois irá gerar os títulos e comissões automaticamente ao finalizar.</p>
                      </div>
                    </div>
                  )}
                </section>

                {/* SEGUIMENTO SECTION */}
                <section className="p-6 rounded-3xl bg-white/[0.02] border-2 border-white/5 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase text-white tracking-widest">Seguimento Operacional</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Lançamento de prazos e reagendamentos</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="nextStepType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tipo de Andamento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 bg-black/40 border-white/10">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#0f172a] text-white">
                                {NEXT_STEP_PRESETS.map(preset => (
                                  <SelectItem key={preset} value={preset}>{preset}</SelectItem>
                                ))}
                                <SelectItem value="OUTRO">Outro (Digitar na nota)</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nextStepDeadline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vencimento da Ação</FormLabel>
                            <FormControl><Input type="date" className="h-11 bg-black/40 border-white/10 font-bold" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                      <FormField
                        control={form.control}
                        name="createLegalDeadline"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0">
                            <Label className="text-xs font-bold text-slate-300 cursor-pointer">Lançar Prazo Fatal (Agenda)</Label>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="scheduleNewHearing"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0">
                            <Label className="text-xs font-bold text-slate-300 cursor-pointer">Reagendar Próximo Ato</Label>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-blue-500" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {showNewHearingFields && (
                    <div className="pt-6 border-t border-white/5 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex items-center justify-between p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                        <div className="space-y-0.5">
                          <Label htmlFor="date-not-set" className="text-xs font-black uppercase text-amber-400 tracking-widest">Aguardando Designação?</Label>
                          <p className="text-[10px] text-slate-500 font-medium">O juiz proferirá decisão posterior com a data?</p>
                        </div>
                        <FormField
                          control={form.control}
                          name="dateNotSet"
                          render={({ field }) => (
                            <FormControl>
                              <Switch id="date-not-set" checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-amber-500" />
                            </FormControl>
                          )}
                        />
                      </div>

                      {!dateNotSet && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="newHearingType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[9px] font-black uppercase text-blue-400">Novo Ato</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger className="h-10 text-xs bg-black/40 border-blue-500/20"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent className="bg-[#0f172a] text-white">
                                    <SelectItem value="UNA">Una</SelectItem>
                                    <SelectItem value="INSTRUCAO">Instrução</SelectItem>
                                    <SelectItem value="PERICIA">Perícia</SelectItem>
                                    <SelectItem value="CONCILIACAO">Conciliação</SelectItem>
                                    <SelectItem value="JULGAMENTO">Sentença</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="newHearingDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[9px] font-black uppercase text-blue-400">Data</FormLabel>
                                <FormControl><Input type="date" className="h-10 text-xs bg-black/40 border-blue-500/20 font-bold" {...field} /></FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="newHearingTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[9px] font-black uppercase text-blue-400">Horário</FormLabel>
                                <FormControl><Input type="time" className="h-10 text-xs bg-black/40 border-blue-500/20 font-bold" {...field} /></FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 gap-3">
          <DialogClose asChild>
            <Button variant="ghost" type="button" className="text-slate-400 font-bold uppercase text-[10px] tracking-widest h-14">Cancelar</Button>
          </DialogClose>
          <Button 
            type="submit" 
            form="hearing-return-form"
            disabled={isSaving} 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] px-8 h-14 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Finalizar e Encadear Ações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
