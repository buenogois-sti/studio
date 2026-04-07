"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  X,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Calculator,
  Printer,
  Scale,
  Calendar,
  Clock,
  Users,
  Flame,
  History,
  Trash2,
  ShieldCheck,
  Check,
  DollarSign,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFirebase } from "@/firebase";
import {
  collection,
  Timestamp,
  query,
  orderBy,
  getDocs,
  where,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import type { FinancialTitle, Client, Process } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  EXPENSE_CATEGORIES,
  REVENUE_CATEGORIES,
} from "@/lib/financial-constants";
import {
  createFinancialTitle,
  updateFinancialTitleStatus,
  updateFinancialTitle,
  anticipateFinancialTitles,
} from "@/lib/finance-actions";
import { searchProcesses } from "@/lib/process-actions";
import { searchClients } from "@/lib/client-actions";
import { searchStaff } from "@/lib/staff-actions";
import { searchCorrespondents } from "@/lib/correspondent-actions";

export const titleFormSchema = z.object({
  description: z.string().min(3, "Descrição obrigatória"),
  type: z.enum(["RECEITA", "DESPESA"]),
  origin: z.string(),
  value: z.coerce.number().positive("Valor deve ser positivo"),
  dueDate: z.string().min(1, "Data de vencimento obrigatória"),
  competenceDate: z.string().optional(),
  status: z
    .enum(["PENDENTE", "PAGO", "ATRASADO", "CANCELADO"])
    .default("PENDENTE"),
  paymentMethod: z
    .enum(["PIX", "BOLETO", "CARTAO", "TRANSFERENCIA", "DINHEIRO"])
    .optional(),
  beneficiaryName: z.string().optional(),
  beneficiaryDocument: z.string().optional(),
  pixKey: z.string().optional(),
  notes: z.string().optional(),
  processId: z.string().optional(),
  clientId: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  recurring: z.boolean().default(false),
  months: z.coerce.number().min(1).max(24).default(1),
  installmentType: z.enum(["TOTAL", "PARCELA"]).default("TOTAL"),
});

export function ClientReceiptDialog({
  title,
  client,
  process,
  open,
  onOpenChange,
}: {
  title: FinancialTitle | null;
  client: Client | null;
  process: Process | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [receiptMode, setReceiptMode] = React.useState<
    "REPASSE" | "HONORARIOS"
  >("REPASSE");
  const [feePercentage, setFeePercentage] = React.useState(30);

  React.useEffect(() => {
    if (
      title?.origin === "HONORARIOS_CONTRATUAIS" ||
      title?.origin === "SUCUMBENCIA"
    ) {
      setReceiptMode("HONORARIOS");
    } else {
      setReceiptMode("REPASSE");
    }
  }, [title]);

  if (!title || !client) return null;

  const paymentDate = title.paymentDate
    ? (title.paymentDate as any).toDate()
    : new Date();
  const grossValue = title.value;
  const feeValue = (grossValue * feePercentage) / 100;
  const netValue = grossValue - feeValue;

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl bg-slate-50 text-slate-900 p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Emissão de Recibo de Liquidação</DialogTitle>
          <DialogDescription>
            Documento oficial para prestação de contas com o cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col lg:flex-row h-[90vh]">
          <div className="w-full lg:w-80 bg-slate-900 p-6 text-white shrink-0 print:hidden overflow-y-auto">
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Configurações do Recibo
                </h3>
                <p className="text-[10px] text-slate-400">
                  Ajuste os valores para o cálculo da liquidação.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Modelo de Recibo
                  </label>
                  <Select
                    value={receiptMode}
                    onValueChange={(v: any) => setReceiptMode(v)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REPASSE">
                        Repasse (Com Desconto)
                      </SelectItem>
                      <SelectItem value="HONORARIOS">
                        Apenas Honorários
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {receiptMode === "REPASSE" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-500">
                        Honorários Contratuais (%)
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={feePercentage}
                          onChange={(e) =>
                            setFeePercentage(Number(e.target.value))
                          }
                          className="bg-white/5 border-white/10 text-white pl-10 h-10"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">BRUTO:</span>
                        <span className="text-white">
                          {formatCurrency(grossValue)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-rose-400">
                          DESC. ({feePercentage}%):
                        </span>
                        <span className="text-rose-400">
                          -{formatCurrency(feeValue)}
                        </span>
                      </div>
                      <Separator className="bg-primary/20" />
                      <div className="flex justify-between text-xs font-black">
                        <span className="text-primary">LÍQUIDO:</span>
                        <span className="text-primary">
                          {formatCurrency(netValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8 space-y-4">
                <Button
                  onClick={() => window.print()}
                  className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20"
                >
                  <Printer className="h-4 w-4 mr-2" /> Imprimir Recibo
                </Button>
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    className="w-full text-slate-400 hover:text-white text-[10px] font-bold uppercase"
                  >
                    Fechar
                  </Button>
                </DialogClose>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-white">
            <div
              className="p-12 min-h-full flex flex-col"
              id="receipt-print-area"
            >
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-900 p-2 rounded-xl print:bg-transparent">
                    <img
                      src="/logo.png"
                      alt="Bueno Gois"
                      className="h-12 w-auto print:brightness-0"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                      Bueno Gois Advogados
                    </h2>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1.5">
                      Assessoria e Consultoria Jurídica
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-900 leading-none font-headline tracking-widest">
                    RECIBO
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-tighter">
                    ID OPERAÇÃO: {title.id.substring(0, 8).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-10">
                <div className="bg-slate-100 border-2 border-slate-200 p-8 rounded-3xl flex justify-between items-center">
                  <span className="text-sm font-black uppercase text-slate-500 tracking-widest">
                    {receiptMode === "REPASSE"
                      ? "Valor Líquido da Liquidação"
                      : "Valor Total Recebido"}
                  </span>
                  <span className="text-4xl font-black text-slate-900">
                    {formatCurrency(
                      receiptMode === "REPASSE" ? netValue : grossValue,
                    )}
                  </span>
                </div>

                <div className="space-y-8 text-base leading-relaxed text-justify text-slate-800">
                  <p>
                    Recebemos de{" "}
                    <strong className="text-slate-900 uppercase">
                      Bueno Gois Advogados e Associados
                    </strong>
                    , inscrito sob o CNPJ{" "}
                    <strong className="text-slate-900">
                      12.345.678/0001-90
                    </strong>
                    , a importância supramencionada em favor de{" "}
                    <strong className="text-slate-900 uppercase">
                      {client.firstName} {client.lastName}
                    </strong>
                    , portador(a) do documento{" "}
                    <strong className="text-slate-900">
                      {client.document}
                    </strong>
                    .
                  </p>

                  {receiptMode === "REPASSE" ? (
                    <div className="space-y-6">
                      <p>
                        Referente à liquidação de valores no processo abaixo
                        identificado, com a devida prestação de contas e
                        desconto de honorários contratuais:
                      </p>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase text-slate-500">
                              Detalhamento da Liquidação
                            </span>
                            <Badge
                              variant="outline"
                              className="border-slate-300 text-slate-600 text-[9px] font-black"
                            >
                              EXTRATO
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>
                                (+) Valor Bruto Recebido (Acordo/Sentença)
                              </span>
                              <span className="font-bold">
                                {formatCurrency(grossValue)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm text-rose-600">
                              <span>
                                (-) Honorários Advocatícios Contratuais (
                                {feePercentage}%)
                              </span>
                              <span className="font-bold">
                                -{formatCurrency(feeValue)}
                              </span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between text-lg font-black text-slate-900">
                              <span>(=) VALOR LÍQUIDO DISPONIBILIZADO</span>
                              <span>{formatCurrency(netValue)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p>
                      Referente ao pagamento de{" "}
                      <strong>Honorários Advocatícios</strong> por serviços
                      prestados no acompanhamento do processo identificado
                      abaixo, dando plena e total quitação pelo valor ora
                      recebido.
                    </p>
                  )}

                  {process && (
                    <div className="p-6 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-primary tracking-widest">
                          Vínculo Processual
                        </p>
                        <p className="font-bold text-base">{process.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          AUTOS Nº {process.processNumber || "N/A"}
                        </p>
                      </div>
                      <Scale className="h-10 w-10 text-white/10 shrink-0" />
                    </div>
                  )}

                  <p className="text-sm italic text-slate-500 border-l-4 border-slate-200 pl-4">
                    Pelo que firmo the presente recibo para que produza seus
                    efeitos legais, dando plena, geral e irrevogável quitação do
                    valor recebido nesta data.
                  </p>
                </div>

                <div className="pt-16 flex flex-col items-center gap-12">
                  <p className="text-sm font-bold text-slate-900">
                    São Bernardo do Campo,{" "}
                    {format(
                      paymentDate || new Date(),
                      "dd 'de' MMMM 'de' yyyy",
                      { locale: ptBR },
                    )}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-20 w-full pt-10">
                    <div className="text-center space-y-2">
                      <div className="w-full border-t border-slate-900" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                        Bueno Gois Advogados
                      </p>
                      <p className="text-[8px] text-slate-500 uppercase font-bold">
                        Emitente / Outorgado
                      </p>
                    </div>
                    <div className="text-center space-y-2">
                      <div className="w-full border-t border-slate-900" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="text-[8px] text-slate-500 uppercase font-bold">
                        Recebedor / Outorgante
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-20 pt-6 border-t border-slate-100 text-center space-y-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Bueno Gois Advogados e Associados - OAB/SP 00.000
                </p>
                <p className="text-[8px] text-slate-400">
                  Rua Marechal Deodoro, 1594 - Sala 2, São Bernardo do Campo /
                  SP - (11) 98059-0128
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TitleFormDialog({
  open,
  onOpenChange,
  title,
  onSuccess,
  onDelete,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title?: FinancialTitle | null;
  onSuccess: () => void;
  onDelete?: (title: FinancialTitle, series: boolean) => void;
  defaultDate?: string;
}) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [processSearch, setProcessSearch] = React.useState("");
  const [processResults, setProcessResults] = React.useState<Process[]>([]);
  const [isSearchingProcess, setIsSearchingProcess] = React.useState(false);
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(
    null,
  );
  const [recurrenceHistory, setRecurrenceHistory] = React.useState<
    FinancialTitle[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [beneficiarySearch, setBeneficiarySearch] = React.useState("");
  const [beneficiaryResults, setBeneficiaryResults] = React.useState<any[]>([]);
  const [isSearchingBeneficiary, setIsSearchingBeneficiary] =
    React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const isEdit = !!title && !!title.id;

  const form = useForm<z.infer<typeof titleFormSchema>>({
    resolver: zodResolver(titleFormSchema),
    defaultValues: {
      description: "",
      type: "RECEITA",
      origin: "OUTRAS_DESPESAS",
      status: "PENDENTE",
      value: 0,
      dueDate: format(new Date(), "yyyy-MM-dd"),
      competenceDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "PIX",
      beneficiaryName: "",
      beneficiaryDocument: "",
      pixKey: "",
      notes: "",
      processId: "",
      clientId: "",
      category: "",
      subcategory: "",
      recurring: false,
      months: 1,
      installmentType: "TOTAL",
    },
  });

  React.useEffect(() => {
    if (open && title) {
      let dateVal: Date;
      if (title.dueDate instanceof Timestamp) {
        dateVal = title.dueDate.toDate();
      } else if (
        title.dueDate &&
        typeof title.dueDate === "object" &&
        "seconds" in title.dueDate
      ) {
        dateVal = new Date((title.dueDate as any).seconds * 1000);
      } else {
        dateVal = new Date(title.dueDate as any);
      }

      const competenceVal = title.competenceDate
        ? title.competenceDate instanceof Timestamp
          ? title.competenceDate.toDate()
          : new Date(title.competenceDate)
        : null;

      form.reset({
        description: title.description || "",
        type: title.type || "RECEITA",
        origin: (title.origin as any) || "OUTRAS_DESPESAS",
        status: title.status || "PENDENTE",
        value: title.value || 0,
        dueDate: format(dateVal, "yyyy-MM-dd"),
        competenceDate: competenceVal
          ? format(competenceVal, "yyyy-MM-dd")
          : format(dateVal, "yyyy-MM-dd"),
        paymentMethod: title.paymentMethod || "PIX",
        beneficiaryName: title.beneficiaryName || "",
        beneficiaryDocument: title.beneficiaryDocument || "",
        pixKey: title.pixKey || "",
        notes: title.notes || "",
        processId: title.processId || "",
        clientId: title.clientId || "",
        category: title.category || "",
        subcategory: title.subcategory || "",
        recurring: false,
        months: 1,
        installmentType: "TOTAL",
      });

      if (title.processId && firestore) {
        getDocs(
          query(
            collection(firestore, "processes"),
            where("id", "==", title.processId),
            limit(1),
          ),
        ).then((snap) => {
          if (!snap.empty)
            setSelectedProcess({
              id: snap.docs[0].id,
              ...snap.docs[0].data(),
            } as Process);
        });
      }
    } else if (open && !title) {
      form.reset({
        description: "",
        type: "RECEITA",
        origin: "OUTRAS_DESPESAS",
        status: "PENDENTE",
        value: 0,
        dueDate: defaultDate || format(new Date(), "yyyy-MM-dd"),
        competenceDate: defaultDate || format(new Date(), "yyyy-MM-dd"),
        paymentMethod: "PIX",
        beneficiaryName: "",
        beneficiaryDocument: "",
        pixKey: "",
        notes: "",
        processId: "",
        clientId: "",
        category: "",
        subcategory: "",
        recurring: false,
        months: 1,
        installmentType: "TOTAL",
      });
      setSelectedProcess(null);
    }

    if (open && title?.recurrenceId && firestore) {
      setIsLoadingHistory(true);
      getDocs(
        query(
          collection(firestore, "financial_titles"),
          where("recurrenceId", "==", title.recurrenceId),
          orderBy("dueDate", "asc"),
        ),
      )
        .then((snap) => {
          setRecurrenceHistory(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FinancialTitle),
          );
        })
        .finally(() => setIsLoadingHistory(false));
    } else {
      setRecurrenceHistory([]);
    }
  }, [open, title, form, firestore, defaultDate]);

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

  React.useEffect(() => {
    if (beneficiarySearch.length < 2) {
      setBeneficiaryResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingBeneficiary(true);
      try {
        const [clients, staff, correspondents] = await Promise.all([
          searchClients(beneficiarySearch),
          searchStaff(beneficiarySearch),
          searchCorrespondents(beneficiarySearch),
        ]);

        const combined = [
          ...clients.map((c) => ({
            ...c,
            source: "CLIENTE",
            label: `${c.firstName} ${c.lastName}`,
          })),
          ...staff.map((s) => ({
            ...s,
            source: "COLABORADOR",
            label: `${s.firstName} ${s.lastName}`,
          })),
          ...correspondents.map((c) => ({
            ...c,
            source: "CORRESPONDENTE",
            label: c.name,
          })),
        ];

        setBeneficiaryResults(combined.slice(0, 10));
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingBeneficiary(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [beneficiarySearch]);

  const handleValueChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (val: number) => void,
  ) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const numericValue = Number(rawValue) / 100;
    onChange(numericValue);
  };

  const formatCurrencyValue = (value: number) => {
    if (typeof value !== "number") return "0,00";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleUpdateStatusQuick = async (
    id: string,
    status: "PAGO" | "PENDENTE",
  ) => {
    setIsSaving(true);
    try {
      await updateFinancialTitleStatus(id, status);
      toast({ title: `Título marcado como ${status.toLowerCase()}!` });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (series: boolean) => {
    if (!title || !onDelete) return;
    if (
      !confirm(
        series
          ? "Excluir toda a série de recorrência?"
          : "Excluir este lançamento específico?",
      )
    )
      return;

    setIsDeleting(true);
    try {
      onDelete(title, series);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAnticipate = async () => {
    if (!title?.recurrenceId) return;
    if (!confirm("Deseja liquidar todas as parcelas pendentes desta série?"))
      return;

    setIsSaving(true);
    try {
      const res = await anticipateFinancialTitles(title.recurrenceId);
      toast({
        title: "Série Antecipada!",
        description: `${res.count} títulos liquidados.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectBeneficiary = (item: any) => {
    form.setValue("beneficiaryName", item.label);
    form.setValue(
      "beneficiaryDocument",
      item.document || item.documentCPF || "",
    );
    form.setValue("pixKey", item.bankInfo?.pixKey || "");
    setBeneficiarySearch("");
    setBeneficiaryResults([]);
  };

  const onSubmit = (values: z.infer<typeof titleFormSchema>) => {
    setIsConfirming(true);
  };

  const handleFinalSave = async () => {
    const values = form.getValues();
    setIsSaving(true);
    try {
      const payload: any = {
        ...values,
        dueDate: new Date(values.dueDate + "T12:00:00"),
        competenceDate: values.competenceDate
          ? new Date(values.competenceDate + "T12:00:00")
          : null,
        processId: selectedProcess?.id || "",
        clientId: selectedProcess?.clientId || "",
        updatedAt: serverTimestamp() as any,
      };

      if (isEdit && title) {
        await updateFinancialTitle(title.id, payload);
        toast({ title: "Lançamento Atualizado!" });
      } else {
        if (
          values.recurring &&
          values.installmentType === "TOTAL" &&
          values.months > 1
        ) {
          payload.value = values.value / values.months;
        }

        await createFinancialTitle(payload);
        toast({
          title: values.recurring
            ? "Lançamentos Recorrentes Criados!"
            : "Lançamento realizado!",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao Lançar",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "bg-[#020617] border-white/10 h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl transition-all duration-500",
          title?.recurrenceId ? "sm:max-w-5xl" : "sm:max-w-2xl",
        )}
      >
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0 flex flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-xl font-black font-headline text-white uppercase tracking-tight">
              {isEdit ? "Editar Título Financeiro" : "Novo Título Financeiro"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {isEdit
                ? "Ajuste os dados do lançamento selecionado."
                : "Lançamento manual de entrada ou saída para controle de caixa."}
            </DialogDescription>
          </div>
          {isEdit && title?.status !== "PAGO" && (
            <Button
              onClick={() => handleUpdateStatusQuick(title.id, "PAGO")}
              disabled={isSaving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Liquidar Título
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          <ScrollArea className="flex-1 border-r border-white/5">
            <div className="p-6">
              {isConfirming ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center gap-4 bg-primary/10 p-6 rounded-3xl border border-primary/20">
                    <div
                      className={cn(
                        "h-16 w-16 rounded-2xl flex items-center justify-center text-2xl",
                        form.watch("type") === "RECEITA"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : "bg-rose-500/20 text-rose-500",
                      )}
                    >
                      {form.watch("type") === "RECEITA" ? (
                        <DollarSign className="h-8 w-8" />
                      ) : (
                        <DollarSign className="h-8 w-8 rotate-180" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tight truncate">
                        {form.watch("description")}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={
                            form.watch("type") === "RECEITA"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }
                        >
                          {form.watch("type")}
                        </Badge>
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                          {form.watch("category")} • {form.watch("subcategory")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Valor do Lançamento
                        </span>
                        <span className="text-3xl font-black text-white italic">
                          R${" "}
                          {form.watch("value").toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest">
                            Vencimento
                          </span>
                          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase">
                            <Calendar className="h-3 w-3 text-primary" />
                            {form.watch("dueDate")
                              ? format(
                                  new Date(form.watch("dueDate") + "T12:00:00"),
                                  "dd/MM/yyyy",
                                )
                              : "---"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest">
                            Competência
                          </span>
                          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {form.watch("competenceDate")
                              ? format(
                                  new Date(
                                    form.watch("competenceDate") + "T12:00:00",
                                  ),
                                  "MM/yyyy",
                                )
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Favorecido & Pagamento
                        </span>
                        <div className="text-white font-black uppercase text-sm italic truncate">
                          {form.watch("beneficiaryName") || "NÃO INFORMADO"}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {form.watch("beneficiaryDocument") || "SEM DOCUMENTO"}
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/5 text-emerald-400 border-emerald-500/20 py-1"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1.5" />{" "}
                            {form.watch("paymentMethod")}
                          </Badge>
                        </div>
                        {form.watch("pixKey") && (
                          <div
                            className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 truncate max-w-[120px]"
                            title={form.watch("pixKey")}
                          >
                            PIX: {form.watch("pixKey")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {form.watch("recurring") && (
                    <div className="bg-primary/5 p-5 rounded-2xl border border-dashed border-primary/30 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                          <History className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest block">
                            Projeção de Recorrência
                          </span>
                          <span className="text-white font-black uppercase italic">
                            {form.watch("months")} Parcelas Mensais
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-500 uppercase block">
                          Tipo de Rateio
                        </span>
                        <Badge className="bg-white/10 text-white border-white/5 text-[9px]">
                          {form.watch("installmentType")}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Form {...form}>
                  <form
                    id="title-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-8"
                  >
                    {/* 0. Identificação Básica */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                            Descrição do Lançamento *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Aluguel Mensal, Honorários Processo X..."
                              className="bg-black/40 border-white/10 h-12 text-white font-bold rounded-xl focus:border-primary"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 1. Categorização e Operação */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                              Tipo de Operação *
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-black/40 border-white/10 h-11 focus:border-primary transition-all rounded-xl">
                                  <SelectValue placeholder="Selecione tipo..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#0f172a] border-white/10 text-white shadow-2xl">
                                <SelectItem
                                  value="RECEITA"
                                  className="focus:bg-emerald-500/10 focus:text-emerald-400"
                                >
                                  💰 Entrada (Receita)
                                </SelectItem>
                                <SelectItem
                                  value="DESPESA"
                                  className="focus:bg-rose-500/10 focus:text-rose-400"
                                >
                                  💸 Saída (Despesa)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                              Grupo de Contas / Gestão *
                            </FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(val);
                                form.setValue("origin", val as any);
                                form.setValue("subcategory", ""); // Reset subcategory
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-black/40 border-white/10 h-11 focus:border-primary transition-all rounded-xl">
                                  <SelectValue placeholder="Selecione Categoria..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#0f172a] border-white/10 text-white max-h-[400px]">
                                {Object.entries(
                                  form.watch("type") === "RECEITA"
                                    ? REVENUE_CATEGORIES
                                    : EXPENSE_CATEGORIES,
                                ).map(([key, cat]) => (
                                  <SelectItem key={key} value={key}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="subcategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                              Subcategoria Detalhada{" "}
                              <Badge
                                variant="outline"
                                className="text-[7px] h-4 bg-primary/10 text-primary border-primary/20"
                              >
                                Dinâmico
                              </Badge>
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={!form.watch("category")}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-black/40 border-white/10 h-11 focus:border-primary transition-all rounded-xl">
                                  <SelectValue placeholder="Selecione detalhe..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#0f172a] border-white/10 text-white max-h-[350px]">
                                {(
                                  (form.watch("type") === "RECEITA"
                                    ? REVENUE_CATEGORIES
                                    : EXPENSE_CATEGORIES) as any
                                )[
                                  form.watch("category") as string
                                ]?.subcategories.map((sub: string) => (
                                  <SelectItem key={sub} value={sub}>
                                    {sub}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                              Valor do Título (R$) *
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-black text-sm">
                                  R$
                                </span>
                                <Input
                                  className="bg-black/40 border-white/10 pl-10 h-11 text-base font-black text-white rounded-xl focus:border-primary shadow-inner"
                                  placeholder="0,00"
                                  value={formatCurrencyValue(field.value)}
                                  onChange={(e) =>
                                    handleValueChange(e, field.onChange)
                                  }
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* 3. Datas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-white/5 border border-white/10">
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                              Data de Vencimento *
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                <Input
                                  type="date"
                                  className="bg-[#020617] border-white/10 h-11 pl-10 text-white rounded-xl focus:ring-1 focus:ring-primary"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="competenceDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                              Mês de Competência
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input
                                  type="date"
                                  className="bg-[#020617] border-white/10 h-11 pl-10 text-white rounded-xl focus:ring-1 focus:ring-primary"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Parcelamento / Recorrência */}
                    {!isEdit && (
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                              <History className="h-3.5 w-3.5 text-primary" />{" "}
                              Parcelamento / Recorrência
                            </h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">
                              Habilite para repetir este lançamento mensalmente
                            </p>
                          </div>
                          <Switch
                            checked={form.watch("recurring")}
                            onCheckedChange={(v) =>
                              form.setValue("recurring", v)
                            }
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>

                        {form.watch("recurring") && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-in slide-in-from-top-4 duration-300">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                Base do Lançamento
                              </label>
                              <div className="flex bg-black p-1 rounded-xl border border-white/5 shadow-inner">
                                <button
                                  type="button"
                                  onClick={() =>
                                    form.setValue("installmentType", "TOTAL")
                                  }
                                  className={cn(
                                    "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all duration-300",
                                    form.watch("installmentType") === "TOTAL"
                                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                      : "text-slate-500 hover:text-white",
                                  )}
                                >
                                  VALOR TOTAL
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    form.setValue("installmentType", "PARCELA")
                                  }
                                  className={cn(
                                    "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all duration-300",
                                    form.watch("installmentType") === "PARCELA"
                                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                      : "text-slate-500 hover:text-white",
                                  )}
                                >
                                  VALOR PARCELA
                                </button>
                              </div>
                            </div>

                            <FormField
                              control={form.control}
                              name="months"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                    Número de Parcelas
                                  </FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                      <Input
                                        type="number"
                                        min="1"
                                        max="24"
                                        className="bg-black/40 border-white/10 h-11 pl-10 text-white rounded-xl focus:border-primary shadow-inner"
                                        {...field}
                                      />
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <div className="col-span-1 md:col-span-2 p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between">
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                                  Resumo do Parcelamento
                                </span>
                                <p className="text-[10px] text-slate-400 font-medium uppercase">
                                  Projeção de fluxo baseada nos parâmetros acima
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-black text-white">
                                  {form.watch("months")}x de R${" "}
                                  {form.watch("installmentType") === "TOTAL"
                                    ? formatCurrencyValue(
                                        form.watch("value") /
                                          (form.watch("months") || 1),
                                      )
                                    : formatCurrencyValue(form.watch("value"))}
                                </span>
                                <p className="text-[9px] font-black text-primary uppercase">
                                  Total: R${" "}
                                  {(form.watch("installmentType") === "TOTAL"
                                    ? form.watch("value")
                                    : form.watch("value") *
                                      (form.watch("months") || 1)
                                  ).toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="beneficiaryName"
                          render={({ field }) => (
                            <FormItem className="relative">
                              <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                Favorecido / Beneficiário
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                  <Input
                                    className="h-11 bg-black/40 border-white/10 rounded-xl pl-10 pr-10"
                                    placeholder="Nome do favorecido..."
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      setBeneficiarySearch(e.target.value);
                                    }}
                                  />
                                  {form.watch("beneficiaryName") && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        form.setValue("beneficiaryName", "");
                                        form.setValue(
                                          "beneficiaryDocument",
                                          "",
                                        );
                                        form.setValue("pixKey", "");
                                        setBeneficiarySearch("");
                                      }}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                  {isSearchingBeneficiary && (
                                    <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                                  )}
                                </div>
                              </FormControl>
                              {beneficiaryResults.length > 0 && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                  <ScrollArea className="max-h-[200px]">
                                    <div className="p-2 space-y-1">
                                      {beneficiaryResults.map((res) => (
                                        <button
                                          key={res.id}
                                          type="button"
                                          onClick={() =>
                                            handleSelectBeneficiary(res)
                                          }
                                          className="w-full text-left p-3 hover:bg-white/5 rounded-lg transition-colors flex items-center justify-between group"
                                        >
                                          <div>
                                            <div className="text-xs font-black text-white group-hover:text-primary transition-colors uppercase">
                                              {res.label}
                                            </div>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                              {res.source} •{" "}
                                              {res.document ||
                                                res.documentCPF ||
                                                "SEM DOCUMENTO"}
                                            </div>
                                          </div>
                                          <Check className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                              )}
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                Meio de Pagamento
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-black/40 border-white/10 h-11 rounded-xl">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                                  <SelectItem value="PIX">Pix</SelectItem>
                                  <SelectItem value="BOLETO">Boleto</SelectItem>
                                  <SelectItem value="CARTAO">Cartão</SelectItem>
                                  <SelectItem value="TRANSFERENCIA">
                                    Transferência
                                  </SelectItem>
                                  <SelectItem value="DINHEIRO">
                                    Dinheiro
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <FormField
                          control={form.control}
                          name="beneficiaryDocument"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                Documento do Favorecido
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="h-11 bg-black/40 border-white/10 rounded-xl"
                                  placeholder="CPF ou CNPJ..."
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="pixKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                Chave PIX ou Dados Financeiros
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                                  <Input
                                    className="h-11 bg-black/40 border-white/10 rounded-xl pl-10 text-emerald-400 font-bold"
                                    placeholder="Email, CPF, Celular ou Chave Aleatória..."
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          </ScrollArea>
          {title?.recurrenceId && (
            <div className="w-80 bg-black/20 overflow-hidden flex flex-col shrink-0 animate-in slide-in-from-right duration-500">
              <div className="p-6 border-b border-white/5 bg-white/5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <History className="h-3.5 w-3.5" /> Histórico de Recorrência
                </h4>
                <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">
                  Ciclagem de parcelas vinculadas
                </p>
              </div>
              {recurrenceHistory.some((h) => h.status === "PENDENTE") && (
                <div className="px-4 py-2 border-b border-white/5 bg-primary/5">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    className="w-full text-primary hover:bg-primary/10 font-black uppercase text-[9px] tracking-widest gap-2 h-8"
                    onClick={handleAnticipate}
                  >
                    <Flame className="h-3 w-3" /> Antecipar Pendentes
                  </Button>
                </div>
              )}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {isLoadingHistory ? (
                    <div className="flex flex-col items-center justify-center p-12 gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
                      <span className="text-[9px] font-black text-slate-700 uppercase">
                        Carregando série...
                      </span>
                    </div>
                  ) : (
                    recurrenceHistory.map((h, i) => (
                      <div
                        key={h.id}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border transition-all group flex items-center justify-between",
                          h.id === title.id
                            ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                            : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10",
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={cn(
                                "text-[7px] font-black px-1 rounded uppercase",
                                h.status === "PAGO"
                                  ? "bg-emerald-500/20 text-emerald-500"
                                  : "bg-amber-500/20 text-amber-500",
                              )}
                            >
                              {h.installmentIndex}/{h.totalInstallments}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">
                              {format(
                                h.dueDate instanceof Timestamp
                                  ? h.dueDate.toDate()
                                  : new Date(h.dueDate),
                                "MMM/yyyy",
                                { locale: ptBR },
                              )}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "text-[10px] font-black truncate",
                              h.id === title.id ? "text-primary" : "text-white",
                            )}
                          >
                            R${" "}
                            {h.value.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        {h.status === "PAGO" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-white/5 bg-black/40">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 mb-2">
                  <span>Progresso da Série</span>
                  <span className="text-white">
                    {recurrenceHistory.length > 0
                      ? Math.round(
                          (recurrenceHistory.filter((h) => h.status === "PAGO")
                            .length /
                            recurrenceHistory.length) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-1000"
                    style={{
                      width: `${recurrenceHistory.length > 0 ? (recurrenceHistory.filter((h) => h.status === "PAGO").length / recurrenceHistory.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 gap-3">
          {isEdit && title && !isConfirming && (
            <div className="mr-auto flex items-center gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => handleDelete(false)}
                disabled={isSaving || isDeleting}
                className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 font-bold uppercase text-[10px] h-12 px-4 rounded-xl"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
              {title.recurrenceId && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => handleDelete(true)}
                  disabled={isSaving || isDeleting}
                  className="text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 font-bold uppercase text-[10px] h-12 px-4 rounded-xl"
                >
                  Excluir Série
                </Button>
              )}
            </div>
          )}

          {isConfirming ? (
            <>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setIsConfirming(false)}
                className="text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12 px-8"
              >
                Voltar para Editar
              </Button>
              <Button
                onClick={handleFinalSave}
                disabled={isSaving}
                className="flex-1 bg-emerald-600 text-white font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Confirmar e Lançar Agora
              </Button>
            </>
          ) : (
            <>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12"
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                form="title-form"
                disabled={isSaving || isDeleting}
                className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="mr-2 h-4 w-4" />
                )}
                Revisar Lançamento
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
