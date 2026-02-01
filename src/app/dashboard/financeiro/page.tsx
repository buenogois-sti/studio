'use client';
import * as React from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  DollarSign,
  PlusCircle,
  File,
  Loader2,
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy } from 'firebase/firestore';
import type { Client, FinancialTitle, Staff, Process } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { H1 } from '@/components/ui/typography';

const formatDate = (date: Timestamp | undefined) => {
  if (!date) return 'N/A';
  return date.toDate().toLocaleDateString('pt-BR');
};

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function FinancialTitlesTable({
  titles,
  clientsMap,
  processesMap,
  isLoading,
}: {
  titles: FinancialTitle[];
  clientsMap: Map<string, string>;
  processesMap: Map<string, Process>;
  isLoading: boolean;
}) {
  const getAssociatedName = (title: FinancialTitle) => {
    if (title.processId) {
      const process = processesMap.get(title.processId);
      if (process && process.clientId) {
        return clientsMap.get(process.clientId) || 'Cliente não encontrado';
      }
    }
    if (title.origin === 'DESPESA_OPERACIONAL') return 'Escritório';
    return 'N/A';
  };

  const getStatusVariant = (status: 'PAGO' | 'PENDENTE' | 'ATRASADO') => {
    switch (status) {
      case 'PAGO':
        return 'secondary';
      case 'PENDENTE':
        return 'default';
      case 'ATRASADO':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (titles.length === 0) {
     return (
        <div className="text-center text-muted-foreground py-16">
            Nenhum título financeiro encontrado nesta categoria.
        </div>
     )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descrição</TableHead>
          <TableHead className="hidden sm:table-cell">Origem</TableHead>
          <TableHead className="hidden md:table-cell">Status</TableHead>
          <TableHead className="hidden md:table-cell">Vencimento</TableHead>
          <TableHead className="text-right">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {titles.map((title) => {
          const isRevenue = title.type === 'RECEITA';
          return (
            <TableRow key={title.id}>
              <TableCell>
                <div className="font-medium">{title.description}</div>
                <div className="text-sm text-muted-foreground hidden md:block">
                  {getAssociatedName(title)}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline">{title.origin.replace(/_/g, ' ')}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant={getStatusVariant(title.status)} className="capitalize">
                  {title.status.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="font-medium">{formatDate(title.dueDate)}</div>
                {title.status === 'PAGO' && title.paymentDate && <div className="text-xs text-muted-foreground">Pago: {formatDate(title.paymentDate)}</div>}
              </TableCell>
              <TableCell className={cn('text-right font-semibold', isRevenue ? 'text-green-500' : 'text-red-500')}>
                {isRevenue ? '+' : '-'} {formatCurrency(title.value)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function FinanceiroPage() {
  const { firestore, isUserLoading } = useFirebase();

  const titlesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'desc')) : null),
    [firestore]
  );
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore]);
  const { data: staffData, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);

  const processesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'processes') : null), [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const isLoading = isUserLoading || isLoadingTitles || isLoadingClients || isLoadingStaff || isLoadingProcesses;
  const titles = titlesData || [];
  
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, `${c.firstName} ${c.lastName}`])), [clientsData]);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  const { monthlyRevenue, monthlyExpenses, pendingReceivables } = React.useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return titles.reduce((acc, t) => {
        const paymentDate = (t.paymentDate as Timestamp)?.toDate();
        if (t.status === 'PAGO' && paymentDate >= startOfMonth) {
            if (t.type === 'RECEITA') acc.monthlyRevenue += t.value;
            if (t.type === 'DESPESA') acc.monthlyExpenses += t.value;
        }
        if (t.type === 'RECEITA' && t.status === 'PENDENTE') {
            acc.pendingReceivables += t.value;
        }
        return acc;
    }, { monthlyRevenue: 0, monthlyExpenses: 0, pendingReceivables: 0 });
  }, [titles]);
  
  const monthlyBalance = monthlyRevenue - monthlyExpenses;

  const receitas = React.useMemo(() => titles.filter((t) => t.type === 'RECEITA'), [titles]);
  const despesas = React.useMemo(() => titles.filter((t) => t.type === 'DESPESA'), [titles]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <H1>Painel Financeiro</H1>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 gap-1 hidden sm:flex">
            <File className="h-4 w-4" />
            <span className="whitespace-nowrap">Exportar</span>
          </Button>
          <Button size="sm" className="h-9 gap-1">
            <PlusCircle className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Novo Título</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita (Mês)</CardTitle>
                    <ArrowUpRight className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(monthlyRevenue)}</div>
                    <p className="text-xs text-muted-foreground">+20.1% vs. mês anterior</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
                    <ArrowDownRight className="h-5 w-5 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(monthlyExpenses)}</div>
                    <p className="text-xs text-muted-foreground">+12.4% vs. mês anterior</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo (Mês)</CardTitle>
                    <Scale className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", monthlyBalance >= 0 ? 'text-green-500' : 'text-red-500')}>
                        {formatCurrency(monthlyBalance)}
                    </div>
                     <p className="text-xs text-muted-foreground">Resultado líquido do mês</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(pendingReceivables)}</div>
                    <p className="text-xs text-muted-foreground">Total de pendências de clientes</p>
                </CardContent>
            </Card>
        </>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="revenues">Receitas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Últimos Títulos Financeiros</CardTitle>
              <CardDescription>Visualize as movimentações mais recentes do seu escritório.</CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialTitlesTable titles={titles.slice(0, 10)} clientsMap={clientsMap} processesMap={processesMap} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="revenues">
          <Card>
            <CardHeader>
              <CardTitle>Contas a Receber</CardTitle>
              <CardDescription>Visualize todos os honorários, acordos e pagamentos recebidos.</CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialTitlesTable titles={receitas} clientsMap={clientsMap} processesMap={processesMap} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Contas a Pagar</CardTitle>
              <CardDescription>Visualize todas as custas, despesas e pagamentos efetuados.</CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialTitlesTable titles={despesas} clientsMap={clientsMap} processesMap={processesMap} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
