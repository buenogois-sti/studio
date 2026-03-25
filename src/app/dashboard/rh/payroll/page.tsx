'use client';
import * as React from 'react';
import { 
  DollarSign, 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  User, 
  ArrowRight,
  Loader2,
  Calendar,
  X,
  History,
  TrendingUp,
  CreditCard,
  FileBadge
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import type { Staff, PayrollEntry } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { processPayroll } from '@/lib/staff-actions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PayrollPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [monthKey, setMonthKey] = React.useState(format(new Date(), 'yyyy-MM'));
  
  const staffQuery = React.useMemo(() => firestore ? query(collection(firestore, 'staff'), limit(100)) : null, [firestore]);
  const { data: staffData, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);

  const [entries, setEntries] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (staffData) {
      const initialEntries = staffData.filter(s => !s.resignationDate).map(s => ({
        staffId: s.id,
        staffName: `${s.firstName} ${s.lastName}`,
        baseSalary: s.remuneration?.salary || 0,
        bonuses: [],
        discounts: [],
        netValue: s.remuneration?.salary || 0
      }));
      setEntries(initialEntries);
    }
  }, [staffData]);

  const updateEntry = (index: number, field: string, value: number) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    
    // Recalculate net
    const bonusSum = (newEntries[index].bonuses || []).reduce((acc: any, b: any) => acc + b.value, 0);
    const discountSum = (newEntries[index].discounts || []).reduce((acc: any, d: any) => acc + d.value, 0);
    newEntries[index].netValue = newEntries[index].baseSalary + bonusSum - discountSum;
    
    setEntries(newEntries);
  };

  const handleProcessPayroll = async () => {
    setIsProcessing(true);
    try {
      await processPayroll(monthKey, entries);
      toast({ title: 'Folha de Pagamento Processada!', description: `A folha de ${monthKey} foi aprovada e integrada ao financeiro.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao processar folha', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPayroll = entries.reduce((acc, e) => acc + e.netValue, 0);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline text-white uppercase italic">Folha de Pagamento</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Calculadora de Proventos e Integração Financeira</p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-inner">
           <div className="px-4 py-2 flex flex-col items-center">
              <span className="text-[9px] font-black uppercase text-slate-500">Mês Referência</span>
              <input 
                type="month" 
                value={monthKey} 
                onChange={(e) => setMonthKey(e.target.value)}
                className="bg-transparent text-white font-black text-sm outline-none cursor-pointer"
              />
           </div>
           <Button 
            onClick={handleProcessPayroll} 
            disabled={isProcessing || entries.length === 0}
            className="bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-12 px-8 shadow-xl shadow-primary/20"
           >
             {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />} 
             Aprovar & Integrar
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
            <TableHeader className="bg-white/5 border-b border-white/10 uppercase">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-black tracking-widest px-6 h-12">Colaborador</TableHead>
                <TableHead className="text-[10px] font-black tracking-widest h-12">Salário Base</TableHead>
                <TableHead className="text-[10px] font-black tracking-widest h-12 text-emerald-500">+ Prêmios/Bônus</TableHead>
                <TableHead className="text-[10px] font-black tracking-widest h-12 text-rose-500">- Descontos</TableHead>
                <TableHead className="text-[10px] font-black tracking-widest h-12 text-right px-6">Líquido a Pagar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingStaff ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-500 font-bold italic uppercase">Carregando quadro de pessoal...</TableCell></TableRow>
              ) : entries.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-500 font-bold italic uppercase">Nenhum colaborador ativo para processar.</TableCell></TableRow>
              ) : entries.map((entry, index) => (
                <TableRow key={entry.staffId} className="border-b border-white/5 hover:bg-white/5 group transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black uppercase text-xs border border-primary/20">{entry.staffName[0]}</div>
                        <div className="flex flex-col">
                            <span className="font-bold text-white group-hover:text-primary transition-colors">{entry.staffName}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mt-0.5">Ref: {entry.staffId.substring(0, 8)}</span>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="text-xs font-black text-white">{entry.baseSalary.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <div className="flex items-center gap-1 opacity-50"><CreditCard className="h-2 w-2" /><span className="text-[8px] font-black uppercase">Fixo Mensal</span></div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold text-emerald-400">R$</span>
                         <Input 
                            type="number" 
                            className="w-24 h-8 bg-black/40 border-emerald-500/20 text-white font-black text-xs"
                            onChange={(e) => updateEntry(index, 'bonuses', [{ description: 'Especial', value: parseFloat(e.target.value) || 0 }])}
                         />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold text-rose-400">R$</span>
                         <Input 
                            type="number" 
                            className="w-24 h-8 bg-black/40 border-rose-500/20 text-white font-black text-xs"
                            onChange={(e) => updateEntry(index, 'discounts', [{ description: 'Descontos', value: parseFloat(e.target.value) || 0 }])}
                         />
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-6">
                     <p className="text-lg font-black text-white tabular-nums">{entry.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                     <div className="inline-flex items-center gap-1 mt-1"><div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /><span className="text-[8px] font-black uppercase text-slate-500">Pronto para Envio</span></div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Card>

          <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/20 shadow-lg">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20"><TrendingUp className="h-6 w-6" /></div>
                <div>
                   <p className="text-[10px] font-black uppercase text-primary tracking-widest">Resumo Consolidado</p>
                   <p className="text-2xl font-black text-white italic tabular-nums">{totalPayroll.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-500">Integridade de Dados</p>
                    <p className="text-xs font-bold text-emerald-400">100% VALIDADE TÉCNICA</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
             </div>
          </div>
        </div>

        <div className="space-y-6">
            <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
                <CardHeader className="p-5 border-b border-white/5 bg-white/5">
                    <CardTitle className="text-xs font-black uppercase tracking-tight text-white italic flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" /> Histórico de Fechamento
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                        {[
                          { m: 'Fevereiro 2026', v: 45600.00, s: 'PAID' },
                          { m: 'Janeiro 2026', v: 48200.00, s: 'PAID' },
                          { m: 'Dezembro 2025', v: 54100.00, s: 'PAID' },
                        ].map((h, i) => (
                          <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                              <div>
                                 <p className="text-[10px] font-black text-white uppercase">{h.m}</p>
                                 <p className="text-[10px] font-bold text-slate-500 tabular-nums">{h.v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                              </div>
                              <Badge variant="outline" className="text-[8px] h-4 uppercase border-emerald-500/20 text-emerald-400 bg-emerald-500/5">Pago</Badge>
                          </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="p-4 border-t border-white/5 bg-black/20">
                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase text-slate-500 h-9">Ver Relatório Anual <ArrowRight className="ml-2 h-3 w-3" /></Button>
                </CardFooter>
            </Card>

            <Card className="bg-amber-500/5 border-amber-500/20 overflow-hidden">
                <CardHeader className="p-5">
                    <div className="flex items-center gap-2 text-amber-500 mb-2">
                        <AlertCircle className="h-5 w-5" />
                        <CardTitle className="text-xs font-black uppercase tracking-tight italic">Atenção Crítica</CardTitle>
                    </div>
                    <CardDescription className="text-[10px] font-bold uppercase text-slate-500 leading-relaxed">
                        Certifique-se de que os dados bancários (PIX/Banco) de todos os colaboradores estão atualizados no módulo Equipe antes de aprovar.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="p-6 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center text-center gap-3">
                <FileBadge className="h-10 w-10 text-slate-500 opacity-20" />
                <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">Este módulo gera lançamentos automáticos no fluxo de caixa (Caixa e Competência).</p>
            </div>
        </div>
      </div>
    </div>
  );
}
