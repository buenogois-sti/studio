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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { updateLeadDetails } from '@/lib/lead-actions';
import type { Lead, Staff } from '@/lib/types';

interface TaskInteractionDialogProps {
  lead: Lead | null;
  task: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lawyers: Staff[];
  onSuccess: (lawyerId?: string) => void;
}

export function TaskInteractionDialog({ 
  lead, 
  task, 
  open, 
  onOpenChange,
  lawyers,
  onSuccess 
}: TaskInteractionDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async (data: any) => {
    if (!lead) return;
    setIsSaving(true);
    try {
      const completed = lead.completedTasks || [];
      const updatedTasks = [...new Set([...completed, task])];
      
      await updateLeadDetails(lead.id, { 
        ...data, 
        completedTasks: updatedTasks 
      });
      
      toast({ title: 'Informações Salvas!' });
      onSuccess(data.lawyerId);
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#020617] border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white font-headline flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> {task}
          </DialogTitle>
          <DialogDescription className="text-slate-400">Complete as informações para prosseguir com a triagem.</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {task === 'Qualificação do Lead' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500">Origem da Captação</Label>
                <Select defaultValue={lead.captureSource} onValueChange={(val) => handleSave({ captureSource: val })}>
                  <SelectTrigger className="bg-black/40 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                    <SelectItem value="Google Search">Google Search</SelectItem>
                    <SelectItem value="Google Ads">Google Ads</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Indicação por Terceiro">Indicação por Terceiro</SelectItem>
                    <SelectItem value="Antigo Cliente">Antigo Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500">Quem indicou? (Se aplicável)</Label>
                <Input 
                  placeholder="Nome do terceiro..." 
                  className="bg-black/40 border-white/10" 
                  defaultValue={lead.referralName}
                  onBlur={(e) => handleSave({ referralName: e.target.value })}
                />
              </div>
            </div>
          )}

          {task === 'Identificação da área jurídica' && (
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500">Área Jurídica de Atuação</Label>
              <Select defaultValue={lead.legalArea} onValueChange={(val) => handleSave({ legalArea: val })}>
                <SelectTrigger className="bg-black/40 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                  <SelectItem value="Trabalhista">⚖️ Trabalhista</SelectItem>
                  <SelectItem value="Cível">🏢 Cível</SelectItem>
                  <SelectItem value="Previdenciário">👴 Previdenciário</SelectItem>
                  <SelectItem value="Família">🏠 Família</SelectItem>
                  <SelectItem value="Outro">🔘 Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {task === 'Direcionamento ao Adv. Responsável' && (
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500">Advogado Titular do Caso</Label>
              <Select defaultValue={lead.lawyerId} onValueChange={(val) => handleSave({ lawyerId: val })}>
                <SelectTrigger className="bg-black/40 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                  {lawyers.map(l => (
                    <SelectItem key={l.id} value={l.id}>Dr(a). {l.firstName} {l.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500 italic mt-2">Após este passo, o sistema abrirá o agendamento para este profissional e o caso será entregue a ele.</p>
            </div>
          )}
        </div>

        <DialogFooter className="bg-white/5 p-4 -m-6 mt-4">
          <DialogClose asChild><Button variant="ghost" className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Fechar</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
