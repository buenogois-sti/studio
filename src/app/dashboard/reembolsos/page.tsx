'use client';

import * as React from 'react';
import {
  PlusCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Search,
  MoreVertical,
  ArrowUpRight,
  TrendingUp,
  History,
  User,
  AlertCircle,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, doc } from 'firebase/firestore';
import type { Reimbursement, ReimbursementStatus, UserProfile, Staff } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createReimbursement, updateReimbursementStatus, deleteReimbursement } from '@/lib/reimbursement-actions';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const reimbursementFormSchema = z.object({
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres.'),
  value: z.coerce.number().positive('O valor deve ser positivo.'),
  requestDate: z.string().min(1, 'A data é obrigatória.'),
  userId: z.string().optional(), // Admin can select user
});

const statusConfig: Record<ReimbursementStatus, { label: string; color: string; icon: any }> = {
  SOLICITADO: { label: 'Solicitado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Clock },
  APROVADO: { label: 'Aprovado', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
  REEMBOLSADO: { label: 'Reembolsado', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: DollarSign },
  NEGADO: { label: 'Negado', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20', icon: XCircle },
};

function NewReimbursementDialog({ onCreated, isAdmin }: { onCreated: () => void; isAdmin: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { firestore } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => (firestore && isAdmin ? collection(firestore, 'users') : null), [firestore, isAdmin]);
  const { data: users } = useCollection<UserProfile>(usersQuery);

  const form = useForm<z.infer<typeof reimbursementFormSchema>>({
    resolver: zodResolver(reimbursementFormSchema),
    defaultValues: {
      description: '',
      value: 0,
      requestDate: format(new Date(), 'yyyy-MM-dd'),
      userId: session?.user?.id,
    }
  });

  const onSubmit = async (values: z.infer<typeof reimbursementFormSchema>) => {
    setIsSaving(true);
    try {
      let userName = session?.user?.name || 'Usuário';
      if (isAdmin && values.userId !== session?.user?.id) {
        const selectedUser = users?.find(u => u.id === values.userId);
        if (selectedUser) userName = `${selectedUser.firstName} ${selectedUser.lastName}`;
      }

      await createReimbursement({
        ...values,
        userName,
      });

      toast({ title: 'Pedido Enviado!', description: 'Sua solicitação de reembolso foi registrada.' });
      form.reset();
      onCreated();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-md">
          <PlusCircle className="h-4 w-4" />
          Solicitar Reembolso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Reembolso</DialogTitle>
          <DialogDescription>Preencha os detalhes da despesa realizada.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            {isAdmin && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Para quem é o reembolso? (Admin)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o usuário" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {users?.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição da Despesa *</FormLabel>
                  <FormControl><Input placeholder="Ex: Estacionamento Fórum SBC" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requestDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Despesa *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline" type="button">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar Solicitação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ReembolsosPage() {
  const { firestore, isUserLoading } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState('meus');
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);

  const isAdmin = session?.user?.role === 'admin';

  // Meus Reembolsos
  const myReimbursementsQuery = useMemoFirebase(
    () => (firestore && session?.user?.id ? query(
      collection(firestore, 'reimbursements'),
      where('userId', '==', session.user.id),
      orderBy('createdAt', 'desc')
    ) : null),
    [firestore, session?.user?.id]
  );
  const { data: myData, isLoading: isLoadingMy } = useCollection<Reimbursement>(myReimbursementsQuery);

  // Todos Reembolsos (Admin)
  const allReimbursementsQuery = useMemoFirebase(
    () => (firestore && isAdmin ? query(
      collection(firestore, 'reimbursements'),
      orderBy('status', 'asc'),
      orderBy('createdAt', 'desc')
    ) : null),
    [firestore, isAdmin]
  );
  const { data: allData, isLoading: isLoadingAll } = useCollection<Reimbursement>(allReimbursementsQuery);

  const handleStatusUpdate = async (id: string, status: ReimbursementStatus) => {
    setIsUpdating(id);
    try {
      await updateReimbursementStatus(id, status);
      toast({ title: 'Status Atualizado', description: `Reembolso marcado como ${status.toLowerCase()}.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsUpdating(null);
    }
  };

  const stats = React.useMemo(() => {
    const list = isAdmin && activeTab === 'todos' ? allData : myData;
    if (!list) return { total: 0, pending: 0, paid: 0 };
    return list.reduce((acc, r) => {
      acc.total += r.value;
      if (r.status === 'SOLICITADO') acc.pending += r.value;
      if (r.status === 'REEMBOLSADO') acc.paid += r.value;
      return acc;
    }, { total: 0, pending: 0, paid: 0 });
  }, [myData, allData, isAdmin, activeTab]);

  const isLoading = isUserLoading || (activeTab === 'meus' ? isLoadingMy : isLoadingAll);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline flex items-center gap-3 text-primary">
            <Receipt className="h-8 w-8" />
            Gestão de Reembolsos
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Controle de despesas operacionais e reembolsos de equipe.</p>
        </div>
        <NewReimbursementDialog onCreated={() => {}} isAdmin={isAdmin} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-500/5 border-blue-500/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Solicitado</p>
              <p className="text-xl font-black leading-none">{stats.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pendente</p>
              <p className="text-xl font-black leading-none text-amber-700">{stats.pending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pago/Liquidado</p>
              <p className="text-xl font-black leading-none text-emerald-700">{stats.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="meus" className="gap-2">Meus Pedidos</TabsTrigger>
            {isAdmin && <TabsTrigger value="todos" className="gap-2">Todos (Fila Admin)</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="meus" className="mt-0">
          <ReimbursementTable data={myData} isLoading={isLoadingMy} isAdmin={false} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="todos" className="mt-0">
            <ReimbursementTable 
              data={allData} 
              isLoading={isLoadingAll} 
              isAdmin={true} 
              onUpdateStatus={handleStatusUpdate}
              updatingId={isUpdating}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ReimbursementTable({ 
  data, 
  isLoading, 
  isAdmin, 
  onUpdateStatus,
  updatingId 
}: { 
  data: Reimbursement[] | null; 
  isLoading: boolean; 
  isAdmin: boolean;
  onUpdateStatus?: (id: string, status: ReimbursementStatus) => void;
  updatingId?: string | null;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="p-8 space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton className="h-12 w-full" key={i} />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-2xl bg-muted/5">
        <Receipt className="h-12 w-12 mb-4 text-muted-foreground/20" />
        <p className="font-bold text-lg">Nenhum reembolso encontrado</p>
        <p className="text-sm text-muted-foreground">Novas solicitações aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            {isAdmin && <TableHead>Colaborador</TableHead>}
            <TableHead>Descrição</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => {
            const StatusIcon = statusConfig[r.status].icon;
            return (
              <TableRow key={r.id} className="group">
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{r.userName}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{r.description}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <History className="h-3 w-3" /> 
                      {format(r.createdAt.toDate(), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {format(r.requestDate.toDate(), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell className="font-mono text-sm font-bold">
                  {r.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("gap-1.5 h-7 px-2.5 text-[10px] font-black uppercase tracking-widest", statusConfig[r.status].color)}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig[r.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {isAdmin && r.status === 'SOLICITADO' ? (
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50"
                        onClick={() => onUpdateStatus?.(r.id, 'APROVADO')}
                        disabled={updatingId === r.id}
                      >
                        Aprovar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-[10px] font-black uppercase text-rose-600 hover:bg-rose-50"
                        onClick={() => onUpdateStatus?.(r.id, 'NEGADO')}
                        disabled={updatingId === r.id}
                      >
                        Recusar
                      </Button>
                    </div>
                  ) : isAdmin && r.status === 'APROVADO' ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-[10px] font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => onUpdateStatus?.(r.id, 'REEMBOLSADO')}
                      disabled={updatingId === r.id}
                    >
                      Marcar Pago
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => window.print()}>Imprimir Comprovante</DropdownMenuItem>
                        {!isAdmin && r.status === 'SOLICITADO' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteReimbursement(r.id)}>Cancelar Solicitação</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
