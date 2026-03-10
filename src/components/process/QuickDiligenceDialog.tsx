
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Briefcase, 
  Clock, 
  MapPin, 
  Loader2, 
  UserCheck, 
  CheckCircle2, 
  Info,
  X,
  Video,
  FileText,
  ShieldCheck,
  Building
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import type { Process, Staff } from '@/lib/types';
import { createHearing } from '@/lib/hearing-actions';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { ScrollArea } from '@/components/ui/scroll-area';

const diligenceSchema = z.object({
  staffId: z.string().min(1, 'Selecione o profissional encarregado.'),
  date: z.string().min(1, 'A data é obrigatória.'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora inválida.'),
  location: z.string().min(3, 'O local é obrigatório.'),
  description: z.string().min(5, 'Descreva o objetivo da diligência.'),
  isOnline: z.boolean().default(false),
  meetingLink: z.string().optional().or(z.literal('')),
  notes: z.string().optional(),
});

interface QuickDiligenceDialogProps {
  process: Process | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function QuickDiligenceDialog({ process, open, onOpenChange, onSuccess }: QuickDiligenceDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  // Diligências podem ser feitas por QUALQUER membro da equipe
  const staffQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'staff'), limit(100)) : null, [firestore]);
  const { data: staffData, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);

  const form = useForm<z.infer<typeof diligenceSchema>>({
    resolver: zodResolver(diligenceSchema),
    defaultValues: {
      staffId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '10:00',
      location: '',
      description: '',
      isOnline: false,
      meetingLink: '',
      notes: '',
    }
  });

  React.useEffect(() => {
    if (process && open) {
      form.setValue('location', process.court || '');
      if (process.leadLawyerId) {
        form.setValue('staffId', process.leadLawyerId);
      }
    }
  }, [process, open, form]);

  const onSubmit = async (values: z.infer<typeof diligenceSchema>) => {
    if (!process) return;
    setIsSaving(true);
    try {
      const diligenceDateTime = `${values.date}T${values.time}`;
      
      // Reutiliza o motor de Hearing actions com o tipo DILIGENCIA
      await createHearing({
        processId: process.id,
        processName: process.name,
        lawyerId: values.staffId, // Na tipagem do hearing usamos lawyerId, mas aqui passamos qualquer staff
        hearingDate: diligenceDateTime,
        location: values.location,
        responsibleParty: values.description,
        status: 'PENDENTE',
        type: 'DILIGENCIA',
        notes: values.notes,
        meetingLink: values.meetingLink,
        clientNotified: false,
      });

      toast({ title: 'Diligência Agendada!', description: 'A tarefa foi distribuída e sincronizada no Calendar do responsável.' });
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
      <DialogContent className="sm:max-w-2xl bg-[#020617] border-white/10 text-white h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl uppercase tracking-tighter">
            <Briefcase className="h-6 w-6 text-primary" />
            Nova Diligência Operacional
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Escalar profissional para diligência no processo: <span className="font-bold text-white">{process?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl bg-white/5 border border-white/10">
                  <FormField
                    control={form.control}
                    name="staffId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Responsável Encarregado *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 bg-black/40 border-white/10">
                              <SelectValue placeholder="Selecione o membro..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                            {staffData?.map(s => (
                              <SelectItem key={s.id} value={s.id} className="font-bold">
                                {s.firstName} {s.lastName} ({s.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data *</FormLabel>
                          <FormControl><Input type="date" className="h-11 bg-black/40 border-white/10 font-bold" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Horário *</FormLabel>
                          <FormControl><Input type="time" className="h-11 bg-black/40 border-white/10 font-bold" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Objetivo da Diligência *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Tirar fotos do local / Despachar com Juiz / Coleta de Assinatura" className="h-12 bg-black/40 border-white/10 font-bold text-white" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-primary" /> Local da Realização *
                        </FormLabel>
                        <FormControl>
                          <LocationSearch value={field.value} onSelect={field.onChange} placeholder="Pesquise o fórum, empresa ou endereço..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="meetingLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                          <Video className="h-3.5 w-3.5" /> Link Virtual (Se Online)
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Google Meet, Zoom ou WhatsApp Link..." className="h-11 bg-black/40 border-primary/20 focus:border-primary font-mono text-[10px]" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Observações / Instruções Adicionais</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Falar com o escrevente X sobre a petição ID 123..." className="h-12 bg-black/40 border-white/10" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex items-start gap-4 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-400 leading-relaxed italic">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>As diligências são integradas à agenda global e geram notificações automáticas para o colaborador designado.</p>
                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 gap-3 shrink-0">
          <DialogClose asChild>
            <Button variant="ghost" type="button" className="text-slate-400 font-bold uppercase text-[10px]">Cancelar</Button>
          </DialogClose>
          <Button 
            type="submit" 
            disabled={isSaving} 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20"
            onClick={() => form.handleSubmit(onSubmit)()}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Confirmar e Agendar Diligência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
