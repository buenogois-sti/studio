
'use client';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpRight, ArrowDownRight, PlusCircle, Loader2, Check, Download, Receipt, Users, RefreshCw, TrendingUp, BarChartIcon
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy } from 'firebase/firestore';
import type { FinancialTitle, Staff } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { H1 } from '@/components/ui/typography';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createFinancialTitle } from '@/lib/finance-actions';

export default function FinanceiroPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const titlesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'desc')) : null), [firestore, refreshKey]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);
  
  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);

  // OTIMIZAÇÃO: Cálculo de estatísticas financeiros memoizado O(n)
  const stats = React.useMemo(() => {
    if (!titlesData) return { totalReceitas: 0, totalDespesas: 0 };
    return titlesData.reduce((acc, t) => {
      if (t.type === 'RECEITA' && t.status === 'PAGO') acc.totalReceitas += t.value;
      if (t.type === 'DESPESA' && t.status === 'PAGO') acc.totalDespesas += t.value;
      return acc;
    }, { totalReceitas: 0, totalDespesas: 0 });
  }, [titlesData]);

  // OTIMIZAÇÃO: Listas separadas memoizadas
  const receitas = React.useMemo(() => titlesData?.filter(t => t.type === 'RECEITA') || [], [titlesData]);
  const despesas = React.useMemo(() => titlesData?.filter(t => t.type === 'DESPESA') || [], [titlesData]);
  
  const isLoading = isUserLoading || isLoadingTitles;

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div><H1 className="text-white">Financeiro</H1><p className="text-sm text-muted-foreground">Controle estratégico de faturamento e despesas.</p></div>
        <div className="flex gap-2">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-end">
                <span className="text-[10px] font-black text-emerald-400 uppercase">Recebido (Mês)</span>
                <span className="text-lg font-black text-emerald-400">{formatCurrency(stats.totalReceitas)}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-end">
                <span className="text-[10px] font-black text-rose-400 uppercase">Pago (Mês)</span>
                <span className="text-lg font-black text-rose-400">{formatCurrency(stats.totalDespesas)}</span>
            </div>
        </div>
      </div>

      <Tabs defaultValue="receitas" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-[#0f172a] border border-white/5 rounded-lg p-1 gap-1">
            <TabsTrigger value="receitas" className="rounded-md data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Receitas</TabsTrigger>
            <TabsTrigger value="despesas" className="rounded-md data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">Despesas</TabsTrigger>
            <TabsTrigger value="relatorios" className="rounded-md data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="receitas" className="flex-1">
            <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
                <Table>
                    <TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="text-muted-foreground">Descrição</TableHead><TableHead className="text-muted-foreground">Vencimento</TableHead><TableHead className="text-center text-muted-foreground">Status</TableHead><TableHead className="text-right text-muted-foreground">Valor</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full bg-white/5" /></TableCell></TableRow>) : receitas.map(r => (
                            <TableRow key={r.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                <TableCell className="font-medium text-white">{r.description}</TableCell>
                                <TableCell className="text-slate-400">{format(r.dueDate instanceof Timestamp ? r.dueDate.toDate() : new Date(r.dueDate), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="text-center"><Badge className={r.status === 'PAGO' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'} variant="outline">{r.status}</Badge></TableCell>
                                <TableCell className="text-right font-bold text-emerald-400">{formatCurrency(r.value)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </TabsContent>

        <TabsContent value="despesas" className="flex-1">
            <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
                <Table>
                    <TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="text-muted-foreground">Descrição</TableHead><TableHead className="text-muted-foreground">Data</TableHead><TableHead className="text-right text-muted-foreground">Valor</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8 w-full bg-white/5" /></TableCell></TableRow>) : despesas.map(d => (
                            <TableRow key={d.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                <TableCell className="font-medium text-white">{d.description}</TableCell>
                                <TableCell className="text-slate-400">{format(d.dueDate instanceof Timestamp ? d.dueDate.toDate() : new Date(d.dueDate), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="text-right font-bold text-rose-400">{formatCurrency(d.value)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
