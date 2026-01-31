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
import { File } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import type { Client, FinancialTransaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const formatDate = (date: Timestamp | undefined) => {
    if (!date) return 'N/A';
    return date.toDate().toLocaleDateString('pt-BR');
};

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function TransactionsTable({
  transactions,
  clients,
  isLoading,
  type,
}: {
  transactions: FinancialTransaction[];
  clients: Client[];
  isLoading: boolean;
  type: 'receita' | 'despesa';
}) {
  const clientsMap = React.useMemo(() => {
    return new Map(clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));
  }, [clients]);

  const textColor = type === 'receita' ? 'text-green-600' : 'text-red-600';

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descrição</TableHead>
          <TableHead className="hidden sm:table-cell">Cliente</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="hidden sm:table-cell">Data</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-20 ml-auto" />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
            </TableRow>
          ))
        ) : (
          transactions.map((trans) => (
            <TableRow key={trans.id}>
              <TableCell className="font-medium">{trans.description}</TableCell>
              <TableCell className="hidden sm:table-cell">{clientsMap.get(trans.clientId) || 'N/A'}</TableCell>
              <TableCell className={`text-right font-semibold ${textColor}`}>
                {formatCurrency(trans.amount)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{formatDate(trans.transactionDate)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export default function FinanceiroPage() {
  const { firestore, isUserLoading } = useFirebase();

  const transactionsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'financial_transactions') : null),
    [firestore]
  );
  const { data: transactionsData, isLoading: isLoadingTransactions } = useCollection<FinancialTransaction>(transactionsQuery);

  const clientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clients') : null),
    [firestore]
  );
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const isLoading = isUserLoading || isLoadingTransactions || isLoadingClients;
  const transactions = transactionsData || [];
  const clients = clientsData || [];

  const receitas = React.useMemo(() => transactions.filter((t) => t.type === 'receita'), [transactions]);
  const despesas = React.useMemo(() => transactions.filter((t) => t.type === 'despesa'), [transactions]);
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
          Financeiro
        </h1>
        <div className="hidden items-center gap-2 md:ml-auto md:flex">
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Exportar para Sheets</span>
          </Button>
        </div>
      </div>
      <Tabs defaultValue="receber">
        <TabsList>
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
        </TabsList>
        <TabsContent value="receber">
          <Card>
            <CardHeader>
              <CardTitle>Contas a Receber</CardTitle>
              <CardDescription>
                Visualize todos os honorários, acordos e pagamentos recebidos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionsTable
                transactions={receitas}
                clients={clients}
                isLoading={isLoading}
                type="receita"
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pagar">
          <Card>
            <CardHeader>
              <CardTitle>Contas a Pagar</CardTitle>
              <CardDescription>
                Visualize todas as custas, despesas e pagamentos efetuados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionsTable
                transactions={despesas}
                clients={clients}
                isLoading={isLoading}
                type="despesa"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
