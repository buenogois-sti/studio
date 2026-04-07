"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Loader2,
  Calendar,
  Users,
  Wallet,
  Scale,
  DollarSign,
  BarChart3,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Clock,
  PieChart,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import {
  collection,
  Timestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import type { FinancialTitle, BankAccount } from "@/lib/types";
import {
  REVENUE_CATEGORIES,
  EXPENSE_CATEGORIES,
} from "@/lib/financial-constants";
import { cn } from "@/lib/utils";
import { H1 } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import {
  format,
  startOfDay,
  addMonths,
  subMonths,
  isSameMonth,
  isSameYear,
  endOfMonth,
  isBefore,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  deleteFinancialTitle,
  deleteFinancialTitleSeries,
} from "@/lib/finance-actions";
import { TitleFormDialog } from "@/components/finance/finance-dialogs";
import { ReceiptGenerator } from "@/components/finance/ReceiptGenerator";
import { FileText } from "lucide-react";
import Link from "next/link";

export default function FinanceiroPage() {
  const { firestore, isUserLoading } = useFirebase();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [activeFilter, setActiveFilter] = React.useState<
    "TODOS" | "RECEITA" | "DESPESA" | "PENDENTE"
  >("TODOS");
  const [selectedTitle, setSelectedTitle] =
    React.useState<FinancialTitle | null>(null);

  const prevMonth = () => setSelectedDate((prev) => subMonths(prev, 1));
  const nextMonth = () => setSelectedDate((prev) => addMonths(prev, 1));
  const goToToday = () => setSelectedDate(new Date());

  const titlesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, "financial_titles"),
            orderBy("dueDate", "asc"),
            limit(500),
          )
        : null,
    [firestore, refreshKey],
  );
  const {
    data: titlesData,
    isLoading: isLoadingTitles,
    error: titlesError,
  } = useCollection<FinancialTitle>(titlesQuery);

  const { toast } = useToast();

  React.useEffect(() => {
    if (titlesError) {
      console.error("[Financeiro] Erro ao carregar títulos:", titlesError);
      toast({
        variant: "destructive",
        title: "Erro de Permissão",
        description:
          "Você não tem autorização para visualizar os dados financeiros. Verifique seu cargo no sistema.",
      });
    }
  }, [titlesError, toast]);

  const accountsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, "bank_accounts"), orderBy("name", "asc"))
        : null,
    [firestore],
  );
  const { data: bankAccounts, isLoading: isLoadingAccounts } =
    useCollection<BankAccount>(accountsQuery);

  const currentMonthTitles = React.useMemo(() => {
    if (!titlesData) return [];
    return titlesData.filter((t) => {
      const date =
        t.dueDate instanceof Timestamp
          ? t.dueDate.toDate()
          : new Date(t.dueDate);
      return isSameMonth(date, selectedDate) && isSameYear(date, selectedDate);
    });
  }, [titlesData, selectedDate]);

  const filteredTitles = React.useMemo(() => {
    let titles = currentMonthTitles;
    if (activeFilter === "RECEITA")
      titles = titles.filter(
        (t) => t.type === "RECEITA" && t.status === "PAGO",
      );
    if (activeFilter === "DESPESA")
      titles = titles.filter(
        (t) => t.type === "DESPESA" && t.status === "PAGO",
      );
    if (activeFilter === "PENDENTE")
      titles = titles.filter((t) => t.status === "PENDENTE");

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      titles = titles.filter(
        (t) =>
          t.description.toLowerCase().includes(s) ||
          t.beneficiaryName?.toLowerCase().includes(s),
      );
    }
    return titles;
  }, [currentMonthTitles, activeFilter, searchTerm]);

  const stats = React.useMemo(() => {
    return currentMonthTitles.reduce(
      (acc, t) => {
        const val = t.value || 0;
        if (t.type === "RECEITA") {
          if (t.status === "PAGO") {
            acc.totalReceitas += val;
            acc.officeRevenue += val * 0.3;
          } else {
            acc.pendenteReceita += val;
          }
        } else {
          if (t.status === "PAGO") {
            acc.totalDespesas += val;
          } else {
            acc.pendenteDespesa += val;
            if (t.origin === "REPASSE_CLIENTE") {
              acc.pendingClientPayouts += val;
            }
          }
        }
        return acc;
      },
      {
        totalReceitas: 0,
        totalDespesas: 0,
        pendenteReceita: 0,
        pendenteDespesa: 0,
        officeRevenue: 0,
        pendingClientPayouts: 0,
      },
    );
  }, [currentMonthTitles]);

  const projectedBalance = React.useMemo(() => {
    const currentCash = (bankAccounts || []).reduce(
      (acc, a) => acc + (a.balance || 0),
      0,
    );
    const endOfSelected = endOfMonth(selectedDate);

    const pendingUntilEnd = (titlesData || []).filter((t) => {
      if (t.status === "PAGO") return false;
      const date =
        t.dueDate instanceof Timestamp
          ? t.dueDate.toDate()
          : new Date(t.dueDate);
      return (
        isBefore(date, endOfSelected) ||
        (isSameMonth(date, selectedDate) && isSameYear(date, selectedDate))
      );
    });

    const pendingRev = pendingUntilEnd
      .filter((t) => t.type === "RECEITA")
      .reduce((acc, t) => acc + (t.value || 0), 0);
    const pendingExp = pendingUntilEnd
      .filter((t) => t.type === "DESPESA")
      .reduce((acc, t) => acc + (t.value || 0), 0);

    return currentCash + pendingRev - pendingExp;
  }, [bankAccounts, titlesData, selectedDate]);

  const handleDelete = async (title: FinancialTitle, series: boolean) => {
    try {
      if (series && title.recurrenceId) {
        await deleteFinancialTitleSeries(title.recurrenceId);
        toast({ title: "Série excluída com sucesso!" });
      } else {
        await deleteFinancialTitle(title.id);
        toast({ title: "Lançamento excluído!" });
      }
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: e.message,
      });
    }
  };

  const chartData = React.useMemo(() => {
    if (!titlesData) return [];
    const months: Record<
      string,
      { month: string; receita: number; despesa: number }
    > = {};

    titlesData.forEach((t) => {
      const date =
        t.dueDate instanceof Timestamp
          ? t.dueDate.toDate()
          : new Date(t.dueDate);
      const monthKey = format(date, "MMM/yy", { locale: ptBR });
      if (!months[monthKey])
        months[monthKey] = { month: monthKey, receita: 0, despesa: 0 };

      if (t.status === "PAGO") {
        if (t.type === "RECEITA") months[monthKey].receita += t.value;
        else months[monthKey].despesa += t.value;
      }
    });

    return Object.values(months).slice(-6);
  }, [titlesData]);

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const isLoading = isUserLoading || isLoadingTitles;

  return (
    <div className="flex flex-col gap-6 p-1 relative">
      {(isLoadingTitles || isLoadingAccounts) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[2px] rounded-3xl animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-3 p-6 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              Sincronizando dados...
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <H1 className="text-white">Financeiro</H1>
          <p className="text-sm text-muted-foreground">
            Visão geral estratégica e indicadores de performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full max-sm:w-full max-w-sm print:hidden">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              className="pl-8 bg-[#0f172a] border-border/50 text-white h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            className="gap-2 bg-slate-800 border border-white/10 hover:bg-slate-700 text-white font-bold h-10 px-6 shadow-lg transition-colors"
            onClick={() => setIsReceiptOpen(true)}
          >
            <FileText className="h-4 w-4 text-emerald-400" />
            Gerar Recibo
          </Button>
          <Button
            className="gap-2 bg-primary text-primary-foreground font-bold h-10 px-6 shadow-lg shadow-primary/20"
            onClick={() => {
              setSelectedTitle(null);
              setIsFormOpen(true);
            }}
          >
            <PlusCircle className="h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#0f172a]/50 border border-white/5 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              onClick={prevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-1 text-center min-w-[140px]">
              <span className="text-[10px] font-black uppercase text-primary block leading-none mb-1">
                Período de Análise
              </span>
              <span className="text-xs font-bold text-white uppercase">
                {format(selectedDate, "MMMM yyyy", { locale: ptBR })}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[9px] font-black uppercase border-white/10 hover:bg-white/5"
            onClick={goToToday}
          >
            Hoje
          </Button>
        </div>

        <div className="flex items-center gap-6 pr-4">
          <div className="text-right">
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1 italic">
              Expectativa p/ Final do Mês
            </p>
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">
                Saldo Projetado:
              </span>
              <span
                className={cn(
                  "text-base font-black tabular-nums",
                  projectedBalance >= 0 ? "text-emerald-400" : "text-rose-500",
                )}
              >
                {formatCurrency(projectedBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/20 border-2 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Scale className="h-12 w-12" />
          </div>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest">
              Lucro Operacional (30%)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-32 bg-white/5" />
            ) : (
              <p className="text-2xl font-black text-primary tabular-nums">
                {formatCurrency(stats.officeRevenue)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card
          onClick={() =>
            setActiveFilter(activeFilter === "RECEITA" ? "TODOS" : "RECEITA")
          }
          className={cn(
            "bg-emerald-500/5 border-emerald-500/10 overflow-hidden relative cursor-pointer transition-all hover:scale-[1.02]",
            activeFilter === "RECEITA" &&
              "ring-2 ring-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20",
          )}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <ArrowUpRight className="h-12 w-12" />
          </div>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">
              Realizado (Receitas)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-32 bg-white/5" />
            ) : (
              <p className="text-2xl font-black text-emerald-400 tabular-nums">
                {formatCurrency(stats.totalReceitas)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card
          onClick={() =>
            setActiveFilter(activeFilter === "DESPESA" ? "TODOS" : "DESPESA")
          }
          className={cn(
            "bg-rose-500/5 border-rose-500/10 overflow-hidden relative cursor-pointer transition-all hover:scale-[1.02]",
            activeFilter === "DESPESA" &&
              "ring-2 ring-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/20",
          )}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <ArrowDownRight className="h-12 w-12" />
          </div>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[10px] font-black uppercase text-rose-400 tracking-widest">
              Realizado (Saídas)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-32 bg-white/5" />
            ) : (
              <p className="text-2xl font-black text-rose-400 tabular-nums">
                {formatCurrency(stats.totalDespesas)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card
          onClick={() =>
            setActiveFilter(activeFilter === "PENDENTE" ? "TODOS" : "PENDENTE")
          }
          className={cn(
            "bg-amber-500/5 border-amber-500/10 overflow-hidden relative cursor-pointer transition-all hover:scale-[1.02]",
            activeFilter === "PENDENTE" &&
              "ring-2 ring-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20",
          )}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Clock className="h-12 w-12" />
          </div>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[10px] font-black uppercase text-amber-400 tracking-widest">
              Provisionado (Entrada)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-32 bg-white/5" />
            ) : (
              <p className="text-2xl font-black text-amber-400 tabular-nums">
                {formatCurrency(stats.pendenteReceita)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Users className="h-12 w-12" />
          </div>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[10px] font-black uppercase text-blue-400 tracking-widest">
              A Repassar (Clientes)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-32 bg-white/5" />
            ) : (
              <p className="text-2xl font-black text-blue-400 tabular-nums">
                {formatCurrency(stats.pendingClientPayouts)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card className="bg-[#0f172a] border-white/5 p-6 h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">
                  Fluxo de Caixa Consolidado
                </h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">
                  Visualização dos últimos 6 meses de operação
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-[9px] font-black uppercase text-slate-400">
                    Receitas
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="text-[9px] font-black uppercase text-slate-400">
                    Despesas
                  </span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="colorReceita"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--primary)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="colorDespesa"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#ffffff05"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#475569"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#020617",
                      border: "1px solid #ffffff10",
                      borderRadius: "12px",
                    }}
                    itemStyle={{ fontSize: "10px", fontWeight: "bold" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorReceita)"
                  />
                  <Area
                    type="monotone"
                    dataKey="despesa"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorDespesa)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
            <CardHeader className="p-5 border-b border-white/5 bg-white/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" /> Disponibilidade
                </CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase h-5">
                  Tempo Real
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {isLoadingAccounts ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-primary" />
                  </div>
                ) : (
                  (bankAccounts || []).slice(0, 3).map((account) => (
                    <div
                      key={account.id}
                      className="p-4 flex items-center justify-between group hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center border border-white/10 shrink-0"
                          style={{
                            backgroundColor: `${account.color || "#F5D030"}10`,
                            color: account.color || "#F5D030",
                          }}
                        >
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-white">
                            {account.name}
                          </p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                            {account.bankName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-white tabular-nums">
                          {formatCurrency(account.balance)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-5 bg-black/20 text-center">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">
                  Patrimônio Líquido Estimado
                </p>
                <p className="text-xl font-black text-primary">
                  {formatCurrency(
                    (bankAccounts || []).reduce(
                      (acc, a) => acc + (a.balance || 0),
                      0,
                    ),
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/financeiro/receitas" className="block group">
              <Card className="bg-[#0f172a] border-white/5 p-4 hover:border-emerald-500/30 transition-all cursor-pointer h-full">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <h4 className="text-[10px] font-black uppercase text-white tracking-widest">
                  Receitas
                </h4>
                <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">
                  Acessar Lista <ArrowRight className="inline h-2 w-2 ml-1" />
                </p>
              </Card>
            </Link>
            <Link href="/dashboard/financeiro/despesas" className="block group">
              <Card className="bg-[#0f172a] border-white/5 p-4 hover:border-rose-500/30 transition-all cursor-pointer h-full">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-3 group-hover:scale-110 transition-transform">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
                <h4 className="text-[10px] font-black uppercase text-white tracking-widest">
                  Despesas
                </h4>
                <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">
                  Acessar Lista <ArrowRight className="inline h-2 w-2 ml-1" />
                </p>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
        <CardHeader className="p-6 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-primary" /> Detalhamento de
              Lançamentos
            </h3>
            <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">
              Exibindo: {activeFilter} ({filteredTitles.length} itens
              encontrados)
            </p>
          </div>
          {activeFilter !== "TODOS" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveFilter("TODOS")}
              className="text-[9px] font-black uppercase text-slate-400 hover:text-white"
            >
              Limpar Filtro
            </Button>
          )}
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/40 border-b border-white/5">
                <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">
                  Descrição / Favorecido
                </th>
                <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500 text-center">
                  Data
                </th>
                <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500 text-right">
                  Valor
                </th>
                <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500 text-center">
                  Status
                </th>
                <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500 text-right">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTitles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <Wallet className="h-12 w-12" />
                      <p className="text-xs font-black uppercase">
                        Nenhum lançamento encontrado para este filtro.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTitles.map((title) => (
                  <tr
                    key={title.id}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white uppercase italic truncate max-w-[250px]">
                          {title.description}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <Users className="h-2.5 w-2.5" />{" "}
                          {title.beneficiaryName || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-white uppercase">
                          {format(
                            title.dueDate instanceof Timestamp
                              ? title.dueDate.toDate()
                              : new Date(title.dueDate),
                            "dd MMM",
                            { locale: ptBR },
                          )}
                        </span>
                        <span className="text-[8px] font-black text-slate-500 uppercase">
                          {format(
                            title.dueDate instanceof Timestamp
                              ? title.dueDate.toDate()
                              : new Date(title.dueDate),
                            "yyyy",
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={cn(
                          "text-xs font-black tabular-nums",
                          title.type === "RECEITA"
                            ? "text-emerald-400"
                            : "text-rose-400",
                        )}
                      >
                        {title.type === "RECEITA" ? "+" : "-"}
                        {formatCurrency(title.value)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        className={cn(
                          "text-[8px] font-black uppercase",
                          title.status === "PAGO"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20",
                        )}
                      >
                        {title.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTitle(title);
                          setIsFormOpen(true);
                        }}
                        className="h-7 w-7 p-0 hover:bg-white/10 text-slate-400 hover:text-white"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20 border-2 p-6 flex flex-col items-center text-center">
          <TrendingUp className="h-8 w-8 text-primary mb-3" />
          <h3 className="text-xs font-black text-white uppercase mb-1">
            Performance Março
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-4">
            65% da meta atingida
          </p>
          <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full w-[65%] rounded-full shadow-[0_0_10px_rgba(245,208,48,0.5)]" />
          </div>
        </Card>

        <Card className="bg-[#0f172a] border-white/5 p-6 flex flex-col items-center text-center">
          <PieChart className="h-8 w-8 text-blue-400 mb-3" />
          <h3 className="text-xs font-black text-white uppercase mb-1">
            Distribuição de Custo
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-4">
            Folha de pagamento (42%)
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-[9px] font-black uppercase text-primary"
          >
            Ver Detalhes
          </Button>
        </Card>

        <Card className="bg-[#0f172a] border-white/5 p-6 flex flex-col items-center text-center">
          <BarChart3 className="h-8 w-8 text-purple-400 mb-3" />
          <h3 className="text-xs font-black text-white uppercase mb-1">
            Crescimento Mensal
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-4">
            +12.5% vs mês anterior
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-[9px] font-black uppercase text-primary"
          >
            Baixar Relatório
          </Button>
        </Card>
      </div>

      <TitleFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelectedTitle(null);
        }}
        title={selectedTitle}
        onDelete={handleDelete}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
      <ReceiptGenerator open={isReceiptOpen} onOpenChange={setIsReceiptOpen} />
    </div>
  );
}
