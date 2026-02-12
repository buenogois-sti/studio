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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Copy, 
  Printer, 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Briefcase,
  FileText,
  Calendar,
  AtSign,
  Smartphone,
  Hash,
  ShieldCheck,
  AlertCircle,
  Globe,
  DollarSign,
  History,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Heart
} from 'lucide-react';
import type { Client, FinancialTitle } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';

interface ClientDetailsSheetProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Sub-componente memoizado definido fora para evitar recriação de tipo em cada render
const InfoRow = React.memo(({ 
  icon: Icon, 
  label, 
  value, 
  className = "", 
  actionType,
  copyValue,
  onCopy
}: { 
  icon: any, 
  label: string, 
  value?: string, 
  className?: string,
  actionType?: 'email' | 'phone' | 'whatsapp' | 'copy',
  copyValue?: string,
  onCopy: (text: string, label: string) => void
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
              onCopy(copyValue || value, label);
          }
      }}
      >
          <div className={cn("mt-0.5 shrink-0 transition-transform", isInteractive && "group-hover:scale-110")}>
              <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
              {href ? (
                  <a href={href} target={actionType === 'whatsapp' ? '_blank' : undefined} className="flex-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col text-left">
                          <span className="text-[10px] uppercase font-black text-muted-foreground leading-none mb-1 tracking-widest">{label}</span>
                          <span className={cn("text-sm font-medium truncate", !value && "text-muted-foreground italic font-normal", isInteractive && "group-hover:text-primary transition-colors")}>
                              {value || 'Não informado'}
                          </span>
                      </div>
                  </a>
              ) : (
                  <div className="flex flex-col text-left">
                      <span className="text-[10px] uppercase font-black text-muted-foreground leading-none mb-1 tracking-widest">{label}</span>
                      <span className={cn("text-sm font-medium", !value && "text-muted-foreground italic font-normal")}>
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
});
InfoRow.displayName = 'InfoRow';

export const ClientDetailsSheet = React.memo(function ClientDetailsSheet({ client, open, onOpenChange }: ClientDetailsSheetProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const titlesQuery = useMemoFirebase(
    () => (firestore && client?.id ? query(
      collection(firestore, 'financial_titles'), 
      where('clientId', '==', client.id),
      orderBy('dueDate', 'desc')
    ) : null),
    [firestore, client?.id] // Removido 'open' para manter query estável durante transições
  );
  const { data: titles, isLoading: isLoadingFinance } = useCollection<FinancialTitle>(titlesQuery);

  const financialStats = React.useMemo(() => {
    if (!titles) return { total: 0, paid: 0, pending: 0, overdue: 0 };
    const now = startOfDay(new Date());
    return titles.reduce((acc, t) => {
      const val = t.value || 0;
      acc.total += val;
      if (t.status === 'PAGO') {
        acc.paid += val;
      } else {
        acc.pending += val;
        const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate as any);
        if (isBefore(dueDate, now)) acc.overdue += val;
      }
      return acc;
    }, { total: 0, paid: 0, pending: 0, overdue: 0 });
  }, [titles]);

  const handleCopy = React.useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
    });
  }, [toast]);

  if (!client) return null;

  const isPJ = client.clientType === 'Pessoa Jurídica';

  const integrity = React.useMemo(() => {
    const commonFields = [
      client.firstName, client.document, client.email,
      client.mobile, client.address?.street, client.address?.zipCode,
      client.bankInfo?.pixKey
    ];
    
    const pfFields = [client.lastName, client.rg, client.motherName, client.nationality, client.civilStatus, client.profession];
    const pjFields = [client.stateRegistration, client.municipalRegistration];

    const fields = isPJ ? [...commonFields, ...pjFields] : [...commonFields, ...pfFields];
    const filled = fields.filter(f => !!f).length;
    return Math.round((filled / fields.length) * 100);
  }, [client, isPJ]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl w-full p-0 flex flex-col bg-[#020617] border-border overflow-hidden shadow-2xl">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col text-left">
                <SheetTitle className="text-2xl font-headline font-bold text-white">{client.firstName} {client.lastName || ''}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                    <Progress value={integrity} className="h-1.5 w-24" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase">{integrity}% Integridade</span>
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => window.print()} title="Imprimir" className="h-10 w-10">
                    <Printer className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="profile" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 bg-white/5 border-b border-white/5 shrink-0">
            <TabsList className="bg-transparent gap-6 h-12 p-0">
              <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white font-bold h-full px-0">Ficha Cadastral</TabsTrigger>
              <TabsTrigger value="financial" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white font-bold h-full px-0">Dados Financeiros</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 pb-20">
              <TabsContent value="profile" className="m-0 space-y-8 animate-in fade-in duration-300">
                {integrity < 100 && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-amber-200">Cadastro Incompleto</p>
                            <p className="text-[10px] text-amber-400/70 leading-relaxed uppercase font-bold">Preencha RG, CPF e Endereço para habilitar automação de documentos.</p>
                        </div>
                    </div>
                )}

                <section>
                  <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          {isPJ ? <Building className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                      </div>
                      <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">{isPJ ? 'Dados da Empresa' : 'Dados Pessoais'}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-white/5 p-6 rounded-2xl border border-white/10">
                      <InfoRow icon={Hash} label={isPJ ? "CNPJ" : "CPF"} value={client.document} actionType="copy" onCopy={handleCopy} />
                      <InfoRow icon={FileText} label="Pessoa" value={client.clientType} onCopy={handleCopy} />
                      {isPJ ? (
                        <>
                          <InfoRow icon={FileText} label="Inscrição Estadual" value={client.stateRegistration} actionType="copy" onCopy={handleCopy} />
                          <InfoRow icon={Building} label="Razão Social" value={client.firstName} className="col-span-full" onCopy={handleCopy} />
                        </>
                      ) : (
                        <>
                          <InfoRow icon={Globe} label="Nacionalidade" value={client.nationality} onCopy={handleCopy} />
                          <InfoRow icon={Heart} label="Estado Civil" value={client.civilStatus} onCopy={handleCopy} />
                          <InfoRow icon={Briefcase} label="Profissão" value={client.profession} className="col-span-full" onCopy={handleCopy} />
                          <InfoRow icon={FileText} label="RG" value={client.rg} actionType="copy" onCopy={handleCopy} />
                          <InfoRow icon={User} label="Nome da Mãe" value={client.motherName} className="col-span-full" onCopy={handleCopy} />
                        </>
                      )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Smartphone className="h-4 w-4 text-blue-500" />
                      </div>
                      <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Canais de Contato</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-white/5 p-6 rounded-2xl border border-white/10">
                      <InfoRow icon={AtSign} label="E-mail" value={client.email} actionType="email" className="col-span-full" onCopy={handleCopy} />
                      <InfoRow icon={Smartphone} label="WhatsApp" value={client.mobile} actionType="whatsapp" onCopy={handleCopy} />
                      <InfoRow icon={Phone} label="Telefone" value={client.phone} actionType="phone" onCopy={handleCopy} />
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-rose-500" />
                      </div>
                      <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Localização</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-white/5 p-6 rounded-2xl border border-white/10">
                      <InfoRow 
                          icon={MapPin} 
                          label="Logradouro" 
                          value={client.address?.street ? `${client.address.street}, ${client.address.number || 'S/N'}` : undefined} 
                          actionType="copy"
                          className="col-span-full" 
                          onCopy={handleCopy}
                      />
                      <InfoRow icon={MapPin} label="Bairro" value={client.address?.neighborhood} onCopy={handleCopy} />
                      <InfoRow icon={MapPin} label="Cidade / UF" value={client.address?.city ? `${client.address.city} - ${client.address.state || ''}` : undefined} onCopy={handleCopy} />
                      <InfoRow icon={Hash} label="CEP" value={client.address?.zipCode} actionType="copy" onCopy={handleCopy} />
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="financial" className="m-0 space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-1">Pago p/ Cliente</p>
                    <p className="text-lg font-black text-white tabular-nums">{financialStats.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest mb-1">Em Aberto</p>
                    <p className="text-lg font-black text-white tabular-nums">{financialStats.pending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <p className="text-[9px] font-black uppercase text-rose-500 tracking-widest mb-1">Atrasado</p>
                    <p className="text-lg font-black text-white tabular-nums">{financialStats.overdue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                </div>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-emerald-500" />
                      </div>
                      <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Dados p/ Repasses Bancários</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-white/5 p-6 rounded-2xl border border-white/10">
                      <InfoRow 
                          icon={User} 
                          label="Favorecido" 
                          value={client.bankInfo?.bankBeneficiary || `${client.firstName} ${client.lastName || ''}`} 
                          actionType="copy"
                          className="col-span-full"
                          onCopy={handleCopy}
                      />
                      <InfoRow icon={CreditCard} label="Banco" value={client.bankInfo?.bankName} actionType="copy" onCopy={handleCopy} />
                      <InfoRow icon={CreditCard} label="Agência / Conta" value={client.bankInfo?.agency ? `${client.bankInfo.agency} / ${client.bankInfo.account || ''}` : undefined} actionType="copy" onCopy={handleCopy} />
                      <InfoRow icon={Smartphone} label="Chave PIX" value={client.bankInfo?.pixKey} actionType="copy" className="col-span-full" onCopy={handleCopy} />
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Extrato Financeiro do Cliente</h3>
                  </div>
                  
                  {isLoadingFinance ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)}
                    </div>
                  ) : titles && titles.length > 0 ? (
                    <div className="space-y-3">
                      {titles.map(t => {
                        const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate as any);
                        const isOverdue = t.status !== 'PAGO' && isBefore(dueDate, startOfDay(new Date()));
                        return (
                          <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={cn(
                                  "text-[8px] font-black uppercase px-1.5 h-4 border-none",
                                  t.status === 'PAGO' ? "bg-emerald-500/20 text-emerald-400" :
                                  isOverdue ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                                )}>{isOverdue ? 'ATRASADO' : t.status}</Badge>
                                <span className="text-[10px] text-muted-foreground font-bold">{format(dueDate, 'dd/MM/yy')}</span>
                              </div>
                              <p className="text-sm font-bold text-slate-200 truncate">{t.description}</p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-sm font-black text-white tabular-nums">{t.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                              <p className="text-[9px] text-primary font-black uppercase tracking-widest">{t.origin}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-30 italic text-sm text-slate-400">Nenhum lançamento financeiro registrado.</div>
                  )}
                </section>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-white/5 shrink-0 flex items-center justify-between text-[10px] text-muted-foreground mt-auto">
            <div className="flex items-center gap-2 font-bold uppercase tracking-tighter">
                <Calendar className="h-3 w-3 text-primary" />
                <span>Cliente desde {format(typeof client.createdAt === 'string' ? new Date(client.createdAt) : client.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
            <div className="font-mono opacity-50">ID: {client.id}</div>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
});
ClientDetailsSheet.displayName = 'ClientDetailsSheet';
