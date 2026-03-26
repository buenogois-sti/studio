'use client';

import * as React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Calendar as CalendarIcon,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Timestamp } from 'firebase/firestore';
import type { FinancialTitle } from '@/lib/types';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FinanceCalendarProps {
  titles: FinancialTitle[];
  onTitleClick?: (title: FinancialTitle) => void;
  onNewTitle?: (date: Date) => void;
}

export function FinanceCalendar({ titles, onTitleClick, onNewTitle }: FinanceCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getDueDate = (title: FinancialTitle): Date => {
    if (title.dueDate instanceof Timestamp) return title.dueDate.toDate();
    if (title.dueDate && typeof title.dueDate === 'object' && 'seconds' in title.dueDate) {
      return new Date((title.dueDate as any).seconds * 1000);
    }
    return new Date(title.dueDate);
  };

  const titlesByDay = React.useMemo(() => {
    const map = new Map<string, FinancialTitle[]>();
    titles.forEach(title => {
      const date = getDueDate(title);
      const key = format(date, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(title);
    });
    return map;
  }, [titles]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  };

  const selectedTitles = React.useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, 'yyyy-MM-dd');
    return titlesByDay.get(key) || [];
  }, [selectedDay, titlesByDay]);

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-8 bg-[#0f172a] border-white/5 overflow-hidden shadow-2xl">
          <CardHeader className="p-6 border-b border-white/5 bg-white/10 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-white uppercase tracking-tighter">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </CardTitle>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Calendário Financeiro Studio</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white h-9 px-4 hover:bg-white/10" onClick={goToToday}>
                Hoje
              </Button>
              <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/5">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b border-white/5">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-black uppercase text-slate-500 tracking-widest bg-white/5">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-[120px]">
              {calendarDays.map((day, idx) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayTitles = titlesByDay.get(dayKey) || [];
                const receitas = dayTitles.filter(t => t.type === 'RECEITA').reduce((acc, t) => acc + t.value, 0);
                const despesas = dayTitles.filter(t => t.type === 'DESPESA').reduce((acc, t) => acc + t.value, 0);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDate = isToday(day);

                return (
                  <div 
                    key={dayKey}
                    className={cn(
                      "relative p-2 border-r border-b border-white/5 group cursor-pointer transition-all hover:bg-white/5",
                      !isCurrentMonth && "opacity-20",
                      isSelected && "bg-primary/10 ring-2 ring-primary/20 inset-0 z-10",
                      (idx + 1) % 7 === 0 && "border-r-0"
                    )}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div className="flex items-start justify-between">
                      <span className={cn(
                        "text-xs font-black h-6 w-6 flex items-center justify-center rounded-lg transition-all",
                        isTodayDate ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "text-slate-400 group-hover:text-white"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {dayTitles.length > 0 && (
                        <div className="flex flex-col gap-0.5 items-end">
                           {receitas > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />}
                           {despesas > 0 && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]" />}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      {receitas > 0 && isCurrentMonth && (
                        <div className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between overflow-hidden">
                          <ArrowUpRight className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                          <span className="text-[9px] font-black text-emerald-400 truncate ml-1">{formatCurrency(receitas).replace('R$', '')}</span>
                        </div>
                      )}
                      {despesas > 0 && isCurrentMonth && (
                        <div className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 flex items-center justify-between overflow-hidden">
                          <ArrowDownRight className="h-2.5 w-2.5 text-rose-500 shrink-0" />
                          <span className="text-[9px] font-black text-rose-400 truncate ml-1">{formatCurrency(despesas).replace('R$', '')}</span>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      className="absolute bottom-2 right-2 h-6 w-6 rounded-lg bg-white/5 border border-white/10 items-center justify-center hidden group-hover:flex hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewTitle?.(day);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-[#0f172a] border-white/5 h-full flex flex-col shadow-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-white/5 bg-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black text-white uppercase tracking-widest">
                    {selectedDay ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
                  </CardTitle>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Lançamentos do Período</p>
                </div>
                {selectedDay && (
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-xl" onClick={() => onNewTitle?.(selectedDay)}>
                     <Plus className="h-4 w-4" />
                   </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {selectedTitles.length > 0 ? (
                <ScrollArea className="flex-1 max-h-[600px]">
                  <div className="p-4 space-y-3">
                    {selectedTitles.map(title => (
                      <div 
                        key={title.id}
                        className={cn(
                          "p-4 rounded-2xl border transition-all cursor-pointer group/item",
                          title.type === 'RECEITA' ? "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30" : "bg-rose-500/5 border-rose-500/10 hover:border-rose-500/30"
                        )}
                        onClick={() => onTitleClick?.(title)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={cn(
                                "text-[8px] font-black uppercase h-4 px-1.5 border-none",
                                title.type === 'RECEITA' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                              )}>
                                {title.type}
                              </Badge>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter truncate">
                                {title.category || 'Geral'}
                              </span>
                            </div>
                            <h4 className="text-xs font-black text-white truncate leading-tight group-hover/item:text-primary transition-colors">{title.description}</h4>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn(
                              "text-sm font-black tabular-nums",
                              title.type === 'RECEITA' ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {formatCurrency(title.value)}
                            </p>
                            <Badge variant="outline" className={cn(
                              "text-[7px] font-black uppercase h-4 mt-1 border-none",
                              title.status === 'PAGO' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                            )}>
                              {title.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                  <div className="h-16 w-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 text-slate-600">
                    <CalendarIcon className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-white uppercase">Nenhum lançamento</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase max-w-[160px]">Nenhuma movimentação financeira agendada para este dia.</p>
                  </div>
                  <Button variant="outline" size="sm" className="bg-primary/10 border-primary/20 text-primary uppercase font-black text-[10px] h-9 px-6 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => selectedDay && onNewTitle?.(selectedDay)}>
                    Agendar Agora
                  </Button>
                </div>
              )}
              
              <div className="p-6 bg-black/20 border-t border-white/5 space-y-4 mt-auto">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Saldo do Dia</span>
                  <div className="text-right">
                    <p className={cn(
                      "text-lg font-black tabular-nums",
                      (selectedTitles.filter(t => t.type === 'RECEITA').reduce((acc, t) => acc + t.value, 0) - 
                       selectedTitles.filter(t => t.type === 'DESPESA').reduce((acc, t) => acc + t.value, 0)) >= 0 
                      ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {formatCurrency(
                        selectedTitles.filter(t => t.type === 'RECEITA').reduce((acc, t) => acc + t.value, 0) - 
                        selectedTitles.filter(t => t.type === 'DESPESA').reduce((acc, t) => acc + t.value, 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
