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
  Info,
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import type { Process } from '@/lib/types';
import { createLegalDeadline } from '@/lib/deadline-actions';

const deadlineSchema = z.object({
  type: z.string().min(1, 'O tipo de prazo é obrigatório.'),
  startDate: z.string().min(1, 'A data inicial é obrigatória.'),
  endDate: z.string().min(1, 'A data fatal é obrigatória.'),
  publicationText: z.string().optional(),
  observations: z.string().optional(),
});

interface LegalDeadlineDialogProps {
  process: Process | null;
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

export function LegalDeadlineDialog({ process, open, onOpenChange, onSuccess }: LegalDeadlineDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [customType, setCustomType] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof deadlineSchema>>({
    resolver: zodResolver(deadlineSchema),
    defaultValues: {
      type: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      publicationText: '',
      observations: '',
    }
  });

  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');

  const daysRemaining = React.useMemo(() => {
    if (!startDate || !endDate) return 0;
    try {
      return differenceInDays(new Date(endDate), new Date(startDate));
    } catch (e) {
      return 0;
    }
  }, [startDate, endDate]);

  const onSubmit = async (values: z.infer<typeof deadlineSchema>) => {
    if (!process) return;
    setIsSaving(true);
    try {
      await createLegalDeadline({
        processId: process.id,
        type: values.type,
        startDate: values.startDate,
        endDate: values.endDate,
        daysCount: daysRemaining,
        publicationText: values.publicationText,
        observations: values.observations,
      });

      toast({ 
        title: 'Prazo Lançado!', 
        description: `O prazo de ${values.type} foi registrado na timeline do processo.` 
      });
      
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao lançar prazo', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Clock className="h-5 w-5 text-primary" />
            Lançar Novo Prazo Judicial
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Gerencie o compromisso fatal para: <span className="font-bold text-white">{process?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Tipo de Prazo *</FormLabel>
                    {!customType ? (
                      <Select 
                        onValueChange={(val) => {
                          if (val === 'Personalizado') setCustomType(true);
                          else field.onChange(val);
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background border-border">
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
                          className="bg-background border-border" 
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

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex flex-col items-center justify-center">
                <span className="text-[10px] font-black uppercase text-primary mb-1">Duração do Prazo</span>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-black text-white">{daysRemaining < 0 ? 0 : daysRemaining} Dias</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Data de Publicação / Início *</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-background border-border text-white" {...field} />
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
                    <FormLabel className="text-rose-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Data Fatal (Vencimento) *
                    </FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-background border-rose-500/30 text-white focus:border-rose-500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="publicationText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Copiar/Colar Publicação
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Cole aqui o texto do Diário Oficial ou intimação..." 
                      className="min-h-[120px] bg-background border-border resize-none text-xs leading-relaxed" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Observações Estratégicas</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notas internas para a equipe sobre este prazo..." 
                      className="bg-background border-border resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-blue-400 leading-relaxed">
                <strong>Atenção:</strong> O cálculo de dias acima é corrido. Verifique se o prazo do seu tribunal segue dias úteis (CPC/15) ou se há suspensão de prazos antes de confirmar a data fatal.
              </p>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <DialogClose asChild>
                <Button variant="ghost" type="button" className="text-slate-400 hover:text-white">Cancelar</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSaving} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[150px]"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
                Lançar Prazo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
