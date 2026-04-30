'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Plus, 
  ChevronRight,
  Search,
  X,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface LeadHeaderProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (val: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (val: string) => void;
  showAnalytics: boolean;
  onToggleAnalytics: () => void;
  onNewLead: () => void;
  isSearching: boolean;
}

export function LeadHeader({
  searchTerm,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  sourceFilter,
  onSourceFilterChange,
  showAnalytics,
  onToggleAnalytics,
  onNewLead,
  isSearching
}: LeadHeaderProps) {
  return (
    <div className="flex flex-col gap-6 mb-2">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            <span className="hover:text-primary cursor-pointer transition-colors">Início</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-300">Funil de Leads</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter font-headline text-white uppercase">
            Triagem de Oportunidades
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={onToggleAnalytics} 
            className={cn(
              "border-white/10 text-[10px] font-black uppercase tracking-widest h-11 px-6 rounded-xl transition-all",
              showAnalytics ? "bg-primary/20 text-primary border-primary/30" : "bg-[#0f172a] text-slate-400"
            )}
          >
            <TrendingUp className="mr-2 h-4 w-4" /> 
            {showAnalytics ? 'Fechar Analytics' : 'Ver Analytics'}
          </Button>
          <Button 
            onClick={onNewLead} 
            className="bg-gradient-to-r from-[#D4AF37] to-[#F9D71C] text-black font-black uppercase text-[11px] tracking-widest h-11 px-8 rounded-xl shadow-xl shadow-yellow-900/20 hover:scale-105 transition-transform"
          >
            <Plus className="mr-2 h-4 w-4 fill-current" /> Novo Atendimento
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-[#0f172a]/50 p-3 rounded-2xl border border-white/5 backdrop-blur-sm mt-2">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Busque por nome, CPF ou título da demanda..." 
            className="pl-9 pr-10 bg-black/40 border-white/5 h-11 text-sm rounded-xl text-white w-full transition-colors focus:border-primary/50" 
            value={searchTerm} 
            onChange={e => onSearchChange(e.target.value)} 
          />
          {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
            <SelectTrigger className="w-[160px] bg-black/40 border-white/5 h-11 rounded-xl font-bold">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f172a] border-white/10 text-white">
              <SelectItem value="all">Todas Prioridades</SelectItem>
              <SelectItem value="CRITICA" className="text-rose-500">Crítica</SelectItem>
              <SelectItem value="ALTA" className="text-orange-500">Alta</SelectItem>
              <SelectItem value="MEDIA" className="text-amber-500">Média</SelectItem>
              <SelectItem value="BAIXA" className="text-blue-400">Baixa</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
            <SelectTrigger className="w-[180px] bg-black/40 border-white/5 h-11 rounded-xl font-bold">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f172a] border-white/10 text-white">
              <SelectItem value="all">Todas Origens</SelectItem>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="Indicação">Indicação</SelectItem>
              <SelectItem value="Site">Site</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || priorityFilter !== 'all' || sourceFilter !== 'all') && (
            <Button 
              variant="ghost" 
              onClick={() => { onSearchChange(''); onPriorityFilterChange('all'); onSourceFilterChange('all'); }}
              className="h-11 px-4 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shrink-0"
            >
              <X className="h-3 w-3 mr-1.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
