'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MapPin, Loader2, Gavel, Building } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import type { Process, HearingType, Staff } from '@/lib/types';
import { createHearing } from '@/lib/hearing-actions';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { LocationSearch } from '@/components/shared/LocationSearch';

const hearingSchema = z.object({
  date: z.string().min(1, 'A data é obrigatória.'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora inválida.'),
  location: z.string().min(3, 'O local é obrigatório.'),
  courtBranch: z.string().optional().or(z.literal('')),
  type: z.enum(['CONCILIACAO', 'INSTRUCAO', 'UNA', 'JULGAMENTO', 'OUTRA']),
  responsibleParty: z.string().min(3, 'O responsável é obrigatório.'),
  notes: z.string().optional(),
});

interface QuickHearingDialogProps {
  process: Process | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function QuickHearingDialog({ process, open, onOpenChange, onSuccess }: QuickHearingDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const staffQuery = useMemoFirebase(() => firestore ? collection(firestore, 'staff') : null, [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);

  const form = useForm<z.infer<typeof hearingSchema>>({
    resolver: zodResolver(hearingSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '09:00',
      type: 'UNA',
      location: '',
      courtBranch: '',
      responsibleParty: '',
    }
  });

  React.useEffect(() => {
    if (process && open) {
      form.setValue('location', process.court || '');
      form.setValue('courtBranch', process.courtBranch || '');
      if (process.leadLawyerId && staffData) {
        const leader = staffData.find(s => s.id === process.leadLawyerId);
        if (leader) {
          form.setValue('responsibleParty', `Dr(a). ${leader.firstName} ${leader.lastName}`);
        }
      }
    }
  }, [process, open, staffData, form]);

  const onSubmit = async (values: z.infer<typeof hearingSchema>) => {
    if (!process) return;
    setIsSaving(true);
    try {
      const hearingDateTime = new Date(`${values.date}T${values.time}`);
      
      await createHearing({
        processId: process.id,
        processName: process.name,
        hearingDate: hearingDateTime.toISOString(),
        location: values.location,
        courtBranch: values.courtBranch,
        responsibleParty: values.responsibleParty,
        status: 'PENDENTE',
        type: values.type,
        notes: values.notes,
      });

      toast({ title: 'Audiência Agendada!', description: 'O evento foi salvo e sincronizado com a agenda.' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao agendar', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-w-[95vw] overflow-hidden bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
            <Gavel className="h-6 w-6 text-primary" />
            Marcar Audiência
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Agendamento rápido para o processo: <span className="font-bold text-white">{process?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 overflow-x-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-bold">Tipo de Audiência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-background border-border h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="UNA">Una</SelectItem>
                        <SelectItem value="CONCILIACAO">Conciliação</SelectItem>
                        <SelectItem value="INSTRUCAO">Instrução</SelectItem>
                        <SelectItem value="JULGAMENTO">Julgamento</SelectItem>
                        <SelectItem value="OUTRA">Outra</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-bold">Data</FormLabel>
                    <FormControl><Input type="date" className="bg-background border-border h-11" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-bold">Horário</FormLabel>
                    <FormControl><Input type="time" className="bg-background border-border h-11" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsibleParty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-bold">Advogado Responsável</FormLabel>
                    <FormControl><Input placeholder="Nome do advogado" className="bg-background border-border h-11" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="text-white font-bold">Fórum / Local</FormLabel>
                  <FormControl>
                    <LocationSearch value={field.value} onSelect={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="courtBranch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white font-bold flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" /> Vara / Câmara / Turma
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: 2ª Vara do Trabalho de São Bernardo do Campo" 
                      className="h-11 bg-background border-border" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
              <DialogClose asChild><Button variant="ghost" type="button" className="w-full sm:w-auto text-slate-400">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] h-11 px-8">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarIcon className="h-4 w-4 mr-2" />}
                Confirmar Agendamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
