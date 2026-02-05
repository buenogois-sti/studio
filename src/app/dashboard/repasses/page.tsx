
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
  AlertCircle,
  Zap,
  ShieldCheck,
  X,
  ChevronDown,
  LayoutList,
  FileCheck
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, FieldValue, Timestamp, doc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import type { Staff, FinancialTitle, StaffCredit } from '@/lib/types';
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
import { processRepasse, launchPayroll } from '@/lib/finance-actions';
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
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';

const roleLabels: Record<string, string> = {
  lawyer: 'Advogado',
  intern: 'Estagiário',
  employee: 'Administrativo',
  provider: 'Prestador / Fornecedor',
  partner: 'Sócio',
};

// Componente de Comprovante de Pagamento (Voucher)
function StaffVoucherDialog({ 
  staff, 
  credits, 
  totalValue, 
  paymentDate,
  open, 
  onOpenChange 
}: { 
  staff: Staff | null; 
  credits: any[]; 
  totalValue: number; 
  paymentDate?: Date;
  open: boolean; 
  onOpenChange: (open: boolean) => void 
}) {
  const [isDetailed, setIsDetailed] = React.useState(false);
  if (!staff) return null;

  const handlePrint = () => { window.print(); };
  const todayFormatted = format(paymentDate || new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedTotal = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-white text-slate-900 p-0 overflow-hidden border-none shadow-none print:max-w-full">
        <ScrollArea className="max-h-[90vh] print:max-h-full">
          <div className="p-10 space-y-8 bg-white print:p-0" id="staff-voucher-print-area">
            {/* Header Timbrado */}
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-slate-900 p-1.5 rounded-lg print:bg-transparent">
                  <img src="/logo.png" alt="Logo" className="h-10 w-auto print:brightness-0" />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Bueno Gois Advogados</h2>
                  <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest mt-1">Gestão de Capital Humano e Parcerias</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-slate-900 leading-none font-headline uppercase">Comprovante de Repasse</div>
                <div className="text-[8px] font-bold text-slate-500 mt-1 uppercase">ID: {Math.random().toString(36).substring(7).toUpperCase()}</div>
              </div>
            </div>

            {/* Texto do Recibo */}
            <div className="py-6 space-y-6 text-sm leading-relaxed text-justify">
              <p>
                Declaramos para os devidos fins que o escritório <strong className="text-slate-900">Bueno Gois Advogados e Associados</strong> efetuou o pagamento da importância líquida de <strong className="text-lg font-black underline">{formattedTotal}</strong> ao colaborador(a) <strong className="text-slate-900">{staff.firstName} {staff.lastName}</strong>, portador(a) do CPF/CNPJ <strong className="text-slate-900">{staff.oabNumber ? `OAB ${staff.oabNumber}` : '---'}</strong>.
              </p>

              {isDetailed ? (
                <div className="space-y-3 animate-in fade-in">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b pb-1">Detalhamento da Liquidação (Extrato)</h4>
                  <table className="w-full text-[11px] border border-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-black uppercase">Natureza</th>
                        <th className="px-3 py-2 text-left font-black uppercase">Descrição</th>
                        <th className="px-3 py-2 text-right font-black uppercase">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {credits.map((c, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-bold text-slate-600">{c.type}</td>
                          <td className="px-3 py-2 text-slate-500">{c.description}</td>
                          <td className="px-3 py-2 text-right font-mono">{c.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-right font-black uppercase">Total Liquidado</td>
                        <td className="px-3 py-2 text-right font-black text-slate-900">{formattedTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 italic text-slate-600 text-center">
                  "O valor acima refere-se à quitação de honorários advocatícios, pro-labore e/ou reembolsos de despesas processuais acumulados até a presente data."
                </div>
              )}
            </div>

            {/* Dados Bancários de Destino */}
            <div className="grid grid-cols-2 gap-8 text-[10px] bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="font-black uppercase text-slate-400 mb-1">Destino do Crédito</p>
                <p className="font-bold text-slate-900">{staff.bankInfo?.bankName || 'Dados não informados'}</p>
                <p className="text-slate-600">Ag: {staff.bankInfo?.agency} | Cc: {staff.bankInfo?.account}</p>
              </div>
              <div>
                <p className="font-black uppercase text-slate-400 mb-1">Chave PIX</p>
                <p className="font-bold text-slate-900">{staff.bankInfo?.pixKey || '---'}</p>
              </div>
            </div>

            {/* Assinaturas */}
            <div className="pt-12 flex flex-col items-center gap-12">
              <p className="text-sm font-bold text-slate-900">São Bernardo do Campo, {todayFormatted}</p>
              
              <div className="grid grid-cols-2 gap-12 w-full max-w-2xl">
                <div className="text-center">
                  <div className="w-full border-t border-slate-900 mb-1" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-900">Bueno Gois Advogados</p>
                  <p className="text-[8px] text-slate-500 uppercase font-bold">Emitente / Financeiro</p>
                </div>
                <div className="text-center">
                  <div className="w-full border-t border-slate-900 mb-1" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-900">{staff.firstName} {staff.lastName}</p>
                  <p className="text-[8px] text-slate-500 uppercase font-bold">Assinatura do Recebedor</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 bg-slate-50 border-t print:hidden flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className={cn("h-9 px-4 text-[10px] font-black uppercase gap-2 transition-all", isDetailed && "bg-slate-900 text-white border-slate-900")}
              onClick={() => setIsDetailed(!isDetailed)}
            >
              {isDetailed ? <FileCheck className="h-3.5 w-3.5" /> : <LayoutList className="h-3.5 w-3.5" />}
              {isDetailed ? 'Ver Modo Simples' : 'Ver Modo Detalhado'}
            </Button>
          </div>
          <div className="flex gap-3">
            <DialogClose asChild><Button variant="ghost" className="font-bold text-slate-500">Fechar</Button></DialogClose>
            <Button 
              onClick={handlePrint} 
              className="gap-2 bg-slate-900 hover:bg-slate-800 text-white h-10 px-8 font-black uppercase text-[11px] border-b-4 border-primary rounded-lg"
            >
              <Printer className="h-4 w-4" /> Imprimir Comprovante
            </Button>
          </div>
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
  credits: any[]; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onPaid: (total: number, creditsPaid: any[]) => void;
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
      onPaid(totalValue, credits);
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
                          {c.type === 'REEMBOLSO' ? 'Natureza: Ressarcimento' : c.type === 'SALARIO' ? 'Natureza: Pro-labore' : 'Natureza: Participação'}
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

function PayoutList({ filterRole, onRefresh, onPaid }: { filterRole?: string; onRefresh?: () => void; onPaid: (total: number, credits: any[], staff: Staff) => void }) {
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
          className="pl-8 bg-card border-border/50 text-white" 
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
                <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full bg-white/5" /></TableCell></TableRow>
              ))
            ) : filteredStaff.map(member => (
              <TableRow key={member.id} className="border-white/5 hover:bg-white/5 transition-colors">
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
                    {roleLabels[member.role] || member.role}
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
        onPaid={(total, credits) => {
          setIsRepasseOpen(false);
          if (selectedStaff) onPaid(total, credits, selectedStaff);
          onRefresh?.();
        }}
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

function PaymentHistory({ onShowVoucher }: { onPaid: () => void; onShowVoucher: (t: FinancialTitle) => void }) {
  const { firestore } = useFirebase();
  const historyQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), where('origin', '==', 'HONORARIOS_PAGOS'), orderBy('paymentDate', 'desc'), limit(50)) : null), [firestore]);
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
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-bold text-white">{t.description}</span>
                  <span className="text-[9px] text-muted-foreground uppercase font-black">Ref ID: {t.id.substring(0, 8)}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-black text-emerald-400">
                {t.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50" onClick={() => onShowVoucher(t)}>
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
  const { toast } = useToast();
  const [isLaunching, setIsLaunching] = React.useState(false);
  const [stats, setStats] = React.useState({ totalPending: 0, totalPaidMonth: 0, staffCount: 0, totalRetained: 0 });
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Estados para o Comprovante (Voucher)
  const [isVoucherOpen, setIsVoucherOpen] = React.useState(false);
  const [voucherData, setVoucherData] = React.useState<{ staff: Staff | null, credits: any[], total: number, date?: Date }>({
    staff: null,
    credits: [],
    total: 0
  });

  const loadStats = React.useCallback(async () => {
    if (!firestore) return;
    
    // Buscar todos os staff
    const staffSnap = await getDocs(collection(firestore, 'staff'));
    let pending = 0;
    let retained = 0;

    for (const s of staffSnap.docs) {
      const credSnap = await getDocs(collection(firestore, `staff/${s.id}/credits`));
      credSnap.docs.forEach(d => {
        const val = d.data().value || 0;
        if (d.data().status === 'DISPONIVEL') pending += val;
        if (d.data().status === 'RETIDO') retained += val;
      });
    }
    
    // Pagos no mês
    const startOfCurrentMonth = startOfMonth(new Date());
    const paidSnap = await getDocs(query(
      collection(firestore, 'financial_titles'), 
      where('origin', '==', 'HONORARIOS_PAGOS'), 
      where('paymentDate', '>=', Timestamp.fromDate(startOfCurrentMonth))
    ));
    const paid = paidSnap.docs.reduce((sum, d) => sum + (d.data().value || 0), 0);

    setStats({ 
      totalPending: pending, 
      totalPaidMonth: paid, 
      staffCount: staffSnap.size,
      totalRetained: retained 
    });
  }, [firestore]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats, refreshKey]);

  const handleLaunchPayroll = async () => {
    if (!confirm('Deseja processar a folha de pagamento fixa de todos os colaboradores ativos?')) return;
    setIsLaunching(true);
    try {
      const res = await launchPayroll();
      toast({ title: 'Folha Processada!', description: `${res.count} colaboradores receberam seus créditos mensais.` });
      setRefreshKey(prev => prev + 1);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro na folha', description: e.message });
    } finally {
      setIsLaunching(false);
    }
  };

  const handleRepassePaid = (total: number, credits: any[], staff: Staff) => {
    setVoucherData({ staff, credits, total, date: new Date() });
    setIsVoucherOpen(true);
    setRefreshKey(k => k + 1);
  };

  const handleShowVoucherFromHistory = async (title: FinancialTitle) => {
    if (!firestore || !title.paidToStaffId) return;
    
    try {
      // 1. Buscar dados do profissional
      const staffDoc = await getDocs(query(collection(firestore, 'staff'), where('id', '==', title.paidToStaffId)));
      const staff = staffDoc.docs[0]?.exists() ? { id: staffDoc.docs[0].id, ...staffDoc.docs[0].data() } as Staff : null;
      
      // 2. Buscar créditos vinculados a este pagamento (se existirem metadados)
      // Como a relação crédito <-> título é complexa, no histórico mostramos o modo Simples com o valor do título.
      setVoucherData({
        staff,
        credits: [{ description: title.description, value: title.value, type: 'HONORARIOS' }],
        total: title.value,
        date: title.paymentDate ? (title.paymentDate as any).toDate() : new Date()
      });
      setIsVoucherOpen(true);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao carregar comprovante' });
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <H1 className="text-white">Gestão de Repasses & Folha</H1>
          <p className="text-sm text-muted-foreground">Controle central de salários, honorários e pagamentos externos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5 h-10"
            onClick={handleLaunchPayroll}
            disabled={isLaunching}
          >
            {isLaunching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="mr-2 h-4 w-4" />}
            Rodar Folha Mensal
          </Button>
          <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5 h-10" onClick={() => setRefreshKey(k => k + 1)}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Recarregar Saldos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-emerald-400">Pago este Mês</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{stats.totalPaidMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-amber-400">Disponível p/ Saque</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{stats.totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-blue-400">Aguardando Clientes</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{stats.totalRetained.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Total Equipe</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-white">{stats.staffCount} Profissionais</p></CardContent>
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
            <ShieldCheck className="h-4 w-4" /> Fornecedores
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lawyers" className="mt-6">
          <PayoutList filterRole="lawyer" onRefresh={() => setRefreshKey(k => k + 1)} onPaid={handleRepassePaid} />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <PayoutList filterRole="employee" onRefresh={() => setRefreshKey(k => k + 1)} onPaid={handleRepassePaid} />
        </TabsContent>

        <TabsContent value="providers" className="mt-6">
          <PayoutList filterRole="provider" onRefresh={() => setRefreshKey(k => k + 1)} onPaid={handleRepassePaid} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <PaymentHistory onPaid={() => setRefreshKey(k => k + 1)} onShowVoucher={handleShowVoucherFromHistory} />
        </TabsContent>
      </Tabs>

      <StaffVoucherDialog 
        staff={voucherData.staff} 
        credits={voucherData.credits} 
        totalValue={voucherData.total}
        paymentDate={voucherData.date}
        open={isVoucherOpen}
        onOpenChange={setIsVoucherOpen}
      />
    </div>
  );
}
