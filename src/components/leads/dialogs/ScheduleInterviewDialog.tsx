'use client';

import * as React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectSeparator, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { CalendarDays, Search, Loader2, ShieldCheck, AlertTriangle, Info, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { useFirebase } from '@/firebase';
import { scheduleLeadInterview } from '@/lib/lead-actions';
import type { Lead, Staff } from '@/lib/types';

export const scheduleInterviewSchema = z.object({
  date: z.string().min(1, 'Selecione a data.'),
  time: z.string().min(1, 'Selecione o horário.'),
  location: z.string().min(1, 'Selecione o local/modo.'),
  staffId: z.string().min(1, 'Selecione o profissional.'),
  zipCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
});

interface ScheduleInterviewDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
  lawyers: Staff[];
  interviewers: Staff[];
}

export function ScheduleInterviewDialog({ 
  lead, 
  open, 
  onOpenChange, 
  onSuccess, 
  lawyers, 
  interviewers 
}: ScheduleInterviewDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSearchingCep, setIsSearchingCep] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof scheduleInterviewSchema>>({
    resolver: zodResolver(scheduleInterviewSchema),
    defaultValues: { 
      date: format(new Date(), 'yyyy-MM-dd'), 
      time: '14:00', 
      location: 'Sede Bueno Gois - Rua Marechal Deodoro, 1594 - Sala 2, São Bernardo do Campo / SP', 
      staffId: lead?.lawyerId || '',
      notes: '', 
      zipCode: '', 
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: ''
    }
  });

  const currentLocation = form.watch('location');

  // Sync form with lead data when lead changes
  React.useEffect(() => {
    if (open && lead) {
      form.reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '14:00',
        location: 'Sede Bueno Gois - Rua Marechal Deodoro, 1594 - Sala 2, São Bernardo do Campo / SP',
        staffId: lead.lawyerId || '',
        notes: '',
        zipCode: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: ''
      });
    }
  }, [open, lead, form]);

  const handleCepSearch = async () => {
    const cep = form.getValues('zipCode');
    const cleanCep = cep?.replace(/\D/g, '');
    
    if (!cleanCep || cleanCep.length !== 8) {
      toast({ variant: 'destructive', title: 'CEP Inválido', description: 'O CEP deve ter 8 dígitos.' });
      return;
    }

    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({ variant: 'destructive', title: 'CEP não encontrado' });
      } else {
        form.setValue('street', data.logradouro);
        form.setValue('neighborhood', data.bairro);
        form.setValue('city', data.localidade);
        form.setValue('state', data.uf);
        toast({ title: 'Endereço Localizado!', description: `${data.logradouro}, ${data.localidade}` });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Falha na busca', description: 'Não foi possível conectar ao serviço de CEP.' });
    } finally {
      setIsSearchingCep(false);
    }
  };

  React.useEffect(() => {
    if (lead && open) {
      form.setValue('staffId', lead.lawyerId);
    }
  }, [lead, open, form]);

  const selectedStaffId = form.watch('staffId');
  const selectedStaff = [...lawyers, ...interviewers].find(s => s.id === selectedStaffId);
  const staffDisplayName = selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : 'Profissional';
  const isInterviewer = interviewers.some(i => i.id === selectedStaffId) && !lawyers.some(l => l.id === selectedStaffId);
  const isNotResponsible = selectedStaffId !== lead?.lawyerId;

  const onSubmit = async (values: z.infer<typeof scheduleInterviewSchema>) => {
    if (!lead) return;
    setIsSaving(true);
    try {
      await scheduleLeadInterview(lead.id, values);
      toast({ title: 'Atendimento Agendado!', description: `Evento sincronizado na agenda de ${staffDisplayName}.` });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) { 
      toast({ variant: 'destructive', title: 'Erro ao agendar', description: e.message }); 
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f172a] border-white/10 text-white shadow-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white font-headline flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Agendar Entrevista Técnica
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Definir horário na agenda de <span className="text-white font-bold">{staffDisplayName}</span>.
            {selectedStaff?.email && <div className="text-[12px] text-primary/60 font-mono mt-1 italic">Sincronizando com: {selectedStaff.email}</div>}
          </DialogDescription>
        </DialogHeader>

        {isNotResponsible && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 animate-in slide-in-from-top-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[12px] font-black uppercase text-amber-500 tracking-widest">Atenção: Agenda de Terceiro</p>
              <p className="text-[12px] text-slate-400 leading-tight">Você está agendando na pauta de um colaborador que não é o responsável principal. O Dr. Responsável será notificado para fins de compliance.</p>
            </div>
          </div>
        )}

        {isInterviewer && (
          <div className="mx-6 mt-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3 animate-in slide-in-from-top-2">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[12px] font-black uppercase text-blue-500 tracking-widest">Sessão Supervisionada</p>
              <p className="text-[12px] text-slate-400 leading-tight">Este atendimento será marcado como supervisionado. O entrevistador deve seguir rigorosamente o DNA Bueno Gois.</p>
            </div>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full max-h-[80vh]">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 -m-6 mb-0 pt-6">
              <FormField control={form.control} name="staffId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px] font-black uppercase text-slate-500">Profissional Responsável (Agenda)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 bg-black/40 border-white/10 font-bold">
                        <div className="flex items-center gap-3">
                          <Mail className="h-3.5 w-3.5 text-slate-500" />
                          <SelectValue placeholder="Selecione o profissional..." />
                        </div>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#0f172a] text-white">
                      <SelectGroup>
                        <SelectLabel className="text-[11px] uppercase text-slate-500 px-2 py-1">Advogados</SelectLabel>
                        {lawyers.map(s => (
                          <SelectItem key={s.id} value={s.id} className="font-bold">
                            <div className="flex flex-col">
                              <span>Dr(a). {s.firstName} {s.lastName}</span>
                              <span className="text-[10px] font-normal text-slate-500 lowercase opacity-60">{s.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator className="bg-white/5 my-1" />
                      <SelectGroup>
                        <SelectLabel className="text-[11px] uppercase text-slate-500 px-2 py-1">Entrevistadores / Estagiários</SelectLabel>
                        {interviewers.filter(i => !lawyers.find(l => l.id === i.id)).map(s => (
                          <SelectItem key={s.id} value={s.id} className="font-bold">
                            <div className="flex flex-col">
                              <span>{s.firstName} {s.lastName}</span>
                              <span className="text-[10px] font-normal text-slate-500 lowercase opacity-60">{s.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {selectedStaffId === lead?.lawyerId && (
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-tighter mt-1 ml-1 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Responsável Designado
                    </p>
                  )}
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px] font-black uppercase text-slate-500">Data</FormLabel>
                    <FormControl><Input type="date" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="time" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px] font-black uppercase text-slate-500">Horário</FormLabel>
                    <FormControl><Input type="time" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px] font-black uppercase text-slate-500">Modo / Local de Atendimento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-11 bg-black/40 border-white/10"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent className="bg-[#0f172a] text-white">
                      <SelectItem value="Sede Bueno Gois - Rua Marechal Deodoro, 1594 - Sala 2, São Bernardo do Campo / SP">🏢 Sede Bueno Gois (Presencial)</SelectItem>
                      <SelectItem value="Google Meet (Online)">🎥 Google Meet (Online)</SelectItem>
                      <SelectItem value="Visita Técnica (Local)">🚗 Visita Local</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              {currentLocation === 'Visita Técnica (Local)' && (
                <div className="space-y-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="zipCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-black uppercase text-slate-500">CEP para Visita</FormLabel>
                        <div className="flex gap-2">
                          <FormControl><Input placeholder="00000-000" className="h-11 bg-black/40 border-white/10 font-mono" {...field} /></FormControl>
                          <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 border-primary/20 bg-primary/5" onClick={handleCepSearch} disabled={isSearchingCep}>
                            {isSearchingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="neighborhood" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-black uppercase text-slate-500">Bairro</FormLabel>
                        <FormControl><Input placeholder="Bairro..." className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="street" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[12px] font-black uppercase text-slate-500">Logradouro / Rua</FormLabel>
                      <FormControl><Input placeholder="Nome da rua ou avenida..." className="h-11 bg-black/40 border-white/10 italic" {...field} /></FormControl>
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="number" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-black uppercase text-slate-500">Número</FormLabel>
                        <FormControl><Input placeholder="123" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="complement" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Complemento (Opcional)</FormLabel>
                        <FormControl><Input placeholder="Apto, Bloco, etc..." className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Cidade</FormLabel>
                        <FormControl><Input placeholder="Cidade..." className="h-11 bg-black/40 border-white/10 truncate" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Estado (UF)</FormLabel>
                        <FormControl><Input placeholder="SP" className="h-11 bg-black/40 border-white/10 uppercase" {...field} maxLength={2} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500">Notas Estratégicas p/ Agenda</FormLabel>
                  <FormControl><Textarea className="bg-black/40 border-white/10 min-h-[100px] resize-none" placeholder="Pontos chaves que o advogado deve saber..." {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
            <DialogFooter className="bg-white/5 p-6 border-t border-white/5">
              <Button type="submit" disabled={isSaving} className="w-full h-12 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Confirmar Agendamento e Sincronizar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
