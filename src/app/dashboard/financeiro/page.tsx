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
  CheckCircle2,
  Coins,
  Scale
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy, deleteDoc, doc, getDocs, where } from 'firebase/firestore';
import type { FinancialTitle, Staff, Client, Process } from '@/lib/types';
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
  origin: z.enum([
    'ACORDO',
    'SENTENCA',
    'HONORARIOS_CONTRATUAIS',
    'SUCUMBENCIA',
    'CUSTAS_PROCESSUAIS',
    'HONORARIOS_PAGOS',
    'SALARIOS_PROLABORE',
    'ALUGUEL_CONTAS',
    'INFRAESTRUTURA_TI',
    'MARKETING_PUBLICIDADE',
    'IMPOSTOS_TAXAS',
    'MATERIAL_ESCRITORIO',
    'SERVICOS_TERCEIROS',
    'OUTRAS_DESPESAS',
  ]),
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
              <DialogClose asChild><Button variant="outline" type="button" className="text-white">Cancelar</Button></DialogClose>
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
  process,
  open, 
  onOpenChange 
}: { 
  title: FinancialTitle | null; 
  client?: Client; 
  process?: Process;
  open: boolean; 
  onOpenChange: (open: boolean) => void 
}) {
  if (!title) return null;

  const handlePrint = () => { window.print(); };
  
  const totalValue = title.value;
  const feePercent = 30; 
  const feeValue = totalValue * (feePercent / 100);
  const netValue = totalValue - feeValue;

  const formattedTotal = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedFee = feeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedNet = netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  const opposingParty = process?.opposingParties?.[0]?.name || "Parte Executada";
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-white text-slate-900 p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-12 space-y-8 print:p-0">
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8">
            <div className="flex items-center gap-4">
              <div className="bg-slate-900 p-3 rounded-xl">
                <img src="/logo.png" alt="Logo" className="h-12 w-auto brightness-0 invert" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Bueno Gois Advogados</h2>
                <p className="text-[10px] text-slate-600 uppercase font-bold">CNPJ: 00.000.000/0001-00 | OAB/SP 000.000</p>
                <p className="text-[10px] text-slate-600">Rua Marechal Deodoro, 1594 - SBC/SP</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-slate-900 leading-none">RECIBO DE REPASSE</div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-2 tracking-widest">Controle: {title.id.substring(0, 8).toUpperCase()}</div>
            </div>
          </div>

          <div className="py-6 space-y-6 text-lg leading-relaxed text-justify text-slate-800">
            <p>
              Declaramos para os devidos fins que o escritório <strong>Bueno Gois Advogados e Associados</strong> recebeu de <strong>{opposingParty}</strong> a importância bruta de <strong>{formattedTotal}</strong>, referente ao pagamento de <i>{title.description}</i> no âmbito do processo judicial nº <strong>{process?.processNumber || 'N/A'}</strong>.
            </p>
            
            <p>
              Pelo presente instrumento, o escritório efetua o repasse de valores ao cliente <strong>{client ? `${client.firstName} ${client.lastName}` : 'N/A'}</strong>, inscrito no CPF/CNPJ <strong>{client?.document || 'N/A'}</strong>, procedendo com a dedução da verba honorária advocatícia contratual, conforme demonstrativo discriminado abaixo:
            </p>
          </div>

          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl overflow-hidden my-8">
            <table className="w-full text-base">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left font-black uppercase text-xs tracking-widest text-slate-600">Discriminação das Verbas</th>
                  <th className="px-6 py-4 text-right font-black uppercase text-xs tracking-widest text-slate-600">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-6 py-4 font-semibold">Valor Bruto Recebido (Proveniente do Réu)</td>
                  <td className="px-6 py-4 text-right font-bold">{formattedTotal}</td>
                </tr>
                <tr className="text-rose-600 bg-rose-50/30">
                  <td className="px-6 py-4 font-semibold">(-) Honorários Advocatícios Contratuais ({feePercent}%)</td>
                  <td className="px-6 py-4 text-right font-bold italic">({formattedFee})</td>
                </tr>
                <tr className="bg-emerald-50 font-black text-emerald-900 border-t-2 border-emerald-200">
                  <td className="px-6 py-5 uppercase tracking-tighter text-lg">Valor Líquido a Repassar ao Cliente</td>
                  <td className="px-6 py-5 text-right text-2xl">{formattedNet}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-sm text-center italic text-slate-500 py-6 border-y border-slate-100">
            "O cliente declara ter conferido os valores acima e dá plena, rasa e geral quitação para nada mais reclamar quanto ao objeto deste pagamento específico."
          </div>

          <div className="pt-12 flex flex-col items-center gap-16">
            <p className="text-lg font-bold">São Bernardo do Campo, {today}</p>
            
            <div className="grid grid-cols-2 gap-20 w-full max-w-2xl pt-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-full border-t-2 border-slate-900 mb-3" />
                <p className="text-xs font-black uppercase tracking-widest">Bueno Gois Advogados</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Representante Legal</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-full border-t-2 border-slate-900 mb-3" />
                <p className="text-xs font-black uppercase tracking-widest">{client ? `${client.firstName} ${client.lastName}` : 'Beneficiário'}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Assinatura do Cliente</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-100 border-t print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-slate-600 border-slate-300">Fechar Janela</Button>
          <Button onClick={handlePrint} className="gap-2 bg-slate-900 text-white hover:bg-slate-800 h-12 px-8 font-black uppercase tracking-widest text-xs">
            <Printer className="h-4 w-4" /> Imprimir Documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HonorariosReceiptDialog({ 
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
  
  const feePercent = 30; 
  const feeValue = title.value * (feePercent / 100);
  const formattedFee = feeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-white text-slate-900 p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-12 space-y-8 print:p-0">
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8">
            <div className="flex items-center gap-4">
              <div className="bg-slate-900 p-3 rounded-xl">
                <img src="/logo.png" alt="Logo" className="h-12 w-auto brightness-0 invert" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Bueno Gois Advogados</h2>
                <p className="text-[10px] text-slate-600 uppercase font-bold">OAB/SP 000.000 | CONTABILIDADE INTERNA</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-slate-900 leading-none">RECIBO DE HONORÁRIOS</div>
              <div className="text-xs font-bold text-slate-500 mt-2">DOC: {title.id.substring(0, 8).toUpperCase()}</div>
            </div>
          </div>

          <div className="py-8 space-y-8 text-xl leading-relaxed text-justify">
            <p>
              Recebemos de <strong>{client ? `${client.firstName} ${client.lastName}` : 'N/A'}</strong> a importância de <strong>{formattedFee}</strong>, referente aos honorários advocatícios contratuais de {feePercent}% incidentes sobre o recebimento de <i>{title.description}</i>.
            </p>
            <p className="text-sm text-slate-500 uppercase font-bold tracking-widest">
              Natureza da Verba: Honorários Advocatícios de Êxito / Quota Litis.
            </p>
          </div>

          <div className="pt-20 flex flex-col items-center gap-16">
            <p className="text-lg font-bold">São Bernardo do Campo, {today}</p>
            <div className="w-full max-w-md text-center">
              <div className="w-full border-t-2 border-slate-900 mb-3" />
              <p className="text-sm font-black uppercase tracking-widest text-slate-900">Bueno Gois Advogados e Associados</p>
              <p className="text-xs text-slate-500 font-bold uppercase mt-1">Prestador de Serviços</p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handlePrint} className="gap-2 bg-slate-900 text-white h-12 px-8 font-black uppercase text-xs">
            <Printer className="h-4 w-4" /> Imprimir Recibo de Honorários
          </Button>
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
  const [staffCredits, setStaffCredits] = React.useState<any[]>([]);
  const [isRepasseOpen, setIsRepasseOpen] = React.useState(false);

  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore]);
  const { data: staffData, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);

  const handleOpenRepasse = async (member: Staff) => {
    if (!firestore) return;
    const creditsRef = collection(firestore, `staff/${member.id}/credits`);
    const q = query(creditsRef, where('status', '==', 'DISPONIVEL'));
    const snapshot = await getDocs(q);
    const credits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (credits.length === 0) {
      alert("Este profissional não possui créditos disponíveis para saque no momento.");
      return;
    }

    setStaffCredits(credits);
    setSelectedStaff(member);
    setIsRepasseOpen(true);
  };

  return (
    <>
      <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5">
              <TableHead className="text-muted-foreground">Profissional</TableHead>
              <TableHead className="text-muted-foreground">Perfil</TableHead>
              <TableHead className="text-right text-muted-foreground">Disponível para Repasse</TableHead>
              <TableHead className="text-right text-muted-foreground">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingStaff ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
              ))
            ) : staffData?.map(member => (
              <TableRow key={member.id} className="border-white/5 hover:bg-white/5">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                    </div>
                    <span className="font-bold text-white">{member.firstName} {member.lastName}</span>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] uppercase">{member.role}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <RepasseValue staffId={member.id} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-[10px] font-black uppercase text-primary hover:bg-primary/10"
                    onClick={() => handleOpenRepasse(member)}
                  >
                    Pagar Agora
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
    </>
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

export default function FinanceiroPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const [receiptTitle, setReceiptTitle] = React.useState<FinancialTitle | null>(null);
  const [honorariosTitle, setHonorariosTitle] = React.useState<FinancialTitle | null>(null);
  const { toast } = useToast();

  const titlesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'desc')) : null), [firestore, refreshKey]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const processesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'processes') : null), [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);
  
  const stats = React.useMemo(() => {
    if (!titlesData) return { totalReceitas: 0, totalDespesas: 0, pendenteReceita: 0, pendenteDespesa: 0, officeRevenue: 0 };
    return titlesData.reduce((acc, t) => {
      const val = t.value || 0;
      if (t.type === 'RECEITA') {
        if (t.status === 'PAGO') {
          acc.totalReceitas += val;
          acc.officeRevenue += (val * 0.3); // 30% de honorários como receita real
        } else {
          acc.pendenteReceita += val;
        }
      } else {
        if (t.status === 'PAGO') acc.totalDespesas += val;
        else acc.pendenteDespesa += val;
      }
      return acc;
    }, { totalReceitas: 0, totalDespesas: 0, pendenteReceita: 0, pendenteDespesa: 0, officeRevenue: 0 });
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
            <TableHead className="text-right text-muted-foreground">Valor Bruto</TableHead>
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
                    <DropdownMenuContent align="end" className="bg-card border-border w-64">
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
                        <>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem onClick={() => setReceiptTitle(t)}>
                            <Users className="mr-2 h-4 w-4 text-blue-400" /> Recibo de Repasse (Cliente)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setHonorariosTitle(t)}>
                            <Scale className="mr-2 h-4 w-4 text-primary" /> Recibo de Honorários (Escritório)
                          </DropdownMenuItem>
                        </>
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
        <Card className="bg-primary/5 border-primary/20 border-2">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-primary">Receita Real (Honorários 30%)</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-primary tabular-nums">{formatCurrency(stats.officeRevenue)}</p></CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/10">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-emerald-400">Total Bruto Recebido</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-emerald-400 tabular-nums">{formatCurrency(stats.totalReceitas)}</p></CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/10">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-amber-400">Receitas Pendentes</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-amber-400 tabular-nums">{formatCurrency(stats.pendenteReceita)}</p></CardContent>
        </Card>
        <Card className="bg-rose-500/5 border-rose-500/10">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] font-black uppercase text-rose-400">Total de Custos (Saídas)</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-black text-rose-400 tabular-nums">{formatCurrency(stats.totalDespesas)}</p></CardContent>
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
        process={receiptTitle?.processId ? processesMap.get(receiptTitle.processId) : undefined}
        open={!!receiptTitle} 
        onOpenChange={(open) => !open && setReceiptTitle(null)} 
      />

      <HonorariosReceiptDialog 
        title={honorariosTitle}
        client={honorariosTitle?.clientId ? clientsMap.get(honorariosTitle.clientId) : undefined}
        open={!!honorariosTitle}
        onOpenChange={(open) => !open && setHonorariosTitle(null)}
      />
    </div>
  );
}
