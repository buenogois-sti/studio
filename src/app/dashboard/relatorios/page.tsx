
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
  Clock
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
  Cell,
  Cell as RechartsCell
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, isBefore, startOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { H1 } from '@/components/ui/typography';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy, where } from 'firebase/firestore';
import type { Process, Client, FinancialTitle, Staff, LegalDeadline, Hearing, Lead } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const COLORS = ['#F5D030', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function RelatoriosPage() {
  const { firestore, isUserLoading } = useFirebase();

  // Queries
  const clientsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);

  const processesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'processes') : null, [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);

  const titlesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'desc')) : null, [firestore]);
  const { data: titlesData } = useCollection<FinancialTitle>(titlesQuery);

  const staffQuery = useMemoFirebase(() => firestore ? collection(firestore, 'staff') : null, [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);

  const deadlinesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'deadlines') : null, [firestore]);
  const { data: deadlinesData } = useCollection<LegalDeadline>(deadlinesQuery);

  const hearingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'hearings') : null, [firestore]);
  const { data: hearingsData } = useCollection<Hearing>(hearingsQuery);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: leadsData } = useCollection<Lead>(leadsQuery);

  // 1. Processamento de Prazos (Vencidos e Pendentes)
  const deadlineStats = React.useMemo(() => {
    if (!deadlinesData) return { pending: 0, overdue: 0, today: 0 };
    const now = startOfDay(new Date());
    
    return deadlinesData.reduce((acc, d) => {
      if (d.status === 'PENDENTE') {
        const endDate = d.endDate.toDate();
        if (isToday(endDate)) acc.today++;
        else if (isBefore(endDate, now)) acc.overdue++;
        else acc.pending++;
      }
      return acc;
    }, { pending: 0, overdue: 0, today: 0 });
  }, [deadlinesData]);

  // 2. Leads por Tipo de Captação
  const leadCaptureData = React.useMemo(() => {
    if (!leadsData) return [];
    const counts: Record<string, number> = {};
    leadsData.forEach(l => {
      const source = l.captureSource || 'Não Informado';
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leadsData]);

  // 3. Leads Pendentes ("Carrinho Abandonado")
  const pendingLeadsCount = React.useMemo(() => {
    if (!leadsData) return 0;
    return leadsData.filter(l => l.status === 'NOVO' || l.status === 'EM_ELABORACAO').length;
  }, [leadsData]);

  // 4. Performance por Advogado (Comparative)
  const lawyerPerformanceData = React.useMemo(() => {
    if (!staffData || !processesData || !deadlinesData || !hearingsData) return [];
    
    return staffData
      .filter(s => s.role === 'lawyer' || s.role === 'partner')
      .map(lawyer => {
        const processes = processesData.filter(p => p.leadLawyerId === lawyer.id).length;
        const pendingDeadlines = deadlinesData.filter(d => d.authorId === lawyer.id && d.status === 'PENDENTE').length;
        const upcomingHearings = hearingsData.filter(h => h.lawyerId === lawyer.id && h.status === 'PENDENTE').length;
        
        return {
          nome: `${lawyer.firstName} ${lawyer.lastName.charAt(0)}.`,
          demandas: processes,
          prazos: pendingDeadlines,
          audiencias: upcomingHearings,
        };
      })
      .filter(d => d.demandas > 0 || d.prazos > 0 || d.audiencias > 0)
      .sort((a, b) => b.demandas - a.demandas);
  }, [staffData, processesData, deadlinesData, hearingsData]);

  // 5. Histórico Financeiro (Fluxo de Caixa)
  const financialData = React.useMemo(() => {
    if (!titlesData) return [];
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
    
    titlesData.forEach(t => {
      if (t.status === 'PAGO' && t.paymentDate) {
        const date = t.paymentDate instanceof Timestamp ? t.paymentDate.toDate() : new Date(t.paymentDate as any);
        const monthKey = format(date, 'yyyy-MM');
        const m = months.find(m => m.key === monthKey);
        if (m) {
          if (t.type === 'RECEITA') m.receita += t.value;
          else m.despesa += t.value;
        }
      }
    });
    return months;
  }, [titlesData]);

  const isLoading = isUserLoading || !deadlinesData || !leadsData;

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-64 bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full bg-white/5" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full bg-white/5" />
          <Skeleton className="h-[400px] w-full bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <H1 className="text-white text-3xl font-black">Inteligência Operacional</H1>
          <p className="text-sm text-slate-400 mt-1">Análise estratégica de demandas, prazos e performance da banca.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="bg-[#0f172a] border-white/10 text-white font-bold h-10">
          <Download className="mr-2 h-4 w-4" /> Exportar Relatório Geral
        </Button>
      </div>

      {/* KPI Operacionais */}
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
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Leads Pendentes</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-black text-amber-500 tabular-nums">{pendingLeadsCount}</p>
            <p className="text-[10px] text-amber-400/60 font-bold uppercase mt-1">Potencial não convertido</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-primary/20 border-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Gavel className="h-12 w-12 text-primary" /></div>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest">Prazos de Hoje</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-black text-primary tabular-nums">{deadlineStats.today}</p>
            <p className="text-[10px] text-primary/60 font-bold uppercase mt-1">Vencimento fatal hoje</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-blue-500/20 border-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Zap className="h-12 w-12 text-blue-500" /></div>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Novos Leads (Mês)</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-black text-blue-400 tabular-nums">{leadsData?.length || 0}</p>
            <p className="text-[10px] text-blue-400/60 font-bold uppercase mt-1">Entrada de novos casos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Comparativa por Advogado */}
        <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Distribuição de Carga por Advogado
            </CardTitle>
            <CardDescription>Comparativo de processos, prazos e audiências sob responsabilidade.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lawyerPerformanceData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                <XAxis dataKey="nome" stroke="#94a3b8" fontSize={10} fontVariant="bold" axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                <Bar dataKey="demandas" name="Processos" fill="#F5D030" radius={[4, 4, 0, 0]} />
                <Bar dataKey="prazos" name="Prazos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="audiencias" name="Audiências" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Eficácia de Canais de Captação (Marketing Jurídico) */}
        <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-400" /> Origem de Novos Negócios (Leads)
            </CardTitle>
            <CardDescription>Breakdown por tipo de captação para análise de ROI.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center">
            {leadCaptureData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadCaptureData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {leadCaptureData.map((_, index) => (
                      <RechartsCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }}
                  />
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
        {/* Fluxo de Caixa (Últimos 6 meses) */}
        <Card className="lg:col-span-2 bg-[#0f172a] border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" /> Evolução Financeira Real
            </CardTitle>
            <CardDescription>Fluxo de entradas vs saídas operacionais consolidadas.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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

        {/* Resumo de Conversão */}
        <Card className="bg-[#0f172a] border-white/5 shadow-2xl flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" /> Saúde do Funil
            </CardTitle>
            <CardDescription>Métricas de conversão e retenção.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between py-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle2 className="h-4 w-4" /></div>
                  <span className="text-xs font-bold text-slate-300 uppercase">Leads Convertidos</span>
                </div>
                <span className="text-lg font-black text-white">{leadsData?.filter(l => l.status === 'CONVERTIDO').length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><FolderKanban className="h-4 w-4" /></div>
                  <span className="text-xs font-bold text-slate-300 uppercase">Total Clientes Ativos</span>
                </div>
                <span className="text-lg font-black text-white">{clientsData?.filter(c => c.status === 'active').length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500"><XCircle className="h-4 w-4" /></div>
                  <span className="text-xs font-bold text-slate-300 uppercase">Leads Reprovados</span>
                </div>
                <span className="text-lg font-black text-white">{leadsData?.filter(l => l.status === 'REPROVADO').length || 0}</span>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Taxa de Conversão</span>
              </div>
              <p className="text-2xl font-black text-white">
                {leadsData?.length ? ((leadsData.filter(l => l.status === 'CONVERTIDO').length / leadsData.length) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function XCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  )
}
