'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Timer, 
  FileText, 
  Info, 
  Scale, 
  CalendarDays,
  Printer,
  Copy,
  History,
  User,
  Gavel,
  ExternalLink
} from 'lucide-react';
import type { LegalDeadline, Process } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

interface DeadlineDetailsSheetProps {
  deadline: LegalDeadline | null;
  process?: Process;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeadlineDetailsSheet({ deadline, process, open, onOpenChange }: DeadlineDetailsSheetProps) {
  const { toast } = useToast();
  const router = useRouter();

  if (!deadline) return null;

  const handleGoToProcess = () => {
    if (process) {
      router.push(`/dashboard/processos?clientId=${process.clientId}`);
      onOpenChange(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
    });
  };

  const statusConfig = {
    PENDENTE: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    CUMPRIDO: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    PERDIDO: { color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    CANCELADO: { color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full bg-[#020617] border-border overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={cn("text-[9px] font-black uppercase", statusConfig[deadline.status].color)}>
                  {deadline.status}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/30 text-primary">
                  {deadline.type}
                </Badge>
              </div>
              <SheetTitle className="text-2xl font-headline font-bold text-white">Detalhes do Prazo</SheetTitle>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="icon" onClick={() => window.print()} title="Imprimir">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <SheetDescription className="text-slate-400 text-left flex items-center gap-1.5 flex-wrap">
            Vinculado ao processo:{' '}
            {process ? (
              <button 
                onClick={handleGoToProcess}
                className="text-primary hover:text-primary/80 hover:underline font-bold flex items-center gap-1 transition-colors group/proc"
              >
                {process.name}
                <ExternalLink className="h-3 w-3 opacity-50 group-hover/proc:opacity-100" />
              </button>
            ) : (
              <span className="text-white font-bold">Processo não encontrado</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8 mt-8">
          {/* Cronologia */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
              <Info className="h-4 w-4 text-blue-400 mb-2" />
              <span className="text-sm font-black text-white">{format(deadline.startDate.toDate(), 'dd/MM/yyyy')}</span>
              <span className="text-[9px] font-black uppercase text-muted-foreground">Início (Publicação)</span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col items-center text-center">
              <Timer className="h-4 w-4 text-rose-500 mb-2" />
              <span className="text-sm font-black text-rose-400">{format(deadline.endDate.toDate(), 'dd/MM/yyyy')}</span>
              <span className="text-[9px] font-black uppercase text-rose-500">Data Fatal</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 py-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
              <Scale className="h-3 w-3" />
              <span className="text-[10px] font-black uppercase">{deadline.isBusinessDays ? 'Dias Úteis (CPC)' : 'Dias Corridos'}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <CalendarDays className="h-3 w-3" />
              <span className="text-[10px] font-black uppercase">{deadline.daysCount} Dias de Prazo</span>
            </div>
          </div>

          {/* Publicação Oficial */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Publicação Oficial / Intimação</h3>
              </div>
              {deadline.publicationText && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] uppercase font-bold"
                  onClick={() => copyToClipboard(deadline.publicationText || '', 'Publicação')}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </Button>
              )}
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 min-h-[100px]">
              {deadline.publicationText ? (
                <p className="text-xs font-mono leading-relaxed text-slate-300 whitespace-pre-wrap">
                  {deadline.publicationText}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-8">Nenhum texto de publicação anexado.</p>
              )}
            </div>
          </section>

          {/* Observações */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Gavel className="h-4 w-4 text-emerald-500" />
              <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Observações Estratégicas</h3>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              {deadline.observations ? (
                <p className="text-sm leading-relaxed text-slate-200">
                  {deadline.observations}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-4">Sem observações adicionais.</p>
              )}
            </div>
          </section>

          <Separator className="bg-white/10" />

          <div className="pt-4 text-[10px] text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold uppercase tracking-tighter">
              <User className="h-3 w-3 text-primary" />
              <span>Lançado por: {deadline.authorName}</span>
            </div>
            <div className="flex items-center gap-2 font-bold uppercase tracking-tighter">
              <History className="h-3 w-3" />
              <span>Criado: {format(deadline.createdAt.toDate(), 'dd/MM/yy HH:mm')}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}