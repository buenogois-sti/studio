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
  PieChart
} from 'lucide-react';
import type { Staff, Process } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface StaffDetailsSheetProps {
  staff: Staff | null;
  processes: Process[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleLabels: Record<string, string> = {
  employee: 'Funcionário(a)',
  lawyer: 'Advogado(a)',
  intern: 'Estagiário(a)',
};

const remunerationLabels: Record<string, string> = {
  SUCUMBENCIA: 'Honorários de Sucumbência',
  PRODUCAO: 'Honorários por Produção',
  QUOTA_LITIS: 'Quota Litis (Êxito)',
  FIXO_MENSAL: 'Valor Fixo Mensal',
  AUDIENCISTA: 'Advogado Audiencista',
};

export function StaffDetailsSheet({ staff, processes, open, onOpenChange }: StaffDetailsSheetProps) {
  const { toast } = useToast();

  if (!staff) return null;

  const staffProcesses = processes.filter(p => staff.id && p.responsibleStaffIds?.includes(staff.id));
  const activeCount = staffProcesses.filter(p => p.status === 'Ativo').length;

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

    const Content = () => (
        <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-black text-muted-foreground leading-none mb-1 tracking-widest">{label}</span>
            <span className={cn(
                "text-sm font-medium break-all", 
                !value && "text-muted-foreground italic font-normal",
                isInteractive && "group-hover:text-primary transition-colors"
            )}>
                {value || 'Não informado'}
            </span>
        </div>
    );

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
            <div className={cn(
                "mt-0.5 shrink-0 transition-transform",
                isInteractive && "group-hover:scale-110"
            )}>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {href ? (
                <a href={href} target={actionType === 'whatsapp' ? '_blank' : undefined} className="flex-1">
                    <Content />
                </a>
            ) : (
                <div className="flex-1">
                    <Content />
                </div>
            )}

            {isInteractive && actionType === 'copy' && (
                <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto self-center" />
            )}
        </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl w-full overflow-y-auto bg-[#020617] border-border">
        <SheetHeader>
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex flex-col text-left">
                <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] font-black uppercase bg-primary/10 text-primary border-primary/20">
                        {roleLabels[staff.role]}
                    </Badge>
                </div>
                <SheetTitle className="text-2xl font-headline font-bold text-white">{staff.firstName} {staff.lastName}</SheetTitle>
            </div>
            <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="icon" onClick={() => window.print()} title="Imprimir">
                    <Printer className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-8 mt-8">
          {/* Carga de Trabalho */}
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

          {/* REGRA DE REMUNERAÇÃO (Destaque) */}
          {staff.role === 'lawyer' && staff.remuneration && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Regra de Negócio / Pagamento</h3>
                </div>
                <div className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/20 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-tighter">Modalidade Base:</span>
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
                        {staff.remuneration.type === 'QUOTA_LITIS' && (
                            <div className="col-span-2">
                                <p className="text-[10px] uppercase font-black text-muted-foreground">Participação no Êxito</p>
                                <p className="text-lg font-black text-primary">{staff.remuneration.lawyerPercentage}% <span className="text-xs font-normal text-muted-foreground">após recebimento do cliente</span></p>
                            </div>
                        )}
                        {staff.remuneration.type === 'FIXO_MENSAL' && (
                            <div className="col-span-2">
                                <p className="text-[10px] uppercase font-black text-muted-foreground">Valor Mensal Fixo</p>
                                <p className="text-lg font-black text-white">{staff.remuneration.fixedMonthlyValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                        )}
                        {staff.remuneration.type === 'AUDIENCISTA' && (
                            <div className="col-span-2">
                                <p className="text-[10px] uppercase font-black text-muted-foreground">Pagamento por Audiência</p>
                                <p className="text-lg font-black text-white">{staff.remuneration.valuePerHearing?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                        )}
                        {staff.remuneration.type === 'PRODUCAO' && (
                            <>
                                <div>
                                    <p className="text-[10px] uppercase font-black text-muted-foreground">Valor p/ Peça</p>
                                    <p className="text-sm font-black text-white">{staff.remuneration.activityPrices?.drafting?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-black text-muted-foreground">Valor p/ Diligência</p>
                                    <p className="text-sm font-black text-white">{staff.remuneration.activityPrices?.diligence?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
              </section>
          )}

          {/* Sessão: Profissional */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Habilitação</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-white/5 p-6 rounded-2xl border border-white/10">
                <InfoRow icon={Hash} label="Nº da OAB" value={staff.oabNumber} actionType="copy" />
                <InfoRow icon={AlertCircle} label="Situação OAB" value={staff.oabStatus} />
                <InfoRow icon={AtSign} label="E-mail Corporativo" value={staff.email} actionType="email" className="col-span-1 sm:col-span-2" />
            </div>
          </section>

          {/* Sessão: Contato */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-emerald-500" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Canais de Contato</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-white/5 p-6 rounded-2xl border border-white/10">
                <InfoRow icon={Smartphone} label="WhatsApp" value={staff.whatsapp} actionType="whatsapp" />
                <InfoRow icon={Phone} label="Telefone" value={staff.phone} actionType="phone" />
                <InfoRow icon={MapPin} label="Endereço" value={staff.address?.street} actionType="copy" className="col-span-1 sm:col-span-2" />
            </div>
          </section>

          {/* Sessão: Financeiro (Repasse) */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-purple-500" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Dados p/ Pagamento</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-white/5 p-6 rounded-2xl border border-white/10">
                <InfoRow icon={CreditCard} label="Banco" value={staff.bankInfo?.bankName} actionType="copy" />
                <InfoRow icon={CreditCard} label="Agência / Conta" value={staff.bankInfo?.agency ? `${staff.bankInfo.agency} / ${staff.bankInfo.account || ''}` : undefined} actionType="copy" />
                <InfoRow icon={Smartphone} label="Chave PIX" value={staff.bankInfo?.pixKey} actionType="copy" className="col-span-1 sm:col-span-2" />
            </div>
          </section>

          <div className="pt-8 text-[10px] text-muted-foreground flex items-center justify-between border-t border-white/10">
            <div className="flex items-center gap-2 font-bold uppercase tracking-tighter">
                <Calendar className="h-3 w-3" />
                <span>Colaborador desde {formatDate(staff.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
                ID: {staff.id}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
