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
  Check,
  X,
  FileText,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  Gavel,
  FolderKanban,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, Timestamp, getDocs } from 'firebase/firestore';
import type { Reimbursement, ReimbursementStatus, UserProfile, Process } from '@/lib/types';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { searchProcesses } from '@/lib/process-actions';
import { ScrollArea } from '@/components/ui/scroll-area';

const reimbursementFormSchema = z.object({
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres.'),
  value: z.coerce.number().positive('O valor deve ser positivo.'),
  requestDate: z.string().min(1, 'A data é obrigatória.'),
  userId: z.string().optional(),
  processId: z.string().optional(),
});

const statusConfig: Record<ReimbursementStatus, { label: string; color: string; icon: any }> = {
  SOLICITADO: { label: 'Solicitado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock },
  APROVADO: { label: 'Pendente de Pagto', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  REEMBOLSADO: { label: 'Pago', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: DollarSign },
  NEGADO: { label: 'Negado', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: XCircle },
};

function NewReimbursementDialog({
  onCreated,
  canManage,
  currentUserId,
  currentUserName,
}: {
  onCreated: () => void;
  canManage: boolean;
  currentUserId: string | null;
  currentUserName: string;
}) {
  const { firestore } = useFirebase();
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const [processSearch, setProcessSearch] = React.useState('');
  const [processResults, setProcessResults] = React.useState<Process[]>([]);
  const [isSearchingProcess, setIsSearchingProcess] = React.useState(false);
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null);

  const usersQuery = useMemoFirebase(() => (firestore && canManage ? collection(firestore, 'users') : null), [firestore, canManage]);
  const { data: users } = useCollection<UserProfile>(usersQuery);

  const form = useForm<z.infer<typeof reimbursementFormSchema>>({
    resolver: zodResolver(reimbursementFormSchema),
    defaultValues: {
      description: '',
      value: 0,
      requestDate: format(new Date(), 'yyyy-MM-dd'),
      userId: currentUserId || undefined,
      processId: '',
    }
  });

  React.useEffect(() => {
    if (processSearch.length < 2) {
      setProcessResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingProcess(true);
      try {
        const results = await searchProcesses(processSearch);
        setProcessResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingProcess(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [processSearch]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: number) => void) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = Number(rawValue) / 100;
    onChange(numericValue);
  };

  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const onSubmit = async (data: z.infer<typeof reimbursementFormSchema>) => {
    setIsSaving(true);
    try {
      if (!currentUserId) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }
      let userName = currentUserName || 'Usuário';
      if (canManage && data.userId && data.userId !== currentUserId) {
        const selectedUser = users?.find(u => u.id === data.userId);
        if (selectedUser) userName = `${selectedUser.firstName} ${selectedUser.lastName}`;
      }

      await createReimbursement({
        ...data,
        userId: data.userId || currentUserId || '',
        userName,
        processId: selectedProcess?.id,
        processName: selectedProcess?.name,
      });

      toast({ title: 'Pedido Enviado!', description: 'Solicitação registrada com sucesso.' });
      form.reset();
      setSelectedProcess(null);
      setProcessSearch('');
      onCreated();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) {
        form.reset();
        setSelectedProcess(null);
        setProcessSearch('');
      }
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
          <PlusCircle className="h-4 w-4" />
          Solicitar Reembolso
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0f172a] border-white/10 sm:max-w-lg text-white h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0">
          <DialogTitle className="text-white">Nova Solicitação</DialogTitle>
          <DialogDescription className="text-slate-400">Preencha os detalhes da despesa para reembolso.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          <Form {...form}>
            <form id="reimbursement-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
              {canManage && (
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Colaborador (Admin)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="bg-black/40 border-white/10"><SelectValue placeholder="Selecione o usuário" /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">
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

              <div className="space-y-2">
                <FormLabel className="text-white">Vincular a um Processo (Opcional)</FormLabel>
                {selectedProcess ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FolderKanban className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{selectedProcess.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{selectedProcess.processNumber}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={() => setSelectedProcess(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="bg-black/40 border-white/10 pl-9" 
                      placeholder="Pesquisar processo..." 
                      value={processSearch}
                      onChange={(e) => setProcessSearch(e.target.value)}
                    />
                    {isSearchingProcess && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                    
                    {processResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
                        <ScrollArea className="max-h-[200px]">
                          {processResults.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full text-left p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                              onClick={() => {
                                setSelectedProcess(p);
                                setProcessResults([]);
                                setProcessSearch('');
                              }}
                            >
                              <p className="text-xs font-bold text-white truncate">{p.name}</p>
                              <p className="text-[9px] text-muted-foreground font-mono">{p.processNumber}</p>
                            </button>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Descrição da Despesa *</FormLabel>
                    <FormControl><Input className="bg-black/40 border-white/10 text-white" placeholder="Ex: Cópias de Processo - Fórum SBC" {...field} /></FormControl>
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
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">R$</span>
                          <Input 
                            className="bg-black/40 border-white/10 pl-9 text-white" 
                            type="text"
                            value={formatCurrencyValue(field.value)}
                            onChange={(e) => handleValueChange(e, field.onChange)}
                          />
                        </div>
                      </FormControl>
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
                      <FormControl><Input className="bg-black/40 border-white/10 text-white" type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 gap-2">
          <DialogClose asChild><Button variant="outline" className="text-slate-400 hover:text-white border-white/10" type="button" disabled={isSaving}>Cancelar</Button></DialogClose>
          <Button type="submit" form="reimbursement-form" disabled={isSaving} className="bg-primary text-primary-foreground font-bold">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Enviando...' : 'Enviar Pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReembolsosPage() {
  const { firestore, user, isUserLoading: isFirebaseLoading, userError } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState('meus');
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const userProfileRef = useMemoFirebase(
    () => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const role = userProfile?.role;
  const canManage = role === 'admin' || role === 'financial';
  const currentUserId = user?.uid || null;
  const currentUserName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : (session?.user?.name || 'Usuário');

  React.useEffect(() => {
    if (!canManage && activeTab === 'todos') {
      setActiveTab('meus');
    }
  }, [canManage, activeTab]);

  const myReimbursementsQuery = useMemoFirebase(
    () => (firestore && currentUserId ? query(
      collection(firestore, 'reimbursements'),
      where('userId', '==', currentUserId),
      orderBy('requestDate', 'desc')
    ) : null),
    [firestore, currentUserId]
  );
  const { data: myData, isLoading: isLoadingMy, error: myError } = useCollection<Reimbursement>(myReimbursementsQuery);

  const allReimbursementsQuery = useMemoFirebase(
    () => (firestore && canManage ? query(
      collection(firestore, 'reimbursements'),
      orderBy('requestDate', 'desc')
    ) : null),
    [firestore, canManage]
  );
  const { data: allData, isLoading: isLoadingAll, error: allError } = useCollection<Reimbursement>(allReimbursementsQuery);

  const filteredAllData = React.useMemo(() => {
    if (!allData) return [];
    if (!searchTerm.trim()) return allData;
    const q = searchTerm.toLowerCase();
    return allData.filter(r => 
      r.userName.toLowerCase().includes(q) || 
      r.description.toLowerCase().includes(q) ||
      r.processName?.toLowerCase().includes(q)
    );
  }, [allData, searchTerm]);

  const handleStatusUpdate = async (id: string, status: ReimbursementStatus) => {
    if (isUpdating) return;
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
    if (!confirm('Tem certeza que deseja remover esta solicitação?')) return;
    try {
      await deleteReimbursement(id);
      toast({ title: 'Cancelado', description: 'O pedido foi removido.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: error.message });
    }
  };

  const isLoading = isFirebaseLoading || isProfileLoading || (activeTab === 'todos' ? isLoadingAll : isLoadingMy);
  const currentError = activeTab === 'todos' ? allError : myError;

  const stats = React.useMemo(() => {
    const list = activeTab === 'todos' ? allData : myData;
    if (!list) return { total: 0, pending: 0, paid: 0 };
    return list.reduce((acc, r) => {
      acc.total += r.value;
      if (r.status === 'SOLICITADO') acc.pending += r.value;
      if (r.status === 'REEMBOLSADO') acc.paid += r.value;
      return acc;
    }, { total: 0, pending: 0, paid: 0 });
  }, [myData, allData, activeTab]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline flex items-center gap-3 text-white">
            <DollarSign className="h-8 w-8 text-primary" />
            Gestão de Reembolsos
          </h1>
          <p className="text-sm text-muted-foreground">Controle de despesas e solicitações de ressarcimento.</p>
        </div>
        <NewReimbursementDialog
          onCreated={() => {}}
          canManage={canManage}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
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
              <p className="text-[10px] font-black uppercase text-muted-foreground">Aguardando Aprovação</p>
              <p className="text-xl font-black text-white">{stats.pending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
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
            <TabsTrigger value="meus" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Meus Pedidos</TabsTrigger>
            {canManage && <TabsTrigger value="todos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Fila Administrativa (Todos)</TabsTrigger>}
          </TabsList>
          
          {activeTab === 'todos' && canManage && (
            <div className="relative w-full max-sm:w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrar pedidos..." 
                className="pl-8 bg-card border-border/50 h-9 text-white" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        {currentError && (
          <div className="mb-6">
            <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Índice Necessário no Banco de Dados</AlertTitle>
              <AlertDescription className="text-xs mt-2 space-y-4">
                <p>Para visualizar seus pedidos, o Firebase exige a criação de um índice manual devido ao filtro de usuário combinado com ordenação.</p>
                
                <div className="bg-black/20 p-4 rounded-lg space-y-2 border border-white/10">
                  <p className="font-bold text-white">Siga estes passos no Firebase Console:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>Vá em <strong>Firestore Database</strong> &rarr; <strong>Índices</strong>.</li>
                    <li>Clique em <strong>"Adicionar Índice"</strong>.</li>
                    <li>ID da Coleção: <code className="bg-white/10 px-1 rounded">reimbursements</code></li>
                    <li>Campo 1: <code className="bg-white/10 px-1 rounded">userId</code> (Crescente)</li>
                    <li>Campo 2: <code className="bg-white/10 px-1 rounded">requestDate</code> (Decrescente)</li>
                    <li>Escopo da Consulta: <strong>"Coleção"</strong></li>
                    <li>Clique em <strong>"Salvar"</strong> e aguarde o status "Ativo".</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <TabsContent value="meus" className="mt-0">
          <ReimbursementTable 
            data={myData} 
            isLoading={isLoading} 
            canManage={false} 
            currentUserId={currentUserId}
            onUpdateStatus={handleStatusUpdate}
            onDelete={handleDelete}
            updatingId={isUpdating}
          />
        </TabsContent>

        {canManage && (
          <TabsContent value="todos" className="mt-0">
            <ReimbursementTable 
              data={filteredAllData} 
              isLoading={isLoading} 
              canManage={true} 
              currentUserId={currentUserId}
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
  canManage, 
  currentUserId,
  onUpdateStatus,
  onDelete,
  updatingId 
}: { 
  data: Reimbursement[] | null; 
  isLoading: boolean; 
  canManage: boolean;
  currentUserId: string | null;
  onUpdateStatus?: (id: string, status: ReimbursementStatus) => void;
  onDelete?: (id: string) => void;
  updatingId?: string | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/50 rounded-2xl bg-white/5">
        <XCircle className="h-12 w-12 mb-4 text-muted-foreground/20" />
        <p className="font-bold text-lg text-white">Nenhum registro encontrado</p>
        <p className="text-sm text-muted-foreground">Novas solicitações aparecerão aqui conforme registradas.</p>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none bg-[#0f172a] overflow-hidden">
      <Table>
        <TableHeader className="bg-white/5 border-b border-white/10">
          <TableRow className="hover:bg-transparent">
            {canManage && <TableHead className="text-muted-foreground">Colaborador</TableHead>}
            <TableHead className="text-muted-foreground">Descrição</TableHead>
            <TableHead className="text-muted-foreground">Data Despesa</TableHead>
            <TableHead className="text-muted-foreground">Valor</TableHead>
            <TableHead className="text-center text-muted-foreground">Status</TableHead>
            <TableHead className="text-right text-muted-foreground px-6">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => {
            const config = statusConfig[r.status];
            const StatusIcon = config.icon;
            const isProcessing = updatingId === r.id;
            
            return (
              <TableRow key={r.id} className="border-white/5 hover:bg-white/5 transition-colors">
                {canManage && (
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
                    {r.processName && (
                      <div className="flex items-center gap-1.5 mt-1 text-primary">
                        <Gavel className="h-3 w-3" />
                        <span className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[200px]">
                          {r.processName}
                        </span>
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <History className="h-3 w-3" /> Criado em {r.createdAt && typeof r.createdAt !== 'string' ? format(r.createdAt.toDate(), "dd/MM/yy") : 'Recente'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-300">
                  {r.requestDate && typeof r.requestDate !== 'string' ? format(r.requestDate.toDate(), 'dd/MM/yyyy') : 'N/A'}
                </TableCell>
                <TableCell className="font-mono text-sm font-bold text-white">
                  {r.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={cn("gap-1.5 h-7 px-2.5 text-[10px] font-black uppercase tracking-widest", config.color)}>
                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <StatusIcon className="h-3 w-3" />}
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right px-6">
                  <div className="flex justify-end gap-2">
                    {!canManage && r.status === 'NEGADO' && r.userId === currentUserId && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-[10px] font-black uppercase border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        onClick={() => onUpdateStatus?.(r.id, 'SOLICITADO')}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Reanálise
                      </Button>
                    )}

                    {canManage && r.status === 'SOLICITADO' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10"
                          onClick={() => onUpdateStatus?.(r.id, 'APROVADO')}
                          disabled={isProcessing}
                          title="Aprovar"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
                          onClick={() => onUpdateStatus?.(r.id, 'NEGADO')}
                          disabled={isProcessing}
                          title="Recusar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {canManage && r.status === 'APROVADO' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-[10px] font-black uppercase bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => onUpdateStatus?.(r.id, 'REEMBOLSADO')}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Confirmar Pagto
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50" disabled={isProcessing}><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 text-white">
                        <DropdownMenuLabel className="text-white">Opções</DropdownMenuLabel>
                        <DropdownMenuItem className="text-slate-300 focus:bg-white/5 focus:text-white" onSelect={() => window.print()}>
                          <FileText className="mr-2 h-4 w-4" /> Imprimir Comprovante
                        </DropdownMenuItem>
                        {((canManage || (r.userId === currentUserId && r.status === 'SOLICITADO'))) && (
                          <>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem className="text-rose-500 focus:bg-rose-500/10 focus:text-rose-400" onClick={() => onDelete?.(r.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir Registro
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
