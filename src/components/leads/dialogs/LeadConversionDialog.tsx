'use client';

import * as React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FolderKanban, 
  Bot, 
  Loader2, 
  DollarSign, 
  Plus, 
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { extractProtocolData } from '@/ai/flows/extract-protocol-data-flow';
import type { Lead, Staff, TimelineEvent } from '@/lib/types';

export const conversionSchema = z.object({
  processNumber: z.string().min(10, 'O número CNJ é obrigatório para protocolar.'),
  court: z.string().min(3, 'O fórum/comarca é obrigatório.'),
  courtBranch: z.string().min(3, 'A vara judiciária é obrigatória.'),
  caseValue: z.coerce.number().min(0, 'Informe o valor da causa.'),
  leadLawyerId: z.string().min(1, 'Defina o advogado responsável.'),
  commissionStaffId: z.string().optional().or(z.literal('')),
  opposingParties: z.array(z.object({
    name: z.string().min(1, 'Nome do réu é obrigatório'),
    document: z.string().optional(),
    address: z.string().optional(),
  })).min(1, 'Pelo menos um réu deve ser qualificado.'),
});

interface LeadConversionDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (data: z.infer<typeof conversionSchema>) => void;
  lawyers: Staff[];
  commissionableStaff: Staff[];
}

export function LeadConversionDialog({ 
  lead, 
  open, 
  onOpenChange, 
  onConfirm, 
  lawyers, 
  commissionableStaff 
}: LeadConversionDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof conversionSchema>>({
    resolver: zodResolver(conversionSchema),
    defaultValues: { 
      processNumber: '', 
      court: '', 
      courtBranch: '', 
      caseValue: 0, 
      leadLawyerId: '', 
      commissionStaffId: '', 
      opposingParties: [{ name: '', document: '', address: '' }] 
    }
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "opposingParties" });

  React.useEffect(() => {
    if (lead && open) {
      form.setValue('leadLawyerId', lead.lawyerId);
      form.setValue('caseValue', 0);
    }
  }, [lead, open, form]);

  const handleAIAnalysis = async () => {
    if (!lead) return;
    setIsAnalyzing(true);
    try {
      const result = await extractProtocolData({
        leadTitle: lead.title,
        leadDescription: lead.description || '',
        timelineNotes: lead.timeline?.map((e: TimelineEvent) => e.description) || []
      });
      if (result) {
        form.setValue('processNumber', result.suggestedProcessNumber);
        form.setValue('court', result.suggestedCourt);
        form.setValue('courtBranch', result.suggestedCourtBranch);
        form.setValue('caseValue', result.suggestedCaseValue);
        toast({ title: 'Análise Concluída!', description: result.reasoning });
      }
    } catch (e) { 
      toast({ variant: 'destructive', title: 'Falha na IA', description: 'Não foi possível extrair dados automáticos.' }); 
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#020617] border-white/10 text-white p-0 h-[90vh] flex flex-col shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-black font-headline">Distribuição Processual</DialogTitle>
                <DialogDescription className="text-slate-400">Converta o lead em um processo ativo na pauta do escritório.</DialogDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleAIAnalysis} disabled={isAnalyzing} className="h-10 border-primary/20 text-primary gap-2 font-bold px-4">
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} Sugestão IA
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Form {...form}>
              <form id="conversion-form" onSubmit={form.handleSubmit(onConfirm)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="processNumber" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Número CNJ *</FormLabel><FormControl><Input placeholder="0000000-00.0000.0.00.0000" className="bg-black/40 border-white/10 font-mono" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="caseValue" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Valor da Causa *</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" /><Input type="number" step="0.01" className="bg-black/40 border-white/10 pl-9 font-bold" {...field} /></div></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="court" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Tribunal / Fórum *</FormLabel><FormControl><Input placeholder="Ex: TRT2 - São Bernardo do Campo" className="bg-black/40 border-white/10" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="courtBranch" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Vara / Câmara *</FormLabel><FormControl><Input placeholder="Ex: 2ª Vara do Trabalho" className="bg-black/40 border-white/10" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="leadLawyerId" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Advogado Responsável (Requalificação) *</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-12 text-base font-bold"><SelectValue placeholder="Selecione o titular do caso..." /></SelectTrigger></FormControl>
                    <SelectContent className="bg-[#0f172a] border-white/10 text-white">{lawyers.map(l => <SelectItem key={l.id} value={l.id} className="font-bold">Dr(a). {l.firstName}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="commissionStaffId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-amber-500">Colaborador Comissionado (Estagiário/Consultor)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-amber-500/5 border-amber-500/20 h-12 text-base font-bold text-amber-500">
                          <SelectValue placeholder="Ninguém (Sem comissão vinculada)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                        <SelectItem value="none" className="text-slate-500 italic">Nenhum (Sem comissão)</SelectItem>
                        {commissionableStaff.map(s => (
                          <SelectItem key={s.id} value={s.id} className="font-bold">
                            {s.role === 'intern' ? '🎓 ' : '👤 '}{s.firstName} {s.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[9px] text-slate-500 italic">O sistema aplicará a regra de 10% ou valor fixo conforme o perfil deste colaborador.</p>
                  </FormItem>
                )} />

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between"><FormLabel className="text-[10px] font-black uppercase text-slate-500">Qualificação dos Réus *</FormLabel><Button type="button" variant="ghost" size="sm" onClick={() => append({ name: '', document: '', address: '' })} className="text-primary font-bold uppercase text-[9px] h-7 gap-1"><Plus className="h-3 w-3" /> Adicionar Réu</Button></div>
                  <div className="grid gap-4">{fields.map((field, index) => (
                    <div key={field.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4 animate-in slide-in-from-right-2">
                      <div className="flex gap-4"><FormField control={form.control} name={`opposingParties.${index}.name` as any} render={({ field: nameF }) => (<FormItem className="flex-1"><FormControl><Input placeholder="Nome do Réu..." className="bg-black/20 border-white/5" {...nameF} /></FormControl></FormItem>)} /><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-rose-500 hover:bg-rose-500/10 h-10 w-10 shrink-0"><Trash2 className="h-4 w-4" /></Button></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={form.control} name={`opposingParties.${index}.document` as any} render={({ field: docF }) => (<FormItem><FormControl><Input placeholder="CNPJ/CPF..." className="bg-black/20 border-white/5 font-mono text-xs" {...docF} /></FormControl></FormItem>)} /><FormField control={form.control} name={`opposingParties.${index}.address` as any} render={({ field: addrF }) => (<FormItem><FormControl><Input placeholder="Endereço Completo..." className="bg-black/20 border-white/5 text-xs" {...addrF} /></FormControl></FormItem>)} /></div>
                    </div>
                  ))}</div>
                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>
        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 gap-3">
          <DialogClose asChild><Button variant="ghost" className="flex-1 text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12">Cancelar</Button></DialogClose>
          <Button type="submit" form="conversion-form" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] h-12 shadow-xl shadow-emerald-900/20">
            Protocolar e Migrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
