'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  limit,
  doc,
  updateDoc,
  arrayUnion,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Intimacao, Process } from '@/lib/types';
import { 
  FileText, 
  Search, 
  AlertCircle, 
  Gavel, 
  ExternalLink, 
  CheckCircle2, 
  Loader2,
  Share2,
  Trash2,
  Clock,
  Bot,
  Truck,
  MessageSquare
} from 'lucide-react';
import { QuickProcessDialog } from '@/components/process/QuickProcessDialog';
import { LegalDeadlineDialog } from '@/components/process/LegalDeadlineDialog';
import { QuickHearingDialog } from '@/components/process/QuickHearingDialog';
import { QuickDiligenceDialog } from '@/components/process/QuickDiligenceDialog';
import { useToast } from '@/components/ui/use-toast';
import { cn, extractFullOrgao } from '@/lib/utils';
import React from 'react';

const formatLegalText = (text: string) => {
  if (!text) return text;
  
  // Limpar sujeiras HTML residuais
  let cleanText = text.replace(/&nbsp;/g, ' ').replace(/\[\.\.\.\]/g, '...');

  // Destacar palavras cruciais e valores
  const regex = /(SENTENÇA|DECISÃO|PRAZO|AUDIÊNCIA|PERÍCIA|VALOR|HOMOLOGO|R\$ ?[0-9.,]+|\d{2}\/\d{2}\/\d{4})/gi;
  
  const parts = cleanText.split(regex);
  
  return parts.map((part, i) => {
    if (part.match(regex)) {
      if (part.toUpperCase().includes('R$')) {
          return <span key={i} className="font-bold text-emerald-400 bg-emerald-400/10 px-1 rounded">{part}</span>;
      }
      if (part.match(/\d{2}\/\d{2}\/\d{4}/)) {
          return <span key={i} className="font-bold text-blue-400 bg-blue-400/10 px-1 rounded">{part}</span>;
      }
      return <span key={i} className="font-black text-rose-400 bg-rose-400/10 px-1 rounded">{part}</span>;
    }
    return part;
  });
};

const getInferredArea = (item: Intimacao) => {
   const text = (item.descricao || '').toUpperCase();
   const orgao = (item.orgao || '').toUpperCase();
   
   if (orgao.includes('TRABALHO') || text.includes('TRT') || text.includes('RECLAMANTE') || text.includes('CLT') || orgao.includes('VARA DO TRABALHO')) return 'Trabalhista';
   if (orgao.includes('ÉTICA') || text.includes('TED') || text.includes('OAB')) return 'Ética Profissional (OAB)';
   if (orgao.includes('CRIMINAL') || text.includes('PENAL') || text.includes('DELEGACIA')) return 'Criminal';
   if (orgao.includes('PREVIDENCIÁRIO') || text.includes('INSS')) return 'Previdenciário';
   if (orgao.includes('FAMÍLIA') || text.includes('ALIMENTOS')) return 'Família e Sucessões';
   if (orgao.includes('TRIBUTÁRIO') || orgao.includes('FAZENDA PÚBLICA') || text.includes('EXECUÇÃO FISCAL')) return 'Tributário / Fazenda Pública';
   if (orgao.includes('CONSUMIDOR')) return 'Consumidor';
   
   return 'Cível';
}

const getInferredTitle = (item: Intimacao) => {
   const area = getInferredArea(item);
   if (area === 'Ética Profissional (OAB)') return 'Processo Administrativo Disciplinar (TED/OAB)';
   if (area === 'Trabalhista') return 'Reclamação Trabalhista';
   if (area === 'Criminal') return 'Ação Penal';
   if (area === 'Previdenciário') return 'Ação Previdenciária';
   return 'Ação Cível (Cadastro Rápido)';
}

interface IntimacaoDetailsDialogProps {
  item: Intimacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntimacaoDetailsDialog({ 
  item, 
  open, 
  onOpenChange 
}: IntimacaoDetailsDialogProps) {
  const [foundProcess, setFoundProcess] = useState<Process | null>(null);
  const [searching, setSearching] = useState(false);
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [showDeadlineDialog, setShowDeadlineDialog] = useState(false);
  const [showHearingDialog, setShowHearingDialog] = useState(false);
  const [showDiligenceDialog, setShowDiligenceDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiDate, setAiDate] = useState<string | null>(null);
  const [aiSteps, setAiSteps] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open && item?.processo) {
      checkProcessExistence(item.processo);
    } else {
      setFoundProcess(null);
    }
  }, [open, item]);

  const checkProcessExistence = async (processNumber: string) => {
    setSearching(true);
    try {
      const q = query(
        collection(db, 'processes'),
        where('processNumber', '==', processNumber),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setFoundProcess({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Process);
      } else {
        setFoundProcess(null);
      }
    } catch (error) {
      console.error("Erro ao buscar processo:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleAIAnalysis = async () => {
    if(!item?.descricao) return;
    setIsAnalyzing(true);
    setAiSummary(null);
    setAiDate(null);
    setAiSteps([]);
    try {
        const { parseLegalPublication } = await import('@/ai/flows/parse-publication-flow');
        const res = await parseLegalPublication({ text: item.descricao });
        toast({ title: 'Análise Concluída', description: res.summary });
        setAiSummary(`Decisão/Resumo: ${res.summary} | Prazo Detectado: ${res.daysCount} dias (${res.deadlineType}).`);
        if (res.publicationDate) setAiDate(res.publicationDate);
        if (res.recommendedSteps) setAiSteps(res.recommendedSteps);
    } catch(err) {
        toast({ variant: 'destructive', title: 'Erro na IA', description: 'Não foi possível completar a análise no momento.' });
    } finally {
        setIsAnalyzing(false);
    }
  };

  const requireProcess = (callback: () => void) => {
    if (!foundProcess) {
       toast({ variant: 'destructive', title: 'Vínculo Necessário', description: 'Cadastre ou aguarde a identificação do processo para usar esta ação manual.' });
       return;
    }
    callback();
  };

  const handleComentario = async () => {
    requireProcess(async () => {
       const obs = window.prompt('Adicionar anotação na timeline deste processo vinculado:');
       if (!obs) return;
       try {
           const processRef = doc(db, 'processes', foundProcess!.id);
           await updateDoc(processRef, {
             timeline: arrayUnion({
               id: crypto.randomUUID(),
               type: 'note',
               description: obs,
               date: Timestamp.now(),
               authorName: 'Usuário (via Intimação)'
             })
           });
           toast({ title: "Anotação salva!" });
       } catch {
           toast({ variant: 'destructive', title: "Erro ao salvar anotação" });
       }
    });
  };

  const vincularAoProcesso = async (processId: string) => {
    if (!item) return;

    try {
      // 1. Atualiza a timeline do processo com a nova intimação
      const processRef = doc(db, 'processes', processId);
      await updateDoc(processRef, {
        timeline: arrayUnion({
          id: crypto.randomUUID(),
          type: 'decision', // ou outro tipo que faça sentido
          description: `Intimação vinculada: ${item.tipo} - ${item.orgao}`,
          date: Timestamp.now(),
          authorName: 'Sistema (IA)Aasp',
          fullText: item.descricao // opcional guardar o texto completo
        })
      });

      // 2. Marca a intimação como lida e vinculada (podemos adicionar um campo processId na intimacao)
      const intimacaoRef = doc(db, 'intimacoes', item.id);
      await updateDoc(intimacaoRef, { 
        lida: true,
        processId: processId
      });

      toast({
        title: "Vinculada com sucesso!",
        description: "A intimação já aparece na linha do tempo do processo.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao vincular",
        variant: "destructive",
      });
    }
  };

  if (!item) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[850px] lg:max-w-[1000px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-muted/30 border-b shrink-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className="font-mono">{item.tipo}</Badge>
              {item.processo && (
                <Badge className="font-mono bg-blue-500/10 text-blue-600 border-blue-200">
                  {item.processo}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl leading-tight">{extractFullOrgao(item)}</DialogTitle>
            <DialogDescription>
              Disponibilizado em {item.dataDisponibilizacao} • ID: {item.id}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {!item.processo ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">Esta intimação não contém um número de processo identificado automaticamente.</p>
              </div>
            ) : searching ? (
              <div className="p-4 bg-muted animate-pulse rounded-lg flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Buscando vínculo no sistema...</p>
              </div>
            ) : foundProcess ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold">Processo Identificado</h4>
                      <p className="text-xs opacity-80">{foundProcess.name} ({foundProcess.clientId})</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-xs underline" onClick={() => window.open(`/dashboard/processes/${foundProcess.id}`, '_blank')}>
                      Abrir
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                    <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 flex items-center shadow-md shadow-green-500/20" onClick={() => vincularAoProcesso(foundProcess.id)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Vincular Histórico
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <Button 
                    variant="outline" 
                    className="h-12 border-primary/30 text-primary hover:bg-primary/10 shadow-inner group transition-all"
                    onClick={() => setShowDeadlineDialog(true)}
                  >
                    <Clock className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" /> 
                    <span className="font-bold uppercase tracking-widest text-[11px]">Agendar Prazo Fatal</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 shadow-inner group transition-all"
                    onClick={() => setShowHearingDialog(true)}
                  >
                    <Gavel className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" /> 
                    <span className="font-bold uppercase tracking-widest text-[11px]">Reservar Audiência</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-blue-700 dark:text-blue-400">
                  <Search className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold">Vínculo Pendente</h4>
                    <p className="text-xs opacity-80">O processo {item.processo} não existe no sistema.</p>
                  </div>
                </div>
                <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => setShowQuickRegister(true)}>
                  <Gavel className="w-3 h-3 mr-1" />
                  Cadastrar Agora
                </Button>
              </div>
            )}

            <div className="space-y-4">
               <h3 className="font-bold flex items-center gap-2 text-muted-foreground uppercase text-xs tracking-widest">
                 <FileText className="w-4 h-4 ml-1" />
                 Transcrição do Diário
               </h3>

              {aiSummary && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm shadow-[0_0_15px_rgba(245,158,11,0.1)] mb-4 space-y-3">
                      <div className="flex items-center justify-between">
                         <strong className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-80">
                            <Bot className="w-3 h-3" /> Resumo Inteligente (GenKit)
                         </strong>
                         {aiDate && <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/20 px-2 py-0.5 rounded shadow-sm">Data Alvo: {aiDate}</span>}
                      </div>
                      
                      <div className="font-semibold text-[13px]">{aiSummary}</div>
                      
                      {aiSteps && aiSteps.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-amber-500/20">
                             <strong className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2 block">Passos Estratégicos:</strong>
                             <ul className="list-disc pl-4 space-y-1 text-xs opacity-90 font-medium font-mono">
                               {aiSteps.map((step, i) => <li key={i}>{step}</li>)}
                             </ul>
                          </div>
                      )}
                  </div>
              )}

              <div className="p-6 bg-[#0f172a] border border-slate-800 rounded-xl leading-8 whitespace-pre-wrap text-[15px] font-medium text-slate-300 shadow-inner relative overflow-hidden selection:bg-primary/30 mt-2">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-rose-500"></div>
                {formatLegalText(item.descricao)}
              </div>
            </div>
          </div>

          <div className="w-64 bg-card border-l border-white/5 flex flex-col shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-10">
            <div className="p-4 border-b border-white/5 bg-muted/20">
               <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-1">
                 Ações Rápidas
               </h4>
               <p className="text-xs text-slate-400 font-medium">Interaja com a intimação</p>
            </div>
            <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
                <Button 
                   variant="outline" 
                   className="h-11 w-full justify-start text-[11px] font-black text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 uppercase tracking-widest border-amber-500/20 shadow-inner"
                   onClick={handleAIAnalysis}
                   disabled={isAnalyzing}
                >
                   {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
                   Analisar c/ IA
                </Button>
                <div className="my-2 h-px bg-white/5 w-full"></div>
                <Button variant="ghost" className="h-10 w-full justify-start text-[11px] text-slate-300 hover:bg-white/5 hover:text-white uppercase font-bold" onClick={() => requireProcess(() => setShowDeadlineDialog(true))}>
                    <Clock className="w-4 h-4 mr-2 text-primary" /> Lançar Prazo
                </Button>
                <Button variant="ghost" className="h-10 w-full justify-start text-[11px] text-slate-300 hover:bg-white/5 hover:text-white uppercase font-bold" onClick={() => requireProcess(() => setShowHearingDialog(true))}>
                    <Gavel className="w-4 h-4 mr-2 text-blue-400" /> Audiência
                </Button>
                <Button variant="ghost" className="h-10 w-full justify-start text-[11px] text-slate-300 hover:bg-white/5 hover:text-white uppercase font-bold" onClick={() => requireProcess(() => setShowDiligenceDialog(true))}>
                    <Truck className="w-4 h-4 mr-2 text-emerald-400" /> Diligência
                </Button>
                <div className="my-2 h-px bg-white/5 w-full"></div>
                <Button variant="ghost" className="h-10 w-full justify-start text-[11px] text-slate-300 hover:bg-white/5 hover:text-white uppercase font-bold" onClick={handleComentario}>
                    <MessageSquare className="w-4 h-4 mr-2 text-slate-400" /> Comentário
                </Button>
            </div>
          </div>
          </div>

          <DialogFooter className="p-4 bg-muted/30 border-t flex-row justify-between sm:justify-between items-center bg-card shrink-0">
            <div className="flex gap-2 items-center">
               <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
               </Button>
               <Button variant="ghost" size="icon">
                <Share2 className="w-4 h-4" />
               </Button>
               
               {!item.lida && (
                 <Button 
                   variant="default" 
                   size="sm" 
                   className="ml-2 bg-emerald-600 hover:bg-emerald-700 font-bold gap-2"
                   onClick={async () => {
                     try {
                        const intimacaoRef = doc(db, 'intimacoes', item.id);
                        await updateDoc(intimacaoRef, { lida: true });
                        toast({ title: "Leitura confirmada!" });
                        onOpenChange(false);
                     } catch (error) {
                        toast({ variant: 'destructive', title: "Erro ao confirmar leitura" });
                     }
                   }}
                 >
                   <CheckCircle2 className="w-4 h-4" />
                   Confirmar Leitura
                 </Button>
               )}
            </div>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickProcessDialog 
        open={showQuickRegister}
        onOpenChange={setShowQuickRegister}
        initialProcessNumber={item.processo || ''}
        initialLegalArea={getInferredArea(item)}
        initialTitle={getInferredTitle(item)}
        onSuccess={(id) => checkProcessExistence(item.processo!)}
      />

      <LegalDeadlineDialog 
        open={showDeadlineDialog}
        onOpenChange={setShowDeadlineDialog}
        process={foundProcess}
        initialText={item.descricao}
        initialDate={aiDate || undefined}
      />

      <QuickHearingDialog 
        open={showHearingDialog}
        onOpenChange={setShowHearingDialog}
        process={foundProcess}
      />

      <QuickDiligenceDialog
        open={showDiligenceDialog}
        onOpenChange={setShowDiligenceDialog}
        process={foundProcess}
      />
    </>
  );
}
