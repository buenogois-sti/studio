'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MapPin, Loader2, Gavel, Building, UserCheck, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import type { Process, HearingType, Staff } from '@/lib/types';
import { createHearing } from '@/lib/hearing-actions';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { LocationSearch } from '@/components/shared/LocationSearch';

const hearingSchema = z.object({
  lawyerId: z.string().min(1, 'Selecione o advogado que fará a audiência.'),
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

  // OTIMIZAÇÃO: Carrega apenas membros ativos e limitados
  const staffQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'staff'), limit(50)) : null, [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);
  const lawyers = staffData?.filter(s => s.role === 'lawyer' || s.role === 'partner' || s.role === 'intern') || [];

  const form = useForm<z.infer<typeof hearingSchema>>({
    resolver: zodResolver(hearingSchema),
    defaultValues: {
      lawyerId: '',
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
      
      // Auto-seleciona o advogado líder do processo como responsável padrão
      if (process.leadLawyerId) {
        form.setValue('lawyerId', process.leadLawyerId);
        const leader = lawyers.find(s => s.id === process.leadLawyerId);
        if (leader) {
          form.setValue('responsibleParty', `Dr(a). ${leader.firstName} ${leader.lastName}`);
        }
      }
    }
  }, [process, open, lawyers.length, form]);

  const onSubmit = async (values: z.infer<typeof hearingSchema>) => {
    if (!process) return;
    setIsSaving(true);
    try {
      const hearingDateTime = new Date(`${values.date}T${values.time}`);
      
      await createHearing({
        processId: process.id,
        processName: process.name,
        lawyerId: values.lawyerId,
        hearingDate: hearingDateTime.toISOString(),
        location: values.location,
        courtBranch: values.courtBranch,
        responsibleParty: values.responsibleParty,
        status: 'PENDENTE',
        type: values.type,
        notes: values.notes,
      });

      toast({ title: 'Audiência Agendada!', description: 'O compromisso foi distribuído na pauta do escritório.' });
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao agendar', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] overflow-hidden bg-[#020617] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
            <Gavel className="h-6 w-6 text-primary" />
            Distribuir Audiência na Pauta
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Defina o profissional e o local para o processo: <span className="font-bold text-white">{process?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-white/5 border border-white/10">
              <FormField
                control={form.control}
                name="lawyerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Advogado que fará o Ato *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 bg-black/40 border-white/10">
                          <SelectValue placeholder="Selecione o profissional..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                        {lawyers.map(l => (
                          <SelectItem key={l.id} value={l.id} className="font-bold">
                            Dr(a). {l.firstName} {l.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tipo de Audiência *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 bg-black/40 border-white/10">
                          <SelectValue placeholder="Selecione o tipo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                        <SelectItem value="UNA">Una</SelectItem>
                        <SelectItem value="CONCILIACAO">Conciliação</SelectItem>
                        <SelectItem value="INSTRUCAO">Instrução</SelectItem>
                        <SelectItem value="JULGAMENTO">Sentença/Julgamento</SelectItem>
                        <SelectItem value="OUTRA">Outra</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data *</FormLabel>
                    <FormControl><Input type="date" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Horário *</FormLabel>
                    <FormControl><Input type="time" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsibleParty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Identificação p/ Agenda</FormLabel>
                    <FormControl><Input placeholder="Ex: Dr. Alan" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Local / Fórum / Link *</FormLabel>
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
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                      <Building className="h-3 w-3" /> Vara / Câmara / Secretaria
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 2ª Vara do Trabalho de SBC" 
                        className="h-11 bg-black/40 border-white/10" 
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 gap-3">
              <DialogClose asChild>
                <Button variant="ghost" type="button" className="text-slate-400 font-bold uppercase text-[10px]">Cancelar</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSaving} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] h-12 px-8 shadow-xl shadow-primary/20"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
                Confirmar e Distribuir
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
