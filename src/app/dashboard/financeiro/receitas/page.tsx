'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpRight, 
  PlusCircle, 
  Loader2, 
  Check, 
  RefreshCw, 
  MoreVertical,
  Trash2,
  Calendar,
  Wallet,
  CheckCircle2,
  DollarSign,
  Search,
  FolderKanban,
  Receipt,
  Calculator,
  ChevronDown,
  ChevronUp,
  LayoutList,
  AlertTriangle,
  Flame,
  MessageSquare,
  Gavel,
  History,
  ShieldCheck,
  Edit,
  Filter,
  ChevronLeft,
  ChevronRight,
  Scale,
  Clock
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy, where, limit } from 'firebase/firestore';
import type { FinancialTitle, Client, Process } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { REVENUE_CATEGORIES } from '@/lib/financial-constants';
import { cn } from '@/lib/utils';
import { H1 } from '@/components/ui/typography';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { format, isBefore, startOfDay, addMonths, subMonths, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { updateFinancialTitleStatus, processLatePaymentRoutine, deleteFinancialTitle, deleteFinancialTitleSeries } from '@/lib/finance-actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TitleFormDialog, ClientReceiptDialog } from '@/components/finance/finance-dialogs';
import Link from 'next/link';

export default function ReceitasPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const [selectedReceiptTitle, setSelectedReceiptTitle] = React.useState<FinancialTitle | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [titleToEdit, setTitleToEdit] = React.useState<FinancialTitle | null>(null);
  const [titleToDelete, setTitleToDelete] = React.useState<FinancialTitle | null>(null);
  const [periodFilter, setPeriodFilter] = React.useState<'WEEK' | 'FORTNIGHT' | 'MONTH' | 'ALL'>('MONTH');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'PENDENTE' | 'PAGO' | 'ATRASADO'>('ALL');
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  const prevMonth = () => setSelectedDate(prev => subMonths(prev, 1));
  const nextMonth = () => setSelectedDate(prev => addMonths(prev, 1));
  const goToToday = () => setSelectedDate(new Date());
  
  const { toast } = useToast();
  const now = React.useMemo(() => startOfDay(new Date()), []);

  const titlesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), where('type', '==', 'RECEITA'), orderBy('dueDate', 'asc'), limit(300)) : null), [firestore, refreshKey]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'clients'), limit(100)) : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const processesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'processes'), limit(100)) : null, [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);
  
  const filteredTitles = React.useMemo(() => {
    if (!titlesData) return [];
    
    return titlesData.filter(t => {
      const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : (t.dueDate && typeof t.dueDate === 'object' && 'seconds' in t.dueDate) ? new Date((t.dueDate as any).seconds * 1000) : new Date(t.dueDate as any);
      
      if (statusFilter !== 'ALL') {
        const isOverdue = t.status !== 'PAGO' && isBefore(dueDate, now);
        if (statusFilter === 'ATRASADO' && !isOverdue) return false;
        if (statusFilter === 'PENDENTE' && (t.status !== 'PENDENTE' || isOverdue)) return false;
        if (statusFilter === 'PAGO' && t.status !== 'PAGO') return false;
      }

      if (periodFilter !== 'ALL') {
        if (periodFilter === 'MONTH') {
          return isSameMonth(dueDate, selectedDate) && isSameYear(dueDate, selectedDate);
        }

        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (periodFilter === 'WEEK' && (diffDays < -7 || diffDays > 7)) return false;
        if (periodFilter === 'FORTNIGHT' && (diffDays < -15 || diffDays > 15)) return false;
      }

      return true;
    });
  }, [titlesData, periodFilter, statusFilter, now, selectedDate]);

  const stats = React.useMemo(() => {
    return filteredTitles.reduce((acc, t) => {
      const val = t.value || 0;
      acc.total += val;
      if (t.status === 'PAGO') {
        acc.paid += val;
        acc.officeFees += (val * 0.3);
      } else {
        acc.pending += val;
        const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : (t.dueDate && typeof t.dueDate === 'object' && 'seconds' in t.dueDate) ? new Date((t.dueDate as any).seconds * 1000) : new Date(t.dueDate as any);
        if (isBefore(dueDate, now)) {
          acc.overdue += val;
        }
      }
      return acc;
    }, { total: 0, paid: 0, pending: 0, overdue: 0, officeFees: 0 });
  }, [filteredTitles, now]);

  const groupedReceitas = React.useMemo(() => {
    const q = searchTerm.toLowerCase();
    
    const filtered = filteredTitles.filter(t => 
      t.description.toLowerCase().includes(q) ||
      processesMap.get(t.processId || '')?.name.toLowerCase().includes(q)
    );

    const groups: Record<string, { process?: Process, titles: FinancialTitle[], total: number, paid: number, pending: number, hasOverdue: boolean }> = {};
    
    filtered.forEach(t => {
      const key = t.processId || 'standalone';
      if (!groups[key]) {
        groups[key] = { 
          process: t.processId ? processesMap.get(t.processId) : undefined, 
          titles: [], 
          total: 0, 
          paid: 0, 
          pending: 0,
          hasOverdue: false
        };
      }
      
      const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : (t.dueDate && typeof t.dueDate === 'object' && 'seconds' in t.dueDate) ? new Date((t.dueDate as any).seconds * 1000) : new Date(t.dueDate as any);
      const isOverdue = t.status !== 'PAGO' && isBefore(dueDate, now);
      if (isOverdue) groups[key].hasOverdue = true;

      groups[key].titles.push(t);
      groups[key].total += t.value;
      if (t.status === 'PAGO') groups[key].paid += t.value;
      else groups[key].pending += t.value;
    });
    
    return Object.entries(groups).sort((a, b) => {
      if (a[1].hasOverdue && !b[1].hasOverdue) return -1;
      if (!a[1].hasOverdue && b[1].hasOverdue) return 1;
      if (a[0] === 'standalone') return 1;
      if (b[0] === 'standalone') return -1;
      return 0;
    });
  }, [filteredTitles, searchTerm, processesMap, now]);

  const handleUpdateStatus = async (id: string, status: 'PAGO' | 'PENDENTE') => {
    setIsProcessing(id);
    try {
      await updateFinancialTitleStatus(id, status);
      toast({ title: `Título marcado como ${status.toLowerCase()}!` });
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRunLateRoutine = async (title: FinancialTitle) => {
    setIsProcessing(title.id);
    try {
      await processLatePaymentRoutine(title.id);
      toast({ title: 'Rotina de Inadimplência Iniciada!', description: 'O atraso foi registrado no processo.' });
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro na Rotina', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteTitle = async (title: FinancialTitle, deleteSeries = false) => {
    setIsDeleting(true);
    try {
      if (deleteSeries && (title.recurrenceId || title.financialEventId)) {
        await deleteFinancialTitleSeries((title.recurrenceId || title.financialEventId)!);
        toast({ title: 'Série de lançamentos excluída!' });
      } else {
        await deleteFinancialTitle(title.id);
        toast({ title: 'Lançamento excluído com sucesso!' });
      }
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleGroup = (id: string) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedGroups(next);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isLoading = isUserLoading || isLoadingTitles;

  return (
    <div className="flex flex-col gap-6 p-1 relative">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[2px] rounded-3xl animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-3 p-6 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Sincronizando dados...</p>
          </div>
        </div>
      )}

      <RevenuesHeader onAdd={() => { setTitleToEdit(null); setIsFormOpen(true); }} searchTerm={searchTerm} onSearch={setSearchTerm} />

      <RevenuesKPIs stats={stats} formatCurrency={formatCurrency} />

      <RevenuesFilterBar 
        periodFilter={periodFilter} 
        setPeriodFilter={setPeriodFilter} 
        statusFilter={statusFilter} 
        setStatusFilter={setStatusFilter}
        selectedDate={selectedDate}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
        goToToday={goToToday}
      />

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full bg-[#0f172a] rounded-2xl" />)
        ) : groupedReceitas.map(([key, group]) => (
          <RevenuesGroupedCard 
            key={key}
            groupKey={key}
            group={group as any}
            isExpanded={expandedGroups.has(key)}
            onToggle={() => toggleGroup(key)}
            now={now}
            formatCurrency={formatCurrency}
            onUpdateStatus={handleUpdateStatus}
            onRunLateRoutine={handleRunLateRoutine}
            onDelete={handleDeleteTitle}
            onEdit={(t: FinancialTitle) => { setTitleToEdit(t); setIsFormOpen(true); }}
            onReceipt={(t: FinancialTitle) => { setSelectedReceiptTitle(t); setIsReceiptOpen(true); }}
            clientsMap={clientsMap}
          />
        ))}

        {groupedReceitas.length === 0 && !isLoading && (
          <div className="text-center py-20 bg-[#0f172a] rounded-3xl border-2 border-dashed border-white/5 opacity-40">
            <Calculator className="h-12 w-12 mx-auto mb-4" />
            <p className="font-bold text-white uppercase tracking-widest text-[10px]">Nenhuma receita encontrada</p>
          </div>
        )}
      </div>

      <TitleFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        title={titleToEdit}
        onSuccess={() => setRefreshKey(k => k + 1)}
        onDelete={handleDeleteTitle}
      />

      <ClientReceiptDialog 
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        title={selectedReceiptTitle}
        client={selectedReceiptTitle?.clientId ? clientsMap.get(selectedReceiptTitle.clientId) || null : null}
        process={selectedReceiptTitle?.processId ? processesMap.get(selectedReceiptTitle.processId) || null : null}
      />
    </div>
  );
}

// Sub-components para organização
function RevenuesHeader({ onAdd, searchTerm, onSearch }: { onAdd: () => void, searchTerm: string, onSearch: (v: string) => void }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/dashboard/financeiro" className="text-[10px] uppercase font-black text-primary hover:underline">Financeiro</Link>
          <span className="text-slate-500 text-[10px]">/</span>
          <span className="text-slate-200 text-[10px] uppercase font-black">Receitas</span>
        </div>
        <H1 className="text-white">Contas a Receber</H1>
        <p className="text-sm text-muted-foreground">Gestão de entradas, honorários e repasses judiciais.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-full max-sm:w-full max-w-sm print:hidden">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar receitas..." 
            className="pl-8 bg-[#0f172a] border-border/50 text-white h-10" 
            value={searchTerm} 
            onChange={e => onSearch(e.target.value)} 
          />
        </div>
        <Button 
          className="gap-2 bg-emerald-600 text-white font-bold h-10 px-6 shadow-lg shadow-emerald-500/20 hover:bg-emerald-700"
          onClick={onAdd}
        >
          <PlusCircle className="h-4 w-4" />
          Nova Receita
        </Button>
      </div>
    </div>
  );
}

function RevenuesKPIs({ stats, formatCurrency }: { stats: { officeFees: number, total: number, paid: number, pending: number, overdue: number }, formatCurrency: (v: number) => string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-[#0f172a] border-white/5 overflow-hidden relative border-l-4 border-l-primary/50">
        <div className="absolute top-0 right-0 p-3 opacity-10"><Scale className="h-10 w-10 text-primary" /></div>
        <CardHeader className="p-4 pb-1">
          <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Honorários (Estimados)</h4>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-xl font-black text-primary">{formatCurrency(stats.officeFees)}</p>
          <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">30% sobre o realizado</p>
        </CardContent>
      </Card>
      <Card className="bg-[#0f172a] border-white/5 overflow-hidden relative border-l-4 border-l-emerald-500/50">
        <div className="absolute top-0 right-0 p-3 opacity-10"><CheckCircle2 className="h-10 w-10 text-emerald-500" /></div>
        <CardHeader className="p-4 pb-1">
          <h4 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Recebido (Realizado)</h4>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-xl font-black text-emerald-400">{formatCurrency(stats.paid)}</p>
          <div className="flex items-center gap-1.5 mt-1">
              <div className="bg-emerald-500/20 h-1 flex-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${stats.total > 0 ? (stats.paid / stats.total) * 100 : 0}%` }} />
              </div>
              <span className="text-[9px] font-bold text-slate-500">{stats.total > 0 ? Math.round((stats.paid/stats.total)*100) : 0}%</span>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-[#0f172a] border-white/5 overflow-hidden relative border-l-4 border-l-amber-500/50">
        <div className="absolute top-0 right-0 p-3 opacity-10"><Clock className="h-10 w-10 text-amber-500" /></div>
        <CardHeader className="p-4 pb-1">
          <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Aguardando</h4>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-xl font-black text-amber-400">{formatCurrency(stats.pending)}</p>
          <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">Previsão para o período</p>
        </CardContent>
      </Card>
      <Card className="bg-[#0f172a] border-white/5 overflow-hidden relative border-l-4 border-l-rose-500">
        <div className="absolute top-0 right-0 p-3 opacity-10"><AlertTriangle className="h-10 w-10 text-rose-500" /></div>
        <CardHeader className="p-4 pb-1">
          <h4 className="text-[10px] font-black uppercase text-rose-500 tracking-widest">Atrasado (Inadimplência)</h4>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-xl font-black text-rose-500">{formatCurrency(stats.overdue)}</p>
          <p className="text-[9px] text-rose-500/50 font-black mt-1 uppercase">Pendência de clientes</p>
        </CardContent>
      </Card>
    </div>
  );
}

interface RevenuesFilterBarProps {
  periodFilter: 'WEEK' | 'FORTNIGHT' | 'MONTH' | 'ALL';
  setPeriodFilter: (v: 'WEEK' | 'FORTNIGHT' | 'MONTH' | 'ALL') => void;
  statusFilter: 'ALL' | 'PENDENTE' | 'PAGO' | 'ATRASADO';
  setStatusFilter: (v: 'ALL' | 'PENDENTE' | 'PAGO' | 'ATRASADO') => void;
  selectedDate: Date;
  prevMonth: () => void;
  nextMonth: () => void;
  goToToday: () => void;
}

function RevenuesFilterBar({ periodFilter, setPeriodFilter, statusFilter, setStatusFilter, selectedDate, prevMonth, nextMonth, goToToday }: RevenuesFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-1.5 bg-[#0f172a]/80 backdrop-blur-md border border-white/5 rounded-2xl shadow-2xl">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 border-r border-white/5">
          <Calendar className="h-4 w-4 text-primary" />
          <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
            {[
              { id: 'WEEK', label: 'Semanal' },
              { id: 'FORTNIGHT', label: 'Quinzena' },
              { id: 'MONTH', label: 'Mensal' },
              { id: 'ALL', label: 'Tudo' }
            ].map((p) => (
              <Button
                key={p.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 text-[9px] font-black uppercase rounded-lg px-4 transition-all duration-300",
                  periodFilter === p.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white hover:bg-white/5"
                )}
                onClick={() => setPeriodFilter(p.id as any)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {periodFilter === 'MONTH' && (
          <div className="flex items-center gap-1 px-3 py-1 animate-in slide-in-from-left-2 duration-300">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 text-center min-w-[130px]">
              <span className="text-[10px] font-black text-white uppercase tracking-wider">{format(selectedDate, 'MMMM yyyy', { locale: ptBR })}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[8px] font-black uppercase border-white/10 hover:bg-white/5 text-slate-400 ml-2" onClick={goToToday}>Hoje</Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 px-3 py-1">
        <Filter className="h-4 w-4 text-blue-400" />
        <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'ATRASADO', label: '🚨 Vencidas' },
            { id: 'PENDENTE', label: '🕒 Futuras' },
            { id: 'PAGO', label: '✅ Realizadas' }
          ].map((s) => (
            <Button
              key={s.id}
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 text-[9px] font-black uppercase rounded-lg px-4 transition-all duration-300",
                statusFilter === s.id ? "bg-white/10 text-white shadow-inner" : "text-slate-500 hover:text-white hover:bg-white/5"
              )}
              onClick={() => setStatusFilter(s.id as any)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface RevenuesGroupedCardProps {
  groupKey: string;
  group: { 
    process?: Process;
    titles: FinancialTitle[];
    total: number;
    paid: number;
    pending: number;
    hasOverdue: boolean;
  };
  isExpanded: boolean;
  onToggle: () => void;
  now: Date;
  formatCurrency: (v: number) => string;
  onUpdateStatus: (id: string, status: 'PAGO' | 'PENDENTE') => Promise<void>;
  onRunLateRoutine: (t: FinancialTitle) => Promise<void>;
  onDelete: (t: FinancialTitle) => Promise<void>;
  onEdit: (t: FinancialTitle) => void;
  onReceipt: (t: FinancialTitle) => void;
  clientsMap: Map<string, Client>;
}

function RevenuesGroupedCard({ groupKey, group, isExpanded, onToggle, now, formatCurrency, onUpdateStatus, onRunLateRoutine, onDelete, onEdit, onReceipt, clientsMap }: RevenuesGroupedCardProps) {
  return (
    <Card className={cn(
      "bg-[#0f172a] border-white/5 overflow-hidden group/card hover:border-emerald-500/20 transition-all duration-300",
      group.hasOverdue && "border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.05)]"
    )}>
      <div 
        className="p-5 flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border transition-all",
            group.hasOverdue ? "bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse" :
            group.pending > 0 ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : 
            "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          )}>
            {group.hasOverdue ? <AlertTriangle className="h-6 w-6" /> : group.process ? <FolderKanban className="h-6 w-6" /> : <LayoutList className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base leading-tight">
                {group.process ? group.process.name : 'Lançamentos Avulsos'}
              </h3>
              {group.hasOverdue && (
                <Badge className="bg-rose-600 text-white font-black text-[8px] uppercase tracking-widest h-4">🚨 Inadimplência</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{group.titles.length} Títulos vinculados</span>
              {group.process?.processNumber && <span className="text-[10px] font-mono text-primary/60">{group.process.processNumber}</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-[9px] font-black uppercase text-emerald-500 tracking-tighter">Recebido (Bruto)</p>
            <p className="text-sm font-black text-emerald-400">{formatCurrency(group.paid)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase text-primary tracking-tighter">Honorários (30%)</p>
            <p className="text-sm font-black text-primary">{formatCurrency(group.paid * 0.3)}</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/20">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-white/5 bg-black/20 animate-in slide-in-from-top-2 duration-300">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="text-[9px] font-black uppercase text-slate-500 px-6">Descrição / Subcategoria</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-slate-500">Agrupamento</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-slate-500">Vencimento</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-slate-500 text-center">Status</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-slate-500 text-right">Valor Bruto</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-slate-500 text-right px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.titles.map((t: FinancialTitle) => {
                const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : (t.dueDate && typeof t.dueDate === 'object' && 'seconds' in t.dueDate) ? new Date((t.dueDate as any).seconds * 1000) : new Date(t.dueDate as any);
                const isOverdue = t.status !== 'PAGO' && isBefore(dueDate, now);
                return (
                  <TableRow key={t.id} className={cn(
                    "border-white/5 hover:bg-white/5 transition-colors",
                    isOverdue && "bg-rose-500/[0.03]"
                  )}>
                    <TableCell className="px-6">
                      <div>
                        <span className={cn("font-bold text-xs block", isOverdue ? "text-rose-400" : "text-slate-200")}>{t.description}</span>
                        {t.subcategory && <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter block mt-0.5">{t.subcategory}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[8px] font-black uppercase border-white/5 bg-white/5 text-slate-400">
                        {t.category ? (REVENUE_CATEGORIES[t.category as keyof typeof REVENUE_CATEGORIES]?.label || t.category) : 'Geral'}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-[10px] font-mono", isOverdue ? "text-rose-500 font-black" : "text-slate-400")}>
                      {format(dueDate, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn(
                        "text-[8px] font-black uppercase h-5 px-2 border-none",
                        t.status === 'PAGO' ? 'bg-emerald-500/20 text-emerald-400' : 
                        isOverdue ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-400'
                      )}>
                        {isOverdue ? 'VENCIDO' : t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-white text-xs tabular-nums">
                      {formatCurrency(t.value)}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2">
                        {isOverdue && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 rounded-full animate-pulse">
                                <Flame className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border shadow-2xl p-1 w-64">
                              <DropdownMenuLabel className="text-[9px] font-black uppercase text-rose-500 px-2 py-1.5 tracking-widest">Rotina de Inadimplência</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => onRunLateRoutine(t)} className="gap-2 cursor-pointer focus:bg-rose-500/10">
                                <History className="h-4 w-4 text-rose-500" /> <span className="font-bold">Registrar no Processo</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  const phone = clientsMap.get(t.clientId || '')?.mobile?.replace(/\D/g, '');
                                  if (phone) window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá! Notamos um atraso no pagamento da parcela "${t.description}". Poderia nos enviar o comprovante?`)}`, '_blank');
                                }} 
                                className="gap-2 cursor-pointer focus:bg-emerald-500/10"
                              >
                                <MessageSquare className="h-4 w-4 text-emerald-500" /> <span className="font-bold">Notificar Cliente</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {t.status === 'PAGO' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-primary hover:bg-primary/10 rounded-full"
                            onClick={() => onReceipt(t)}
                            title="Emitir Recibo"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white rounded-full">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border shadow-2xl p-1">
                            {t.status !== 'PAGO' ? (
                              <DropdownMenuItem onClick={() => onUpdateStatus(t.id, 'PAGO')} className="gap-2 cursor-pointer focus:bg-emerald-500/10">
                                <Check className="h-4 w-4 text-emerald-500" /> <span className="font-bold">Marcar Recebido</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => onUpdateStatus(t.id, 'PENDENTE')} className="gap-2 cursor-pointer focus:bg-amber-500/10">
                                <RefreshCw className="h-4 w-4 text-amber-500" /> <span className="font-bold text-amber-500">Estornar</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={() => onEdit(t)} className="gap-2 cursor-pointer">
                              <Edit className="h-4 w-4 text-blue-400" /> <span className="font-bold">Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(t)} className="gap-2 cursor-pointer text-rose-500 focus:bg-rose-500/10">
                              <Trash2 className="h-4 w-4" /> <span className="font-bold">Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
