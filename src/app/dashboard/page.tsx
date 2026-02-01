'use client';
import * as React from 'react';
import {
  Activity,
  ArrowUpRight,
  Calendar,
  DollarSign,
  FolderKanban,
  Users,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Tooltip,
} from 'recharts';
import Link from 'next/link';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Client, FinancialTitle, Process, Hearing, Log } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const chartConfig = {
  newCases: {
    label: 'Novos Casos',
    color: 'hsl(var(--primary))',
  },
};

export default function Dashboard() {
  const { firestore } = useFirebase();
  const { data: session, status } = useSession();

  const titlesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'financial_titles') : null),
    [firestore]
  );
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const clientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clients') : null),
    [firestore]
  );
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const processesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'processes') : null),
    [firestore]
  );
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const hearingsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'hearings') : null),
    [firestore]
  );
  const { data: hearingsData, isLoading: isLoadingHearings } = useCollection<Hearing>(hearingsQuery);

  const logsQuery = useMemoFirebase(
    () => (firestore && session?.user?.id ? query(collection(firestore, `users/${session.user.id}/logs`), orderBy('timestamp', 'desc'), limit(5)) : null),
    [firestore, session]
  );
  const { data: logsData, isLoading: isLoadingLogs } = useCollection<Log>(logsQuery);

  const isLoading = status === 'loading' || isLoadingTitles || isLoadingClients || isLoadingProcesses || isLoadingHearings || isLoadingLogs;

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

    const counts: Record<string, number> = monthLabels.reduce((acc, month) => {
        acc[month.key] = 0;
        return acc;
    }, {} as Record<string, number>);

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

    return monthLabels.map(month => ({
        month: month.name,
        newCases: counts[month.key],
    }));

  }, [processesData]);
  
  const clientCount = clientsData?.length || 0;
  const processCount = processesData?.length || 0;
  const hearingCount = hearingsData?.length || 0;

  const formatLogTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-3/4" />
            ) : (
                <div className="text-2xl font-bold">
              {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            )}
            <p className="text-xs text-muted-foreground">+20.1% em relação ao mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <Skeleton className="h-8 w-1/4" />
            ) : (
                <div className="text-2xl font-bold">+{clientCount}</div>
            )}
            <p className="text-xs text-muted-foreground">+3 no último mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processos Ativos</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-1/4" />
            ) : (
                <div className="text-2xl font-bold">+{processCount}</div>
            )}
            <p className="text-xs text-muted-foreground">+10 no último mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Audiências</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <Skeleton className="h-8 w-1/4" />
            ) : (
                <div className="text-2xl font-bold">+{hearingCount}</div>
            )}
            <p className="text-xs text-muted-foreground">2 na próxima semana</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Novos Casos por Mês</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <XAxis
                    dataKey="month"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    content={<ChartTooltipContent />}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                  />
                  <Bar dataKey="newCases" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
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
                  <Skeleton className="h-9 w-9 rounded-full" />
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
                    <Avatar className="hidden h-9 w-9 sm:flex">
                        <AvatarImage src={`https://picsum.photos/seed/act${activity.id}/100/100`} alt="Avatar" data-ai-hint="abstract pattern" />
                        <AvatarFallback>
                            <Activity className="h-4 w-4"/>
                        </AvatarFallback>
                    </Avatar>
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
                <p className="text-sm text-muted-foreground text-center">Nenhuma atividade recente.</p>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
