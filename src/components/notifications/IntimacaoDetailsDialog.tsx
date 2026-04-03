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
  Trash2
} from 'lucide-react';
import { QuickProcessDialog } from '@/components/process/QuickProcessDialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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
        <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 bg-muted/30 border-b">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className="font-mono">{item.tipo}</Badge>
              {item.processo && (
                <Badge className="font-mono bg-blue-500/10 text-blue-600 border-blue-200">
                  {item.processo}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl">{item.orgao || 'Intimação Publicada'}</DialogTitle>
            <DialogDescription>
              Disponibilizado em {item.dataDisponibilizacao} • ID: {item.id}
            </DialogDescription>
          </DialogHeader>

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
                    Ver Processo
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                  <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700" onClick={() => vincularAoProcesso(foundProcess.id)}>
                    Vincular Timeline
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
              <h3 className="font-bold flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4" />
                CONTEÚDO DA INTIMAÇÃO
              </h3>
              <div className="p-5 bg-card border rounded-xl leading-relaxed whitespace-pre-wrap font-serif text-lg shadow-inner">
                {item.descricao}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/30 border-t flex-row justify-between sm:justify-between items-center bg-card">
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
        onSuccess={(id) => checkProcessExistence(item.processo!)}
      />
    </>
  );
}
