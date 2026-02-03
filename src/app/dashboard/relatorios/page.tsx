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
  ChevronDown,
  PieChart as PieChartIcon,
  Activity,
  FileText
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
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { format, subMonths, startOfMonth, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { H1 } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import type { Process, Client, FinancialTitle, Staff } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#F5D030', '#152c4b', '#10b981', '#ef4444', '#8b5cf6', '#f97316'];

export default function RelatoriosPage() {
  const { firestore, isUserLoading } = useFirebase();

  // Data Fetching
  const clientsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);

  const processesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'processes') : null, [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);

  const titlesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'financial_titles') : null, [firestore]);
  const { data: titlesData } = useCollection<FinancialTitle>(titlesQuery);

  const staffQuery = useMemoFirebase(() => firestore ? collection(firestore, 'staff') : null, [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);

  const isLoading = isUserLoading || !clientsData || !processesData || !titlesData || !staffData;

  // Process Stats
  const processStatusData = React.useMemo(() => {
    if (!processesData) return [];
    const counts = processesData.reduce((acc: any, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [processesData]);

  // Financial Chart Data (6 months)
  const financialData = React.useMemo(() => {
    if (!titlesData) return [];
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({
        month: format(d, 'MMM', { locale: ptBR }),
        key: format(d, 'yyyy-MM'),
        receita: 0,
        despesa: 0,
      });
    }

    titlesData.forEach(t => {
      if (t.status === 'PAGO' && t.paymentDate) {
        const date = t.paymentDate.toDate();
        const key = format(date, 'yyyy-MM');
        const monthData = months.find(m => m.key === key);
        if (monthData) {
          if (t.type === 'RECEITA') monthData.receita += t.value;
          else monthData.despesa += t.value;
        }
      }
    });
    return months;
  }, [titlesData]);

  // Growth Chart (New Clients & Processes)
  const growthData = React.useMemo(() => {
    if (!clientsData || !processesData) return [];
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({
        month: format(d, 'MMM', { locale: ptBR }),
        key: format(d, 'yyyy-MM'),
        clientes: 0,
        processos: 0,
      });
    }

    clientsData.forEach(c => {
      const date = typeof c.createdAt === 'string' ? new Date(c.createdAt) : c.createdAt.toDate();
      const key = format(date, 'yyyy-MM');
      const monthData = months.find(m => m.key === key);
      if (monthData) monthData.clientes++;
    });

    processesData.forEach(p => {
      const date = p.createdAt.toDate();
      const key = format(date, 'yyyy-MM');
      const monthData = months.find(m => m.key === key);
      if (monthData) monthData.processos++;
    });

    return months;
  }, [clientsData, processesData]);

  // Staff Workload
  const staffPerformance = React.useMemo(() => {
    if (!staffData || !processesData) return [];
    return staffData
      .filter(s => s.role === 'lawyer')
      .map(s => {
        const count = processesData.filter(p => p.responsibleStaffIds?.includes(s.id)).length;
        return { name: s.firstName, processos: count };
      })
      .sort((a, b) => b.processos - a.processos)
      .slice(0, 5);
  }, [staffData, processesData]);

  const totalOverdue = React.useMemo(() => {
    if (!titlesData) return 0;
    const now = new Date();
    return titlesData
      .filter(t => t.status === 'PENDENTE' && isAfter(now, t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate)))
      .reduce((sum, t) => sum + t.value, 0);
  }, [titlesData]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <H1>Relatórios Gerenciais</H1>
          <p className="text-sm text-muted-foreground">Insights estratégicos e performance do escritório.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Calendar className="h-4 w-4 mr-2" />
            Últimos 6 Meses
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </div>
      </div>

      {/* Destaques Rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Inadimplência</span>
              <Activity className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-black text-rose-600">{formatCurrency(totalOverdue)}</p>
            <p className="text-[10px] text-muted-foreground font-bold">Total vencido não pago</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Novos Processos</span>
              <FolderKanban className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-black text-emerald-700">{processesData.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold">Total histórico de casos</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Base de Clientes</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-black text-blue-700">{clientsData.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold">Contatos ativos no sistema</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Faturamento Acum.</span>
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-black text-accent">{formatCurrency(financialData.reduce((sum, m) => sum + m.receita, 0))}</p>
            <p className="text-[10px] text-muted-foreground font-bold">Últimos 6 meses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fluxo de Caixa */}
        <Card className="shadow-lg border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Fluxo de Caixa Mensal</CardTitle>
                <CardDescription>Receitas vs Despesas (Títulos Liquidados)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="top" align="right" height={36}/>
                <Bar dataKey="receita" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expansão do Escritório */}
        <Card className="shadow-lg border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Crescimento da Operação</CardTitle>
                <CardDescription>Novos processos e clientes por mês</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorProc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5D030" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F5D030" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="processos" name="Novos Processos" stroke="#F5D030" fillOpacity={1} fill="url(#colorProc)" strokeWidth={3} />
                <Area type="monotone" dataKey="clientes" name="Novos Clientes" stroke="#152c4b" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status dos Processos */}
        <Card className="shadow-lg border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Composição da Carteira</CardTitle>
                <CardDescription>Distribuição de processos por status atual</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processStatusData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {processStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full mt-4">
              {processStatusData.map((entry, index) => (
                <div key={entry.name} className="flex flex-col items-center p-2 rounded-xl bg-muted/30">
                  <span className="text-[9px] font-black uppercase text-muted-foreground">{entry.name}</span>
                  <span className="text-lg font-black" style={{ color: COLORS[index % COLORS.length] }}>{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Carga por Advogado */}
        <Card className="shadow-lg border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChartIcon className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Eficiência da Equipe</CardTitle>
                <CardDescription>Top 5 advogados por volume de casos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffPerformance} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.2} />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="processos" name="Processos" fill="#152c4b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Relatório de Títulos Recentes */}
      <Card className="shadow-lg border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Auditoria de Recebimentos Recentes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {titlesData.filter(t => t.type === 'RECEITA' && t.status === 'PAGO').slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border bg-muted/10 hover:bg-muted/20 transition-colors">
                <div className="flex flex-col">
                  <span className="font-bold text-sm">{t.description}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                    {t.paymentDate ? format(t.paymentDate.toDate(), "dd 'de' MMMM", { locale: ptBR }) : ''}
                  </span>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{formatCurrency(t.value)}</Badge>
              </div>
            ))}
          </div>
          <Button variant="link" className="w-full mt-4 text-primary font-bold uppercase text-[10px] tracking-widest" asChild>
            <Link href="/dashboard/financeiro">Ver financeiro completo</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from 'next/link';
