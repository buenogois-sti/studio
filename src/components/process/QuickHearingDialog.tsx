
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Loader2, 
  Gavel, 
  Building, 
  UserCheck, 
  MessageSquare, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  Smartphone,
  ShieldCheck,
  X,
  Video,
  Key,
  Edit
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import type { Process, Hearing, HearingType, Staff, Client, NotificationMethod } from '@/lib/types';
import { createHearing, updateHearing } from '@/lib/hearing-actions';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit, doc, getDoc } from 'firebase/firestore';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const hearingSchema = z.object({
  lawyerId: z.string().min(1, 'Selecione o advogado que fará a audiência.'),
  date: z.string().min(1, 'A data é obrigatória.'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora inválida.'),
  location: z.string().min(3, 'O local é obrigatório.'),
  courtBranch: z.string().optional().or(z.literal('')),
  type: z.enum(['CONCILIACAO', 'INSTRUCAO', 'UNA', 'JULGAMENTO', 'PERICIA', 'ATENDIMENTO', 'OUTRA']),
  responsibleParty: z.string().min(3, 'O responsável é obrigatório.'),
  notes: z.string().optional(),
  meetingLink: z.string().optional().or(z.literal('')),
  meetingPassword: z.string().optional().or(z.literal('')),
  clientNotified: z.boolean().default(false),
  notificationMethod: z.enum(['whatsapp', 'email', 'phone', 'personal', 'court', 'other']).optional(),
});

interface QuickHearingDialogProps {
  process?: Process | null;
  hearing?: Hearing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function QuickHearingDialog({ process, hearing, open, onOpenChange, onSuccess }: QuickHearingDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [clientData, setClientData] = React.useState<Client | null>(null);
  const [processData, setProcessData] = React.useState<Process | null>(null);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const isEdit = !!hearing;

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
      notes: '',
      meetingLink: '',
      meetingPassword: '',
      clientNotified: false,
      notificationMethod: 'whatsapp',
    }
  });

  React.useEffect(() => {
    if (open) {
      if (hearing) {
        const hDate = hearing.date.toDate();
        form.reset({
          lawyerId: hearing.lawyerId,
          date: format(hDate, 'yyyy-MM-dd'),
          time: format(hDate, 'HH:mm'),
          type: hearing.type,
          location: hearing.location,
          courtBranch: hearing.courtBranch || '',
          responsibleParty: hearing.responsibleParty || '',
          notes: hearing.notes || '',
          meetingLink: hearing.meetingLink || '',
          meetingPassword: hearing.meetingPassword || '',
          clientNotified: !!hearing.clientNotified,
          notificationMethod: hearing.notificationMethod || 'whatsapp',
        });

        if (hearing.processId && firestore) {
          getDoc(doc(firestore, 'processes', hearing.processId)).then(pSnap => {
            if (pSnap.exists()) {
              const pData = { id: pSnap.id, ...pSnap.data() } as Process;
              setProcessData(pData);
              if (pData?.clientId) {
                getDoc(doc(firestore, 'clients', pData.clientId)).then(cSnap => {
                  if (cSnap.exists()) setClientData({ id: cSnap.id, ...cSnap.data() } as Client);
                });
              }
            }
          });
        }
      } else if (process) {
        setProcessData(process);
        form.setValue('location', process.court || '');
        form.setValue('courtBranch', process.courtBranch || '');
        
        if (process.leadLawyerId) {
          form.setValue('lawyerId', process.leadLawyerId);
          const leader = lawyers.find(s => s.id === process.leadLawyerId);
          if (leader) {
            form.setValue('responsibleParty', `Dr(a). ${leader.firstName}`);
          }
        }

        if (process.clientId && firestore) {
          getDoc(doc(firestore, 'clients', process.clientId)).then(snap => {
            if (snap.exists()) setClientData({ id: snap.id, ...snap.data() } as Client);
          });
        }
      }
    }
  }, [process, hearing, open, lawyers.length, firestore, form]);

  const getLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const generateWhatsAppLink = () => {
    if (!clientData?.mobile) {
      toast({ variant: 'destructive', title: 'WhatsApp indisponível', description: 'O cliente não possui celular cadastrado.' });
      return;
    }
    const values = form.getValues();
    const dateObj = getLocalDate(values.date);
    const dateFmt = format(dateObj, "dd/MM (EEEE)", { locale: ptBR });
    
    // Construção robusta para evitar erro de codificação
    const msgParts = [
      `Olá, ${clientData.firstName.trim()}! Sou do escritório Bueno Gois Advogados.`,
      '',
      `Informamos que sua audiência de *${values.type}* foi agendada:`,
      `📅 Data: *${dateFmt}*`,
      `🕘 Horário: *${values.time}*`,
      `📍 Local: *${values.location}*`
    ];

    if (values.meetingLink) {
      msgParts.push('');
      msgParts.push(`🔗 *LINK DA SALA VIRTUAL:* ${values.meetingLink}`);
      if (values.meetingPassword) {
        msgParts.push(`🔑 *SENHA:* ${values.meetingPassword}`);
      }
    }

    const currentProcess = process || processData;
    const pNumber = currentProcess?.processNumber || '---';
    
    msgParts.push('');
    msgParts.push(`🔢 *PROCESSO:* ${pNumber}`);
    msgParts.push('');
    msgParts.push('Favor confirmar o recebimento desta mensagem.');

    const message = msgParts.join('\n');
    const cleanPhone = clientData.mobile.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
    form.setValue('clientNotified', true);
    form.setValue('notificationMethod', 'whatsapp');
  };

  const generateEmailLink = () => {
    if (!clientData?.email) {
      toast({ variant: 'destructive', title: 'E-mail indisponível', description: 'O cliente não possui e-mail cadastrado.' });
      return;
    }
    const values = form.getValues();
    const dateObj = getLocalDate(values.date);
    const dateFmt = format(dateObj, "dd/MM/yyyy", { locale: ptBR });
    
    const currentProcess = process || processData;
    const subject = `Agendamento de Audiência - ${currentProcess?.name || 'Seu Processo'}`;
    let body = `Prezado(a) ${clientData.firstName},\n\nComunicamos o agendamento de audiência para o seu processo:\n\nTipo: ${values.type}\nData: ${dateFmt}\nHorário: ${values.time}\nLocal: ${values.location}\nProcesso: ${currentProcess?.processNumber || 'N/A'}`;
    
    if (values.meetingLink) {
      body += `\n\nLink da Sala Virtual: ${values.meetingLink}`;
      if (values.meetingPassword) {
        body += `\nSenha de Acesso: ${values.meetingPassword}`;
      }
    }

    body += `\n\nAtenciosamente,\nEquipe Bueno Gois Advogados.`;
    
    const mailto = `mailto:${clientData.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    form.setValue('clientNotified', true);
    form.setValue('notificationMethod', 'email');
  };

  const onSubmit = async (values: z.infer<typeof hearingSchema>) => {
    const targetProcess = process || processData || { id: hearing?.processId || '', name: hearing?.processName || '' };
    if (!targetProcess.id) return;

    setIsSaving(true);
    try {
      const hearingDateTimeStr = `${values.date}T${values.time}`;
      
      if (isEdit && hearing) {
        await updateHearing(hearing.id, {
          ...values,
          date: hearingDateTimeStr as any
        });
        toast({ title: 'Alterações Salvas!', description: 'O compromisso foi atualizado no LexFlow e no Calendar.' });
      } else {
        await createHearing({
          ...values,
          status: 'PENDENTE',
          processId: targetProcess.id,
          processName: targetProcess.name,
          hearingDate: hearingDateTimeStr,
        });
        toast({ title: 'Audiência Agendada!', description: 'O compromisso foi distribuído na pauta do escritório.' });
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao processar', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-[95vw] overflow-hidden bg-[#020617] border-white/10 text-white h-[90vh] flex flex-col p-0 shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
            {isEdit ? <Edit className="h-6 w-6 text-primary" /> : <Gavel className="h-6 w-6 text-primary" />}
            {isEdit ? 'Editar Compromisso Agendado' : 'Pauta Global de Audiências'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isEdit ? 'Ajuste os dados e o profissional escalado para:' : 'Escalando o profissional e notificando o cliente para:'} <span className="font-bold text-white">{process?.name || processData?.name || hearing?.processName}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <UserCheck className="h-20 w-24" />
                  </div>
                  <FormField
                    control={form.control}
                    name="lawyerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Advogado Escalado *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 bg-black/40 border-white/10 hover:border-primary/50 transition-all">
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
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tipo de Ato Judicial *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 bg-black/40 border-white/10">
                              <SelectValue placeholder="Selecione o tipo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                            <SelectItem value="UNA">Audiência Una</SelectItem>
                            <SelectItem value="CONCILIACAO">Conciliação</SelectItem>
                            <SelectItem value="INSTRUCAO">Instrução</SelectItem>
                            <SelectItem value="JULGAMENTO">Sentença/Julgamento</SelectItem>
                            <SelectItem value="PERICIA">Perícia</SelectItem>
                            <SelectItem value="ATENDIMENTO">Atendimento / Reunião</SelectItem>
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
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data do Ato *</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="responsibleParty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Apelido na Agenda</FormLabel>
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
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                          <MapPin className="h-3 w-3" /> Endereço ou Fórum Presencial *
                        </FormLabel>
                        <FormControl>
                          <LocationSearch value={field.value} onSelect={field.onChange} placeholder="Pesquise o fórum ou endereço..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="meetingLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                            <Video className="h-3.5 w-3.5" /> Link da Sala (Virtual)
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Link do Zoom, Meet ou Teams..." className="h-11 bg-black/40 border-primary/20 focus:border-primary font-mono text-[10px]" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="meetingPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                            <Key className="h-3.5 w-3.5" /> Senha de Acesso
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Senha da reunião..." className="h-11 bg-black/40 border-white/10" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="courtBranch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                          <Building className="h-3 w-3" /> Juízo / Vara / Câmara
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 2ª Vara do Trabalho de SBC" className="h-11 bg-black/40 border-white/10" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase text-white tracking-widest">Comunicação ao Cliente</h4>
                        <p className="text-[10px] text-blue-400/70 font-bold uppercase">Notificação obrigatória de ciência</p>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="clientNotified"
                      render={({ field }) => (
                        <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-white/5">
                          <Label htmlFor="notified" className="text-[10px] font-black text-slate-400 uppercase">Cliente Ciente?</Label>
                          <FormControl>
                            <Switch id="notified" checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </div>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-12 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 font-bold gap-2"
                      onClick={generateWhatsAppLink}
                    >
                      <Smartphone className="h-4 w-4" /> Enviar p/ WhatsApp
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-12 border-blue-500/20 text-blue-400 hover:bg-blue-500/10 font-bold gap-2"
                      onClick={generateEmailLink}
                    >
                      <Mail className="h-4 w-4" /> Enviar p/ E-mail
                    </Button>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Pauta da Audiência / Observações</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Chamar testemunha X no dia..." className="h-12 bg-black/40 border-white/10" {...field} />
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
            <Button variant="ghost" type="button" className="text-slate-400 font-bold uppercase text-[10px]">Cancelar</Button>
          </DialogClose>
          <Button 
            type="submit" 
            disabled={isSaving} 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20"
            onClick={() => form.handleSubmit(onSubmit)()}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {isEdit ? 'Salvar Alterações' : 'Confirmar Escala e Distribuir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
