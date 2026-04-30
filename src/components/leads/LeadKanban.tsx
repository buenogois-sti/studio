'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Flame, 
  AlertTriangle, 
  CalendarDays, 
  Timer, 
  ChevronLeft, 
  LayoutList, 
  Activity 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { STAGES, stageConfig } from '@/lib/leads-constants';
import type { Lead, Client, LeadStatus } from '@/lib/types';

interface LeadKanbanProps {
  leads: Lead[];
  clientsMap: Map<string, Client>;
  expandedStage: LeadStatus | null;
  onToggleExpand: (stage: LeadStatus | null) => void;
}

export function LeadKanban({ 
  leads, 
  clientsMap, 
  expandedStage, 
  onToggleExpand 
}: LeadKanbanProps) {
  const router = useRouter();

  const handleLeadClick = (id: string) => {
    router.push(`/dashboard/leads/${id}`);
  };
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className={cn("flex gap-6 pb-6", expandedStage ? "w-full" : "")}>
        {STAGES.filter(s => s !== 'CONVERTIDO' && s !== 'ABANDONADO').map(stage => {
          if (expandedStage && expandedStage !== stage) return null;

          const config = stageConfig[stage];
          const stageLeads = leads.filter(l => l.status === stage);
          
          const stageColors = {
            'NOVO': { border: 'border-blue-500/40', bg: 'bg-blue-500/10', dot: 'bg-blue-400', shadow: 'shadow-blue-500/10', text: 'text-blue-400', buttonHover: 'hover:bg-blue-500/20' },
            'ATENDIMENTO': { border: 'border-indigo-500/40', bg: 'bg-indigo-500/10', dot: 'bg-indigo-400', shadow: 'shadow-indigo-500/10', text: 'text-indigo-400', buttonHover: 'hover:bg-indigo-500/20' },
            'CONTRATUAL': { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400', shadow: 'shadow-emerald-500/10', text: 'text-emerald-400', buttonHover: 'hover:bg-emerald-500/20' },
            'BUROCRACIA': { border: 'border-amber-500/40', bg: 'bg-amber-500/10', dot: 'bg-amber-400', shadow: 'shadow-amber-500/10', text: 'text-amber-400', buttonHover: 'hover:bg-amber-500/20' },
            'DISTRIBUICAO': { border: 'border-purple-500/40', bg: 'bg-purple-500/10', dot: 'bg-purple-400', shadow: 'shadow-purple-500/10', text: 'text-purple-400', buttonHover: 'hover:bg-purple-500/20' },
            'CONVERTIDO': { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400', shadow: 'shadow-emerald-500/10', text: 'text-emerald-400', buttonHover: 'hover:bg-emerald-500/20' },
            'ABANDONADO': { border: 'border-rose-500/40', bg: 'bg-rose-500/10', dot: 'bg-rose-400', shadow: 'shadow-rose-500/10', text: 'text-rose-400', buttonHover: 'hover:bg-rose-500/20' }
          }[stage as LeadStatus] || { border: 'border-white/20', bg: 'bg-white/5', dot: 'bg-white', shadow: 'shadow-white/10', text: 'text-white', buttonHover: 'hover:bg-white/10' };

          const isExpanded = expandedStage === stage;

          return (
            <div key={stage} className={cn("inline-block align-top shrink-0 transition-all duration-500", isExpanded ? "w-full max-w-full" : "w-[320px]")}>
              <div className={cn("mb-3 backdrop-blur-md border-t-2 rounded-xl p-3 flex items-center justify-between transition-all shadow-xl", stageColors.border, stageColors.bg, stageColors.shadow)}>
                <div className="flex items-center gap-2.5">
                  <div className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)]", stageColors.dot)} />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-white drop-shadow-md">{config.label}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[10px] font-black h-6 px-2.5 rounded-lg shadow-none", stageColors.bg, stageColors.border, stageColors.text, "border")}>
                    {stageLeads.length}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onToggleExpand(isExpanded ? null : (stage as LeadStatus))}
                    className={cn("h-6 w-6 rounded-md", stageColors.text, stageColors.buttonHover)}
                  >
                    {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <LayoutList className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              
              <div className={cn("min-h-[calc(100vh-350px)] rounded-2xl p-2.5 border transition-all duration-500 bg-black/20", stageColors.border.replace('40', '10'), isExpanded ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3")}>
                {stageLeads.length > 0 ? (
                  stageLeads.map(lead => {
                    const client = clientsMap.get(lead.clientId);
                    const isHighPriority = lead.priority === 'ALTA' || lead.priority === 'CRITICA';
                    
                    return (
                      <Card 
                        key={lead.id} 
                        className={cn("bg-[#0f172a]/80 backdrop-blur-sm border transition-all cursor-pointer group shadow-xl hover:-translate-y-1 duration-300 overflow-hidden relative flex flex-col", stageColors.border.replace('40', '20'), stageColors.shadow.replace('10', '20'))}
                        onClick={() => handleLeadClick(lead.id)}
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
                                {client?.firstName?.charAt(0) || 'C'}
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
                              {lead.legalArea}
                            </Badge>
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
                              <Timer className="h-3 w-3" />
                              {differenceInDays(new Date(), lead.updatedAt.toDate())}d
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className={cn("flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl transition-all duration-500 opacity-40 hover:opacity-80", isExpanded ? "col-span-full min-h-[300px]" : "", stageColors.border.replace('40', '20'), stageColors.bg)}>
                    <div className="h-10 w-10 rounded-full mb-3 flex items-center justify-center bg-white/5 border border-white/10">
                        <Activity className={cn("h-4 w-4", stageColors.text)} />
                    </div>
                    <p className={cn("text-[9px] font-black uppercase tracking-widest text-center", stageColors.text)}>Nenhum lead<br/>nesta etapa</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="bg-white/5" />
    </ScrollArea>
  );
}
