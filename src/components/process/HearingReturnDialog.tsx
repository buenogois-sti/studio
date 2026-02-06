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
  CalendarDays
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
import type { Hearing } from '@/lib/types';
import { processHearingReturn } from '@/lib/hearing-actions';

const returnSchema = z.object({
  resultNotes: z.string().min(10, 'Descreva detalhadamente o que ocorreu na audiência.'),
  nextStepType: z.string().optional(),
  nextStepDeadline: z.string().optional(),
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
    }
  });

  const onSubmit = async (values: z.infer<typeof returnSchema>) => {
    if (!hearing) return;
    setIsSaving(true);
    try {
      await processHearingReturn(hearing.id, values);
      toast({ title: 'Retorno Processado!', description: 'O andamento foi registrado e o próximo passo agendado.' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar retorno', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!hearing) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
            <History className="h-6 w-6 text-primary" />
            Retorno de Audiência
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Registre o resultado da audiência e defina o seguimento jurídico do caso.
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
                    <FileText className="h-4 w-4 text-primary" /> O que ocorreu na audiência? *
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Resuma a ata, propostas de acordo, testemunhas ouvidas e ordens do juiz..." 
                      className="min-h-[120px] bg-background border-border resize-none text-sm leading-relaxed" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                <ArrowRight className="h-3 w-3" /> Seguimento Jurídico (Próximo Passo)
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nextStepType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Próxima Providência</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Manifestar sobre Laudo" className="h-10 bg-background border-border" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nextStepDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Vencimento do Passo</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-10 bg-background border-border" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-[9px] text-slate-500 italic">
                Ao preencher estes campos, uma tarefa de seguimento será criada no Google Tasks para lembrá-lo.
              </p>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <DialogClose asChild>
                <Button variant="ghost" type="button" className="text-slate-400">Cancelar</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSaving} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] px-8 h-11"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Finalizar e Seguir Processo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
