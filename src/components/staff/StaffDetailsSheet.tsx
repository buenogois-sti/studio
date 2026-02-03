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
  GraduationCap
} from 'lucide-react';
import type { Staff, Process } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

  const handleCopyAll = () => {
    const summary = `
DADOS DO COLABORADOR - ${staff.firstName} ${staff.lastName}
--------------------------------------------------
PERFIL PROFISSIONAL
Cargo: ${roleLabels[staff.role] || staff.role}
OAB: ${staff.oabNumber || 'N/A'} (${staff.oabStatus || 'N/A'})
E-mail: ${staff.email}

CONTATO
WhatsApp: ${staff.whatsapp || 'Não informado'}
Telefone: ${staff.phone || 'Não informado'}

ENDEREÇO
Logradouro: ${staff.address?.street || 'Não informado'}

DADOS BANCÁRIOS
Banco: ${staff.bankInfo?.bankName || 'Não informado'}
Agência: ${staff.bankInfo?.agency || 'Não informado'}
Conta: ${staff.bankInfo?.account || 'Não informado'}
Chave PIX: ${staff.bankInfo?.pixKey || 'Não informado'}
--------------------------------------------------
Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}
    `.trim();

    navigator.clipboard.writeText(summary);
    toast({
      title: "Dados Copiados!",
      description: "O resumo formatado foi copiado para sua área de transferência.",
    });
  };

  const InfoRow = ({ icon: Icon, label, value, className = "" }: { icon: any, label: string, value?: string, className?: string }) => (
    <div className={`flex items-start gap-3 py-2 ${className}`}>
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-black text-muted-foreground leading-none mb-1 tracking-widest">{label}</span>
        <span className={cn("text-sm font-medium", !value && "text-muted-foreground italic font-normal")}>{value || 'Não informado'}</span>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl w-full overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex flex-col text-left">
                <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] font-black uppercase bg-primary/10 text-primary border-primary/20">
                        {roleLabels[staff.role]}
                    </Badge>
                </div>
                <SheetTitle className="text-2xl font-headline font-bold">{staff.firstName} {staff.lastName}</SheetTitle>
            </div>
            <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="icon" onClick={handleCopyAll} title="Copiar Resumo">
                    <Copy className="h-4 w-4" />
                </Button>
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

          {/* Sessão: Profissional */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Dados Profissionais</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 bg-muted/20 p-6 rounded-2xl border border-border/50">
                <InfoRow icon={Hash} label="Nº da OAB" value={staff.oabNumber} />
                <InfoRow icon={AlertCircle} label="Situação OAB" value={staff.oabStatus} />
                <InfoRow icon={AtSign} label="E-mail Corporativo" value={staff.email} className="col-span-1 sm:col-span-2" />
            </div>
          </section>

          {/* Sessão: Contato */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-blue-500" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Canais de Contato</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 bg-muted/20 p-6 rounded-2xl border border-border/50">
                <InfoRow icon={Smartphone} label="WhatsApp / Celular" value={staff.whatsapp} />
                <InfoRow icon={Phone} label="Telefone Fixo" value={staff.phone} />
                <InfoRow icon={MapPin} label="Endereço" value={staff.address?.street} className="col-span-1 sm:col-span-2" />
            </div>
          </section>

          {/* Sessão: Financeiro */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-emerald-500" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Dados Bancários para Repasse</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 bg-muted/20 p-6 rounded-2xl border border-border/50">
                <InfoRow icon={CreditCard} label="Banco" value={staff.bankInfo?.bankName} />
                <InfoRow icon={CreditCard} label="Agência / Conta" value={staff.bankInfo?.agency ? `${staff.bankInfo.agency} / ${staff.bankInfo.account || ''}` : undefined} />
                <InfoRow icon={Smartphone} label="Chave PIX" value={staff.bankInfo?.pixKey} className="col-span-1 sm:col-span-2" />
            </div>
          </section>

          <div className="pt-8 text-[10px] text-muted-foreground flex items-center justify-between border-t">
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

import { Badge } from '../ui/badge';
