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
  Users
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
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, Timestamp, where } from 'firebase/firestore';
import type { Client, FinancialTitle, Process, Hearing, Log } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow, isBefore, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { analyzeOfficeStatus, type OfficeInsightsOutput } from '@/ai/flows/office-insights-flow';

function AIAdvisor({ stats, activities, isLoading }: { stats: any, activities: string[], isLoading: boolean }) {
    const [insights, setInsights] = React.useState<OfficeInsightsOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const result = await analyzeOfficeStatus({
                totalRevenue: stats.totalRevenue,
                pendingReceivables: stats.pendingReceivables,
                totalOverdue: stats.totalOverdue,
                activeProcessesCount: stats.activeProcessesCount,
                upcomingHearingsCount: stats.upcomingHearingsCount,
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
        <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-[#0f172a] to-accent/5">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit className="h-24 w-24 text-primary" />
            </div>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg text-white">Conselheiro Estratégico IA</CardTitle>
                        <CardDescription>Insights inteligentes para seu escritório</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {insights ? (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-white/5">
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
                                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    {insight}
                                </li>
                            ))}
                        </ul>
                        <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing} className="w-full border-primary/20 text-primary">
                            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                            Atualizar Análise
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Clique abaixo para que a IA analise o status atual do seu escritório.
                        </p>
                        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-primary text-primary-foreground">
                            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            Gerar Insights Estratégicos
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function Dashboard() {
  const { firestore } = useFirebase();
  const { data: session, status } = useSession();

  // OTIMIZAÇÃO: Consulta estritamente limitada a 10 itens para o Dashboard (Redução drástica de leituras)
  const titlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const startOfCurrentMonth = Timestamp.fromDate(startOfMonth(new Date()));
    return query(
      collection(firestore, 'financial_titles'),
      where('dueDate', '>=', startOfCurrentMonth),
      limit(10)
    );
  }, [firestore]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const processesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'processes'), orderBy('createdAt', 'desc'), limit(5)) : null), [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'clients'), limit(5)) : null), [firestore]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const hearingsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'hearings'), where('date', '>=', Timestamp.now()), orderBy('date', 'asc'), limit(5)) : null), [firestore]);
  const { data: hearingsData, isLoading: isLoadingHearings } = useCollection<Hearing>(hearingsQuery);

  const logsQuery = useMemoFirebase(
    () => (firestore && session?.user?.id ? query(collection(firestore, `users/${session.user.id}/logs`), orderBy('timestamp', 'desc'), limit(3)) : null), 
    [firestore, session?.user?.id]
  );
  const { data: logsData, isLoading: isLoadingLogs } = useCollection<Log>(logsQuery);

  const isLoading = status === 'loading' || isLoadingTitles || isLoadingProcesses || isLoadingHearings || isLoadingLogs || isLoadingClients;

  const dashboardStats = React.useMemo(() => {
    if (!titlesData || !processesData || !hearingsData) return { totalRevenue: 0, pendingReceivables: 0, totalOverdue: 0, activeProcessesCount: 0, upcomingHearingsCount: 0, totalClients: 0 };
    
    const now = new Date();
    const revenue = titlesData
      .filter((t) => t.type === 'RECEITA' && t.status === 'PAGO')
      .reduce((sum, t) => sum + t.value, 0);
      
    const pending = titlesData
      .filter(t => t.type === 'RECEITA' && t.status === 'PENDENTE')
      .reduce((sum, t) => sum + t.value, 0);

    const overdue = titlesData
      .filter(t => t.status === 'PENDENTE' && isBefore(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate), now))
      .reduce((sum, t) => sum + t.value, 0);

    const activeProcesses = processesData.filter(p => p.status === 'Ativo').length;
    const upcomingHearings = hearingsData.length;
    const totalClients = clientsData?.length || 0;

    return { totalRevenue: revenue, pendingReceivables: pending, totalOverdue: overdue, activeProcessesCount: activeProcesses, upcomingHearingsCount: upcomingHearings, totalClients };
  }, [titlesData, processesData, hearingsData, clientsData]);

  const chartData = React.useMemo(() => {
    const monthLabels: {key: string, name: string}[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const monthName = date.toLocaleString('pt-BR', { month: 'short' });
        monthLabels.push({ key: monthKey, name: monthName });
    }

    const counts: Record<string, number> = monthLabels.reduce((acc, month) => ({ ...acc, [month.key]: 0 }), {});

    if (processesData) {
        processesData.forEach(process => {
            if (process.createdAt) {
                const createdAtDate = process.createdAt instanceof Timestamp ? process.createdAt.toDate() : new Date(process.createdAt as any);
                const monthKey = `${createdAtDate.getFullYear()}-${createdAtDate.getMonth()}`;
                if (counts.hasOwnProperty(monthKey)) counts[monthKey]++;
            }
        });
    }

    return monthLabels.map(month => ({ month: month.name, newCases: counts[month.key] }));
  }, [processesData]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h1 className="text-4xl font-black tracking-tight font-headline text-white">
            Olá, {session?.user?.name?.split(' ')[0]}
            </h1>
            <p className="text-muted-foreground font-medium mt-1">
            Resumo tático operacional.
            </p>
        </div>
        <Badge variant="outline" className="h-8 px-3 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 font-bold">
            <CheckCircle2 className="h-3 w-3 mr-1.5" /> Monitoramento Ativo
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#0f172a] border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Faturamento (Mês)</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{dashboardStats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f172a] border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Novos Clientes</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{dashboardStats.totalClients}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f172a] border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Processos Ativos</CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{dashboardStats.activeProcessesCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f172a] border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pauta Urgente</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{dashboardStats.upcomingHearingsCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <AIAdvisor 
                stats={dashboardStats} 
                activities={logsData?.map(l => l.description) || []} 
                isLoading={isLoading} 
            />
            
            <Card className="bg-[#0f172a] border-border/50 shadow-none">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-white">Novas Demandas</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{ newCases: { label: 'Novos Casos', color: '#F5D030' } }} className="h-[250px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={chartData}>
                                <XAxis dataKey="month" stroke="#475569" fontSize={12} axisLine={false} tickLine={false} />
                                <YAxis stroke="#475569" fontSize={12} axisLine={false} tickLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="newCases" fill="#F5D030" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <Card className="h-full bg-[#0f172a] border-border/50 shadow-none">
                <CardHeader className="border-b border-white/5">
                    <CardTitle className="font-headline text-xl flex items-center gap-2 text-white uppercase tracking-tighter">
                        <Calendar className="h-5 w-5 text-primary" />
                        Próximos Atos
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-white/5" />)}
                        </div>
                    ) : (
                        <div className="space-y-6 text-slate-300">
                            {hearingsData?.map(h => (
                                <div key={h.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                    <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded-xl w-12 h-12 border border-white/5 shrink-0">
                                        <span className="text-[10px] font-black uppercase text-primary leading-none">{format(h.date.toDate(), 'MMM', { locale: ptBR })}</span>
                                        <span className="text-lg font-black text-white leading-none">{format(h.date.toDate(), 'dd')}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm truncate text-white">Audiência {h.type}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1"><Users className="h-2.5 w-2.5" /> {h.lawyerName}</p>
                                    </div>
                                </div>
                            ))}
                            {hearingsData?.length === 0 && <p className="text-xs italic text-muted-foreground text-center py-10 opacity-30">Sem compromissos.</p>}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}