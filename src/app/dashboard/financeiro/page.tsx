
'use client';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  PlusCircle, 
  Loader2, 
  Check, 
  Receipt, 
  RefreshCw, 
  MoreVertical,
  Trash2,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  Users,
  Handshake,
  Printer,
  ChevronRight,
  Wallet,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy, deleteDoc, doc, getDocs, where } from 'firebase/firestore';
import type { FinancialTitle, Staff, LawyerCredit, Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { H1 } from '@/components/ui/typography';
import { useToast } from '@/components/ui/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogTrigger, 
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { format, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createFinancialTitle, updateFinancialTitleStatus, processRepasse } from '@/lib/finance-actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const titleFormSchema = z.object({
  description: z.string().min(3, 'Descrição obrigatória'),
  type: z.enum(['RECEITA', 'DESPESA']),
  origin: z.string().min(1, 'Origem obrigatória'),
  value: z.coerce.number().positive('Valor deve ser positivo'),
  dueDate: z.string().min(1, 'Data de vencimento obrigatória'),
  status: z.enum(['PENDENTE', 'PAGO']).default('PENDENTE'),
});

function NewTitleDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof titleFormSchema>>({
    resolver: zodResolver(titleFormSchema),
    defaultValues: {
      type: 'RECEITA',
      status: 'PENDENTE',
      value: 0,
      dueDate: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  const onSubmit = async (values: z.infer<typeof titleFormSchema>) => {
    setIsSaving(true);
    try {
      await createFinancialTitle({
        ...values,
        dueDate: new Date(values.dueDate),
      });
      toast({ title: 'Lançamento realizado!' });
      form.reset();
      onCreated();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground">
          <PlusCircle className="h-4 w-4" />
          Novo Lançamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-white">Novo Título Financeiro</DialogTitle>
          <DialogDescription className="text-slate-400">Lançamento manual de entrada ou saída.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="RECEITA">Entrada (Receita)</SelectItem>
                        <SelectItem value="DESPESA">Saída (Despesa)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="origin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="HONORARIOS_CONTRATUAIS">Honorários</SelectItem>
                        <SelectItem value="SUCUMBENCIA">Sucumbência</SelectItem>
                        <SelectItem value="SALARIOS_PROLABORE">Salários/Pró-Labore</SelectItem>
                        <SelectItem value="ALUGUEL_CONTAS">Aluguel/Contas</SelectItem>
                        <SelectItem value="INFRAESTRUTURA_TI">TI/Software</SelectItem>
                        <SelectItem value="OUTRAS_DESPESAS">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Descrição</FormLabel>
                  <FormControl><Input className="bg-background border-border" placeholder="Ex: Honorários Processo X" {...field} /></FormControl>
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
                    <FormLabel className="text-white">Valor (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" className="bg-background border-border" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Vencimento</FormLabel>
                    <FormControl><Input type="date" className="bg-background border-border" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="ghost" type="button">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Lançamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptDialog({ 
  title, 
  client, 
  open, 
  onOpenChange 
}: { 
  title: FinancialTitle | null; 
  client?: Client; 
  open: boolean; 
  onOpenChange: (open: boolean) => void 
}) {
  if (!title) return null;

  const handlePrint = () => { window.print(); };
  const formattedValue = title.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white text-slate-900 p-0 overflow-hidden">
        <div className="p-8 space-y-8 print:p-0">
          <div className="flex justify-between items-start border-b pb-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold uppercase tracking-tighter">Bueno Gois Advogados</h2>
              <p className="text-[10px] text-slate-500 uppercase font-medium">CNPJ: 00.000.000/0001-00</p>
              <p className="text-[10px] text-slate-500">Rua Marechal Deodoro, 1594 - SBC/SP</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900">RECIBO</div>
              <div className="text-sm font-bold text-slate-500">Nº {title.id.substring(0, 8).toUpperCase()}</div>
            </div>
          </div>
          <div className="py-10 space-y-6 text-lg leading-relaxed">
            <p>Recebemos de <strong className="border-b-2 border-slate-900 pb-0.5">{client ? `${client.firstName} ${client.lastName}` : 'Cliente não identificado'}</strong>, inscrito no CPF/CNPJ <strong className="border-b-2 border-slate-900 pb-0.5">{client?.document || 'N/A'}</strong>, a importância de <strong className="text-2xl font-black">{formattedValue}</strong>.</p>
            <p>Referente a: <span className="italic text-slate-700">{title.description}</span></p>
          </div>
          <div className="pt-12 flex flex-col items-center gap-12">
            <p className="text-sm font-medium">São Bernardo do Campo, {today}</p>
            <div className="flex flex-col items-center w-full max-w-xs pt-4">
              <div className="w-full border-t border-slate-900 mb-2" />
              <p className="text-xs font-bold uppercase tracking-widest">Bueno Gois Advogados e Associados</p>
              <p className="text-[10px] text-slate-500">Representante Legal</p>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 bg-slate-50 border-t print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" /> Imprimir Recibo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RepassePaymentDialog({ 
  staff, 
  credits, 
  open, 
  onOpenChange,
  onPaid
}: { 
  staff: Staff | null; 
  credits: LawyerCredit[]; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
}) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { toast } = useToast();

  const totalValue = React.useMemo(() => credits.reduce((sum, c) => sum + c.value, 0), [credits]);

  const handlePay = async () => {
    if (!staff) return;
    setIsProcessing(true);
    try {
      await processRepasse(staff.id, credits.map(c => c.id), totalValue);
      toast({ title: 'Repasse Concluído!', description: `Valor de ${totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} repassado com sucesso.` });
      onPaid();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro no repasse', description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!staff) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" />
            Processar Repasse de Honorários
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Confirmando o pagamento para <span className="text-white font-bold">{staff.firstName} {staff.lastName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
            <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Valor Total a Pagar</p>
            <p className="text-3xl font-black text-white">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Itens do Repasse ({credits.length})</h4>
            <ScrollArea className="h-[200px] border border-white/5 rounded-lg p-2 bg-black/20">
              <div className="space-y-2">
                {credits.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-md bg-white/5 border border-white/5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-200 truncate">{c.description}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">{c.processId ? `Processo Vinculado` : 'Avulso'}</p>
                    </div>
                    <span className="text-xs font-black text-emerald-400 ml-4">{c.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-[10px] text-blue-400 italic">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>Ao confirmar, o sistema registrará uma saída de caixa no financeiro e marcará estes honorários como pagos no histórico do profissional.</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild><Button variant="ghost" className="text-slate-400">Cancelar</Button></DialogClose>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest"
            onClick={handlePay}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RepassesTab() {
    const { firestore } = useFirebase();
    const [selectedStaff, setSelectedStaff] = React.useState<Staff | null>(null);
    const [availableCredits, setAvailableCredits] = React.useState<LawyerCredit[]>([]);
    const [showPayment, setShowPayment] = React.useState(false);
    
    const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore]);
    const { data: staffList, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);
    const [balances, setBalances] = React.useState<Record<string, { available: number, retained: number }>>({});
    const [loadingBalances, setLoadingBalances] = React.useState(false);

    const fetchBalances = React.useCallback(async () => {
        if (!staffList || !firestore) return;
        setLoadingBalances(true);
        const newBalances: Record<string, { available: number, retained: number }> = {};
        
        for (const member of staffList) {
            if (member.role === 'lawyer' || member.role === 'intern') {
                const creditsSnap = await getDocs(collection(firestore, `staff/${member.id}/credits`));
                const data = creditsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LawyerCredit));
                
                newBalances[member.id] = {
                    available: data.filter(c => c.status === 'DISPONIVEL').reduce((sum, c) => sum + c.value, 0),
                    retained: data.filter(c => c.status === 'RETIDO').reduce((sum, c) => sum + c.value, 0),
                };
            }
        }
        setBalances(newBalances);
        setLoadingBalances(false);
    }, [staffList, firestore]);

    React.useEffect(() => { fetchBalances(); }, [fetchBalances]);

    const handleOpenRepasse = async (member: Staff) => {
        if (!firestore) return;
        const creditsSnap = await getDocs(query(collection(firestore, `staff/${member.id}/credits`), where('status', '==', 'DISPONIVEL')));
        const credits = creditsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LawyerCredit));
        setAvailableCredits(credits);
        setSelectedStaff(member);
        setShowPayment(true);
    };

    if (isLoadingStaff || loadingBalances) {
        return <div className="p-8 space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-white/5" />)}</div>;
    }

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="space-y-6">
            <Card className="bg-[#0f172a] border-white/5 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent bg-white/5">
                            <TableHead className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-6 py-4">Profissional</TableHead>
                            <TableHead className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Status OAB</TableHead>
                            <TableHead className="text-right text-muted-foreground text-[10px] font-black uppercase tracking-widest">Aguardando Cliente</TableHead>
                            <TableHead className="text-right text-muted-foreground text-[10px] font-black uppercase tracking-widest">Saldo p/ Repasse</TableHead>
                            <TableHead className="text-right text-muted-foreground text-[10px] font-black uppercase tracking-widest px-6">Ação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {staffList?.filter(s => s.role !== 'employee').map(member => {
                            const b = balances[member.id] || { available: 0, retained: 0 };
                            return (
                                <TableRow key={member.id} className="border-white/5 hover:bg-white/5 transition-all group">
                                    <TableCell className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                                                {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-sm">{member.firstName} {member.lastName}</span>
                                                <Badge variant="outline" className="w-fit text-[8px] h-4 font-black uppercase mt-1 bg-white/5">{member.role === 'lawyer' ? 'Advogado' : 'Estagiário'}</Badge>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <ShieldCheck className={cn("h-3 w-3", member.oabStatus === 'Ativa' ? "text-emerald-500" : "text-amber-500")} />
                                            <span className="text-[10px] font-mono text-slate-400">{member.oabNumber || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-xs text-muted-foreground italic">
                                        {formatCurrency(b.retained)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-black text-emerald-400 text-base tabular-nums">{formatCurrency(b.available)}</span>
                                            {b.available > 0 && <span className="text-[8px] font-bold text-emerald-500/60 uppercase">Liberado para saque</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-9 px-4 text-[10px] font-black uppercase border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 gap-2 group-hover:bg-emerald-500 group-hover:text-white transition-all" 
                                            disabled={b.available <= 0}
                                            onClick={() => handleOpenRepasse(member)}
                                        >
                                            <ChevronRight className="h-3 w-3" /> Pagar Agora
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {(!staffList || staffList.length === 0) && (
                            <TableRow><TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic opacity-50"><Users className="h-12 w-12 mx-auto mb-4 opacity-20" /><p>Nenhum profissional habilitado para repasses encontrado.</p></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            <RepassePaymentDialog 
                staff={selectedStaff} 
                credits={availableCredits} 
                open={showPayment} 
                onOpenChange={setShowPayment}
                onPaid={fetchBalances}
            />
        </div>
    );
}

export default function FinanceiroPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const [receiptTitle, setReceiptTitle] = React.useState<FinancialTitle | null>(null);
  const { toast } = useToast();

  const titlesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'desc')) : null), [firestore, refreshKey]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);
  
  const stats = React.useMemo(() => {
    if (!titlesData) return { totalReceitas: 0, totalDespesas: 0, pendenteReceita: 0, pendenteDespesa: 0 };
    return titlesData.reduce((acc, t) => {
      const val = t.value || 0;
      if (t.type === 'RECEITA') {
        if (t.status === 'PAGO') acc.totalReceitas += val;
        else acc.pendenteReceita += val;
      } else {
        if (t.status === 'PAGO') acc.totalDespesas += val;
        else acc.pendenteDespesa += val;
      }
      return acc;
    }, { totalReceitas: 0, totalDespesas: 0, pendenteReceita: 0, pendenteDespesa: 0 });
  }, [titlesData]);

  const handleUpdateStatus = async (id: string, status: 'PAGO' | 'PENDENTE') => {
    setIsProcessing(id);
    try {
      await updateFinancialTitleStatus(id, status);
      toast({ title: `Título marcado como ${status.toLowerCase()}!` });
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try {
      await deleteDoc(doc(firestore!, 'financial_titles', id));
      toast({ title: 'Lançamento removido.' });
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isLoading = isUserLoading || isLoadingTitles;

  const TitleTable = ({ data, type }: { data: FinancialTitle[], type: 'RECEITA' | 'DESPESA' }) => (
    <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-muted-foreground">Descrição</TableHead>
            <TableHead className="text-muted-foreground">Vencimento</TableHead>
            <TableHead className="text-center text-muted-foreground">Status</TableHead>
            <TableHead className="text-right text-muted-foreground">Valor</TableHead>
            <TableHead className="text-right text-muted-foreground">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(t => {
            const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate);
            const isOverdue = t.status === 'PENDENTE' && isBefore(dueDate, new Date());
            
            return (
              <TableRow key={t.id} className="border-white/5 hover:bg-white/5 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{t.description}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{t.origin}</span>
                  </div>
                </TableCell>
                <TableCell className={cn("text-slate-400 text-xs", isOverdue && "text-rose-500 font-bold")}>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {format(dueDate, 'dd/MM/yyyy')}
                    {isOverdue && <Badge variant="outline" className="h-4 text-[8px] border-rose-500/50 text-rose-500 bg-rose-500/5">VENCIDO</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 h-5",
                    t.status === 'PAGO' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  )} variant="outline">
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell className={cn("text-right font-bold tabular-nums", type === 'RECEITA' ? 'text-emerald-400' : 'text-rose-400')}>
                  {formatCurrency(t.value)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50">
                        {isProcessing === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border w-52">
                      <DropdownMenuLabel className="text-white text-[10px] font-black uppercase">Gerenciar Título</DropdownMenuLabel>
                      {t.status === 'PENDENTE' ? (
                        <DropdownMenuItem onClick={() => handleUpdateStatus(t.id, 'PAGO')}>
                          <Check className="mr-2 h-4 w-4 text-emerald-500" /> Marcar como Pago
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleUpdateStatus(t.id, 'PENDENTE')}>
                          <RefreshCw className="mr-2 h-4 w-4 text-amber-500" /> Estornar Pagamento
                        </DropdownMenuItem>
                      )}
                      
                      {type === 'RECEITA' && t.status === 'PAGO' && (
                        <DropdownMenuItem onClick={() => setReceiptTitle(t)}>
                          <Receipt className="mr-2 h-4 w-4 text-primary" /> Emitir Recibo
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem className="text-rose-500" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir Registro
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                Nenhum título encontrado nesta categoria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <H1 className="text-white">Financeiro</H1>
          <p className="text-sm text-muted-foreground">Controle estratégico de faturamento, despesas e repasses.</p>
        </div>
        <NewTitleDialog onCreated={() => setRefreshKey(k => k + 1)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-emerald-500/5 border-emerald-500/10">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-emerald-400">Total Recebido (Mês)</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-emerald-400 tabular-nums">{formatCurrency(stats.totalReceitas)}</p></CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/10">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-amber-400">Receitas Pendentes</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-amber-400 tabular-nums">{formatCurrency(stats.pendenteReceita)}</p></CardContent>
        </Card>
        <Card className="bg-rose-500/5 border-rose-500/10">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-rose-400">Total Pago (Mês)</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-rose-400 tabular-nums">{formatCurrency(stats.totalDespesas)}</p></CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/10">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-blue-400">Saldo Operacional</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white tabular-nums">{formatCurrency(stats.totalReceitas - stats.totalDespesas)}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receitas" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 bg-[#0f172a] border border-white/5 rounded-lg p-1 gap-1">
            <TabsTrigger value="receitas" className="rounded-md data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <ArrowUpRight className="h-4 w-4 mr-2" /> Receitas
            </TabsTrigger>
            <TabsTrigger value="despesas" className="rounded-md data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">
              <ArrowDownRight className="h-4 w-4 mr-2" /> Despesas
            </TabsTrigger>
            <TabsTrigger value="repasses" className="rounded-md data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              <Handshake className="h-4 w-4 mr-2" /> Repasses
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="rounded-md data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <FileText className="h-4 w-4 mr-2" /> Relatórios
            </TabsTrigger>
        </TabsList>

        <TabsContent value="receitas" className="flex-1 mt-4">
          {isLoading ? <Skeleton className="h-64 w-full bg-white/5" /> : (
            <TitleTable data={titlesData?.filter(t => t.type === 'RECEITA') || []} type="RECEITA" />
          )}
        </TabsContent>

        <TabsContent value="despesas" className="flex-1 mt-4">
          {isLoading ? <Skeleton className="h-64 w-full bg-white/5" /> : (
            <TitleTable data={titlesData?.filter(t => t.type === 'DESPESA') || []} type="DESPESA" />
          )}
        </TabsContent>

        <TabsContent value="repasses" className="flex-1 mt-4">
            <RepassesTab />
        </TabsContent>

        <TabsContent value="relatorios" className="flex-1 mt-4">
          <Card className="bg-[#0f172a] border-white/5 p-12 text-center flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
              <FileText className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Relatórios Gerenciais</h3>
              <p className="text-muted-foreground max-w-sm">Acesse a página consolidada de BI para visualizar gráficos de crescimento, lucratividade e performance da equipe.</p>
            </div>
            <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10" asChild>
              <a href="/dashboard/relatorios">Ver Painel de BI</a>
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      <ReceiptDialog 
        title={receiptTitle} 
        client={receiptTitle?.clientId ? clientsMap.get(receiptTitle.clientId) : undefined} 
        open={!!receiptTitle} 
        onOpenChange={(open) => !open && setReceiptTitle(null)} 
      />
    </div>
  );
}
