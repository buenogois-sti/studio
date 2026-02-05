'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Copy, 
  Printer, 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Briefcase,
  Calendar,
  AtSign,
  Smartphone,
  Hash,
  ShieldCheck,
  AlertCircle,
  GraduationCap,
  MessageSquare,
  DollarSign,
  History,
  Activity,
  CheckCircle2,
  Clock,
  Receipt,
  Coins
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Staff, Process, StaffCredit, Log, Reimbursement } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, where, doc } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';

interface StaffDetailsSheetProps {
  staff: Staff | null;
  processes: Process[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleLabels: Record<string, string> = {
  employee: 'Administrativo',
  lawyer: 'Advogado(a)',
  intern: 'Estagiário(a)',
  partner: 'Sócio(a)',
  provider: 'Prestador / Fornecedor',
};

const remunerationLabels: Record<string, string> = {
  SUCUMBENCIA: 'Honorários de Sucumbência',
  PRODUCAO: 'Honorários por Produção',
  QUOTA_LITIS: 'Quota Litis (Êxito)',
  FIXO_MENSAL: 'Valor Fixo Mensal',
  AUDIENCISTA: 'Advogado Audiencista',
};

export function StaffDetailsSheet({ staff, processes, open, onOpenChange }: StaffDetailsSheetProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // Hooks de dados - Sempre no topo para evitar erro #310
  const creditsQuery = useMemoFirebase(
    () => (firestore && staff?.id ? query(collection(firestore, `staff/${staff.id}/credits`), orderBy('date', 'desc')) : null),
    [firestore, staff?.id, open]
  );
  const { data: credits, isLoading: isLoadingCredits } = useCollection<StaffCredit>(creditsQuery);

  const reimbursementsQuery = useMemoFirebase(
    () => (firestore && staff?.id ? query(collection(firestore, 'reimbursements'), where('userId', '==', staff.id), orderBy('requestDate', 'desc')) : null),
    [firestore, staff?.id, open]
  );
  const { data: reimbursements, isLoading: isLoadingReimbursements } = useCollection<Reimbursement>(reimbursementsQuery);

  const logsQuery = useMemoFirebase(
    () => (firestore && staff?.id ? query(collection(firestore, `users/${staff.id}/logs`), orderBy('timestamp', 'desc'), limit(50)) : null),
    [firestore, staff?.id, open]
  );
  const { data: logs, isLoading: isLoadingLogs } = useCollection<Log>(logsQuery);

  const financialSummary = React.useMemo(() => {
    if (!credits) return { paid: 0, available: 0, retained: 0 };
    return credits.reduce((acc, c) => {
      if (c.status === 'PAGO') acc.paid += c.value;
      else if (c.status === 'DISPONIVEL') acc.available += c.value;
      else if (c.status === 'RETIDO') acc.retained += c.value;
      return acc;
    }, { paid: 0, available: 0, retained: 0 });
  }, [credits]);

  const staffProcesses = React.useMemo(() => {
    if (!staff) return [];
    return processes.filter(p => staff.id && (p.leadLawyerId === staff.id || p.responsibleStaffIds?.includes(staff.id)));
  }, [staff, processes]);

  const activeCount = React.useMemo(() => staffProcesses.filter(p => p.status === 'Ativo').length, [staffProcesses]);

  if (!staff) return null;

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const d = typeof date === 'string' ? new Date(date) : date.toDate();
      return format(d, "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
    });
  };

  const InfoRow = ({ 
    icon: Icon, 
    label, 
    value, 
    className = "",
    actionType,
    copyValue
  }: { 
    icon: any, 
    label: string, 
    value?: string, 
    className?: string,
    actionType?: 'email' | 'phone' | 'whatsapp' | 'copy',
    copyValue?: string
  }) => {
    const isInteractive = !!value && !!actionType;
    const getHref = () => {
        if (!value) return undefined;
        const cleanValue = value.replace(/\D/g, '');
        switch(actionType) {
            case 'email': return `mailto:${value}`;
            case 'phone': return `tel:${cleanValue}`;
            case 'whatsapp': return `https://wa.me/${cleanValue}`;
            default: return undefined;
        }
    };
    const href = getHref();

    return (
        <div className={cn(
            "flex items-start gap-3 py-2 group transition-all rounded-lg",
            isInteractive && "cursor-pointer hover:bg-muted/50 -mx-2 px-2",
            className
        )}
        onClick={() => {
            if (actionType === 'copy' && value) {
                copyToClipboard(copyValue || value, label);
            }
        }}
        >
            <div className={cn("mt-0.5 shrink-0 transition-transform", isInteractive && "group-hover:scale-110")}>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
                {href ? (
                    <a href={href} target={actionType === 'whatsapp' ? '_blank' : undefined}>
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] uppercase font-black text-muted-foreground leading-none mb-1 tracking-widest">{label}</span>
                            <span className={cn("text-sm font-medium break-all", !value && "text-muted-foreground italic font-normal", isInteractive && "group-hover:text-primary transition-colors")}>
                                {value || 'Não informado'}
                            </span>
                        </div>
                    </a>
                ) : (
                    <div className="flex flex-col text-left">
                        <span className="text-[10px] uppercase font-black text-muted-foreground leading-none mb-1 tracking-widest">{label}</span>
                        <span className={cn("text-sm font-medium break-all", !value && "text-muted-foreground italic font-normal")}>
                            {value || 'Não informado'}
                        </span>
                    </div>
                )}
            </div>
            {isInteractive && actionType === 'copy' && (
                <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto self-center" />
            )}
        </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl w-full flex flex-col p-0 bg-[#020617] border-border overflow-hidden">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col text-left">
                <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] font-black uppercase bg-primary/10 text-primary border-primary/20">
                        {roleLabels[staff.role]}
                    </Badge>
                </div>
                <SheetTitle className="text-2xl font-headline font-bold text-white">{staff.firstName} {staff.lastName}</SheetTitle>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => window.print()} title="Imprimir">
                    <Printer className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="profile" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 bg-white/5 border-b border-white/5 shrink-0">
            <TabsList className="bg-transparent gap-6 h-12 p-0">
              <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white font-bold h-full px-0">Ficha do Membro</TabsTrigger>
              <TabsTrigger value="financial" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white font-bold h-full px-0">Histórico Financeiro</TabsTrigger>
              <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white font-bold h-full px-0">Monitor de Atividade</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 pb-20">
              <TabsContent value="profile" className="m-0 space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center text-center">
                        <Briefcase className="h-5 w-5 text-emerald-600 mb-2" />
                        <span className="text-2xl font-black text-emerald-700">{activeCount}</span>
                        <span className="text-[10px] font-black uppercase text-emerald-600">Processos Ativos</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex flex-col items-center text-center">
                        <GraduationCap className="h-5 w-5 text-blue-600 mb-2" />
                        <span className="text-2xl font-black text-blue-700">{staffProcesses.length}</span>
                        <span className="text-[10px] font-black uppercase text-blue-600">Total Carteira</span>
                    </div>
                </div>

                {(staff.role === 'lawyer' || staff.role === 'partner' || staff.role === 'provider') && staff.remuneration && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <DollarSign className="h-4 w-4 text-primary" />
                          </div>
                          <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Regra de Negócio</h3>
                      </div>
                      <div className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/20 space-y-4">
                          <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white uppercase tracking-tighter">Modalidade:</span>
                              <Badge className="bg-primary text-primary-foreground font-black">{remunerationLabels[staff.remuneration.type]}</Badge>
                          </div>
                          <Separator className="bg-primary/10" />
                          <div className="grid grid-cols-2 gap-4">
                              {staff.remuneration.type === 'SUCUMBENCIA' && (
                                  <>
                                      <div>
                                          <p className="text-[10px] uppercase font-black text-muted-foreground">Cota Escritório</p>
                                          <p className="text-lg font-black text-white">{staff.remuneration.officePercentage}%</p>
                                      </div>
                                      <div>
                                          <p className="text-[10px] uppercase font-black text-muted-foreground">Cota Advogado</p>
                                          <p className="text-lg font-black text-primary">{staff.remuneration.lawyerPercentage}%</p>
                                      </div>
                                  </>
                              )}
                              {staff.remuneration.type === 'FIXO_MENSAL' && (
                                  <div className="col-span-2">
                                      <p className="text-[10px] uppercase font-black text-muted-foreground">Valor Mensal Fixo</p>
                                      <p className="text-lg font-black text-white">{staff.remuneration.fixedMonthlyValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                  </div>
                              )}
                          </div>
                      </div>
                    </section>
                )}

                <section>
                  <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <ShieldCheck className="h-4 w-4 text-blue-500" />
                      </div>
                      <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Habilitação & Contato</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-white/5 p-6 rounded-2xl border border-white/10">
                      <InfoRow icon={Hash} label="Nº da OAB" value={staff.oabNumber} actionType="copy" />
                      <InfoRow icon={AlertCircle} label="Situação OAB" value={staff.oabStatus} />
                      <Separator className="col-span-full my-2 bg-white/5" />
                      <InfoRow icon={AtSign} label="E-mail" value={staff.email} actionType="email" className="col-span-full" />
                      <InfoRow icon={Smartphone} label="WhatsApp" value={staff.whatsapp} actionType="whatsapp" />
                      <InfoRow icon={Phone} label="Telefone" value={staff.phone} actionType="phone" />
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="financial" className="m-0 space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-1">Total Recebido</p>
                    <p className="text-lg font-black text-white tabular-nums">{financialSummary.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest mb-1">Disponível</p>
                    <p className="text-lg font-black text-white tabular-nums">{financialSummary.available.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <p className="text-[9px] font-black uppercase text-blue-500 tracking-widest mb-1">Retido</p>
                    <p className="text-lg font-black text-white tabular-nums">{financialSummary.retained.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Extrato Consolidado</h3>
                  </div>
                  
                  {isLoadingCredits || isLoadingReimbursements ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reimbursements?.filter(r => r.status === 'SOLICITADO').map(r => (
                        <div key={r.id} className="flex items-center justify-between p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 h-4 border-none bg-blue-500/20 text-blue-400">AGUARDANDO</Badge>
                              <span className="text-[10px] text-muted-foreground font-bold">{format(r.requestDate.toDate(), 'dd/MM/yyyy')}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-200 truncate">{r.description}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-black text-white tabular-nums">{r.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-1 justify-end"><Receipt className="h-2.5 w-2.5" /> REEMBOLSO</p>
                          </div>
                        </div>
                      ))}

                      {credits?.map(credit => (
                        <div key={credit.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={cn(
                                "text-[8px] font-black uppercase px-1.5 h-4 border-none",
                                credit.status === 'PAGO' ? "bg-emerald-500/20 text-emerald-400" :
                                credit.status === 'DISPONIVEL' ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"
                              )}>
                                {credit.status}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-bold">{format(credit.date.toDate(), 'dd/MM/yyyy')}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-200 truncate">{credit.description}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-black text-white tabular-nums">{credit.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-1 justify-end">
                              {credit.type === 'REEMBOLSO' ? <Receipt className="h-2.5 w-2.5" /> : <Coins className="h-2.5 w-2.5" />}
                              {credit.type}
                            </p>
                          </div>
                        </div>
                      ))}

                      {(!credits || credits.length === 0) && (!reimbursements || reimbursements.length === 0) && (
                        <div className="py-20 text-center opacity-30 italic text-sm">Nenhum lançamento financeiro registrado.</div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="m-0 space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Monitor de Atividade</h3>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{logs?.length || 0} Eventos</Badge>
                </div>

                <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/20 before:to-transparent">
                  {isLoadingLogs ? (
                    <div className="space-y-6 pl-12">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg bg-white/5" />)}
                    </div>
                  ) : logs && logs.length > 0 ? (
                    logs.map(log => (
                      <div key={log.id} className="relative flex items-start gap-6 group">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0f172a] border-2 border-border/50 z-10 shadow-sm group-hover:border-primary transition-colors">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex-1 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black uppercase text-primary tracking-widest">{log.action || 'ATIVIDADE'}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {log.timestamp ? format(log.timestamp.toDate(), "dd/MM/yy HH:mm") : 'Agora'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">{log.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center opacity-30 flex flex-col items-center">
                      <History className="h-12 w-12 mb-4 text-slate-500" />
                      <p className="text-sm italic font-medium">Sem histórico de atividades recente.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-white/5 shrink-0 flex items-center justify-between text-[10px] text-muted-foreground mt-auto">
            <div className="flex items-center gap-2 font-bold uppercase tracking-tighter">
                <Calendar className="h-3 w-3 text-primary" />
                <span>Colaborador desde {formatDate(staff.createdAt)}</span>
            </div>
            <div className="font-mono opacity-50">ID: {staff.id}</div>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
