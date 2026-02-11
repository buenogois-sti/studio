
'use client';
import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { DocumentTemplate, Process, Lead } from '@/lib/types';
import { 
  FileText, 
  Loader2, 
  Search, 
  ExternalLink, 
  Sparkles,
  FileCheck,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  ArrowRight,
  Bot
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { draftDocument } from '@/lib/process-actions';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface DocumentDraftingDialogProps {
  process?: Process | null;
  lead?: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentDraftingDialog({ process, lead, open, onOpenChange }: DocumentDraftingDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDrafting, setIsDrafting] = React.useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null);
  const [lastTemplateName, setLastTemplateName] = React.useState('');

  const target = process || lead;
  const isLead = !!lead;

  const templatesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'document_templates') : null), [firestore]);
  const { data: templates, isLoading } = useCollection<DocumentTemplate>(templatesQuery);

  const filteredTemplates = React.useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templates, searchTerm]);

  const handleSelectTemplate = async (template: DocumentTemplate) => {
    if (!target) return;
    setIsDrafting(template.id);
    setGeneratedUrl(null);
    setLastTemplateName(template.name);
    
    try {
        const result = await draftDocument(target.id, template.templateFileId, template.name, template.category, isLead);
        if (result.success && result.url) {
            setGeneratedUrl(result.url);
            toast({
                title: 'Rascunho Criado!',
                description: `O documento "${template.name}" está pronto para edição no Google Docs.`,
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ 
          variant: 'destructive', 
          title: 'Erro na Geração', 
          description: error.message || 'Não foi possível criar o rascunho.' 
        });
    } finally {
        setIsDrafting(null);
    }
  };

  const resetDialog = () => {
    setGeneratedUrl(null);
    setSearchTerm('');
    setLastTemplateName('');
  };

  const getTargetDisplayName = () => {
    if (!target) return '';
    return 'title' in target ? (target as Lead).title : (target as Process).name;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) setTimeout(resetDialog, 300);
    }}>
      <DialogContent className="sm:max-w-2xl bg-[#020617] border-white/10 text-white shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black font-headline">Gerador de Rascunhos</DialogTitle>
              <DialogDescription className="text-slate-400">
                Processando inteligência documental para: <span className="text-white font-bold">{getTargetDisplayName()}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {isDrafting ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-500">
              <div className="relative">
                <div className="h-24 w-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white tracking-tighter uppercase">Processando Automação</h3>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">
                  Estamos copiando o modelo, preenchendo as tags de qualificação e organizando na pasta do {isLead ? 'lead' : 'processo'}...
                </p>
              </div>
            </div>
          ) : generatedUrl ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="relative">
                <div className="h-24 w-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/20">
                  <FileCheck className="h-12 w-12 text-emerald-400" />
                </div>
                <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border-2 border-[#020617]">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tighter">RASCUNHO PRONTO</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  O documento <strong>{lastTemplateName}</strong> foi gerado com sucesso! Clique abaixo para abrir no Google Docs.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-md pt-4">
                <Button 
                  className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs h-14 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                  onClick={() => window.open(generatedUrl, '_blank')}
                >
                  <ExternalLink className="h-5 w-5 mr-2" /> Abrir no Google Docs
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-slate-500 hover:text-white h-10 font-bold uppercase text-[10px]"
                  onClick={() => setGeneratedUrl(null)}
                >
                  Gerar outro modelo <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Pesquise por modelo ou categoria..." 
                  className="pl-10 h-14 bg-black/40 border-white/10 text-white focus:border-primary transition-all rounded-xl text-base shadow-inner" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>

              <ScrollArea className="h-[350px] pr-4 -mx-2 px-2">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Acessando Biblioteca de Elite...</p>
                  </div>
                ) : filteredTemplates.length > 0 ? (
                  <div className="grid gap-3">
                    {filteredTemplates.map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => handleSelectTemplate(t)}
                        className={cn(
                          "w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 group text-left",
                          "bg-white/5 border-white/5 hover:border-primary/30 hover:bg-white/[0.08]"
                        )}
                      >
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-inner",
                            "bg-black/40 text-slate-500 group-hover:text-primary group-hover:bg-primary/10"
                          )}>
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-sm truncate text-slate-200 group-hover:text-white">{t.name}</h4>
                              <Badge variant="secondary" className="text-[8px] uppercase h-4 px-1.5 bg-white/10 text-slate-400 group-hover:text-primary/80 border-none font-black tracking-widest">
                                {t.category}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 italic group-hover:text-slate-400">{t.description}</p>
                          </div>
                        </div>
                        <div className="ml-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <ChevronRight className="h-5 w-5 text-primary" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-black/20 rounded-3xl border-2 border-dashed border-white/5 opacity-40">
                    <FileText className="h-12 w-12 mx-auto mb-4" />
                    <p className="font-bold text-white uppercase tracking-widest text-[10px]">Nenhum modelo compatível</p>
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>

        <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-center gap-2">
          <FolderOpen className="h-3 w-3 text-slate-500" />
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
            Integração Bueno Gois & Google Workspace (Docs API)
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
