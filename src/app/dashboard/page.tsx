'use client';
import * as React from 'react';
import {
  Activity,
  ArrowRight,
  Calendar,
  DollarSign,
  FolderKanban,
  Users,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const chartConfig = {
  newCases: {
    label: 'Novos Casos',
    color: 'hsl(var(--primary))',
  },
};

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

  // Data Processing
  const totalRevenue = React.useMemo(() => {
    if (!titlesData) return 0;
    return titlesData
      .filter((t) => t.type === 'RECEITA' && t.status === 'PAGO')
      .reduce((sum, t) => sum + t.value, 0);
  }, [titlesData]);

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

  const StatCard = ({ title, value, icon: Icon, href, description }: { title: string; value: string | number; icon: React.ElementType; href: string; description: string; }) => (
    <Link href={href} className="group">
      <Card className="transition-all duration-300 hover:bg-card/95 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-3/4 mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Bem-vindo de volta, {session?.user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo da atividade do seu escritório.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Faturamento (Pago)" 
          value={totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          icon={DollarSign}
          href="/dashboard/financeiro"
          description="+20.1% vs. mês anterior"
        />
        <StatCard 
          title="Clientes Ativos" 
          value={`+${clientsData?.length || 0}`}
          icon={Users}
          href="/dashboard/clientes"
          description="+3 no último mês"
        />
        <StatCard 
          title="Processos Ativos" 
          value={`+${processesData?.length || 0}`}
          icon={FolderKanban}
          href="/dashboard/processos"
          description="+10 no último mês"
        />
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-full">
          <CardHeader>
            <CardTitle className="font-headline">Próximas Audiências</CardTitle>
            <CardDescription>Seus próximos 5 compromissos.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : upcomingHearings.length > 0 ? (
              <div className="space-y-4">
                {upcomingHearings.map(hearing => {
                  const process = processesMap.get(hearing.processId);
                  return (
                    <div key={hearing.id} className="flex items-center gap-4">
                       <div className="flex flex-col items-center justify-center p-2 bg-muted rounded-md w-16 h-16">
                           <span className="text-sm font-bold uppercase">{format(hearing.date.toDate(), 'MMM', { locale: ptBR })}</span>
                           <span className="text-2xl font-bold">{format(hearing.date.toDate(), 'dd')}</span>
                       </div>
                      <div className="flex-1">
                        <p className="font-semibold truncate">{process?.name || 'Processo não encontrado'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(hearing.date.toDate(), "EEEE, HH:mm'h'", { locale: ptBR })}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="icon">
                        <Link href="/dashboard/audiencias"><ArrowRight className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full py-10 border border-dashed rounded-lg">
                <Calendar className="h-10 w-10 mb-2" />
                <p className="font-semibold">Nenhuma audiência agendada</p>
                <p className="text-sm">Você está com a agenda livre!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Novos Casos por Mês</CardTitle>
            <CardDescription>Visão geral de novos processos nos últimos 6 meses.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar dataKey="newCases" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
          <CardHeader>
            <CardTitle className="font-headline">Atividade Recente</CardTitle>
            <CardDescription>
              Últimas ações realizadas no sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="grid gap-1 w-full">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))
            ) : (
              logsData && logsData.length > 0 ? (
                logsData.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4">
                    <div className="grid gap-1">
                        <p className="text-sm font-medium leading-none">
                        {activity.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                        {formatLogTime(activity.timestamp)}
                        </p>
                    </div>
                    </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center p-4">Nenhuma atividade recente para exibir.</p>
              )
            )}
          </CardContent>
        </Card>
    </div>
  );
}
