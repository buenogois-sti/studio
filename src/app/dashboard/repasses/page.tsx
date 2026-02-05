'use client';

import * as React from 'react';
import { 
  Wallet, 
  Users, 
  History, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Briefcase, 
  FileText,
  Search,
  MoreVertical,
  Loader2,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, FieldValue, Timestamp, doc, deleteDoc, orderBy } from 'firebase/firestore';
import type { Staff, FinancialTitle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { H1 } from '@/components/ui/typography';
import { ScrollArea } from '@/components/ui/scroll-area';
import { processRepasse } from '@/lib/finance-actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function RepassePaymentDialog({ 
  staff, 
  credits, 
  open, 
  onOpenChange,
  onPaid
}: { 
  staff: Staff | null; 
  credits: any[]; 
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
      toast({ title: 'Repasse Concluído!', description: `Valor de ${totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} pago.` });
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
      <DialogContent className="sm:max-w-xl bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2 font-headline text-xl">
            <Wallet className="h-6 w-6 text-emerald-400" />
            Processar Liquidação
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Confirmando o pagamento para <span className="text-white font-bold">{staff.firstName} {staff.lastName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-6 rounded-2xl bg-emerald-500/5 border-2 border-emerald-500/20 text-center shadow-[0_0_30px_rgba(16,185,129,0.05)]">
            <p className="text-[10px] font-black uppercase text-emerald-400 mb-1 tracking-[0.2em]">Valor Total Líquido a Pagar</p>
            <p className="text-4xl font-black text-white tabular-nums">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Extrato de Créditos Selecionados ({credits.length})</h4>
            <ScrollArea className="h-[200px] border border-white/5 rounded-xl p-2 bg-black/40">
              <div className="space-y-2">
                {credits.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all">
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                        {c.type === 'REEMBOLSO' ? <FileText className="h-4 w-4 text-blue-400" /> : <DollarSign className="h-4 w-4 text-emerald-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{c.description}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">
                          {c.type === 'REEMBOLSO' ? 'Natureza: Ressarcimento' : 'Natureza: Participação'}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-emerald-400 ml-4 tabular-nums">{c.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-400 italic leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>Esta operação registrará uma saída de caixa no financeiro central e emitirá um aviso de depósito ao colaborador.</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild><Button variant="ghost" className="text-slate-400 hover:text-white">Cancelar</Button></DialogClose>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px] px-8 h-11 shadow-lg shadow-emerald-900/20"
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

function PayoutList({ filterRole }: { filterRole?: string }) {
  const { firestore } = useFirebase();
  const [selectedStaff, setSelectedStaff] = React.useState<Staff | null>(null);
  const [staffCredits, setStaffCredits] = React.useState<any[]>([]);
  const [isRepasseOpen, setIsRepasseOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore]);
  const { data: staffData, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);

  const filteredStaff = React.useMemo(() => {
    if (!staffData) return [];
    let list = staffData;
    if (filterRole) list = list.filter(s => s.role === filterRole);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q));
    }
    return list;
  }, [staffData, filterRole, searchTerm]);

  const handleOpenRepasse = async (member: Staff) => {
    if (!firestore) return;
    const creditsRef = collection(firestore, `staff/${member.id}/credits`);
    const q = query(creditsRef, where('status', '==', 'DISPONIVEL'));
    const snapshot = await getDocs(q);
    const credits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (credits.length === 0) {
      alert("Nenhum crédito disponível para saque neste momento.");
      return;
    }

    setStaffCredits(credits);
    setSelectedStaff(member);
    setIsRepasseOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Pesquisar colaborador..." 
          className="pl-8 bg-card border-border/50" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5">
              <TableHead className="text-muted-foreground">Nome do Colaborador</TableHead>
              <TableHead className="text-muted-foreground">Perfil</TableHead>
              <TableHead className="text-right text-muted-foreground">Total Disponível</TableHead>
              <TableHead className="text-right text-muted-foreground">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingStaff ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : filteredStaff.map(member => (
              <TableRow key={member.id} className="border-white/5 hover:bg-white/5">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                    </div>
                    <span className="font-bold text-white">{member.firstName} {member.lastName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] uppercase border-white/10 text-slate-400">
                    {member.role === 'lawyer' ? 'Advogado' : member.role === 'intern' ? 'Estagiário' : member.role === 'employee' ? 'Funcionário' : 'Prestador'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <RepasseValue staffId={member.id} />
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-[10px] font-black uppercase text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => handleOpenRepasse(member)}
                  >
                    Quitar Saldo
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <RepassePaymentDialog 
        staff={selectedStaff} 
        credits={staffCredits} 
        open={isRepasseOpen} 
        onOpenChange={setIsRepasseOpen}
        onPaid={() => setIsRepasseOpen(false)}
      />
    </div>
  );
}

function RepasseValue({ staffId }: { staffId: string }) {
  const { firestore } = useFirebase();
  const [val, setVal] = React.useState(0);

  React.useEffect(() => {
    if (!firestore) return;
    const creditsRef = collection(firestore, `staff/${staffId}/credits`);
    const q = query(creditsRef, where('status', '==', 'DISPONIVEL'));
    getDocs(q).then(snap => {
      const total = snap.docs.reduce((sum, d) => sum + (d.data().value || 0), 0);
      setVal(total);
    });
  }, [firestore, staffId]);

  return <span className={cn("text-sm font-black", val > 0 ? "text-emerald-400" : "text-slate-500")}>{val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>;
}

function PaymentHistory() {
  const { firestore } = useFirebase();
  const historyQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), where('origin', '==', 'HONORARIOS_PAGOS'), orderBy('paymentDate', 'desc')) : null), [firestore]);
  const { data: history, isLoading } = useCollection<FinancialTitle>(historyQuery);

  if (isLoading) return <Skeleton className="h-64 w-full bg-white/5" />;

  return (
    <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/5">
            <TableHead className="text-muted-foreground">Data Pagamento</TableHead>
            <TableHead className="text-muted-foreground">Descrição</TableHead>
            <TableHead className="text-right text-muted-foreground">Valor Liquidado</TableHead>
            <TableHead className="text-right text-muted-foreground">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history?.map(t => (
            <TableRow key={t.id} className="border-white/5 hover:bg-white/5">
              <TableCell className="text-xs text-slate-400">
                {t.paymentDate && format(t.paymentDate.toDate(), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell className="font-bold text-white">{t.description}</TableCell>
              <TableCell className="text-right font-black text-emerald-400">
                {t.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {history?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">Nenhum pagamento registrado no histórico.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

export default function RepassesPage() {
  const { firestore } = useFirebase();
  const [stats, setStats] = React.useState({ totalPending: 0, totalPaidMonth: 0, staffCount: 0 });

  React.useEffect(() => {
    if (!firestore) return;
    
    const loadStats = async () => {
      // Simplificado: Buscar todos os staff e somar créditos disponíveis
      const staffSnap = await getDocs(collection(firestore, 'staff'));
      let pending = 0;
      for (const s of staffSnap.docs) {
        const credSnap = await getDocs(query(collection(firestore, `staff/${s.id}/credits`), where('status', '==', 'DISPONIVEL')));
        pending += credSnap.docs.reduce((sum, d) => sum + (d.data().value || 0), 0);
      }
      
      // Pagos no mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      const paidSnap = await getDocs(query(collection(firestore, 'financial_titles'), where('origin', '==', 'HONORARIOS_PAGOS'), where('paymentDate', '>=', startOfMonth)));
      const paid = paidSnap.docs.reduce((sum, d) => sum + (d.data().value || 0), 0);

      setStats({ totalPending: pending, totalPaidMonth: paid, staffCount: staffSnap.size });
    };

    loadStats();
  }, [firestore]);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <H1 className="text-white">Pagamentos & Repasses</H1>
          <p className="text-sm text-muted-foreground">Gestão de remuneração variável, salários e fornecedores.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5">
            <TrendingUp className="mr-2 h-4 w-4" />
            Relatório de Performance
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-emerald-400">Total Liquidado (Mês)</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{stats.totalPaidMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-amber-400">Saldo Pendente de Repasse</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{stats.totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Quadro de Colaboradores</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{stats.staffCount} Ativos</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lawyers" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-[#0f172a] border border-white/5 p-1 h-12">
          <TabsTrigger value="lawyers" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Briefcase className="h-4 w-4" /> Honorários
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-4 w-4" /> Administrativo
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Wallet className="h-4 w-4" /> Fornecedores
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lawyers" className="mt-6">
          <PayoutList filterRole="lawyer" />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <PayoutList filterRole="employee" />
        </TabsContent>

        <TabsContent value="providers" className="mt-6">
          <PayoutList filterRole="provider" />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <PaymentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
