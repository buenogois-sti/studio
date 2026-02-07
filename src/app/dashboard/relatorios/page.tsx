
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
  Building
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
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, limit, getDocs, Timestamp, doc } from 'firebase/firestore';
import type { Process, Client, FinancialTitle, Staff, LegalDeadline, Hearing, Lead, UserProfile, StaffCredit } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from 'next-auth/react';

const COLORS = ['#F5D030', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

// --- VISÕES DE RELATÓRIO SEGMENTADAS ---

function AdminReports({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Distribuição de Carga Operacional
            </CardTitle>
            <CardDescription>Breakdown por advogado (Últimos 6 meses).</CardDescription>
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
              <Target className="h-5 w-5 text-emerald-400" /> Conversão & Origem
            </CardTitle>
            <CardDescription>Breakdown por tipo de captação comercial.</CardDescription>
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
    </div>
  );
}

function LawyerReports({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="bg-[#0f172a] border-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" /> Meu Histórico de Honorários
          </CardTitle>
          <CardDescription>Evolução de recebimentos pessoais por mês.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.personalFeesEvolution || []}>
              <defs>
                <linearGradient id="colorPersonal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
              <XAxis dataKey="month" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="valor" name="Honorários Pagos" stroke="#10b981" fillOpacity={1} fill="url(#colorPersonal)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#0f172a] border-white/5">
          <CardHeader><CardTitle className="text-white text-sm uppercase">Atividade Recente (Peças)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(data.recentPetitions || []).map((p: any) => (
              <div key={p.id} className="flex justify-between items-center p-3 rounded-xl bg-black/20 border border-white/5">
                <span className="text-xs font-bold text-white truncate max-w-[200px]">{p.description}</span>
                <span className="text-[10px] text-slate-500">{p.date ? format(p.date.toDate(), 'dd/MM/yy') : '---'}</span>
              </div>
            ))}
            {(data.recentPetitions || []).length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">Nenhuma peça recente.</p>}
          </CardContent>
        </Card>
        <Card className="bg-[#0f172a] border-white/5">
          <CardHeader><CardTitle className="text-white text-sm uppercase">Prazos Cumpridos</CardTitle></CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center opacity-30">
            <CheckCircle2 className="h-16 w-16" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FinancialReports({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-8">
      <FinancialEvolutionChart data={data.financial || []} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[#0f172a] border-white/5">
          <CardHeader><CardTitle className="text-white">Breakdown de Receitas p/ Categoria</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByOrigin || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
                <XAxis type="number" stroke="#475569" fontSize={10} hide />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={150} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10' }} />
                <Bar dataKey="value" fill="#F5D030" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-[#0f172a] border-white/5">
          <CardHeader><CardTitle className="text-white">Taxa de Inadimplência</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[300px]">
            <div className="text-4xl font-black text-rose-500">{data.overdueRate || 0}%</div>
            <p className="text-xs text-slate-500 mt-2">Sobre o faturamento bruto</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AssistantReports({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-8">
      <Card className="bg-[#0f172a] border-white/5">
        <CardHeader><CardTitle className="text-white">Carga Mensal de Atos e Prazos</CardTitle></CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.operationalVolume || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
              <XAxis dataKey="month" stroke="#475569" fontSize={10} />
              <YAxis stroke="#475569" fontSize={10} />
              <Tooltip />
              <Bar dataKey="audiencias" name="Audiências" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="prazos" name="Prazos Diários" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// --- SHARED REPORT COMPONENTS ---

function FinancialEvolutionChart({ data }: { data: any[] }) {
  return (
    <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-400" /> Fluxo de Caixa Real (6m)
        </CardTitle>
        <CardDescription>Comparativo entre entradas efetivas e saídas operacionais.</CardDescription>
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
}

// --- MAIN PAGE ---

export default function RelatoriosPage() {
  const { firestore } = useFirebase();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reportData, setReportData] = React.useState<any>(null);

  const userProfileRef = useMemoFirebase(() => (firestore && session?.user?.id ? doc(firestore, 'users', session.user.id) : null), [firestore, session]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const role = userProfile?.role || 'assistant';

  const fetchData = React.useCallback(async () => {
    if (!firestore || !session?.user?.id || !userProfile) return;
    setIsLoading(true);
    setError(null);

    try {
      const sixMonthsAgo = Timestamp.fromDate(subMonths(new Date(), 6));
      
      // 1. DADOS FINANCEIROS GLOBAIS (Apenas para Admin/Financeiro)
      let titles: FinancialTitle[] = [];
      if (role === 'admin' || role === 'financial') {
        const titlesSnap = await getDocs(query(collection(firestore, 'financial_titles'), where('dueDate', '>=', sixMonthsAgo), orderBy('dueDate', 'desc'), limit(300)));
        titles = titlesSnap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialTitle));
      }

      // 2. DADOS OPERACIONAIS (Escopo depende do Role)
      let processesQueryBase = query(collection(firestore, 'processes'), where('createdAt', '>=', sixMonthsAgo));
      if (role === 'lawyer') processesQueryBase = query(processesQueryBase, where('leadLawyerId', '==', session.user.id));
      const processesSnap = await getDocs(processesQueryBase);
      const processes = processesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Process));

      let deadlinesQueryBase = query(collection(firestore, 'deadlines'), where('endDate', '>=', sixMonthsAgo));
      if (role === 'lawyer') deadlinesQueryBase = query(deadlinesQueryBase, where('authorId', '==', session.user.id));
      const deadlinesSnap = await getDocs(deadlinesQueryBase);
      const deadlines = deadlinesSnap.docs.map(d => ({ id: d.id, ...d.data() } as LegalDeadline));

      let hearingsQueryBase = query(collection(firestore, 'hearings'), where('date', '>=', sixMonthsAgo));
      if (role === 'lawyer') hearingsQueryBase = query(hearingsQueryBase, where('lawyerId', '==', session.user.id));
      const hearingsSnap = await getDocs(hearingsQueryBase);
      const hearings = hearingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Hearing));

      // 3. PROCESSAMENTO DOS DADOS PARA OS GRÁFICOS
      const financial = financialBreackdown(titles);
      
      const leadCapture: any[] = [];
      const lawyerPerformance: any[] = [];
      const personalFeesEvolution: any[] = [];
      
      if (role === 'admin') {
        const leadsSnap = await getDocs(query(collection(firestore, 'leads'), where('createdAt', '>=', sixMonthsAgo)));
        const leads = leadsSnap.docs.map(d => d.data() as Lead);
        const counts: Record<string, number> = {};
        leads.forEach(l => counts[l.captureSource || 'Outros'] = (counts[l.captureSource || 'Outros'] || 0) + 1);
        Object.entries(counts).forEach(([name, value]) => leadCapture.push({ name, value }));

        const staffSnap = await getDocs(collection(firestore, 'staff'));
        staffSnap.docs.forEach(s => {
          const staff = s.data() as Staff;
          if (staff.role === 'lawyer') {
            lawyerPerformance.push({
              nome: `${staff.firstName} ${staff.lastName.charAt(0)}.`,
              demandas: processes.filter(p => p.leadLawyerId === s.id).length,
              prazos: deadlines.filter(d => d.authorId === s.id).length,
              audiencias: hearings.filter(h => h.lawyerId === s.id).length
            });
          }
        });
      }

      if (role === 'lawyer') {
        const creditsSnap = await getDocs(query(collection(firestore, `staff/${session.user.id}/credits`), where('date', '>=', sixMonthsAgo), where('status', '==', 'PAGO')));
        const credits = creditsSnap.docs.map(d => d.data() as StaffCredit);
        // Agrupar por mês
        const feeMonths: Record<string, number> = {};
        credits.forEach(c => {
          const m = format(c.date.toDate(), 'MMM/yy', { locale: ptBR });
          feeMonths[m] = (feeMonths[m] || 0) + c.value;
        });
        Object.entries(feeMonths).forEach(([month, valor]) => personalFeesEvolution.push({ month, valor }));
      }

      setReportData({
        financial,
        leadCapture,
        lawyerPerformance,
        personalFeesEvolution,
        operationalVolume: operationalVolumeBreackdown(hearings, deadlines),
        revenueByOrigin: revenueByOrigin(titles),
        overdueRate: calculateOverdueRate(titles),
        recentPetitions: processes.flatMap(p => (p.timeline || []).filter(e => e.type === 'petition' && e.authorName === session.user.name).slice(0, 5))
      });

    } catch (e: any) {
      console.error("[Relatorios] Fetch error:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, session, role, userProfile]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) return <div className="flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-sm font-black text-slate-500 uppercase tracking-widest">Compilando Inteligência Jurídica...</p></div>;

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <H1 className="text-white text-3xl font-black">BI & Insights Estratégicos</H1>
          <p className="text-sm text-slate-400 mt-1">Análise baseada no seu perfil: <span className="text-primary font-black uppercase">{role}</span></p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="bg-[#0f172a] border-white/10 text-white font-bold h-10"><Download className="mr-2 h-4 w-4" /> Exportar Dados</Button>
      </div>

      {error ? (
        <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription className="text-xs mt-2 space-y-4">
            <p>{error}</p>
            {error.includes('index') && (
              <div className="bg-black/20 p-4 rounded-lg space-y-2 border border-white/10">
                <p>O Firebase está criando os índices necessários para este relatório. Isso pode levar alguns minutos.</p>
                <Button variant="outline" size="sm" className="mt-2 text-[10px] uppercase font-bold" asChild>
                  <a href="https://console.firebase.google.com" target="_blank">Ver Status no Console</a>
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      ) : reportData ? (
        <>
          {role === 'admin' && <AdminReports data={reportData} />}
          {role === 'lawyer' && <LawyerReports data={reportData} />}
          {role === 'financial' && <FinancialReports data={reportData} />}
          {role === 'assistant' && <AssistantReports data={reportData} />}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
          <Activity className="h-12 w-12 mb-4" />
          <p className="font-bold text-white">Nenhum dado disponível para o período selecionado.</p>
        </div>
      )}
    </div>
  );
}

// --- DATA PROCESSING HELPERS ---

function financialBreackdown(titles: FinancialTitle[]) {
  const months: any[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    months.push({ month: format(d, 'MMM/yy', { locale: ptBR }), key: format(d, 'yyyy-MM'), receita: 0, despesa: 0 });
  }
  (titles || []).forEach(t => {
    if (t.status === 'PAGO' && t.paymentDate) {
      const mKey = format(t.paymentDate.toDate(), 'yyyy-MM');
      const m = months.find(m => m.key === mKey);
      if (m) t.type === 'RECEITA' ? m.receita += t.value : m.despesa += t.value;
    }
  });
  return months;
}

function operationalVolumeBreackdown(hearings: Hearing[], deadlines: LegalDeadline[]) {
  const months: any[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    months.push({ month: format(d, 'MMM/yy', { locale: ptBR }), key: format(d, 'yyyy-MM'), audiencias: 0, prazos: 0 });
  }
  (hearings || []).forEach(h => {
    const m = months.find(m => m.key === format(h.date.toDate(), 'yyyy-MM'));
    if (m) m.audiencias++;
  });
  (deadlines || []).forEach(d => {
    const m = months.find(m => m.key === format(d.endDate.toDate(), 'yyyy-MM'));
    if (m) m.prazos++;
  });
  return months;
}

function revenueByOrigin(titles: FinancialTitle[]) {
  const origins: Record<string, number> = {};
  (titles || []).filter(t => t.type === 'RECEITA' && t.status === 'PAGO').forEach(t => {
    origins[t.origin] = (origins[t.origin] || 0) + t.value;
  });
  return Object.entries(origins).map(([name, value]) => ({ name, value }));
}

function calculateOverdueRate(titles: FinancialTitle[]) {
  const now = new Date();
  const validTitles = (titles || []).filter(t => t.type === 'RECEITA');
  const total = validTitles.reduce((s, t) => s + t.value, 0);
  const overdue = validTitles.filter(t => t.status === 'PENDENTE' && isBefore(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate as any), now)).reduce((s, t) => s + t.value, 0);
  return total > 0 ? ((overdue / total) * 100).toFixed(1) : 0;
}
