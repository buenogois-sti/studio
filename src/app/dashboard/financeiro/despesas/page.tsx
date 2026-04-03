'use client';
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowDownRight, 
  PlusCircle, 
  Loader2, 
  Check, 
  RefreshCw, 
  MoreVertical,
  Trash2,
  Calendar,
  DollarSign,
  Search,
  Filter,
  Edit,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy, where, limit } from 'firebase/firestore';
import type { FinancialTitle } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { EXPENSE_CATEGORIES } from '@/lib/financial-constants';
import { cn } from '@/lib/utils';
import { H1 } from '@/components/ui/typography';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { format, isBefore, startOfDay, addMonths, subMonths, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { updateFinancialTitleStatus, deleteFinancialTitle, deleteFinancialTitleSeries } from '@/lib/finance-actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TitleFormDialog } from '@/components/finance/finance-dialogs';
import Link from 'next/link';

export default function DespesasPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [titleToEdit, setTitleToEdit] = React.useState<FinancialTitle | null>(null);
  const [periodFilter, setPeriodFilter] = React.useState<'WEEK' | 'FORTNIGHT' | 'MONTH' | 'ALL'>('MONTH');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'PENDENTE' | 'PAGO' | 'ATRASADO'>('ALL');
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  const prevMonth = () => setSelectedDate(prev => subMonths(prev, 1));
  const nextMonth = () => setSelectedDate(prev => addMonths(prev, 1));
  const goToToday = () => setSelectedDate(new Date());
  
  const { toast } = useToast();
  const now = React.useMemo(() => startOfDay(new Date()), []);

  const titlesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'asc'), limit(500)) : null), [firestore, refreshKey]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const filteredTitles = React.useMemo(() => {
    if (!titlesData) return [];
    
    return titlesData.filter(t => {
      if (t.type !== 'DESPESA') return false;
      const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : (t.dueDate && typeof t.dueDate === 'object' && 'seconds' in t.dueDate) ? new Date((t.dueDate as any).seconds * 1000) : new Date(t.dueDate as any);
      
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.beneficiaryName?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

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
  }, [titlesData, periodFilter, statusFilter, searchTerm, now, selectedDate]);

  const stats = React.useMemo(() => {
    return filteredTitles.reduce((acc, t) => {
      const val = t.value || 0;
      acc.total += val;
      if (t.status === 'PAGO') {
        acc.paid += val;
      } else {
        acc.pending += val;
        const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : (t.dueDate && typeof t.dueDate === 'object' && 'seconds' in t.dueDate) ? new Date((t.dueDate as any).seconds * 1000) : new Date(t.dueDate as any);
        if (isBefore(dueDate, now)) {
          acc.overdue += val;
        }
      }
      return acc;
    }, { total: 0, paid: 0, pending: 0, overdue: 0 });
  }, [filteredTitles, now]);

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
      
      <ExpensesHeader onAdd={() => { setTitleToEdit(null); setIsFormOpen(true); }} searchTerm={searchTerm} onSearch={setSearchTerm} />

      <ExpensesKPIs stats={stats} formatCurrency={formatCurrency} />

      <ExpensesFilterBar 
        periodFilter={periodFilter} 
        setPeriodFilter={setPeriodFilter} 
        statusFilter={statusFilter} 
        setStatusFilter={setStatusFilter}
        selectedDate={selectedDate}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
        goToToday={goToToday}
      />

      <ExpensesTable 
        isLoading={isLoading} 
        titles={filteredTitles} 
        now={now} 
        formatCurrency={formatCurrency}
        onUpdateStatus={handleUpdateStatus}
        onEdit={(t: FinancialTitle) => { setTitleToEdit(t); setIsFormOpen(true); }}
        onDelete={handleDeleteTitle}
        isProcessing={isProcessing}
      />

      <TitleFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        title={titleToEdit}
        onSuccess={() => setRefreshKey(k => k + 1)}
        onDelete={handleDeleteTitle}
      />
    </div>
  );
}

// Sub-components para organização
function ExpensesHeader({ onAdd, searchTerm, onSearch }: { onAdd: () => void, searchTerm: string, onSearch: (v: string) => void }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/dashboard/financeiro" className="text-[10px] uppercase font-black text-primary hover:underline">Financeiro</Link>
          <span className="text-slate-500 text-[10px]">/</span>
          <span className="text-slate-200 text-[10px] uppercase font-black">Despesas</span>
        </div>
        <H1 className="text-white">Contas a Pagar</H1>
        <p className="text-sm text-muted-foreground">Controle de custos fixos, variáveis e pro-labore.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-full max-sm:w-full max-w-sm print:hidden">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar despesas..." 
            className="pl-8 bg-[#0f172a] border-border/50 text-white h-10" 
            value={searchTerm} 
            onChange={e => onSearch(e.target.value)} 
          />
        </div>
        <Button 
          className="gap-2 bg-rose-600 text-white font-bold h-10 px-6 shadow-lg shadow-rose-500/20 hover:bg-rose-700"
          onClick={onAdd}
        >
          <PlusCircle className="h-4 w-4" />
          Nova Despesa
        </Button>
      </div>
    </div>
  );
}

function ExpensesKPIs({ stats, formatCurrency }: { stats: { total: number, paid: number, pending: number, overdue: number }, formatCurrency: (v: number) => string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-[#0f172a] border-white/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 opacity-10"><DollarSign className="h-10 w-10 text-white" /></div>
        <CardHeader className="p-4 pb-1">
          <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Previsão Total</h4>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-xl font-black text-white">{formatCurrency(stats.total)}</p>
          <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">Soma de todos os lançamentos</p>
        </CardContent>
      </Card>
      <Card className="bg-[#0f172a] border-white/5 overflow-hidden relative border-l-4 border-l-emerald-500/50">
        <div className="absolute top-0 right-0 p-3 opacity-10"><Check className="h-10 w-10 text-emerald-500" /></div>
        <CardHeader className="p-4 pb-1">
          <h4 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Realizado (Pago)</h4>
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
          <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Em Aberto</h4>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-xl font-black text-amber-400">{formatCurrency(stats.pending)}</p>
          <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">Compromissos futuros</p>
        </CardContent>
      </Card>
      <Card className="bg-[#0f172a] border-white/5 overflow-hidden relative border-l-4 border-l-rose-500">
        <div className="absolute top-0 right-0 p-3 opacity-10"><AlertTriangle className="h-10 w-10 text-rose-500" /></div>
        <CardHeader className="p-4 pb-1">
          <h4 className="text-[10px] font-black uppercase text-rose-500 tracking-widest">Vencido (🚨)</h4>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-xl font-black text-rose-500">{formatCurrency(stats.overdue)}</p>
          <p className="text-[9px] text-rose-500/50 font-black mt-1 uppercase">Ação necessária imediata</p>
        </CardContent>
      </Card>
    </div>
  );
}

interface ExpensesFilterBarProps {
  periodFilter: 'WEEK' | 'FORTNIGHT' | 'MONTH' | 'ALL';
  setPeriodFilter: (v: 'WEEK' | 'FORTNIGHT' | 'MONTH' | 'ALL') => void;
  statusFilter: 'ALL' | 'PENDENTE' | 'PAGO' | 'ATRASADO';
  setStatusFilter: (v: 'ALL' | 'PENDENTE' | 'PAGO' | 'ATRASADO') => void;
  selectedDate: Date;
  prevMonth: () => void;
  nextMonth: () => void;
  goToToday: () => void;
}

function ExpensesFilterBar({ periodFilter, setPeriodFilter, statusFilter, setStatusFilter, selectedDate, prevMonth, nextMonth, goToToday }: ExpensesFilterBarProps) {
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

interface ExpensesTableProps {
  isLoading: boolean;
  titles: FinancialTitle[];
  now: Date;
  formatCurrency: (v: number) => string;
  onUpdateStatus: (id: string, status: 'PAGO' | 'PENDENTE') => Promise<void>;
  onEdit: (t: FinancialTitle) => void;
  onDelete: (t: FinancialTitle) => Promise<void>;
  isProcessing: string | null;
}

function ExpensesTable({ isLoading, titles, now, formatCurrency, onUpdateStatus, onEdit, onDelete, isProcessing }: ExpensesTableProps) {
  return (
    <Card className="bg-[#0f172a] border-white/5 overflow-hidden shadow-xl">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-black uppercase text-[10px] px-6">Descrição / Subcategoria</TableHead>
            <TableHead className="text-muted-foreground font-black uppercase text-[10px]">Agrupamento</TableHead>
            <TableHead className="text-muted-foreground font-black uppercase text-[10px]">Vencimento</TableHead>
            <TableHead className="text-center text-muted-foreground font-black uppercase text-[10px]">Status</TableHead>
            <TableHead className="text-right text-muted-foreground font-black uppercase text-[10px]">Valor</TableHead>
            <TableHead className="text-right text-muted-foreground font-black uppercase text-[10px] px-6">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-12 w-full bg-white/5 rounded-lg" /></TableCell></TableRow>
            ))
          ) : titles.length > 0 ? (
            titles.map((t: FinancialTitle) => {
              const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : (t.dueDate && typeof t.dueDate === 'object' && 'seconds' in t.dueDate) ? new Date((t.dueDate as any).seconds * 1000) : new Date(t.dueDate as any);
              const isOverdue = t.status !== 'PAGO' && isBefore(dueDate, now);
              return (
                <TableRow key={t.id} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="px-6">
                    <div>
                      <p className="font-bold text-white text-sm">{t.description}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1 flex items-center gap-2">
                        {t.subcategory && <span className="text-primary/70">{t.subcategory}</span>}
                        <span>• {t.beneficiaryName || 'Sem favorecido'}</span>
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[8px] font-black uppercase border-white/5 bg-white/5 text-slate-400">
                      {t.category ? (EXPENSE_CATEGORIES[t.category as keyof typeof EXPENSE_CATEGORIES]?.label || t.category) : 'Outros'}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn("text-xs font-mono", isOverdue ? "text-rose-500 font-black" : "text-slate-400")}>
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
                  <TableCell className="text-right font-black text-rose-400 text-sm tabular-nums">
                    {formatCurrency(t.value)}
                  </TableCell>
                  <TableCell className="text-right px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/30 hover:text-white hover:bg-white/5 rounded-full">
                            {isProcessing === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 text-white shadow-2xl">
                          {t.status !== 'PAGO' ? (
                            <DropdownMenuItem onClick={() => onUpdateStatus(t.id, 'PAGO')} className="gap-2 cursor-pointer focus:bg-emerald-500/10">
                              <Check className="h-4 w-4 text-emerald-500" /> <span className="font-bold">Baixar Título</span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => onUpdateStatus(t.id, 'PENDENTE')} className="gap-2 cursor-pointer focus:bg-amber-500/10">
                              <RefreshCw className="h-4 w-4 text-amber-500" /> <span className="font-bold text-amber-500">Estornar Pagamento</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => onEdit(t)} className="gap-2 cursor-pointer focus:bg-blue-500/10">
                            <Edit className="h-4 w-4 text-blue-400" /> <span className="font-bold">Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(t)} className="gap-2 cursor-pointer text-rose-500 focus:bg-rose-500/10">
                            <Trash2 className="h-4 w-4" /> <span className="font-bold">Excluir Lançamento</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-20 opacity-30">
                <AlertTriangle className="h-10 w-10 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma despesa para exibir</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
