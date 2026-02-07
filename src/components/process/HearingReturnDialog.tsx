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
  HelpCircle
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

const returnSchema = z.object({
  resultNotes: z.string().min(10, 'Descreva detalhadamente o que ocorreu no ato.'),
  nextStepType: z.string().optional(),
  nextStepDeadline: z.string().optional(),
  createLegalDeadline: z.boolean().default(false),
  scheduleNewHearing: z.boolean().default(false),
  newHearingType: z.enum(['UNA', 'CONCILIACAO', 'INSTRUCAO', 'JULGAMENTO', 'PERICIA', 'OUTRA']).optional(),
  newHearingDate: z.string().optional(),
  newHearingTime: z.string().optional(),
  dateNotSet: z.boolean().default(false),
});

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

  if (!hearing) return null;

  const isPericia = hearing.type === 'PERICIA';
  const showNewHearingFields = form.watch('scheduleNewHearing');
  const dateNotSet = form.watch('dateNotSet');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
            <History className="h-6 w-6 text-primary" />
            {isPericia ? 'Retorno de Perícia Técnica' : 'Retorno de Audiência'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Registre o desfecho do ato e defina a próxima iteração do processo para: <span className="text-white font-bold">{hearing.processName || 'Processo'}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            
            <FormField
              control={form.control}
              name="resultNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Síntese do Ato *
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={isPericia 
                        ? "Descreva o que foi analisado pelo perito, quesitos respondidos e clima da diligência..." 
                        : "Resuma a ata, propostas de acordo, testemunhas ouvidas e ordens do juiz..."}
                      className="min-h-[120px] bg-background border-border resize-none text-sm leading-relaxed" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 p-6 rounded-2xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest mb-4">
                <ArrowRight className="h-3 w-3" /> Seguimento Jurídico (Iteração)
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="createLegalDeadline"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                            className="border-primary data-[state=checked]:bg-primary"
                          />
                        </FormControl>
                        <Label className="text-xs font-bold text-slate-200 cursor-pointer">Lançar Prazo Fatal (Diário)</Label>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduleNewHearing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            className="border-primary data-[state=checked]:bg-primary"
                          />
                        </FormControl>
                        <Label className="text-xs font-bold text-slate-200 cursor-pointer">Reagendar / Novo Ato Judicial</Label>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nextStepDeadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Data p/ Próxima Ação</FormLabel>
                        <FormControl>
                          <Input type="date" className="h-10 bg-background border-border" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {showNewHearingFields && (
                <div className="pt-4 border-t border-white/5 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                    <div className="space-y-0.5">
                      <Label htmlFor="date-not-set" className="text-xs font-bold text-amber-400">Data não designada em ata?</Label>
                      <p className="text-[10px] text-slate-500">Marque se o juiz não definiu o próximo ato no momento.</p>
                    </div>
                    <FormField
                      control={form.control}
                      name="dateNotSet"
                      render={({ field }) => (
                        <FormControl>
                          <Switch 
                            id="date-not-set"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-amber-500"
                          />
                        </FormControl>
                      )}
                    />
                  </div>

                  {!dateNotSet && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="newHearingType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] uppercase font-bold text-primary">Tipo de Ato</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger className="h-9 text-xs bg-background border-primary/20"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent className="bg-[#0f172a] text-white">
                                <SelectItem value="UNA">Audiência Una</SelectItem>
                                <SelectItem value="INSTRUCAO">Instrução</SelectItem>
                                <SelectItem value="PERICIA">Perícia</SelectItem>
                                <SelectItem value="CONCILIACAO">Conciliação</SelectItem>
                                <SelectItem value="JULGAMENTO">Julgamento</SelectItem>
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
                            <FormLabel className="text-[9px] uppercase font-bold text-primary">Nova Data</FormLabel>
                            <FormControl><Input type="date" className="h-9 text-xs bg-background" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="newHearingTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] uppercase font-bold text-primary">Horário</FormLabel>
                            <FormControl><Input type="time" className="h-9 text-xs bg-background" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {dateNotSet && (
                    <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-amber-500 text-[10px] font-bold italic">
                      <HelpCircle className="h-3 w-3" />
                      O andamento será registrado apenas como nota estratégica. Verifique os autos posteriormente.
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 gap-2">
              <DialogClose asChild>
                <Button variant="ghost" type="button" className="text-slate-400">Cancelar</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSaving} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] px-8 h-12 shadow-xl shadow-primary/20"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Finalizar e Atualizar Agenda
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
