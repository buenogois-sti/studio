'use client';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  PlusCircle, 
  Loader2, 
  Check, 
  RefreshCw, 
  MoreVertical,
  Trash2,
  Calendar,
  AlertCircle,
  Users,
  Handshake,
  Printer,
  Wallet,
  CheckCircle2,
  Scale,
  FileText,
  DollarSign,
  BarChart3,
  Search,
  FolderKanban,
  X
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy, deleteDoc, doc, getDocs, where, limit } from 'firebase/firestore';
import type { FinancialTitle, Staff, Client, Process } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
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
import { createFinancialTitle, updateFinancialTitleStatus } from '@/lib/finance-actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { searchProcesses } from '@/lib/process-actions';

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
  processId: z.string().optional(),
});

function NewTitleDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [processSearch, setProcessSearch] = React.useState('');
  const [processResults, setProcessResults] = React.useState<Process[]>([]);
  const [isSearchingProcess, setIsSearchingProcess] = React.useState(false);
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof titleFormSchema>>({
    resolver: zodResolver(titleFormSchema),
    defaultValues: {
      type: 'RECEITA',
      status: 'PENDENTE',
      value: 0,
      dueDate: format(new Date(), 'yyyy-MM-dd'),
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

  const onSubmit = async (values: z.infer<typeof titleFormSchema>) => {
    setIsSaving(true);
    try {
      await createFinancialTitle({
        ...values,
        dueDate: new Date(values.dueDate),
        processId: selectedProcess?.id || undefined,
      });
      toast({ title: 'Lançamento realizado!' });
      form.reset();
      setSelectedProcess(null);
      setProcessSearch('');
      onCreated();
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) {
        setSelectedProcess(null);
        setProcessSearch('');
        form.reset();
      }
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground">
          <PlusCircle className="h-4 w-4" />
          Novo Lançamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
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
                    className="bg-background border-border pl-9 h-11" 
                    placeholder="Pesquisar processo..." 
                    value={processSearch}
                    onChange={(e) => setProcessSearch(e.target.value)}
                  />
                  {isSearchingProcess && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                  
                  {processResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-border rounded-lg shadow-2xl z-50 overflow-hidden">
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
                    <FormLabel className="text-white">Valor (R$) *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">R$</span>
                        <Input 
                          className="bg-background border-border pl-9" 
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

export default function FinanceiroPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const { toast } = useToast();

  const titlesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'financial_titles'), orderBy('dueDate', 'asc')) : null), [firestore, refreshKey]);
  const { data: titlesData, isLoading: isLoadingTitles } = useCollection<FinancialTitle>(titlesQuery);

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
          acc.officeRevenue += (val * 0.3); 
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

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isLoading = isUserLoading || isLoadingTitles;

  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <H1 className="text-white">Financeiro</H1>
          <p className="text-sm text-muted-foreground">Controle estratégico de faturamento e despesas operacionais.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-primary/20 text-primary" asChild>
            <Link href="/dashboard/repasses">
              <Wallet className="mr-2 h-4 w-4" /> Ir para Repasses & Folha
            </Link>
          </Button>
          <NewTitleDialog onCreated={() => setRefreshKey(k => k + 1)} />
        </div>
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
        <TabsList className="grid w-full grid-cols-3 bg-[#0f172a] border border-white/5 rounded-lg p-1 gap-1">
            <TabsTrigger value="receitas" className="rounded-md data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <ArrowUpRight className="h-4 w-4 mr-2" /> Receitas
            </TabsTrigger>
            <TabsTrigger value="despesas" className="rounded-md data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">
              <ArrowDownRight className="h-4 w-4 mr-2" /> Despesas
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="rounded-md data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <BarChart3 className="h-4 w-4 mr-2" /> Painel BI
            </TabsTrigger>
        </TabsList>

        <TabsContent value="receitas" className="flex-1 mt-4">
          <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead className="text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-muted-foreground">Vencimento</TableHead>
                  <TableHead className="text-center text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full bg-white/5" /></TableCell></TableRow>
                  ))
                ) : (titlesData?.filter(t => t.type === 'RECEITA').map(t => (
                  <TableRow key={t.id} className="border-white/5">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{t.description}</span>
                        {t.processId && <span className="text-[9px] text-primary font-bold uppercase">{processesMap.get(t.processId)?.name}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{format(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-[9px] uppercase", t.status === 'PAGO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400')} variant="outline">{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-400">{formatCurrency(t.value)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          {t.status === 'PENDENTE' ? (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(t.id, 'PAGO')}><Check className="mr-2 h-4 w-4" /> Marcar Pago</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(t.id, 'PENDENTE')}><RefreshCw className="mr-2 h-4 w-4" /> Estornar</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="despesas" className="flex-1 mt-4">
          <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead className="text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-muted-foreground">Vencimento</TableHead>
                  <TableHead className="text-center text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full bg-white/5" /></TableCell></TableRow>
                  ))
                ) : (titlesData?.filter(t => t.type === 'DESPESA').map(t => (
                  <TableRow key={t.id} className="border-white/5">
                    <TableCell className="font-medium text-white">{t.description}</TableCell>
                    <TableCell className="text-xs text-slate-400">{format(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-[9px] uppercase", t.status === 'PAGO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400')} variant="outline">{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-rose-400">{formatCurrency(t.value)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          {t.status === 'PENDENTE' ? (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(t.id, 'PAGO')}><Check className="mr-2 h-4 w-4" /> Marcar Pago</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(t.id, 'PENDENTE')}><RefreshCw className="mr-2 h-4 w-4" /> Estornar</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="relatorios" className="flex-1 mt-4">
          <Card className="bg-[#0f172a] border-white/5 p-12 text-center">
            <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Relatórios Gerenciais</h3>
            <p className="text-muted-foreground mb-6">Acesse a página de BI para análise completa.</p>
            <Button variant="outline" className="border-primary/20 text-primary" asChild><Link href="/dashboard/relatorios">Ver Painel BI</Link></Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}