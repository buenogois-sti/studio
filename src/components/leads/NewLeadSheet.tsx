'use client';

import * as React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription, 
  SheetFooter 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { createLead } from '@/lib/lead-actions';
import { ClientSearchInput } from '@/components/process/ClientSearchInput';
import { ClientCreationModal } from '@/components/process/ClientCreationModal';
import type { Staff } from '@/lib/types';

export const leadFormSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente.'),
  lawyerId: z.string().min(1, 'Selecione um advogado.'),
  title: z.string().min(5, 'Mínimo 5 caracteres.'),
  legalArea: z.string().min(1, 'Selecione a área.'),
  priority: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).default('MEDIA'),
  captureSource: z.string().min(1, 'Selecione a fonte.'),
  referralName: z.string().optional(),
  referralType: z.string().optional(),
  isUrgent: z.boolean().default(false),
  prescriptionDate: z.string().optional().or(z.literal('')),
  description: z.string().optional(),
  interviewerId: z.string().optional(),
});

interface NewLeadSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lawyers: Staff[];
  interviewers: Staff[];
  onSuccess: (leadId: string) => void;
}

export function NewLeadSheet({ open, onOpenChange, lawyers, interviewers, onSuccess }: NewLeadSheetProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [showClientModal, setShowClientModal] = React.useState(false);

  const form = useForm<z.infer<typeof leadFormSchema>>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: { 
      title: '', 
      clientId: '', 
      lawyerId: '', 
      legalArea: '', 
      priority: 'MEDIA', 
      captureSource: '', 
      description: '', 
      isUrgent: false,
      interviewerId: ''
    }
  });

  const onSubmit = async (values: z.infer<typeof leadFormSchema>) => {
    setIsSaving(true);
    try {
      const result = await createLead(values);
      toast({ title: 'Lead Criado com Sucesso!', description: 'Iniciando fluxo de triagem.' });
      onSuccess(result.leadId);
      onOpenChange(false);
      form.reset();
    } catch (e: any) { 
      toast({ variant: 'destructive', title: 'Erro ao criar lead', description: e.message }); 
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[85vw] p-0 bg-[#020617] border-white/10 flex flex-col shadow-2xl">
        <SheetHeader className="p-8 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Target className="h-7 w-7 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-white">Nova Triagem de Oportunidade</SheetTitle>
              <SheetDescription className="text-slate-400 text-sm">Qualifique o lead para iniciar o atendimento estratégico.</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            <Form {...form}>
              <form id="new-lead-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Cliente Principal *</FormLabel>
                    <ClientSearchInput selectedClientId={field.value} onSelect={(c) => field.onChange(c.id)} onCreateNew={() => setShowClientModal(true)} />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Título da Demanda *</FormLabel>
                    <Input placeholder="Ex: Revisional de Horas Extras..." className="h-11 bg-black/40 border-white/10 rounded-lg font-bold" {...field} />
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="lawyerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Advogado Responsável *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                          {lawyers.map(l => <SelectItem key={l.id} value={l.id} className="font-bold">Dr(a). {l.firstName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="interviewerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Interrevistador (Triagem)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                          {interviewers.map(l => <SelectItem key={l.id} value={l.id} className="font-bold">{l.firstName}</SelectItem>)}
                          <Separator className="bg-white/5 my-1" />
                          <SelectItem value="Outros" className="font-bold text-slate-400 italic">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="legalArea" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Área Jurídica *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                          {['Trabalhista', 'Cível', 'Previdenciário', 'Família', 'Outro'].map(area => <SelectItem key={area} value={area} className="font-bold">{area}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                          <SelectItem value="BAIXA">Baixa</SelectItem>
                          <SelectItem value="MEDIA">Média</SelectItem>
                          <SelectItem value="ALTA">Alta</SelectItem>
                          <SelectItem value="CRITICA">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="prescriptionDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-rose-500 tracking-widest ml-1 flex items-center gap-1.5"><AlertCircle className="h-3 w-3" /> Data de Prescrição</FormLabel>
                      <FormControl><Input type="date" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="captureSource" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Fonte de Captação *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                        <SelectItem value="Indicação">🤝 Indicação</SelectItem>
                        <SelectItem value="Google Search">🔍 Google Search</SelectItem>
                        <SelectItem value="Instagram">📸 Instagram</SelectItem>
                        <SelectItem value="Facebook">👥 Facebook</SelectItem>
                        <SelectItem value="Site Oficial">🌐 Site Oficial</SelectItem>
                        <SelectItem value="Antigo Cliente">🔄 Antigo Cliente</SelectItem>
                        <SelectItem value="Outros">🔘 Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Briefing Inicial</FormLabel>
                    <Textarea className="bg-black/40 border-white/10 h-32 rounded-xl p-4 resize-none leading-relaxed text-sm font-medium" placeholder="Relato inicial do cliente..." {...field} />
                  </FormItem>
                )} />
              </form>
            </Form>
          </div>
        </ScrollArea>
        <SheetFooter className="p-6 border-t border-white/5 bg-white/[0.02] gap-4 shrink-0 flex-row">
          <Button variant="ghost" className="flex-1 text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="new-lead-form" disabled={isSaving} className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] h-12 rounded-lg shadow-lg shadow-primary/20">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />} 
            Iniciar Triagem
          </Button>
        </SheetFooter>
        <ClientCreationModal open={showClientModal} onOpenChange={setShowClientModal} onClientCreated={(c) => form.setValue('clientId', c.id)} />
      </SheetContent>
    </Sheet>
  );
}
