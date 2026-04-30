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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ClipboardList, 
  RefreshCw, 
  AlertTriangle, 
  Target, 
  Activity,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { updateLeadDetails } from '@/lib/lead-actions';
import type { Lead, ChecklistTemplate, ChecklistExecution } from '@/lib/types';

interface LeadChecklistDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}

export function LeadChecklistDialog({ lead, open, onOpenChange, onSuccess }: LeadChecklistDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isAutosaving, setIsAutosaving] = React.useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [currentExecutionId, setCurrentExecutionId] = React.useState<string | null>(null);

  const templatesQuery = React.useMemo(
    () => (firestore ? query(collection(firestore, 'checklist_templates'), where('isActive', '==', true)) : null),
    [firestore]
  );
  const { data: templates } = useCollection<ChecklistTemplate>(templatesQuery);

  const filteredTemplates = React.useMemo(() => {
    if (!templates || !lead) return [];
    
    const normalize = (val: string) => 
      val.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

    const leadArea = normalize(lead.legalArea || '');

    return templates.filter(t => {
      if (!t.legalArea) return true;
      return normalize(t.legalArea) === leadArea;
    });
  }, [templates, lead]);

  const selectedTemplate = React.useMemo(() => 
    filteredTemplates.find(t => t.id === selectedTemplateId), 
    [filteredTemplates, selectedTemplateId]
  );

  // Auto-selecionar se houver apenas um
  React.useEffect(() => {
    if (filteredTemplates.length === 1 && !selectedTemplateId) {
      setSelectedTemplateId(filteredTemplates[0].id);
    }
  }, [filteredTemplates, selectedTemplateId]);

  const handleUpdateAnswer = async (itemId: string, value: any) => {
    const newAnswers = { ...answers, [itemId]: value };
    setAnswers(newAnswers);
    
    if (!lead || !firestore || !selectedTemplate || !user) return;
    
    setIsAutosaving(true);
    try {
      const executionId = currentExecutionId || uuidv4();
      if (!currentExecutionId) setCurrentExecutionId(executionId);

      const execution: ChecklistExecution = {
        id: executionId,
        templateId: selectedTemplate.id,
        templateTitle: selectedTemplate.title,
        userId: user.uid,
        userName: user.displayName || 'Usuário',
        leadId: lead.id,
        leadTitle: lead.title,
        answers: newAnswers,
        status: 'DRAFT',
        executedAt: Timestamp.now() as any
      };

      await setDoc(doc(firestore, 'checklist_executions', executionId), execution);
      
      // Sincroniza respostas para o Lead
      await updateLeadDetails(lead.id, { 
        interviewAnswers: { ...(lead.interviewAnswers || {}), ...newAnswers }
      });
    } catch (e) {
      console.error("Autosave error:", e);
    } finally {
      setTimeout(() => setIsAutosaving(false), 800);
    }
  };

  const handleFinalize = async () => {
    if (!lead || !firestore || !selectedTemplate || !currentExecutionId) {
        toast({ variant: 'destructive', title: 'Atenção', description: 'Preencha pelo menos um item antes de finalizar.' });
        return;
    }
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'checklist_executions', currentExecutionId), {
        status: 'COMPLETED',
        executedAt: Timestamp.now()
      });
      
      await updateLeadDetails(lead.id, { 
        completedTasks: [...new Set([...(lead.completedTasks || []), 'Preenchimento de checklists', 'Entrevista técnica realizada'])]
      });

      toast({ title: 'Entrevista Finalizada!', description: 'Dados salvos e sincronizados com sucesso.' });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao finalizar', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl w-[95vw] bg-[#020617] border-white/10 text-white p-0 overflow-hidden shadow-2xl flex flex-col h-[90vh]">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black font-headline tracking-tight uppercase">Atendimento Estratégico</DialogTitle>
                <DialogDescription className="text-slate-400">Padrão Bueno Gois: Inteligência e Precisão na Coleta de Dados.</DialogDescription>
              </div>
            </div>

            {isAutosaving && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-pulse">
                <RefreshCw className="h-3 w-3 text-emerald-500 animate-spin" />
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Sincronizando...</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/4 border-r border-white/5 bg-black/20 p-6 space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Modelos Disponíveis</p>
              <p className="text-[9px] text-slate-600 font-bold uppercase">Baseado na área: {lead.legalArea}</p>
            </div>
            <ScrollArea className="h-full pr-4 pb-20">
              <div className="space-y-3">
                {filteredTemplates.length > 0 ? filteredTemplates.map(t => (
                  <Button 
                    key={t.id} 
                    variant={selectedTemplateId === t.id ? 'secondary' : 'ghost'} 
                    onClick={() => { setSelectedTemplateId(t.id); setAnswers({}); setCurrentExecutionId(null); }}
                    className={cn(
                      "w-full justify-start text-left h-auto py-4 px-4 rounded-2xl border transition-all duration-300",
                      selectedTemplateId === t.id 
                        ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/10" 
                        : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10 text-slate-400"
                    )}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className={cn("text-xs font-black truncate uppercase tracking-tight", selectedTemplateId === t.id ? "text-black" : "text-white")}>
                        {t.title}
                      </span>
                      <span className={cn("text-[9px] font-bold opacity-60 truncate", selectedTemplateId === t.id ? "text-black/70" : "text-slate-500")}>
                        {t.items.length} campos • {t.description}
                      </span>
                    </div>
                  </Button>
                )) : (
                  <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                    <p className="text-[10px] font-black uppercase text-slate-500">Nenhum modelo<br/>configurado</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col bg-[#010409]">
            <ScrollArea className="flex-1 px-10 py-8">
              {selectedTemplate ? (
                <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl mb-8">
                    <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-tight flex items-center gap-2">
                      <Target className="h-3 w-3" /> As respostas abaixo serão usadas para análise de viabilidade e geração de documentos.
                    </p>
                  </div>

                  {selectedTemplate.items.map((item, idx) => (
                    <div key={item.id} className="group space-y-4">
                      <div className="flex items-start gap-4">
                        <span className="flex items-center justify-center h-7 w-7 rounded-xl bg-white/5 text-slate-400 text-[11px] font-black shrink-0 border border-white/10 group-focus-within:border-amber-500/50 group-focus-within:text-amber-500 transition-all">
                          {idx + 1}
                        </span>
                        <div className="flex-1 pt-1">
                          <Label className="text-sm font-black text-slate-200 uppercase tracking-tight leading-tight">
                            {item.label}
                            {item.required && <span className="text-rose-500 ml-1.5 font-bold">*</span>}
                          </Label>
                        </div>
                      </div>
                      
                      <div className="pl-11 pr-4">
                        {item.type === 'YES_NO' && (
                          <RadioGroup onValueChange={(v) => handleUpdateAnswer(item.id, v)} value={answers[item.id]}>
                            <div className="flex gap-3">
                              <div className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all cursor-pointer",
                                answers[item.id] === 'P' ? "bg-amber-500/20 border-amber-500 text-amber-500" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                              )}>
                                <RadioGroupItem value="P" id={`${item.id}-y`} className="border-slate-500" />
                                <Label htmlFor={`${item.id}-y`} className="text-xs font-black uppercase tracking-widest cursor-pointer ml-1">Sim</Label>
                              </div>
                              <div className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all cursor-pointer",
                                answers[item.id] === 'N' ? "bg-rose-500/20 border-rose-500 text-rose-500" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                              )}>
                                <RadioGroupItem value="N" id={`${item.id}-n`} className="border-slate-500" />
                                <Label htmlFor={`${item.id}-n`} className="text-xs font-black uppercase tracking-widest cursor-pointer ml-1">Não</Label>
                              </div>
                            </div>
                          </RadioGroup>
                        )}
                        {item.type === 'TEXT' && (
                          <Textarea 
                            placeholder="Descreva detalhadamente..." 
                            className="bg-black/60 border-white/10 text-sm rounded-2xl min-h-[120px] focus:border-amber-500/50 focus:ring-amber-500/20 transition-all p-4 leading-relaxed" 
                            onBlur={(e) => handleUpdateAnswer(item.id, e.target.value)}
                            defaultValue={answers[item.id]}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="h-20" /> {/* Espaçamento final */}
                </div>
              ) : (
                <div className="h-[60vh] flex flex-col items-center justify-center text-center p-12 space-y-4">
                  <div className="h-24 w-24 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/5">
                    <Activity className="h-10 w-10 text-slate-600 animate-pulse" />
                  </div>
                  <div className="max-w-xs">
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">Aguardando Seleção</p>
                    <p className="text-[11px] text-slate-600 font-bold uppercase leading-relaxed">Selecione um modelo de checklist à esquerda para iniciar a coleta de dados técnicos.</p>
                  </div>
                </div>
              )}
            </ScrollArea>

            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Processo Interno</span>
                <span className="text-xs font-black text-white uppercase">{lead.title}</span>
              </div>
              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12 px-8">Salvar Rascunho</Button>
                <Button 
                  onClick={handleFinalize} 
                  disabled={isSaving || !selectedTemplate} 
                  className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest text-[10px] h-12 px-10 rounded-xl shadow-xl shadow-amber-500/10"
                >
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Finalizar Atendimento
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
