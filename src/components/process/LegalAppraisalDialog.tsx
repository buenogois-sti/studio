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
  Search, 
  UserCheck, 
  Phone,
  User,
  ShieldCheck,
  Smartphone,
  Mail,
  Edit,
  Building
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import type { Process, Hearing, Staff, Client, NotificationMethod } from '@/lib/types';
import { createHearing, updateHearing } from '@/lib/hearing-actions';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit, doc, getDoc } from 'firebase/firestore';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

const appraisalSchema = z.object({
  lawyerId: z.string().min(1, 'Selecione o advogado responsável.'),
  date: z.string().min(1, 'A data é obrigatória.'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora inválida.'),
  location: z.string().min(3, 'O local é obrigatório.'),
  expertName: z.string().min(3, 'O nome do perito é obrigatório.'),
  expertPhone: z.string().optional().or(z.literal('')),
  notes: z.string().optional(),
  clientNotified: z.boolean().default(false),
  notificationMethod: z.enum(['whatsapp', 'email', 'phone', 'personal', 'court', 'other']).optional(),
  responsibleParty: z.string().min(3, 'O apelido na agenda é obrigatório.'),
  cep: z.string().optional(),
  locationName: z.string().optional(),
  locationNumber: z.string().optional(),
  locationComplement: z.string().optional(),
  locationObservations: z.string().optional(),
  requiresLawyer: z.boolean().default(false),
});

interface LegalAppraisalDialogProps {
  process?: Process | null;
  appraisal?: Hearing | null; // Use Hearing type since we unified them
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LegalAppraisalDialog({ process, appraisal, open, onOpenChange, onSuccess }: LegalAppraisalDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [clientData, setClientData] = React.useState<Client | null>(null);
  const [processData, setProcessData] = React.useState<Process | null>(null);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const isEdit = !!appraisal;

  const staffQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'staff'), limit(50)) : null, [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);
  const lawyers = staffData?.filter(s => s.role === 'lawyer' || s.role === 'partner' || s.role === 'intern') || [];

  const form = useForm<z.infer<typeof appraisalSchema>>({
    resolver: zodResolver(appraisalSchema),
    defaultValues: {
      lawyerId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '09:00',
      location: '',
      expertName: '',
      expertPhone: '',
      notes: '',
      clientNotified: false,
      notificationMethod: 'whatsapp',
      responsibleParty: '',
      cep: '',
      locationName: '',
      locationNumber: '',
      locationComplement: '',
      locationObservations: '',
      requiresLawyer: false,
    }
  });

  React.useEffect(() => {
    if (open) {
      if (appraisal) {
        const hDate = appraisal.date.toDate();
        form.reset({
          lawyerId: appraisal.lawyerId,
          date: format(hDate, 'yyyy-MM-dd'),
          time: format(hDate, 'HH:mm'),
          location: appraisal.location,
          expertName: appraisal.expertName || '',
          expertPhone: appraisal.expertPhone || '',
          notes: appraisal.notes || '',
          clientNotified: !!appraisal.clientNotified,
          notificationMethod: appraisal.notificationMethod || 'whatsapp',
          responsibleParty: appraisal.responsibleParty || '',
          cep: appraisal.cep || '',
          locationName: appraisal.locationName || '',
          locationNumber: appraisal.locationNumber || '',
          locationComplement: appraisal.locationComplement || '',
          locationObservations: appraisal.locationObservations || '',
          requiresLawyer: !!appraisal.requiresLawyer,
        });

        if (appraisal.processId && firestore) {
          getDoc(doc(firestore, 'processes', appraisal.processId)).then(pSnap => {
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
  }, [process, appraisal, open, lawyers.length, firestore, form]);

  const handleCEPLookup = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      if (!data.erro) {
        const address = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
        form.setValue('location', address);
      }
    } catch (error) {
      console.error('CEP lookup failed:', error);
    }
  };

  const generateWhatsAppLink = () => {
    if (!clientData?.mobile) {
      toast({ variant: 'destructive', title: 'WhatsApp indisponível', description: 'O cliente não possui celular cadastrado.' });
      return;
    }
    const values = form.getValues();
    const [year, month, day] = values.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dateFmt = format(dateObj, "dd/MM (EEEE)", { locale: ptBR });
    
    const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${values.locationName ? `${values.locationName}, ` : ''}${values.location}${values.locationNumber ? `, ${values.locationNumber}` : ''}${values.cep ? `, ${values.cep}` : ''}`)}`;

    const msgParts = [
      `Olá, ${clientData.firstName.trim()}! Sou do escritório Bueno Gois Advogados.`,
      '',
      `Informamos que sua *PERÍCIA JUDICIAL* foi agendada:`,
      `📅 Data: *${dateFmt}*`,
      `🕘 Horário: *${values.time}*`,
      `📍 Local: *${values.locationName ? `${values.locationName} - ` : ''}${values.location}${values.locationNumber ? `, ${values.locationNumber}` : ''}${values.locationComplement ? ` (${values.locationComplement})` : ''}*`,
      `⚖️ Presença Advogado: *${values.requiresLawyer ? 'NECESSÁRIA' : 'SOMENTE CLIENTE'}*`,
      `🔍 Perito: *${values.expertName}*`
    ];

    if (values.locationObservations) {
      msgParts.push(`🏠 Observação Local: *${values.locationObservations}*`);
    }

    msgParts.push(`🗺️ Link do Local: ${googleMapsLink}`);

    const currentProcess = process || processData;
    msgParts.push('', `🔢 *PROCESSO:* ${currentProcess?.processNumber || '---'}`, '', 'Favor confirmar o recebimento desta mensagem.');

    const message = msgParts.join('\n');
    const cleanPhone = clientData.mobile.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
    form.setValue('clientNotified', true);
    form.setValue('notificationMethod', 'whatsapp');
  };

  const onSubmit = async (values: z.infer<typeof appraisalSchema>) => {
    const targetProcess = process || processData || { id: appraisal?.processId || '', name: appraisal?.processName || '' };
    if (!targetProcess.id) return;

    setIsSaving(true);
    try {
      const dateTimeStr = `${values.date}T${values.time}`;
      
      if (isEdit && appraisal) {
        await updateHearing(appraisal.id, {
          ...values,
          type: 'PERICIA',
          date: dateTimeStr as any,
          cep: values.cep,
          locationName: values.locationName,
          locationNumber: values.locationNumber,
          locationComplement: values.locationComplement,
          locationObservations: values.locationObservations,
          requiresLawyer: values.requiresLawyer
        });
        toast({ title: 'Perícia Atualizada!', description: 'O compromisso foi sincronizado.' });
      } else {
        await createHearing({
          ...values,
          type: 'PERICIA',
          status: 'PENDENTE',
          processId: targetProcess.id,
          processName: targetProcess.name,
          hearingDate: dateTimeStr,
          cep: values.cep,
          locationName: values.locationName,
          locationNumber: values.locationNumber,
          locationComplement: values.locationComplement,
          locationObservations: values.locationObservations,
          requiresLawyer: values.requiresLawyer
        });
        toast({ title: 'Perícia Agendada!', description: 'O compromisso foi adicionado à pauta global.' });
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
      <DialogContent className="sm:max-w-2xl bg-[#020617] border-white/10 text-white h-[85vh] flex flex-col p-0 shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
            {isEdit ? <Edit className="h-6 w-6 text-primary" /> : <Search className="h-6 w-6 text-primary" />}
            {isEdit ? 'Editar Perícia Judicial' : 'Agendar Perícia Judicial'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isEdit ? 'Ajuste os dados da perícia para:' : 'Configure os detalhes técnicos da perícia para:'} <span className="font-bold text-white">{process?.name || processData?.name || appraisal?.processName}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-white/5 border border-white/10">
                  <FormField
                    control={form.control}
                    name="lawyerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Advogado Responsável *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 bg-black/40 border-white/10">
                              <SelectValue placeholder="Selecione o advogado..." />
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
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Apelido na Agenda *</FormLabel>
                        <FormControl><Input placeholder="Ex: Dr. Alan" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="expertName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                             <User className="h-3 w-3 text-primary" /> Nome do Perito *
                          </FormLabel>
                          <FormControl><Input placeholder="Nome do perito judicial..." className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expertPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                             <Phone className="h-3 w-3 text-primary" /> Telefone do Perito / Assistente
                          </FormLabel>
                          <FormControl><Input placeholder="(00) 00000-0000" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data da Perícia *</FormLabel>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">CEP (Busca Rápida)</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input 
                              placeholder="00000-000" 
                              className="h-11 bg-black/40 border-white/10" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e);
                                if (e.target.value.length >= 8) handleCEPLookup(e.target.value);
                              }}
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2 space-y-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                             <MapPin className="h-3 w-3 text-primary" /> Local da Perícia *
                          </FormLabel>
                          <FormControl>
                            <LocationSearch value={field.value} onSelect={field.onChange} placeholder="Endereço exato da perícia..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="locationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                           <Building className="h-3 w-3 text-primary" /> Nome do Local (Prédio, Clínica, etc)
                        </FormLabel>
                        <FormControl><Input placeholder="Ex: Clínica São José" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="locationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Número</FormLabel>
                          <FormControl><Input placeholder="Ex: 123" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="locationComplement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Complemento</FormLabel>
                          <FormControl><Input placeholder="Ex: Sala 4" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="locationObservations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Observações do Local (Trabalho, Bloco, etc)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: No prédio da recepção, fundos do pátio..." className="h-11 bg-black/40 border-white/10" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-6">
                  <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="text-sm font-black uppercase text-white tracking-widest">Presença do Advogado</h4>
                        <p className="text-[10px] text-primary/70 font-bold uppercase tracking-tighter">O advogado deve acompanhar o cliente?</p>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="requiresLawyer"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="text-sm font-black uppercase text-white tracking-widest">Aviso ao Cliente</h4>
                        <p className="text-[10px] text-primary/70 font-bold uppercase tracking-tighter">O cliente já foi avisado/enviar convite?</p>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="clientNotified"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-11 border-primary/20 text-primary hover:bg-primary/10 font-bold gap-2"
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
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Orientações Adicionais</FormLabel>
                      <FormControl><Input placeholder="Ex: Levar exames originais..." className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

              </form>
            </Form>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 gap-3">
          <DialogClose asChild><Button variant="ghost" className="text-slate-400 font-bold uppercase text-[10px]">Cancelar</Button></DialogClose>
          <Button 
            disabled={isSaving} 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20"
            onClick={() => form.handleSubmit(onSubmit)()}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {isEdit ? 'Salvar Alterações' : 'Confirmar e Agendar Perícia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
