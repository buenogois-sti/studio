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

interface FinancialStat {
  month: string;
  key: string;
  receita: number;
  despesa: number;
}

interface GrowthStat {
  month: string;
  key: string;
  clientes: number;
  processos: number;
}

export default function RelatoriosPage() {
  const { firestore, isUserLoading } = useFirebase();

  const clientsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);

  const processesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'processes') : null, [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);

  const titlesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'financial_titles') : null, [firestore]);
  const { data: titlesData } = useCollection<FinancialTitle>(titlesQuery);

  const staffQuery = useMemoFirebase(() => firestore ? collection(firestore, 'staff') : null, [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);

  // Memoized calculations to prevent UI Freezing
  const processStatusData = React.useMemo(() => {
    if (!processesData) return [];
    const counts = processesData.reduce((acc: any, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [processesData]);

  const financialData = React.useMemo((): FinancialStat[] => {
    if (!titlesData) return [];
    const months: FinancialStat[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({ month: format(d, 'MMM', { locale: ptBR }), key: format(d, 'yyyy-MM'), receita: 0, despesa: 0 });
    }
    titlesData.forEach(t => {
      if (t.status === 'PAGO' && t.paymentDate) {
        const date = t.paymentDate instanceof Timestamp ? t.paymentDate.toDate() : new Date(t.paymentDate as any);
        const key = format(date, 'yyyy-MM');
        const month = months.find(m => m.key === key);
        if (month) {
          if (t.type === 'RECEITA') month.receita += t.value;
          else month.despesa += t.value;
        }
      }
    });
    return months;
  }, [titlesData]);

  const growthData = React.useMemo((): GrowthStat[] => {
    if (!clientsData || !processesData) return [];
    const months: GrowthStat[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({ month: format(d, 'MMM', { locale: ptBR }), key: format(d, 'yyyy-MM'), clientes: 0, processos: 0 });
    }
    clientsData.forEach(c => {
      const date = typeof c.createdAt === 'string' ? new Date(c.createdAt) : c.createdAt.toDate();
      const month = months.find(m => m.key === format(date, 'yyyy-MM'));
      if (month) month.clientes++;
    });
    processesData.forEach(p => {
      const month = months.find(m => m.key === format(p.createdAt.toDate(), 'yyyy-MM'));
      if (month) month.processos++;
    });
    return months;
  }, [clientsData, processesData]);

  const isLoading = isUserLoading || !clientsData || !processesData || !titlesData || !staffData;

  if (isLoading) return <div className="space-y-8 p-6"><Skeleton className="h-10 w-64" /><div className="grid grid-cols-4 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></div>;

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex justify-between items-center">
        <H1>Relatórios Gerenciais</H1>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Download className="h-4 w-4 mr-2" /> PDF</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Fluxo de Caixa Mensal</CardTitle></CardHeader><CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={financialData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="receita" name="Receitas" fill="#10b981" /><Bar dataKey="despesa" name="Despesas" fill="#ef4444" /></BarChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Crescimento da Operação</CardTitle></CardHeader><CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={growthData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip /><Area type="monotone" dataKey="processos" stroke="#F5D030" fill="#F5D03033" /></AreaChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </div>
    </div>
  );
}
