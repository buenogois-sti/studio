
'use client';

import * as React from 'react';
import { 
  BarChart as BarChartIcon, 
  TrendingUp, 
  Users, 
  FolderKanban, 
  DollarSign, 
  Download, 
  Calendar,
  PieChart as PieChartIcon,
  Timer,
  Gavel,
  Zap,
  AlertTriangle,
  Target,
  Flame,
  Clock,
  Activity,
  XCircle,
  Sparkles,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell as RechartsCell
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, isBefore, startOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { H1 } from '@/components/ui/typography';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, where, limit, getDocs, Timestamp } from 'firebase/firestore';
import type { Process, Client, FinancialTitle, Staff, LegalDeadline, Hearing, Lead } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const COLORS = ['#F5D030', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function RelatoriosPage() {
  const { firestore, areServicesAvailable } = useFirebase();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<{
    clients: Client[];
    processes: Process[];
    titles: FinancialTitle[];
    staff: Staff[];
    deadlines: LegalDeadline[];
    hearings: Hearing[];
    leads: Lead[];
  }>({
    clients: [],
    processes: [],
    titles: [],
    staff: [],
    deadlines: [],
    hearings: [],
    leads: [],
  });

  const fetchData = React.useCallback(async (quiet = false) => {
    if (!firestore) return;
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    
    setError(null);

    try {
      const sixMonthsAgo = Timestamp.fromDate(subMonths(new Date(), 6));

      const [
        clientsSnap,
        processesSnap,
        titlesSnap,
        staffSnap,
        deadlinesSnap,
        hearingsSnap,
        leadsSnap
      ] = await Promise.all([
        getDocs(query(collection(firestore, 'clients'), limit(100))),
        getDocs(query(collection(firestore, 'processes'), where('createdAt', '>=', sixMonthsAgo), limit(200))),
        getDocs(query(collection(firestore, 'financial_titles'), where('dueDate', '>=', sixMonthsAgo), orderBy('dueDate', 'desc'), limit(200))),
        getDocs(query(collection(firestore, 'staff'), limit(50))),
        getDocs(query(collection(firestore, 'deadlines'), where('endDate', '>=', sixMonthsAgo), limit(200))),
        getDocs(query(collection(firestore, 'hearings'), where('date', '>=', sixMonthsAgo), limit(200))),
        getDocs(query(collection(firestore, 'leads'), where('createdAt', '>=', sixMonthsAgo), limit(200)))
      ]);

      setData({
        clients: clientsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Client)),
        processes: processesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Process)),
        titles: titlesSnap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialTitle)),
        staff: staffSnap.docs.map(d => ({ id: d.id, ...d.data() } as Staff)),
        deadlines: deadlinesSnap.docs.map(d => ({ id: d.id, ...d.data() } as LegalDeadline)),
        hearings: hearingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Hearing)),
        leads: leadsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)),
      });
    } catch (e: any) {
      console.error("[Relatorios] Fetch error:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [firestore]);

  React.useEffect(() => {
    if (areServicesAvailable) {
      fetchData();
    }
  }, [areServicesAvailable, fetchData]);

  const deadlineStats = React.useMemo(() => {
    const now = startOfDay(new Date());
    return data.deadlines.reduce((acc, d) => {
      if (d.status === 'PENDENTE') {
        const endDate = d.endDate.toDate();
        if (isToday(endDate)) acc.today++;
        else if (isBefore(endDate, now)) acc.overdue++;
        else acc.pending++;
      }
      return acc;
    }, { pending: 0, overdue: 0, today: 0 });
  }, [data.deadlines]);

  const leadCaptureData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    data.leads.forEach(l => {
      const source = l.captureSource || 'Não Informado';
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data.leads]);

  const lawyerPerformanceData = React.useMemo(() => {
    return data.staff
      .filter(s => s.role === 'lawyer' || s.role === 'partner')
      .map(lawyer => {
        const processes = data.processes.filter(p => p.leadLawyerId === lawyer.id).length;
        const pendingDeadlines = data.deadlines.filter(d => d.authorId === lawyer.id && d.status === 'PENDENTE').length;
        const upcomingHearings = data.hearings.filter(h => h.lawyerId === lawyer.id && h.status === 'PENDENTE').length;
        
        return {
          nome: `${lawyer.firstName} ${lawyer.lastName.charAt(0)}.`,
          demandas: processes,
          prazos: pendingDeadlines,
          audiencias: upcomingHearings,
        };
      })
      .filter(d => d.demandas > 0 || d.prazos > 0 || d.audiencias > 0)
      .sort((a, b) => b.demandas - a.demandas);
  }, [data]);

  const financialData = React.useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, 'yyyy-MM');
      months.push({ 
        month: format(d, 'MMM/yy', { locale: ptBR }), 
        key, 
        receita: 0, 
        despesa: 0 
      });
    }
    
    data.titles.forEach(t => {
      if (t.status === 'PAGO' && t.paymentDate) {
        const date = t.paymentDate.toDate();
        const monthKey = format(date, 'yyyy-MM');
        const m = months.find(m => m.key === monthKey);
        if (m) {
          if (t.type === 'RECEITA') m.receita += t.value;
          else m.despesa += t.value;
        }
      }
    });
    return months;
  }, [data.titles]);

  if (error) {
    return (
      <div className="p-8 space-y-6">
        <H1 className="text-white">Relatórios</H1>
        <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados de BI</AlertTitle>
          <AlertDescription className="text-xs mt-2 space-y-4">
            <p>{error}</p>
            <Button onClick={() => fetchData()} variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase">
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-4">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <PieChartIcon className="h-10 w-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Compilando Inteligência</h2>
          <p className="text-sm text-slate-400">Processando métricas operacionais e financeiras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <H1 className="text-white text-3xl font-black">Inteligência Operacional</H1>
          <p className="text-sm text-slate-400 mt-1">Dados processados em {format(new Date(), 'HH:mm')}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => fetchData(true)} 
            disabled={isRefreshing}
            className="text-muted-foreground hover:text-white h-10"
          >
            {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar BI
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="bg-[#0f172a] border-white/10 text-white font-bold h-10">
            <Download className="mr-2 h-4 w-4" /> Exportar Relatório
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#0f172a] border-rose-500/20 border-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Timer className="h-12 w-12 text-rose-500" /></div>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Prazos Vencidos</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-black text-rose-500 tabular-nums">{deadlineStats.overdue}</p>
            <p className="text-[10px] text-rose-400/60 font-bold uppercase mt-1">Atenção Crítica</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-amber-500/20 border-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Flame className="h-12 w-12 text-amber-500" /></div>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Leads Ativos</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-black text-amber-500 tabular-nums">{data.leads.filter(l => l.status !== 'REPROVADO' && l.status !== 'CONVERTIDO').length}</p>
            <p className="text-[10px] text-amber-400/60 font-bold uppercase mt-1">Em prospecção</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-primary/20 border-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Gavel className="h-12 w-12 text-primary" /></div>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest">Prazos p/ Hoje</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-black text-primary tabular-nums">{deadlineStats.today}</p>
            <p className="text-[10px] text-primary/60 font-bold uppercase mt-1">Vencimento fatal</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-blue-500/20 border-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Zap className="h-12 w-12 text-blue-500" /></div>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Novos Casos (6m)</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-black text-blue-400 tabular-nums">{data.processes.length}</p>
            <p className="text-[10px] text-blue-400/60 font-bold uppercase mt-1">Volume de entrada</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Distribuição de Carga
            </CardTitle>
            <CardDescription>Carga de trabalho por advogado (6 meses).</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lawyerPerformanceData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                <XAxis dataKey="nome" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase' }} />
                <Bar dataKey="demandas" name="Processos" fill="#F5D030" radius={[4, 4, 0, 0]} />
                <Bar dataKey="prazos" name="Prazos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="audiencias" name="Audiências" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-400" /> Origem de Clientes (Leads)
            </CardTitle>
            <CardDescription>Breakdown por tipo de captação.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] w-full flex items-center justify-center">
            {leadCaptureData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leadCaptureData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                    {leadCaptureData.map((_, index) => <RechartsCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" align="center" layout="horizontal" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center opacity-30">
                <Target className="h-12 w-12 mb-4" />
                <p className="text-xs font-bold uppercase">Sem dados de captação</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[#0f172a] border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" /> Evolução Financeira
            </CardTitle>
            <CardDescription>Fluxo de caixa real (últimos 6 meses).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="month" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }}
                  formatter={(val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                />
                <Area type="monotone" dataKey="receita" name="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorRec)" strokeWidth={3} />
                <Area type="monotone" dataKey="despesa" name="Saídas" stroke="#ef4444" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-white/5 shadow-2xl flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" /> Saúde da Base
            </CardTitle>
            <CardDescription>Indicadores de retenção.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between py-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle2 className="h-4 w-4" /></div>
                  <span className="text-xs font-bold text-slate-300 uppercase">Leads Convertidos</span>
                </div>
                <span className="text-lg font-black text-white">{data.leads.filter(l => l.status === 'CONVERTIDO').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><FolderKanban className="h-4 w-4" /></div>
                  <span className="text-xs font-bold text-slate-300 uppercase">Processos em Fluxo</span>
                </div>
                <span className="text-lg font-black text-white">{data.processes.length}</span>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Taxa de Eficiência</span>
              </div>
              <p className="text-2xl font-black text-white">
                {data.leads.length ? ((data.leads.filter(l => l.status === 'CONVERTIDO').length / data.leads.length) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
