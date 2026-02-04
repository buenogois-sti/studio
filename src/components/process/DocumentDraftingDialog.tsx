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
import type { DocumentTemplate, Process } from '@/lib/types';
import { FileText, Loader2, Search, ArrowRight, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { draftDocument } from '@/lib/process-actions';
import { useToast } from '@/components/ui/use-toast';

interface DocumentDraftingDialogProps {
  process: Process | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentDraftingDialog({ process, open, onOpenChange }: DocumentDraftingDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDrafting, setIsDrafting] = React.useState<string | null>(null);

  const templatesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'document_templates') : null, [firestore]);
  const { data: templates, isLoading } = useCollection<DocumentTemplate>(templatesQuery);

  const filteredTemplates = React.useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templates, searchTerm]);

  const handleSelectTemplate = async (template: DocumentTemplate) => {
    if (!process) return;
    setIsDrafting(template.id);
    try {
        const result = await draftDocument(process.id, template.templateFileId, template.name);
        if (result.success && result.url) {
            toast({
                title: 'Documento Gerado!',
                description: `O rascunho de "${template.name}" foi criado na pasta do processo.`,
                action: <Button variant="outline" size="sm" onClick={() => window.open(result.url, '_blank')}><ExternalLink className="h-3 w-3 mr-1" /> Abrir</Button>
            });
            onOpenChange(false);
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao gerar documento', description: error.message });
    } finally {
        setIsDrafting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-white">Gerar Rascunho de Documento</DialogTitle>
          <DialogDescription className="text-slate-400">
            Escolha um modelo do acervo para criar um novo documento para: <span className="font-bold text-white">{process?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Pesquisar modelos (ex: Procuração, Petição...)" 
                className="pl-8 bg-background border-border text-white" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
            />
        </div>

        <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredTemplates.length > 0 ? (
                <div className="grid gap-3">
                    {filteredTemplates.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border bg-white/5 hover:bg-white/10 transition-colors group">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="font-bold text-sm truncate text-white">{t.name}</h4>
                                        <Badge variant="secondary" className="text-[9px] uppercase h-4 px-1.5 bg-white/10 text-slate-300">{t.category}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                disabled={isDrafting !== null}
                                onClick={() => handleSelectTemplate(t)}
                                className="ml-4 bg-primary text-primary-foreground"
                            >
                                {isDrafting === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-muted-foreground italic">
                    Nenhum modelo encontrado para esta busca.
                </div>
            )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}