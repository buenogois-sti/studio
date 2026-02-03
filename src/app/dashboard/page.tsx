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
  BrainCircuit
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
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Client, FinancialTitle, Process, Hearing, Log } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { analyzeOfficeStatus, type OfficeInsightsOutput } from '@/ai/flows/office-insights-flow';

const chartConfig = {
  newCases: {
    label: 'Novos Casos',
    color: 'hsl(var(--primary))',
  },
};

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

    if (isLoading) return <Skeleton className="h-48 w-full" />;

    return (
        <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit className="h-24 w-24 text-primary" />
            </div>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Conselheiro Estratégico IA</CardTitle>
                        <CardDescription>Insights inteligentes para seu escritório</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {insights ? (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                            {insights.mood === 'positive' ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                            ) : insights.mood === 'alert' ? (
                                <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5" />
                            ) : (
                                <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                            )}
                            <p className="text-sm font-medium leading-relaxed">{insights.summary}</p>
                        </div>
                        <ul className="grid gap-2">
                            {insights.insights.map((insight: string, i: number) => (
                                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    {insight}
                                </li>
                            ))}
                        </ul>
                        <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing} className="w-full">
                            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                            Atualizar Análise
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Clique abaixo para que a IA analise o status atual do seu escritório e forneça recomendações.
                        </p>
                        <Button onClick={handleAnalyze} disabled={isAnalyzing}>
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

  // Data Fetching
  const titlesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'financial_titles') : null, [firestore]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const clientsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const processesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'processes') : null, [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const hearingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'hearings') : null, [firestore]);
  const { data: hearingsData, isLoading: isLoadingHearings } = useCollection<Hearing>(hearingsQuery);

  const logsQuery = useMemoFirebase(() => (firestore && session?.user?.id ? query(collection(firestore, `users/${session.user.id}/logs`), orderBy('timestamp', 'desc'), limit(5)) : null), [firestore, session]);
  const { data: logsData, isLoading: isLoadingLogs } = useCollection<Log>(logsQuery);

  const isLoading = status === 'loading' || isLoadingTitles || isLoadingClients || isLoadingProcesses || isLoadingHearings || isLoadingLogs;

  // Optimized Data Processing
  const dashboardStats = React.useMemo(() => {
    if (!titlesData || !processesData || !hearingsData) return { totalRevenue: 0, pendingReceivables: 0, totalOverdue: 0, activeProcessesCount: 0, upcomingHearingsCount: 0 };
    
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
    const upcomingHearings = hearingsData.filter(h => h.date.toDate() >= now).length;

    return { totalRevenue: revenue, pendingReceivables: pending, totalOverdue: overdue, activeProcessesCount: activeProcesses, upcomingHearingsCount: upcomingHearings };
  }, [titlesData, processesData, hearingsData]);

  const chartData = React.useMemo(() => {
    const monthLabels: {key: string, name: string}[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const monthName = date.toLocaleString('pt-BR', { month: 'short' });
        const formattedMonth = (monthName.charAt(0).toUpperCase() + monthName.slice(1)).replace('.', '');
        monthLabels.push({ key: monthKey, name: formattedMonth });
    }

    const counts: Record<string, number> = monthLabels.reduce((acc, month) => ({ ...acc, [month.key]: 0 }), {});

    if (processesData) {
        processesData.forEach(process => {
            if (process.createdAt) {
                const createdAtDate = (process.createdAt as Timestamp).toDate();
                const monthKey = `${createdAtDate.getFullYear()}-${createdAtDate.getMonth()}`;
                if (counts.hasOwnProperty(monthKey)) {
                    counts[monthKey]++;
                }
            }
        });
    }

    return monthLabels.map(month => ({ month: month.name, newCases: counts[month.key] }));
  }, [processesData]);

  const upcomingHearings = React.useMemo(() => {
    if (!hearingsData) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return hearingsData
      .filter(h => h.date && (h.date as Timestamp).toDate() >= today)
      .sort((a, b) => (a.date as Timestamp).seconds - (b.date as Timestamp).seconds)
      .slice(0, 5);
  }, [hearingsData]);
  
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  const formatLogTime = (timestamp: any) => {
    if (!timestamp) return '';
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: ptBR });
  }

  const StatCard = ({ title, value, icon: Icon, href, description, trend }: { title: string; value: string | number; icon: React.ElementType; href: string; description: string; trend?: 'up' | 'down' | 'neutral' }) => (
    <Link href={href} className="group">
      <Card className="transition-all duration-300 hover:bg-card/95 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
          <div className="bg-muted p-2 rounded-md group-hover:bg-primary/10 transition-colors">
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-3/4 mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </>
          ) : (
            <>
              <div className="text-3xl font-black tracking-tighter">{value}</div>
              <div className="flex items-center gap-1 mt-1">
                {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                <p className="text-xs text-muted-foreground font-medium">{description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h1 className="text-4xl font-black tracking-tight font-headline">
            Olá, {session?.user?.name?.split(' ')[0]}
            </h1>
            <p className="text-muted-foreground font-medium mt-1">
            Aqui está a pulsação estratégica do seu escritório hoje.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-8 px-3 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 font-bold">
                <CheckCircle2 className="h-3 w-3 mr-1.5" /> Sistema Online
            </Badge>
            <div className="text-xs text-muted-foreground font-mono">
                {format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Faturamento (Liquido)" 
          value={dashboardStats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          icon={DollarSign}
          href="/dashboard/financeiro"
          description="Recebido este mês"
          trend="up"
        />
        <StatCard 
          title="Fila de Processos" 
          value={processesData?.length || 0}
          icon={FolderKanban}
          href="/dashboard/processos"
          description="Total de casos ativos"
          trend="neutral"
        />
        <StatCard 
          title="Agenda Jurídica" 
          value={dashboardStats.upcomingHearingsCount}
          icon={Calendar}
          href="/dashboard/audiencias"
          description="Audiências pendentes"
          trend="down"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <AIAdvisor 
                stats={dashboardStats} 
                activities={logsData?.map(l => l.description) || []} 
                isLoading={isLoading} 
            />
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Expansão de Carteira</CardTitle>
                    <CardDescription>Novos processos protocolados nos últimos 6 meses.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={chartData}>
                        <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                        <ChartTooltip
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="newCases" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <Card className="h-full">
                <CardHeader className="border-b bg-muted/10">
                    <CardTitle className="font-headline text-xl flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Agenda Próxima
                    </CardTitle>
                    <CardDescription>Seus compromissos de audiência.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                    ) : upcomingHearings.length > 0 ? (
                    <div className="space-y-6">
                        {upcomingHearings.map(hearing => {
                        const process = processesMap.get(hearing.processId);
                        return (
                            <div key={hearing.id} className="group relative flex items-start gap-4">
                                <div className="flex flex-col items-center justify-center p-2 bg-muted rounded-xl w-14 h-14 border border-border group-hover:border-primary/50 transition-colors">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground">{format(hearing.date.toDate(), 'MMM', { locale: ptBR })}</span>
                                    <span className="text-xl font-black">{format(hearing.date.toDate(), 'dd')}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{process?.name || 'Processo não encontrado'}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="secondary" className="text-[10px] h-4 font-mono px-1.5">{format(hearing.date.toDate(), "HH:mm'h'")}</Badge>
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter truncate">{hearing.location}</span>
                                    </div>
                                </div>
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8 self-center">
                                    <Link href="/dashboard/audiencias"><ArrowRight className="h-4 w-4" /></Link>
                                </Button>
                            </div>
                        )
                        })}
                    </div>
                    ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-20 border border-dashed rounded-xl bg-muted/5">
                        <Calendar className="h-12 w-12 mb-4 opacity-20" />
                        <p className="font-bold text-lg">Agenda Limpa</p>
                        <p className="text-xs max-w-[180px] mt-1">Nenhuma audiência agendada para os próximos dias.</p>
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>

      <Card className="border-none shadow-none bg-muted/20">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Logs do Sistema
            </CardTitle>
            <CardDescription>
              Últimas ações auditadas na plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : (
              logsData && logsData.length > 0 ? (
                logsData.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/50 hover:border-primary/30 transition-colors">
                        <div className="flex flex-col gap-0.5">
                            <p className="text-sm font-semibold">{activity.description}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                {formatLogTime(activity.timestamp)}
                            </p>
                        </div>
                        <Activity className="h-3 w-3 text-muted-foreground/30" />
                    </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10 italic">Nenhuma atividade registrada.</p>
              )
            )}
          </CardContent>
        </Card>
    </div>
  );
}
