'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Timer, AlertTriangle, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Lead, Client } from '@/lib/types';

interface LeadCardProps {
  lead: Lead;
  client?: Client;
  stageColors: {
    dot: string;
    border: string;
    shadow: string;
  };
  onClick: () => void;
}

export function LeadCard({ lead, client, stageColors, onClick }: LeadCardProps) {
  const isHighPriority = lead.priority === 'ALTA' || lead.priority === 'CRITICA';
  
  return (
    <Card 
      className={cn(
        "bg-[#0f172a]/80 backdrop-blur-sm border transition-all cursor-pointer group shadow-xl hover:-translate-y-1 duration-300 overflow-hidden relative flex flex-col", 
        stageColors.border.replace('40', '20'), 
        stageColors.shadow.replace('10', '20')
      )}
      onClick={onClick}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 opacity-50 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-transparent to-transparent", stageColors.dot.replace('bg-', 'via-'))} />
      <CardContent className="p-4 space-y-4 relative z-10 pl-5 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-black text-white leading-tight uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-2">
              {lead.title}
            </h4>
            {isHighPriority && <Flame className="h-4 w-4 text-rose-500 shrink-0 animate-pulse drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]" />}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-white/5 flex items-center justify-center text-[9px] font-black text-slate-300 border border-white/10 shrink-0">
              {client?.firstName.charAt(0) || 'C'}
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate">
              {lead.clientName || `${client?.firstName} ${client?.lastName}`}
            </p>
          </div>
          
          {lead.status === 'ATENDIMENTO' && !lead.interviewDate && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 animate-pulse mt-1">
              <AlertTriangle className="h-3 w-3 text-rose-500" />
              <span className="text-[9px] font-black text-rose-500 uppercase tracking-tight">Agendamento Pendente</span>
            </div>
          )}

          {lead.interviewDate && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mt-1">
              <CalendarDays className="h-3 w-3 text-emerald-500" />
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tight">
                {format(new Date(`${lead.interviewDate}T00:00:00`), 'dd/MM', { locale: ptBR })} às {lead.interviewTime}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-4">
          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest h-5 px-1.5 rounded-md">
            CPF OK
          </Badge>
          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
            <Timer className="h-3 w-3" />
            {differenceInDays(new Date(), lead.updatedAt.toDate())}d
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
