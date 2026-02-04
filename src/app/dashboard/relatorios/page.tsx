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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { H1 } from '@/components/ui/typography';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy } from 'firebase/firestore';
import type { Process, Client, FinancialTitle, Staff } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface FinancialStat {
  month: string;
  key: string;
  receita: number;
  despesa: number;
  lucro: number;
}

interface GrowthStat {
  month: string;
  key: string;
  clientes: number;
  processos: number;
}

interface ProductivityStat {
  nome: string;
  processos: number;
  receita: number;
  media: number;
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function RelatoriosPage() {
  const { firestore, isUserLoading } = useFirebase();

  const clientsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const processesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'processes') : null, [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const titlesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'financial_titles'), orderBy('paymentDate', 'desc')) : null, [firestore]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const staffQuery = useMemoFirebase(() => firestore ? collection(firestore, 'staff') : null, [firestore]);
  const { data: staffData, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);

  // Dados de fluxo de caixa (últimos 6 meses)
  const financialData = React.useMemo((): FinancialStat[] => {
    if (!titlesData) return [];
    const months: FinancialStat[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const monthStart = startOfMonth(d);
      const monthEnd = endOfMonth(d);
      
      months.push({ 
        month: format(d, 'MMM/yy', { locale: ptBR }), 
        key: format(d, 'yyyy-MM'), 
        receita: 0, 
        despesa: 0,
        lucro: 0
      });
      
      titlesData.forEach(t => {
        if (t.status === 'PAGO' && t.paymentDate) {
          const date = t.paymentDate instanceof Timestamp ? t.paymentDate.toDate() : new Date(t.paymentDate as any);
          if (isWithinInterval(date, { start: monthStart, end: monthEnd })) {
            if (t.type === 'RECEITA') months[months.length - 1].receita += t.value;
            else months[months.length - 1].despesa += t.value;
          }
        }
      });
      
      months[months.length - 1].lucro = months[months.length - 1].receita - months[months.length - 1].despesa;
    }
    
    return months;
  }, [titlesData]);

  // Dados de crescimento (clientes e processos)
  const growthData = React.useMemo((): GrowthStat[] => {
    if (!clientsData || !processesData) return [];
    const months: GrowthStat[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({ 
        month: format(d, 'MMM', { locale: ptBR }), 
        key: format(d, 'yyyy-MM'), 
        clientes: 0, 
        processos: 0 
      });
    }
    
    clientsData.forEach(c => {
      const date = typeof c.createdAt === 'string' ? new Date(c.createdAt) : (c.createdAt as any).toDate?.() || new Date();
      const monthKey = format(date, 'yyyy-MM');
      const month = months.find(m => m.key === monthKey);
      if (month) month.clientes++;
    });
    
    processesData.forEach(p => {
      const date = p.createdAt instanceof Timestamp ? p.createdAt.toDate() : new Date(p.createdAt as any);
      const monthKey = format(date, 'yyyy-MM');
      const month = months.find(m => m.key === monthKey);
      if (month) month.processos++;
    });
    
    return months;
  }, [clientsData, processesData]);

  // Dados de produtividade por advogado
  const productivityData = React.useMemo((): ProductivityStat[] => {
    if (!staffData || !processesData || !titlesData) return [];
    
    return (staffData || [])
      .filter(s => s.role === 'lawyer' || s.role === 'partner')
      .map(staff => {
        const processos = processesData?.filter(p => p.lawyerId === staff.id).length || 0;
        const receita = titlesData
          ?.filter(t => t.type === 'RECEITA' && t.processId && 
            processesData?.find(p => p.id === t.processId && p.lawyerId === staff.id))
          .reduce((sum, t) => sum + t.value, 0) || 0;
        
        return {
          nome: `${staff.firstName.charAt(0)}${staff.lastName}`,
          processos,
          receita,
          media: processos > 0 ? receita / processos : 0
        };
      })
      .filter(d => d.processos > 0)
      .sort((a, b) => b.receita - a.receita);
  }, [staffData, processesData, titlesData]);

  // Dados de custos por centro de custo
  const costCenterData = React.useMemo(() => {
    if (!titlesData) return [];
    const centers: Record<string, number> = {};
    
    titlesData
      .filter(t => t.type === 'DESPESA' && t.status === 'PAGO')
      .forEach(t => {
        const center = t.costCenter || 'Outros';
        centers[center] = (centers[center] || 0) + t.value;
      });
    
    return Object.entries(centers)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [titlesData]);

  const isLoading = isUserLoading || isLoadingClients || isLoadingProcesses || isLoadingTitles || isLoadingStaff;

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // Cálculo de KPIs
  const totalReceita = financialData.reduce((sum, m) => sum + m.receita, 0);
  const totalDespesa = financialData.reduce((sum, m) => sum + m.despesa, 0);
  const totalLucro = totalReceita - totalDespesa;
  const margemLucro = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;

  return (
    <div className="flex flex-col gap-8 pb-12 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <H1>Relatórios Gerenciais</H1>
          <p className="text-sm text-slate-400 mt-1">Análise financeira e operacional dos últimos 6 meses</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.print()}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-2">Total de Receitas</p>
                <p className="text-2xl font-bold text-emerald-400">
                  R$ {(totalReceita / 1000).toFixed(1)}k
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-2">Total de Despesas</p>
                <p className="text-2xl font-bold text-red-400">
                  R$ {(totalDespesa / 1000).toFixed(1)}k
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-2">Lucro Líquido</p>
                <p className={`text-2xl font-bold ${totalLucro >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  R$ {(totalLucro / 1000).toFixed(1)}k
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-2">Margem de Lucro</p>
                <p className="text-2xl font-bold text-amber-400">
                  {margemLucro.toFixed(1)}%
                </p>
              </div>
              <BarChartIcon className="h-8 w-8 text-amber-500/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fluxo de Caixa Mensal */}
        <Card className="border-emerald-500/20 bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-emerald-400 flex items-center gap-2">
              <BarChartIcon className="h-5 w-5" />
              Fluxo de Caixa Mensal
            </CardTitle>
            <CardDescription>Receitas vs Despesas</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis 
                  dataKey="month" 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => [`R$ ${(value / 1000).toFixed(1)}k`, '']}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="square"
                />
                <Bar dataKey="receita" name="Receitas" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="despesa" name="Despesas" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lucro Mensal */}
        <Card className="border-blue-500/20 bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Lucro Líquido Mensal
            </CardTitle>
            <CardDescription>Tendência de lucratividade</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financialData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis 
                  dataKey="month" 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => `R$ ${(value / 1000).toFixed(1)}k`}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="lucro" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Segunda Linha de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crescimento */}
        <Card className="border-cyan-500/20 bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Crescimento da Operação
            </CardTitle>
            <CardDescription>Novos clientes e processos</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis 
                  dataKey="month" 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Area 
                  type="monotone" 
                  dataKey="processos" 
                  name="Processos"
                  stroke="#f59e0b" 
                  fill="#f59e0b20"
                  isAnimationActive={true}
                />
                <Area 
                  type="monotone" 
                  dataKey="clientes" 
                  name="Clientes"
                  stroke="#06b6d4" 
                  fill="#06b6d420"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Custos por Centro */}
        <Card className="border-purple-500/20 bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-purple-400 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Custos por Centro
            </CardTitle>
            <CardDescription>Distribuição de despesas</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {costCenterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                  <Pie
                    data={costCenterData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: R$${(value / 1000).toFixed(0)}k`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costCenterData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => `R$ ${(value / 1000).toFixed(1)}k`}
                    labelStyle={{ color: '#cbd5e1' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Sem dados de despesas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Produtividade por Advogado */}
      {productivityData.length > 0 && (
        <Card className="border-pink-500/20 bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-pink-400 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Produtividade da Equipe
            </CardTitle>
            <CardDescription>Processos e receita por advogado</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={productivityData.slice(0, 8)} 
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis 
                  type="number"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="category"
                  dataKey="nome" 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => [`R$ ${(value / 1000).toFixed(1)}k`, 'Receita']}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Bar dataKey="receita" fill="#ec4899" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
