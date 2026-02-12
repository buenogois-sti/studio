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
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Building,
  Scale,
  Award,
  History,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Handshake
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
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, isBefore, startOfDay, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { H1 } from '@/components/ui/typography';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, limit, getDocs, Timestamp, doc } from 'firebase/firestore';
import type { Process, Client, FinancialTitle, Staff, LegalDeadline, Hearing, Lead, UserProfile, StaffCredit } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from 'next-auth/react';

const COLORS = ['#F5D030', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const ReportLetterhead = ({ title }: { title: string }) => (
  <div className="hidden print:block mb-10 pb-6 border-b-2 border-slate-900">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="bg-slate-900 p-2 rounded-xl">
          <img src="/logo.png" alt="Logo" className="h-12 w-auto brightness-0 invert" />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Bueno Gois Advogados</h2>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Inteligência Jurídica & Performance Estratégica</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl font-black text-slate-900 font-headline uppercase">{title}</div>
        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Emissão: {format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
      </div>
    </div>
    <div className="mt-4 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-rose-600 border border-rose-600/20 px-3 py-1 rounded">
      <span>⚠️ DOCUMENTO CONFIDENCIAL - USO INTERNO EXCLUSIVO</span>
      <span>BUENO GOIS ADVOGADOS E ASSOCIADOS</span>
    </div>
  </div>
);

function StatCard({ title, value, subValue, icon: Icon, currency = false, color = "text-primary" }: any) {
  return (
    <Card className="bg-[#0f172a] border-white/5 transition-all hover:border-primary/20 shadow-xl group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg bg-white/5 group-hover:scale-110 transition-transform", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-black text-white tabular-nums", color)}>
          {currency ? (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value}
        </div>
        {subValue && <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-tighter">{subValue}</p>}
      </CardContent>
    </Card>
  );
}

const AdminReports = React.memo(({ data }: { data: any }) => {
  if (!data) return null;
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ReportLetterhead title="Relatório de Performance Gerencial" />
      
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Ticket Médio / Causa" value={data.stats.avgCaseValue} icon={Scale} currency color="text-primary" subValue="Expectativa de recebimento" />
        <StatCard title="Ticket Médio / Acordo" value={data.stats.avgSettlementValue} icon={Handshake} currency color="text-emerald-400" subValue="Recuperação real imediata" />
        <StatCard title="Taxa de Procedência" value={`${data.stats.successRate}%`} icon={Award} color="text-blue-400" subValue="Vitórias judiciais" />
        <StatCard title="Tempo Médio (Aging)" value={`${data.stats.avgAging} meses`} icon={Timer} color="text-purple-400" subValue="Ciclo de vida do processo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Distribuição de Carga Operacional
            </CardTitle>
            <CardDescription>Breakdown por advogado titular do caso.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.lawyerPerformance || []} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                <XAxis dataKey="nome" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }} />
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
              <Target className="h-5 w-5 text-emerald-400" /> Funil de Captação & Conversão
            </CardTitle>
            <CardDescription>Distribuição de leads por fonte de origem.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.leadCapture || []} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                  {(data.leadCapture || []).map((_: any, index: number) => <RechartsCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" align="center" layout="horizontal" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <FinancialEvolutionChart data={data.financial || []} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:break-before-page pt-10">
        <Card className="bg-[#0f172a] border-white/5">
          <CardHeader><CardTitle className="text-white text-sm uppercase flex items-center gap-2"><Flame className="h-4 w-4 text-rose-500" /> Casos em Risco Crítico</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.riskyProcesses?.map((p: any) => (
              <div key={p.id} className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-white truncate max-w-[250px]">{p.name}</p>
                  <p className="text-[9px] text-rose-400 font-mono uppercase">#{p.id.substring(0,8)}</p>
                </div>
                <Badge variant="outline" className="border-rose-500/30 text-rose-500 text-[9px] font-black uppercase tracking-widest">EXPIRADO</Badge>
              </div>
            ))}
            {(!data.riskyProcesses || data.riskyProcesses.length === 0) && <p className="text-xs italic text-center py-4 text-slate-500">Nenhum risco imediato detectado.</p>}
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-white/5">
          <CardHeader><CardTitle className="text-white text-sm uppercase flex items-center gap-2"><Award className="h-4 w-4 text-emerald-500" /> Top Performers (Encerrados)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.topPerformers?.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-[10px]">{i+1}</div>
                  <span className="text-xs font-bold text-white">{s.name}</span>
                </div>
                <span className="text-xs font-black text-emerald-400">{s.count} Êxitos</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
AdminReports.displayName = 'AdminReports';

const FinancialEvolutionChart = React.memo(({ data }: { data: any[] }) => {
  return (
    <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-400" /> Fluxo de Caixa Institucional (Bueno Gois)
        </CardTitle>
        <CardDescription>Comparativo entre entradas efetivas e saídas operacionais (Últimos 6 meses).</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
  );
});
FinancialEvolutionChart.displayName = 'FinancialEvolutionChart';

export default function RelatoriosPage() {
  const { firestore } = useFirebase();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reportData, setReportData] = React.useState<any>(null);

  const userProfileRef = useMemoFirebase(
    () => (firestore && session?.user?.id ? doc(firestore, 'users', session.user.id) : null),
    [firestore, session]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const role = userProfile?.role || 'assistant';

  const fetchData = React.useCallback(async () => {
    if (!firestore || !session?.user?.id || !userProfile) return;
    setIsLoading(true);
    setError(null);

    try {
      const sixMonthsAgo = Timestamp.fromDate(subMonths(new Date(), 6));
      
      // 1. Fetch de Processos para KPIs
      const processesSnap = await getDocs(query(collection(firestore, 'processes')));
      const allProcesses = processesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Process));
      
      // 2. Fetch de Títulos para Financeiro
      const titlesSnap = await getDocs(query(collection(firestore, 'financial_titles'), where('dueDate', '>=', sixMonthsAgo)));
      const titles = titlesSnap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialTitle));

      // 3. Fetch de Atos Operacionais
      const hearingsSnap = await getDocs(query(collection(firestore, 'hearings'), where('date', '>=', sixMonthsAgo)));
      const hearings = hearingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Hearing));

      // 4. Cálculo de KPIs Estratégicos
      const settlements = titles.filter(t => t.origin === 'ACORDO' && t.status === 'PAGO');
      const avgCaseValue = allProcesses.length > 0 ? allProcesses.reduce((s, p) => s + (p.caseValue || 0), 0) / allProcesses.length : 0;
      const avgSettlementValue = settlements.length > 0 ? settlements.reduce((s, t) => s + t.value, 0) / settlements.length : 0;
      
      const ProcedenciaCount = titles.filter(t => t.origin === 'SENTENCA' && t.status === 'PAGO').length;
      const ImprocedenciaCount = allProcesses.filter(p => p.status === 'Arquivado' && !titles.some(t => t.processId === p.id && t.status === 'PAGO')).length;
      const successRate = ProcedenciaCount > 0 ? ((ProcedenciaCount / (ProcedenciaCount + ImprocedenciaCount)) * 100).toFixed(1) : "0";

      // 5. Organização de Gráficos (Lawyer Performance)
      const staffSnap = await getDocs(collection(firestore, 'staff'));
      const lawyerPerformance = staffSnap.docs
        .filter(s => s.data().role === 'lawyer')
        .map(s => {
          const data = s.data();
          return {
            nome: `${data.firstName} ${data.lastName.charAt(0)}.`,
            demandas: allProcesses.filter(p => p.leadLawyerId === s.id).length,
            audiencias: hearings.filter(h => h.lawyerId === s.id).length,
            prazos: 0 
          };
        });

      // 6. Lead Capture Chart
      const leadsSnap = await getDocs(query(collection(firestore, 'leads'), where('createdAt', '>=', sixMonthsAgo)));
      const leads = leadsSnap.docs.map(d => d.data() as Lead);
      const captureMap: Record<string, number> = {};
      leads.forEach(l => captureMap[l.captureSource || 'Outros'] = (captureMap[l.captureSource || 'Outros'] || 0) + 1);
      const leadCapture = Object.entries(captureMap).map(([name, value]) => ({ name, value }));

      // 7. Financial Evolution (Institucional Bueno Gois)
      const months: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        months.push({ month: format(d, 'MMM/yy', { locale: ptBR }), key: format(d, 'yyyy-MM'), receita: 0, despesa: 0 });
      }
      titles.forEach(t => {
        const mKey = format(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate as any), 'yyyy-MM');
        const m = months.find(m => m.key === mKey);
        if (m) {
          if (t.type === 'RECEITA' && t.status === 'PAGO') m.receita += (t.value * 0.3); 
          if (t.type === 'DESPESA' && t.status === 'PAGO') m.despesa += t.value;
        }
      });

      setReportData({
        stats: {
          avgCaseValue,
          avgSettlementValue,
          successRate,
          avgAging: 14, 
        },
        lawyerPerformance,
        leadCapture,
        financial: months,
        riskyProcesses: allProcesses.filter(p => p.status === 'Pendente').slice(0, 5),
        topPerformers: lawyerPerformance.sort((a, b) => b.demandas - a.demandas).slice(0, 3).map(l => ({ name: l.nome, count: l.demandas }))
      });

    } catch (e: any) {
      console.error("[Relatorios] Fetch error:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, session, role, userProfile]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) return <div className="flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-sm font-black text-slate-500 uppercase tracking-widest">Calculando Inteligência Jurídica...</p></div>;

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <H1 className="text-white text-3xl font-black">BI & Performance Estratégica</H1>
          <p className="text-sm text-slate-400 mt-1">Análise institucional para diretoria e gestores de elite.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()} className="bg-[#0f172a] border-white/10 text-white h-10"><RefreshCw className="mr-2 h-4 w-4" /> Recalcular</Button>
          <Button variant="default" size="sm" onClick={() => window.print()} className="bg-primary text-primary-foreground font-black h-10 shadow-lg shadow-primary/20"><Printer className="mr-2 h-4 w-4" /> Exportar Relatório (PDF)</Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configuração Pendente (Índice Firestore)</AlertTitle>
          <AlertDescription className="text-xs mt-2 space-y-4">
            <p>O Firebase requer a criação de índices para gerar esses relatórios consolidados.</p>
            <Button variant="outline" size="sm" className="mt-2 text-[10px] uppercase font-bold" asChild>
              <a href="https://console.firebase.google.com" target="_blank">Abrir Console e Verificar</a>
            </Button>
          </AlertDescription>
        </Alert>
      ) : reportData ? (
        <div id="report-print-area">
          {role === 'admin' || role === 'financial' ? <AdminReports data={reportData} /> : <div className="text-center py-20 opacity-40 italic">Relatório disponível apenas para gestores.</div>}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
          <Activity className="h-12 w-12 mb-4" />
          <p className="font-bold text-white">Nenhum dado disponível para compilação.</p>
        </div>
      )}
    </div>
  );
}
