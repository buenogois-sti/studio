'use client';

import * as React from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Gavel, 
  FileText, 
  Scale, 
  ExternalLink,
  History,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Hearing, Process } from '@/lib/types';
import { cn } from '@/lib/utils';

interface HearingDetailsSheetProps {
  hearing: Hearing | null;
  process?: Process;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (hearing: Hearing) => void;
  onReport?: (hearing: Hearing) => void;
}

export function HearingDetailsSheet({ 
  hearing, 
  process, 
  open, 
  onOpenChange,
  onEdit,
  onReport
}: HearingDetailsSheetProps) {
  if (!hearing) return null;

  const isDiligencia = hearing.type === 'DILIGENCIA';
  const isPericia = hearing.type === 'PERICIA';
  const isFulfilled = hearing.status === 'REALIZADA';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl bg-[#020617] border-white/10 text-white p-0 overflow-hidden flex flex-col shadow-2xl">
        <SheetHeader className="p-8 border-b border-white/5 bg-white/5 shrink-0 relative">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center border transition-all",
              isFulfilled ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
            )}>
              {isDiligencia ? <FileText className="h-5 w-5" /> : isPericia ? <Scale className="h-5 w-5" /> : <Gavel className="h-5 w-5" />}
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-3 h-6">
              {hearing.type}
            </Badge>
            {isFulfilled && (
              <Badge className="bg-emerald-500 text-black border-none text-[10px] font-black uppercase tracking-widest px-3 h-6">
                CONCLUÍDO
              </Badge>
            )}
          </div>
          <SheetTitle className="text-2xl font-black text-white tracking-tight leading-tight">
            {hearing.responsibleParty}
          </SheetTitle>
          <SheetDescription className="text-slate-400 flex items-center gap-2 mt-1">
            <History className="h-4 w-4 text-primary" />
            Vínculo processual: <span className="text-white font-bold">{process?.name || 'Vínculo Externo'}</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-8 space-y-10">
            {/* INFORMAÇÕES CRÍTICAS */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Data do Ato
                  </p>
                  <p className="text-sm font-bold text-white">
                    {format(hearing.date.toDate(), "eeee, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Horário
                  </p>
                  <p className="text-sm font-bold text-white">
                    {format(hearing.date.toDate(), "HH:mm'h'")}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-primary" /> Advogado Responsável
                  </p>
                  <p className="text-sm font-bold text-white">{hearing.lawyerName || 'Aguardando Atribuição'}</p>
                </div>
                {process?.processNumber && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                      <Scale className="h-3.5 w-3.5 text-primary" /> Número do Processo
                    </p>
                    <p className="text-sm font-mono font-bold text-white">{process.processNumber}</p>
                  </div>
                )}
              </div>
            </section>

            {/* ACOMPANHAMENTO JURÍDICO (EXCLUSIVE FOR PERICIA) */}
            {isPericia && (
              <section className={cn(
                "p-6 rounded-2xl border flex items-center justify-between transition-all",
                hearing.requiresLawyer ? "bg-primary/10 border-primary/20 shadow-[0_0_20px_rgba(255,215,0,0.05)]" : "bg-white/[0.02] border-white/5 opacity-60"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center border",
                    hearing.requiresLawyer ? "bg-primary/20 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-slate-500"
                  )}>
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-white tracking-widest">Acompanhamento Jurídico</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Necessita presença de advogado no local?</p>
                  </div>
                </div>
                <Badge className={cn(
                  "font-black text-[10px] uppercase tracking-widest px-4 h-7 border-none",
                  hearing.requiresLawyer ? "bg-primary text-black" : "bg-slate-800 text-slate-400"
                )}>
                  {hearing.requiresLawyer ? 'SIM - OBRIGATÓRIO' : 'NÃO NECESSÁRIO'}
                </Badge>
              </section>
            )}

            <Separator className="bg-white/5" />

            {/* LOCALIZAÇÃO INTEGRADA */}
            <section className="space-y-4">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Local da Realização
              </p>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                <div className="space-y-1">
                  <p className="text-sm font-black text-white">{hearing.location}</p>
                  {hearing.courtBranch && (
                    <p className="text-xs text-slate-400">Vara / Comarca: {hearing.courtBranch}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="h-9 gap-2 border-white/5 bg-white/5 hover:bg-primary/20 text-xs font-bold" asChild>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hearing.location)}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir Mapas
                  </a>
                </Button>
              </div>
            </section>

            {/* OBSERVAÇÕES E INSTRUÇÕES */}
            {hearing.notes && (
              <section className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Observações e Instruções
                </p>
                <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{hearing.notes}</p>
                </div>
              </section>
            )}

            {/* APOIO E EXECUÇÃO */}
            {hearing.supportId && hearing.supportId !== 'none' && (
              <section className="space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-amber-500" /> Equipe de Apoio / Assistente
                </p>
                <div className={cn(
                  "p-6 rounded-2xl border flex items-center justify-between",
                  hearing.supportStatus === 'REALIZADA' ? "bg-amber-500/5 border-amber-500/20" : "bg-black/20 border-white/5"
                )}>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{hearing.supportName}</p>
                      <p className="text-[10px] uppercase font-bold text-amber-500/70">{hearing.supportStatus || 'PENDENTE'}</p>
                    </div>
                  </div>
                  {hearing.supportStatus === 'REALIZADA' && (
                    <div className="flex items-center gap-2 text-amber-500 animate-pulse">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase">Aguardando Revisão</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* RESULTADO (SE CONCLUÍDO) */}
            {isFulfilled && hearing.resultNotes && (
              <section className="space-y-3">
                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Desfecho e Relatório Técnico
                </p>
                <div className="p-6 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20">
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{hearing.resultNotes}</p>
                </div>
              </section>
            )}
          </div>
        </ScrollArea>

        <Separator className="bg-white/5 shrink-0" />
        
        <div className="p-8 bg-white/5 shrink-0 flex flex-row gap-3">
          <Button 
            variant="outline" 
            className="flex-1 h-12 border-white/10 bg-black/20 text-white font-black uppercase text-[10px] tracking-widest rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          {!isFulfilled ? (
            <Button 
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-emerald-900/20"
              onClick={() => {
                onOpenChange(false);
                onReport?.(hearing);
              }}
            >
              <FileText className="mr-2 h-4 w-4" /> Emitir Relatório
            </Button>
          ) : (
            <Button 
              className="flex-1 h-12 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-primary/20"
              onClick={() => {
                onOpenChange(false);
                onEdit?.(hearing);
              }}
            >
              <Edit className="mr-2 h-4 w-4" /> Alterar Dados
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
