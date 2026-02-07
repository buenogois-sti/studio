'use client';
import * as React from 'react';
import {
  Activity,
  ArrowRight,
  Calendar,
  DollarSign,
  FolderKanban,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BrainCircuit,
  Users,
  Timer,
  Gavel,
  Zap,
  Wallet,
  Receipt,
  Briefcase,
  Clock
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import Link from 'next/link';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, Timestamp, where, doc } from 'firebase/firestore';
import type { Client, FinancialTitle, Process, Hearing, Log, UserProfile, StaffCredit, LegalDeadline } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isBefore, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { analyzeOfficeStatus, type OfficeInsightsOutput } from '@/ai/flows/office-insights-flow';

// --- SUB-COMPONENTES DE VISÃO ---

function AIAdvisor({ stats, activities, isLoading, role }: { stats: any, activities: string[], isLoading: boolean, role: string }) {
    const [insights, setInsights] = React.useState<OfficeInsightsOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const result = await analyzeOfficeStatus({
                totalRevenue: stats.totalRevenue || 0,
                pendingReceivables: stats.pendingReceivables || 0,
                totalOverdue: stats.totalOverdue || 0,
                activeProcessesCount: stats.activeProcessesCount || 0,
                upcomingHearingsCount: stats.upcomingHearingsCount || 0,
                recentActivities: activities,
            });
            setInsights(result);
        } catch (error) {
            console.error("AI Analysis failed:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isLoading) return <Skeleton className="h-48 w-full bg-[#0f172a]" />;

    return (
        <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-[#0f172a] to-accent/5 shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit className="h-24 w-24 text-primary" />
            </div>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg text-white">Advisor AI - {role === 'admin' ? 'Gestão' : 'Operacional'}</CardTitle>
                        <CardDescription>Insights baseados na sua carga de trabalho</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {insights ? (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-black/40 border border-white/10">
                            {insights.mood === 'positive' ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                            ) : insights.mood === 'alert' ? (
                                <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5" />
                            ) : (
                                <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                            )}
                            <p className="text-sm font-medium leading-relaxed text-slate-200">{insights.summary}</p>
                        </div>
                        <ul className="grid gap-2">
                            {insights.insights.map((insight: string, i: number) => (
                                <li key={i} className="text-xs text-slate-400 flex gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    {insight}
                                </li>
                            ))}
                        </ul>
                        <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing} className="w-full border-primary/20 text-primary hover:bg-primary/5">
                            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                            Atualizar Análise
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        <p className="text-sm text-slate-400 max-w-xs">
                            Solicite uma análise estratégica baseada nos dados do {role === 'admin' ? 'escritório' : 'seu perfil'}.
                        </p>
                        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20">
                            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                            Gerar Insights
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- VIEW COMPONENTS ---

function AdminDashboard({ stats, isLoading, logsData, hearingsData, chartData }: any) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Receita Bruta (Mês)" value={stats.totalRevenue} icon={DollarSign} currency />
        <StatCard title="Eficiência Triagem" value={stats.leadsConverted} icon={Zap} suffix="%" />
        <StatCard title="Processos Ativos" value={stats.activeProcessesCount} icon={FolderKanban} />
        <StatCard title="Pauta Urgente" value={stats.upcomingHearingsCount} icon={Calendar} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AIAdvisor stats={stats} activities={logsData} isLoading={isLoading} role="admin" />
          <ChartCard data={chartData} title="Entrada de Novos Casos" />
        </div>
        <div className="space-y-6">
          <UpcomingActsCard data={hearingsData} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

function LawyerDashboard({ stats, isLoading, hearingsData, deadlinesData }: any) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Minha Carteira" value={stats.activeProcessesCount} icon={Briefcase} />
        <StatCard title="Meus Honorários" value={stats.personalFees} icon={Wallet} currency />
        <StatCard title="Prazos Pendentes" value={stats.personalDeadlines} icon={Timer} />
        <StatCard title="Atos Agendados" value={stats.upcomingHearingsCount} icon={Gavel} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AIAdvisor stats={stats} activities={[]} isLoading={isLoading} role="lawyer" />
          <PersonalDeadlinesCard data={deadlinesData} isLoading={isLoading} />
        </div>
        <div className="space-y-6">
          <UpcomingActsCard data={hearingsData} isLoading={isLoading} title="Minhas Audiências" />
        </div>
      </div>
    </div>
  );
}

function FinancialDashboard({ stats, isLoading, titlesData }: any) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Recebido (Mês)" value={stats.totalRevenue} icon={TrendingUp} currency color="text-emerald-500" />
        <StatCard title="Pendentes" value={stats.pendingReceivables} icon={Clock} currency color="text-amber-500" />
        <StatCard title="Total em Atraso" value={stats.totalOverdue} icon={AlertCircle} currency color="text-rose-500" />
        <StatCard title="Contas a Pagar" value={stats.totalExpenses} icon={DollarSign} currency />
      </div>
      <Card className="bg-[#0f172a] border-border/50">
        <CardHeader><CardTitle className="text-white font-headline">Lançamentos Críticos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {titlesData?.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{t.description}</span>
                  <span className="text-[10px] text-slate-500">Vencimento: {format(t.dueDate.toDate(), 'dd/MM/yy')}</span>
                </div>
                <span className="text-sm font-black text-white">{t.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AssistantDashboard({ stats, hearingsData, leadsData, isLoading }: any) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Atos p/ Hoje" value={stats.hearingsToday} icon={Calendar} color="text-primary" />
        <StatCard title="Novos Leads" value={stats.newLeads} icon={Zap} color="text-amber-400" />
        <StatCard title="Prazos Diários" value={stats.deadlinesToday} icon={Timer} />
        <StatCard title="Pastas Pendentes" value={stats.pendingDrive} icon={FolderKanban} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingActsCard data={hearingsData} isLoading={isLoading} title="Logística de Audiências" />
        <Card className="bg-[#0f172a] border-border/50">
          <CardHeader><CardTitle className="text-white font-headline">Últimos Leads para Triagem</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {leadsData?.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                <span className="text-xs font-bold text-white truncate max-w-[200px]">{l.title}</span>
                <Badge variant="outline" className="text-[9px] font-black uppercase text-primary border-primary/30">{l.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function StatCard({ title, value, icon: Icon, currency, suffix, color }: any) {
  return (
    <Card className="bg-[#0f172a] border-border/50 transition-all hover:border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", color || "text-primary")} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-black text-white", color)}>
          {currency ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : `${value}${suffix || ''}`}
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingActsCard({ data, isLoading, title = "Próximos Atos" }: any) {
  return (
    <Card className="h-full bg-[#0f172a] border-border/50 shadow-none">
      <CardHeader className="border-b border-white/5">
        <CardTitle className="font-headline text-xl flex items-center gap-2 text-white uppercase tracking-tighter">
          <Calendar className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-6 text-slate-300">
            {data?.map((h: any) => (
              <div key={h.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded-xl w-12 h-12 border border-white/5 shrink-0 group-hover:border-primary/30 transition-all">
                  <span className="text-[10px] font-black uppercase text-primary leading-none">{format(h.date.toDate(), 'MMM', { locale: ptBR })}</span>
                  <span className="text-lg font-black text-white leading-none">{format(h.date.toDate(), 'dd')}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate text-white">Audiência {h.type}</p>
                  <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1"><Users className="h-2.5 w-2.5" /> {h.lawyerName}</p>
                </div>
              </div>
            ))}
            {data?.length === 0 && <p className="text-xs italic text-muted-foreground text-center py-10 opacity-30">Sem atos agendados.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PersonalDeadlinesCard({ data, isLoading }: any) {
  return (
    <Card className="bg-[#0f172a] border-border/50 shadow-none">
      <CardHeader><CardTitle className="text-white font-headline">Prazos Fatais</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <Skeleton className="h-32 w-full" /> : data?.map((d: any) => (
          <div key={d.id} className="flex items-center justify-between p-4 rounded-xl bg-rose-500/[0.03] border border-rose-500/20 group hover:bg-rose-500/5 transition-all">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500"><Timer className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-bold text-white">{d.type}</p>
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">Vence em: {format(d.endDate.toDate(), 'dd/MM/yyyy')}</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="text-[10px] font-black uppercase text-rose-400" asChild><Link href="/dashboard/prazos">Ver Guia</Link></Button>
          </div>
        ))}
        {data?.length === 0 && <p className="text-center py-10 text-xs text-slate-500 italic">Nenhum prazo pendente.</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ data, title }: any) {
  return (
    <Card className="bg-[#0f172a] border-border/50 shadow-none">
      <CardHeader><CardTitle className="font-headline text-xl text-white">{title}</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{ newCases: { label: 'Novos Casos', color: '#F5D030' } }} className="h-[250px] w-full">
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="month" stroke="#475569" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#475569" fontSize={12} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="newCases" fill="#F5D030" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// --- MAIN PAGE ---

export default function Dashboard() {
  const { firestore } = useFirebase();
  const { data: session, status } = useSession();

  const userProfileRef = useMemoFirebase(() => (firestore && session?.user?.id ? doc(firestore, 'users', session.user.id) : null), [firestore, session]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const role = userProfile?.role || 'assistant';

  // QUERIES DINÂMICAS POR ROLE
  const titlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const start = Timestamp.fromDate(startOfMonth(new Date()));
    return query(collection(firestore, 'financial_titles'), where('dueDate', '>=', start), limit(role === 'admin' ? 10 : 5));
  }, [firestore, role]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const processesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'processes');
    if (role === 'lawyer') return query(base, where('leadLawyerId', '==', session?.user?.id), orderBy('updatedAt', 'desc'), limit(10));
    return query(base, orderBy('createdAt', 'desc'), limit(10));
  }, [firestore, role, session]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const hearingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'hearings');
    if (role === 'lawyer') return query(base, where('lawyerId', '==', session?.user?.id), where('date', '>=', Timestamp.now()), orderBy('date', 'asc'), limit(5));
    return query(base, where('date', '>=', Timestamp.now()), orderBy('date', 'asc'), limit(5));
  }, [firestore, role, session]);
  const { data: hearingsData, isLoading: isLoadingHearings } = useCollection<Hearing>(hearingsQuery);

  const deadlinesQuery = useMemoFirebase(() => {
    if (!firestore || role !== 'lawyer') return null;
    return query(collection(firestore, 'deadlines'), where('authorId', '==', session?.user?.id), where('status', '==', 'PENDENTE'), orderBy('endDate', 'asc'), limit(3));
  }, [firestore, role, session]);
  const { data: deadlinesData } = useCollection<LegalDeadline>(deadlinesQuery);

  const personalCreditsQuery = useMemoFirebase(() => {
    if (!firestore || role !== 'lawyer') return null;
    return query(collection(firestore, `staff/${session?.user?.id}/credits`), where('status', '==', 'DISPONIVEL'));
  }, [firestore, role, session]);
  const { data: creditsData } = useCollection<StaffCredit>(personalCreditsQuery);

  const logsQuery = useMemoFirebase(() => (firestore && session?.user?.id ? query(collection(firestore, `users/${session.user.id}/logs`), orderBy('timestamp', 'desc'), limit(3)) : null), [firestore, session]);
  const { data: logsData } = useCollection<Log>(logsQuery);

  const isLoading = status === 'loading' || isLoadingTitles || isLoadingProcesses || isLoadingHearings;

  const stats = React.useMemo(() => {
    const s = { 
      totalRevenue: 0, pendingReceivables: 0, totalOverdue: 0, activeProcessesCount: 0, 
      upcomingHearingsCount: 0, leadsConverted: 85, personalFees: 0, personalDeadlines: 0,
      totalExpenses: 0, hearingsToday: 0, newLeads: 0, deadlinesToday: 0, pendingDrive: 0
    };
    
    if (!processesData) return s;
    const now = new Date();

    if (role === 'admin' || role === 'financial') {
      titlesData?.forEach(t => {
        if (t.type === 'RECEITA') {
          if (t.status === 'PAGO') s.totalRevenue += t.value;
          else if (isBefore(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate), now)) s.totalOverdue += t.value;
          else s.pendingReceivables += t.value;
        } else if (t.type === 'DESPESA' && t.status === 'PENDENTE') {
          s.totalExpenses += t.value;
        }
      });
    }

    if (role === 'lawyer') {
      creditsData?.forEach(c => s.personalFees += c.value);
      s.personalDeadlines = deadlinesData?.length || 0;
    }

    s.activeProcessesCount = processesData.filter(p => p.status === 'Ativo').length;
    s.upcomingHearingsCount = hearingsData?.length || 0;

    return s;
  }, [role, titlesData, processesData, hearingsData, creditsData, deadlinesData]);

  const chartData = React.useMemo(() => {
    const months: { month: string; key: string; newCases: number; }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.toLocaleString('pt-BR', { month: 'short' }), key: `${d.getFullYear()}-${d.getMonth()}`, newCases: 0 });
    }
    processesData?.forEach(p => {
      const date = p.createdAt?.toDate();
      if (date) {
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const m = months.find(m => m.key === key);
        if (m) m.newCases++;
      }
    });
    return months;
  }, [processesData]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="animate-in slide-in-from-left duration-500">
            <h1 className="text-4xl font-black tracking-tight font-headline text-white">
            Olá, {session?.user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-400 font-medium mt-1">
              Visão: <span className="text-primary font-black uppercase tracking-widest text-[10px]">{role}</span>
            </p>
        </div>
        <Badge variant="outline" className="h-8 px-3 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 font-bold">
            <CheckCircle2 className="h-3 w-3 mr-1.5" /> Acesso Seguro
        </Badge>
      </div>

      {role === 'admin' && <AdminDashboard stats={stats} isLoading={isLoading} logsData={logsData?.map(l => l.description) || []} hearingsData={hearingsData} chartData={chartData} />}
      {role === 'lawyer' && <LawyerDashboard stats={stats} isLoading={isLoading} hearingsData={hearingsData} deadlinesData={deadlinesData} />}
      {role === 'financial' && <FinancialDashboard stats={stats} isLoading={isLoading} titlesData={titlesData} />}
      {role === 'assistant' && <AssistantDashboard stats={stats} hearingsData={hearingsData} leadsData={[]} isLoading={isLoading} />}
    </div>
  );
}
