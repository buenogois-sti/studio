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
import type { Client, FinancialTransaction, Staff } from '@/lib/types';
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

function TransactionsTable({
  transactions,
  clientsMap,
  staffMap,
  isLoading,
}: {
  transactions: FinancialTransaction[];
  clientsMap: Map<string, string>;
  staffMap: Map<string, string>;
  isLoading: boolean;
}) {
  const getAssociatedName = (trans: FinancialTransaction) => {
    if (trans.clientId) return clientsMap.get(trans.clientId) || 'Cliente não encontrado';
    if (trans.staffId) return staffMap.get(trans.staffId) || 'Membro não encontrado';
    return 'Escritório';
  };

  const getStatusVariant = (status: 'pago' | 'pendente' | 'vencido') => {
    switch (status) {
      case 'pago':
        return 'secondary';
      case 'pendente':
        return 'default';
      case 'vencido':
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

  if (transactions.length === 0) {
     return (
        <div className="text-center text-muted-foreground py-16">
            Nenhuma transação encontrada nesta categoria.
        </div>
     )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descrição</TableHead>
          <TableHead className="hidden sm:table-cell">Categoria</TableHead>
          <TableHead className="hidden md:table-cell">Status</TableHead>
          <TableHead className="hidden md:table-cell">Data</TableHead>
          <TableHead className="text-right">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((trans) => {
          const isRevenue = trans.type === 'receita';
          return (
            <TableRow key={trans.id}>
              <TableCell>
                <div className="font-medium">{trans.description}</div>
                <div className="text-sm text-muted-foreground hidden md:block">
                  {getAssociatedName(trans)}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline">{trans.category}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant={getStatusVariant(trans.status)} className="capitalize">
                  {trans.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="font-medium">{formatDate(trans.transactionDate)}</div>
                {trans.dueDate && <div className="text-xs text-muted-foreground">Vence: {formatDate(trans.dueDate)}</div>}
              </TableCell>
              <TableCell className={cn('text-right font-semibold', isRevenue ? 'text-green-500' : 'text-red-500')}>
                {isRevenue ? '+' : '-'} {formatCurrency(trans.amount)}
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

  const transactionsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'financial_transactions'), orderBy('transactionDate', 'desc')) : null),
    [firestore]
  );
  const { data: transactionsData, isLoading: isLoadingTransactions } = useCollection<FinancialTransaction>(transactionsQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore]);
  const { data: staffData, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);

  const isLoading = isUserLoading || isLoadingTransactions || isLoadingClients || isLoadingStaff;
  const transactions = transactionsData || [];
  
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, `${c.firstName} ${c.lastName}`])), [clientsData]);
  const staffMap = React.useMemo(() => new Map(staffData?.map(s => [s.id, `${s.firstName} ${s.lastName}`])), [staffData]);

  const { monthlyRevenue, monthlyExpenses, pendingReceivables } = React.useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return transactions.reduce((acc, t) => {
        const transactionDate = (t.transactionDate as Timestamp)?.toDate();
        if (t.status === 'pago' && transactionDate >= startOfMonth) {
            if (t.type === 'receita') acc.monthlyRevenue += t.amount;
            if (t.type === 'despesa') acc.monthlyExpenses += t.amount;
        }
        if (t.type === 'receita' && t.status === 'pendente') {
            acc.pendingReceivables += t.amount;
        }
        return acc;
    }, { monthlyRevenue: 0, monthlyExpenses: 0, pendingReceivables: 0 });
  }, [transactions]);
  
  const monthlyBalance = monthlyRevenue - monthlyExpenses;

  const receitas = React.useMemo(() => transactions.filter((t) => t.type === 'receita'), [transactions]);
  const despesas = React.useMemo(() => transactions.filter((t) => t.type === 'despesa'), [transactions]);

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
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Nova Transação</span>
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
              <CardTitle>Últimas Transações</CardTitle>
              <CardDescription>Visualize as movimentações mais recentes do seu escritório.</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionsTable transactions={transactions.slice(0, 10)} clientsMap={clientsMap} staffMap={staffMap} isLoading={isLoading} />
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
              <TransactionsTable transactions={receitas} clientsMap={clientsMap} staffMap={staffMap} isLoading={isLoading} />
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
              <TransactionsTable transactions={despesas} clientsMap={clientsMap} staffMap={staffMap} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
