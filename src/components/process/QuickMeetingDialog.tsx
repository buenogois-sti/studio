'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  Loader2, 
  Users, 
  Building, 
  UserCheck, 
  MessageSquare, 
  Mail, 
  ShieldCheck,
  Video,
  Smartphone,
  Info
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import type { Process, Staff, Client, NotificationMethod } from '@/lib/types';
import { createHearing } from '@/lib/hearing-actions';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit, doc, getDoc } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const meetingSchema = z.object({
  lawyerId: z.string().min(1, 'Selecione o advogado responsável pelo atendimento.'),
  date: z.string().min(1, 'A data é obrigatória.'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora inválida.'),
  location: z.string().min(3, 'O local/modo é obrigatório.'),
  responsibleParty: z.string().min(3, 'O nome do profissional na agenda é obrigatório.'),
  notes: z.string().optional(),
  clientNotified: z.boolean().default(false),
  notificationMethod: z.enum(['whatsapp', 'email', 'phone', 'personal', 'court', 'other']).optional(),
});

interface QuickMeetingDialogProps {
  process: Process | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function QuickMeetingDialog({ process, open, onOpenChange, onSuccess }: QuickMeetingDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [clientData, setClientData] = React.useState<Client | null>(null);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const staffQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'staff'), limit(50)) : null, [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);
  const lawyers = staffData?.filter(s => s.role === 'lawyer' || s.role === 'partner' || s.role === 'intern') || [];

  const form = useForm<z.infer<typeof meetingSchema>>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      lawyerId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '14:00',
      location: 'Sede Bueno Gois - Rua Marechal Deodoro, 1594',
      responsibleParty: '',
      notes: '',
      clientNotified: false,
      notificationMethod: 'whatsapp',
    }
  });

  React.useEffect(() => {
    if (process && open && firestore) {
      if (process.leadLawyerId) {
        form.setValue('lawyerId', process.leadLawyerId);
        const leader = lawyers.find(s => s.id === process.leadLawyerId);
        if (leader) {
          form.setValue('responsibleParty', `Dr(a). ${leader.firstName}`);
        }
      }

      if (process.clientId) {
        getDoc(doc(firestore, 'clients', process.clientId)).then(snap => {
          if (snap.exists()) setClientData({ id: snap.id, ...snap.data() } as Client);
        });
      }
    }
  }, [process, open, lawyers.length, firestore, form]);

  const generateWhatsAppLink = () => {
    if (!clientData?.mobile) {
      toast({ variant: 'destructive', title: 'WhatsApp indisponível', description: 'O cliente não possui celular cadastrado.' });
      return;
    }
    const date = form.getValues('date');
    const time = form.getValues('time');
    const loc = form.getValues('location');
    
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dateFmt = format(dateObj, "dd/MM (EEEE)", { locale: ptBR });
    
    const message = `Olá, ${clientData.firstName}! Sou da Bueno Gois Advogados.\n\nAgendamos um atendimento para falarmos sobre seu processo:\n📅 Data: *${dateFmt}*\n🕘 Horário: *${time}*\n📍 Local/Modo: *${loc}*\n\nFavor confirmar se este horário está livre para você.`.trim();
    
    const cleanPhone = clientData.mobile.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    form.setValue('clientNotified', true);
    form.setValue('notificationMethod', 'whatsapp');
  };

  const onSubmit = async (values: z.infer<typeof meetingSchema>) => {
    if (!process) return;
    setIsSaving(true);
    try {
      const meetingDateTime = new Date(`${values.date}T${values.time}`);
      
      // Reutiliza a infra de audiência mas com tipo ATENDIMENTO
      await createHearing({
        ...values,
        status: 'PENDENTE',
        processId: process.id,
        processName: process.name,
        hearingDate: meetingDateTime.toISOString(),
        type: 'ATENDIMENTO',
      });

      toast({ title: 'Reunião Agendada!', description: 'O compromisso foi salvo na agenda do advogado e na timeline do processo.' });
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
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
            <CalendarDays className="h-6 w-6 text-primary" />
            Agendar Reunião com Cliente
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Defina o encontro estratégico para o processo: <span className="font-bold text-white">{process?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden">
                  <FormField
                    control={form.control}
                    name="lawyerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Advogado Responsável *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 bg-black/40 border-white/10">
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
                    name="responsibleParty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Identificador na Agenda</FormLabel>
                        <FormControl><Input placeholder="Ex: Dr. Alan" className="h-12 bg-black/40 border-white/10" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data da Reunião *</FormLabel>
                        <FormControl><Input type="date" className="h-11 bg-black/40 border-white/10 font-bold" {...field} /></FormControl>
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
                        <FormControl><Input type="time" className="h-11 bg-black/40 border-white/10 font-bold" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Local / Modo de Atendimento *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 bg-black/40 border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#0f172a] text-white">
                          <SelectItem value="Sede Bueno Gois - Rua Marechal Deodoro, 1594">🏢 Presencial na Sede</SelectItem>
                          <SelectItem value="Reunião Online - Google Meet">🎥 Reunião Online (Meet)</SelectItem>
                          <SelectItem value="Chamada via WhatsApp Vídeo">📱 WhatsApp Vídeo</SelectItem>
                          <SelectItem value="Visita Técnica / Local do Cliente">🚗 Local do Cliente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase text-white tracking-widest">Comunicação ao Cliente</h4>
                        <p className="text-[10px] text-blue-400/70 font-bold uppercase tracking-tighter">Garanta a ciência do agendamento</p>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="clientNotified"
                      render={({ field }) => (
                        <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-white/5">
                          <Label htmlFor="notified-mt" className="text-[10px] font-black text-slate-400 uppercase">Avisado?</Label>
                          <FormControl>
                            <Switch id="notified-mt" checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </div>
                      )}
                    />
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-12 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 font-bold gap-2"
                    onClick={generateWhatsAppLink}
                  >
                    <Smartphone className="h-4 w-4" /> Enviar Convite via WhatsApp
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Pauta da Reunião / Observações</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Tratar sobre proposta de acordo do réu X..." className="h-12 bg-black/40 border-white/10" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 gap-3 shrink-0">
          <DialogClose asChild>
            <Button variant="ghost" type="button" className="text-slate-400 font-bold uppercase text-[10px] h-12">Cancelar</Button>
          </DialogClose>
          <Button 
            type="submit" 
            disabled={isSaving} 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20"
            onClick={() => form.handleSubmit(onSubmit)()}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Confirmar e Sincronizar Agenda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
