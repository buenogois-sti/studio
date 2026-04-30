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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ClipboardList, 
  Loader2, 
  Save, 
  Search, 
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  FileText,
  History,
  Zap,
  Bot
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { updateLeadDetails } from '@/lib/lead-actions';
import { db } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Lead, ChecklistTemplate } from '@/lib/types';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface ExecuteInterviewDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}

export function ExecuteInterviewDialog({ 
  lead, 
  open, 
  onOpenChange, 
  onSuccess 
}: ExecuteInterviewDialogProps) {
  const [step, setStep] = React.useState<'select' | 'form' | 'finished'>('select');
  const [templates, setTemplates] = React.useState<ChecklistTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<ChecklistTemplate | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [aiSummary, setAiSummary] = React.useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      fetchTemplates();
      setStep('select');
      setSelectedTemplate(null);
      setAnswers({});
      setAiSummary(null);
    }
  }, [open]);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const q = query(collection(db, 'checklist_templates'), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChecklistTemplate));
      setTemplates(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = (t.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                          (t.legalArea?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    if (searchQuery) return matchesSearch;
    
    if (lead?.legalArea) {
      return (t.legalArea?.toLowerCase() || '') === lead.legalArea.toLowerCase();
    }
    
    return matchesSearch;
  });

  const handleSelectTemplate = (template: ChecklistTemplate) => {
    setSelectedTemplate(template);
    const initialAnswers: Record<string, any> = {};
    template.items.forEach(item => {
      initialAnswers[item.id] = '';
    });
    setAnswers(initialAnswers);
    setStep('form');
  };

  const handleSave = async () => {
    if (!lead || !selectedTemplate) return;
    setIsSaving(true);
    try {
      const newInterview = {
        id: uuidv4(),
        templateId: selectedTemplate.id,
        templateTitle: selectedTemplate.title,
        answers: answers,
        executedAt: Timestamp.now(),
      };

      const interviews = lead.interviews || [];
      await updateLeadDetails(lead.id, { 
        interviews: [...interviews, newInterview],
        completedTasks: [...new Set([...(lead.completedTasks || []), 'Entrevista técnica realizada'])]
      });

      setStep('finished');
    } catch (e: any) { 
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message }); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleGenerateAiSummary = async () => {
    setIsSummarizing(true);
    try {
      // Simulando processamento da IA com os dados colhidos
      await new Promise(r => setTimeout(r, 2000));
      const summary = "Com base nas respostas, o cliente apresenta um caso sólido de vínculo empregatício. O período laborado sem registro totaliza 14 meses. Recomenda-se pleitear verbas rescisórias, FGTS e multas do Art. 467 e 477 da CLT.";
      setAiSummary(summary);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f172a] border-white/10 text-white shadow-2xl sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-black font-headline uppercase tracking-tight text-white">
                {step === 'select' ? 'Selecionar Matriz DNA' : step === 'finished' ? 'Atendimento Concluído' : 'Executar Atendimento'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                {step === 'select' ? 'Escolha o roteiro técnico para esta sessão.' : step === 'finished' ? 'O histórico foi atualizado com sucesso.' : `Matriz: ${selectedTemplate?.title}`}
              </DialogDescription>
            </div>
            {step === 'form' && (
              <div className="text-right">
                <div className="text-[12px] font-black uppercase text-primary mb-1">Progresso</div>
                <div className="text-xs font-bold text-white">
                  {Object.values(answers).filter(a => !!a).length} / {selectedTemplate?.items.length}
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' ? (
            <div className="space-y-4">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  className="bg-black/40 border-white/10 pl-10 h-12" 
                  placeholder="Buscar roteiro ou área jurídica..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {!searchQuery && lead?.legalArea && (
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <p className="text-[12px] font-black uppercase text-slate-500 tracking-widest">
                    Filtrando Matrizes de: <span className="text-primary">{lead.legalArea}</span>
                  </p>
                </div>
              )}
              
              {isLoadingTemplates ? (
                <div className="h-40 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <div className="grid gap-3">
                  {filteredTemplates.length > 0 ? (
                    filteredTemplates.map((template) => (
                      <button 
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/40 hover:bg-white/5 transition-all group text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 group-hover:bg-primary/20 transition-colors">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-white uppercase tracking-tight">{template.title}</p>
                            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">{template.legalArea} • {template.items.length} Campos</p>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-600 group-hover:text-primary transition-colors" />
                      </button>
                    ))
                  ) : (
                    <div className="h-40 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                      <p className="text-sm font-black text-slate-500 uppercase">Nenhuma matriz encontrada</p>
                      <p className="text-xs text-slate-600 mt-1">Tente buscar por outro termo ou área jurídica.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : step === 'form' ? (
            <div className="grid grid-cols-12 gap-6 h-full">
              {/* Questionário Principal */}
              <div className="col-span-12 lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                {selectedTemplate?.items.map((item) => (
                  <div key={item.id} className="space-y-3 bg-white/[0.01] p-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[12px] font-black uppercase text-slate-400 tracking-widest ml-1">{item.label} {item.required && <span className="text-rose-500">*</span>}</Label>
                      {item.tag && <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter border-primary/20 text-primary bg-primary/5">Tag: {item.tag}</Badge>}
                    </div>
                    {item.type === 'TEXT' ? (
                      <Textarea 
                        className="bg-black/40 border-white/10 min-h-[100px] resize-none leading-relaxed focus:border-primary/50 text-sm" 
                        placeholder="Registre a resposta ou observação..."
                        value={answers[item.id]}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [item.id]: e.target.value }))}
                      />
                    ) : item.type === 'NUMBER' ? (
                      <Input 
                        type="number"
                        className="bg-black/40 border-white/10 h-12" 
                        value={answers[item.id]}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [item.id]: e.target.value }))}
                      />
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {(item.options || ['Sim', 'Não', 'Não sabe']).map(opt => (
                          <Button 
                            key={opt}
                            type="button"
                            variant="outline"
                            onClick={() => setAnswers(prev => ({ ...prev, [item.id]: opt }))}
                            className={cn(
                              "h-10 font-black uppercase tracking-widest text-[11px] border-white/5",
                              answers[item.id] === opt ? "bg-primary text-black border-primary" : "bg-white/5 text-slate-400"
                            )}
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Resumo em Tempo Real */}
              <div className="hidden lg:block lg:col-span-4 sticky top-0 h-fit space-y-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                    <History className="h-3.5 w-3.5" /> Resumo Estruturado
                  </h4>
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedTemplate?.items.map(item => answers[item.id] && (
                      <div key={item.id} className="space-y-1 animate-in fade-in zoom-in-95">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{item.label}</p>
                        <p className="text-[12px] font-bold text-slate-200 leading-tight uppercase">{answers[item.id]}</p>
                      </div>
                    ))}
                    {Object.keys(answers).filter(k => !!answers[k]).length === 0 && (
                      <p className="text-[11px] font-bold text-slate-600 uppercase italic">Aguardando preenchimento...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto py-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="h-20 w-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tight text-white">Atendimento Registrado</h3>
                <p className="text-slate-400 text-sm">As informações foram salvas no histórico do lead e estão prontas para processamento.</p>
              </div>

              {!aiSummary ? (
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Zap className="h-5 w-5" />
                    <span className="text-xs font-black uppercase tracking-widest">Inteligência de Caso</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">Deseja que a IA elabore um resumo executivo com base nas respostas colhidas?</p>
                  <Button 
                    onClick={handleGenerateAiSummary} 
                    disabled={isSummarizing}
                    className="w-full bg-primary text-black font-black uppercase text-[12px] tracking-widest h-12 shadow-lg shadow-primary/20"
                  >
                    {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bot className="h-4 w-4 mr-2" />}
                    Gerar Resumo IA
                  </Button>
                </div>
              ) : (
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-left space-y-3 animate-in fade-in duration-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><Bot className="h-3.5 w-3.5" /> Parecer Preliminar</span>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-slate-500 hover:text-white"><Save className="h-3 w-3 mr-1.5" /> Salvar Nota</Button>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed font-medium italic border-l-2 border-primary/30 pl-4 py-1 uppercase">
                    "{aiSummary}"
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 flex-row gap-4">
          {step === 'form' && (
            <Button variant="ghost" className="h-12 px-6 text-slate-400 font-bold uppercase text-[12px] tracking-widest" onClick={() => setStep('select')}>
              <ChevronLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step === 'form' ? (
            <Button onClick={handleSave} disabled={isSaving} className="px-8 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[12px] shadow-lg shadow-primary/20 gap-2 h-12">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Finalizar Atendimento
            </Button>
          ) : step === 'finished' && (
            <Button onClick={() => { onOpenChange(false); onSuccess(); }} className="px-8 bg-white/5 text-white border border-white/10 font-black uppercase tracking-widest text-[12px] h-12 hover:bg-white/10 transition-colors">
              Fechar e Atualizar Lead
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
