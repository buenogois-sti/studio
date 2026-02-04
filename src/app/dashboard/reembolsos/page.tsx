'use client';

import * as React from 'react';
import {
  PlusCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Search,
  MoreVertical,
  History,
  User,
  Receipt,
  Check,
  X,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Reimbursement, ReimbursementStatus, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
  userId: z.string().optional(),
});

const statusConfig: Record<ReimbursementStatus, { label: string; color: string; icon: any }> = {
  SOLICITADO: { label: 'Solicitado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock },
  APROVADO: { label: 'Aprovado', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  REEMBOLSADO: { label: 'Pago', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: DollarSign },
  NEGADO: { label: 'Negado', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: XCircle },
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

      toast({ title: 'Pedido Enviado!', description: 'Solicitação registrada com sucesso.' });
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
        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <PlusCircle className="h-4 w-4" />
          Solicitar Reembolso
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-white">Nova Solicitação</DialogTitle>
          <DialogDescription className="text-slate-400">Preencha os detalhes da despesa para reembolso.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            {isAdmin && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Colaborador (Admin)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione o usuário" /></SelectTrigger></FormControl>
                      <SelectContent className="bg-card border-border">
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
                  <FormLabel className="text-white">Descrição da Despesa *</FormLabel>
                  <FormControl><Input className="bg-background border-border" placeholder="Ex: Cópias de Processo - Fórum SBC" {...field} /></FormControl>
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
                    <FormLabel className="text-white">Valor (R$) *</FormLabel>
                    <FormControl><Input className="bg-background border-border" type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requestDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Data da Despesa *</FormLabel>
                    <FormControl><Input className="bg-background border-border" type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="ghost" className="text-slate-400 hover:text-white" type="button">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar Pedido
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ReembolsosPage() {
  const { firestore, user, isUserLoading: isFirebaseLoading } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState('meus');
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const isAdmin = session?.user?.role === 'admin';

  // OTIMIZAÇÃO: Só inicia a query quando o usuário do Firebase está carregado e sincronizado
  const myReimbursementsQuery = useMemoFirebase(
    () => (firestore && user && !isFirebaseLoading ? query(
      collection(firestore, 'reimbursements'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    ) : null),
    [firestore, user, isFirebaseLoading]
  );
  const { data: myData, isLoading: isLoadingMy } = useCollection<Reimbursement>(myReimbursementsQuery);

  const allReimbursementsQuery = useMemoFirebase(
    () => (firestore && user && isAdmin && !isFirebaseLoading ? query(
      collection(firestore, 'reimbursements'),
      orderBy('createdAt', 'desc')
    ) : null),
    [firestore, user, isAdmin, isFirebaseLoading]
  );
  const { data: allData, isLoading: isLoadingAll } = useCollection<Reimbursement>(allReimbursementsQuery);

  const filteredAllData = React.useMemo(() => {
    if (!allData) return [];
    if (!searchTerm.trim()) return allData;
    const q = searchTerm.toLowerCase();
    return allData.filter(r => 
      r.userName.toLowerCase().includes(q) || 
      r.description.toLowerCase().includes(q)
    );
  }, [allData, searchTerm]);

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

  const handleDelete = async (id: string) => {
    try {
      await deleteReimbursement(id);
      toast({ title: 'Cancelado', description: 'O pedido foi removido.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: error.message });
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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline flex items-center gap-3 text-white">
            <Receipt className="h-8 w-8 text-primary" />
            Reembolsos
          </h1>
          <p className="text-sm text-muted-foreground">Controle de despesas operacionais e reembolsos de equipe.</p>
        </div>
        <NewReimbursementDialog onCreated={() => {}} isAdmin={isAdmin} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">Total Solicitado</p>
              <p className="text-xl font-black text-white">{stats.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">Em Aberto</p>
              <p className="text-xl font-black text-white">{stats.pending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">Total Pago</p>
              <p className="text-xl font-black text-white">{stats.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-white/5 p-1 border border-white/10">
            <TabsTrigger value="meus" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Meus Pedidos</TabsTrigger>
            {isAdmin && <TabsTrigger value="todos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Todos (Fila Admin)</TabsTrigger>}
          </TabsList>
          
          {activeTab === 'todos' && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por colaborador ou descrição..." 
                className="pl-8 bg-card border-border/50 h-9 text-white" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        <TabsContent value="meus" className="mt-0">
          <ReimbursementTable 
            data={myData} 
            isLoading={isFirebaseLoading || isLoadingMy} 
            isAdmin={false} 
            onDelete={handleDelete}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="todos" className="mt-0">
            <ReimbursementTable 
              data={filteredAllData} 
              isLoading={isFirebaseLoading || isLoadingAll} 
              isAdmin={true} 
              onUpdateStatus={handleStatusUpdate}
              onDelete={handleDelete}
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
  onDelete,
  updatingId 
}: { 
  data: Reimbursement[] | null; 
  isLoading: boolean; 
  isAdmin: boolean;
  onUpdateStatus?: (id: string, status: ReimbursementStatus) => void;
  onDelete?: (id: string) => void;
  updatingId?: string | null;
}) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border/50">
        <div className="p-8 space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton className="h-12 w-full bg-white/5" key={i} />)}
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/50 rounded-2xl bg-white/5">
        <Receipt className="h-12 w-12 mb-4 text-muted-foreground/20" />
        <p className="font-bold text-lg text-white">Sem pedidos no momento</p>
        <p className="text-sm text-muted-foreground">Novas solicitações de despesas aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-white/5 border-b border-white/10">
          <TableRow className="hover:bg-transparent">
            {isAdmin && <TableHead className="text-muted-foreground">Colaborador</TableHead>}
            <TableHead className="text-muted-foreground">Descrição</TableHead>
            <TableHead className="text-muted-foreground">Data Despesa</TableHead>
            <TableHead className="text-muted-foreground">Valor</TableHead>
            <TableHead className="text-center text-muted-foreground">Status</TableHead>
            <TableHead className="text-right text-muted-foreground">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => {
            const config = statusConfig[r.status];
            const StatusIcon = config.icon;
            
            return (
              <TableRow key={r.id} className="border-white/5 hover:bg-white/5 transition-colors">
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-white">{r.userName}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-white">{r.description}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <History className="h-3 w-3" /> Criado em {format(r.createdAt.toDate(), "dd/MM/yy")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-300">
                  {format(r.requestDate.toDate(), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell className="font-mono text-sm font-bold text-white">
                  {r.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={cn("gap-1.5 h-7 px-2.5 text-[10px] font-black uppercase tracking-widest", config.color)}>
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {isAdmin && r.status === 'SOLICITADO' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10"
                          onClick={() => onUpdateStatus?.(r.id, 'APROVADO')}
                          disabled={updatingId === r.id}
                          title="Aprovar"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
                          onClick={() => onUpdateStatus?.(r.id, 'NEGADO')}
                          disabled={updatingId === r.id}
                          title="Recusar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {isAdmin && r.status === 'APROVADO' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-[10px] font-black uppercase bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => onUpdateStatus?.(r.id, 'REEMBOLSADO')}
                        disabled={updatingId === r.id}
                      >
                        Pagar
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        <DropdownMenuLabel className="text-white">Opções</DropdownMenuLabel>
                        <DropdownMenuItem className="text-slate-300" onSelect={() => window.print()}>
                          <FileText className="mr-2 h-4 w-4" /> Imprimir Comprovante
                        </DropdownMenuItem>
                        {(isAdmin || r.status === 'SOLICITADO') && (
                          <>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem className="text-rose-500" onClick={() => onDelete?.(r.id)}>
                              Excluir Registro
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
