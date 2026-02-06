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
  FileText,
  Calendar,
  AtSign,
  Smartphone,
  Hash,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  Building,
  Sparkles
} from 'lucide-react';
import type { Client } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ClientDetailsSheetProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailsSheet({ client, open, onOpenChange }: ClientDetailsSheetProps) {
  const { toast } = useToast();

  if (!client) return null;

  const isPJ = client.clientType === 'Pessoa Jurídica';

  const calculateIntegrity = () => {
    const commonFields = [
      client.firstName, client.document, client.email,
      client.mobile, client.address?.street, client.address?.zipCode,
      client.bankInfo?.pixKey
    ];
    
    const pfFields = [client.lastName, client.rg, client.motherName];
    const pjFields = [client.stateRegistration, client.municipalRegistration];

    const fields = isPJ ? [...commonFields, ...pjFields] : [...commonFields, ...pfFields];
    const filled = fields.filter(f => !!f).length;
    return Math.round((filled / fields.length) * 100);
  };

  const integrity = calculateIntegrity();

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const d = typeof date === 'string' ? new Date(date) : date.toDate();
      return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
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

  const handleCopyAll = () => {
    const summary = `
FICHA CADASTRAL - ${client.firstName} ${client.lastName || ''}
--------------------------------------------------
DADOS ${isPJ ? 'DA EMPRESA' : 'PESSOAIS'}
Tipo: ${client.clientType || 'Não informado'}
${isPJ ? 'CNPJ' : 'CPF'}: ${client.document}
${isPJ ? `Inscrição Estadual: ${client.stateRegistration || 'Não informado'}
Inscrição Municipal: ${client.municipalRegistration || 'Não informado'}` : `RG: ${client.rg || 'Não informado'}
Nome da Mãe: ${client.motherName || 'Não informado'}`}
Área: ${client.legalArea || 'Não informado'}

CONTATO
E-mail: ${client.email}
Celular: ${client.mobile || 'Não informado'}
Telefone: ${client.phone || 'Não informado'}

ENDEREÇO
Rua: ${client.address?.street || 'Não informado'}, ${client.address?.number || 'S/N'}
Complemento: ${client.address?.complement || '-'}
Bairro: ${client.address?.neighborhood || 'Não informado'}
Cidade/UF: ${client.address?.city || 'Não informado'} - ${client.address?.state || ''}
CEP: ${client.address?.zipCode || 'Não informado'}

DADOS BANCÁRIOS
Favorecido: ${client.bankInfo?.bankBeneficiary || `${client.firstName} ${client.lastName || ''}`}
Banco: ${client.bankInfo?.bankName || 'Não informado'}
Agência: ${client.bankInfo?.agency || 'Não informado'}
Conta: ${client.bankInfo?.account || 'Não informado'}
Chave PIX: ${client.bankInfo?.pixKey || 'Não informado'}
--------------------------------------------------
Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}
    `.trim();

    navigator.clipboard.writeText(summary);
    toast({
      title: "Dados Copiados!",
      description: "O resumo formatado foi copiado para sua área de transferência.",
    });
  };

  const handlePrint = () => {
    window.print();
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
                "text-sm font-medium", 
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
            {isInteractive && actionType === 'whatsapp' && (
                <MessageSquare className="h-3 w-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto self-center" />
            )}
        </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[800px] w-full overflow-y-auto print:p-0 print:shadow-none print:border-none">
        <div className="print:block hidden mb-8">
            <h1 className="text-2xl font-bold">FICHA DO CLIENTE</h1>
            <p className="text-sm text-muted-foreground">Bueno Gois Advogados e Associados</p>
            <Separator className="my-4" />
        </div>

        <SheetHeader className="print:hidden">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex flex-col text-left">
                <SheetTitle className="text-2xl font-headline font-bold">{client.firstName} {client.lastName || ''}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                    <Progress value={integrity} className="h-1.5 w-24" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase">{integrity}% Integridade</span>
                </div>
            </div>
            <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="icon" onClick={handleCopyAll} title="Copiar Resumo">
                    <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handlePrint} title="Imprimir">
                    <Printer className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </SheetHeader>

        <div id="print-area" className="space-y-8 mt-8">
          {/* Alerta de Saúde Cadastral */}
          {integrity < 100 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 print:hidden">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-700">Pendências de Cadastro</p>
                      <p className="text-xs text-amber-600 leading-relaxed">Existem campos vazios que podem ser necessários para automações. Recomendamos completar o perfil.</p>
                  </div>
              </div>
          )}

          {/* Sessão: Dados Pessoais / Empresa */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    {isPJ ? <Building className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">{isPJ ? 'Dados da Empresa' : 'Dados Pessoais'}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-muted/20 p-6 rounded-2xl border border-border/50">
                <InfoRow icon={Hash} label={isPJ ? "CNPJ" : "CPF"} value={client.document} actionType="copy" />
                <InfoRow icon={FileText} label="Pessoa" value={client.clientType} />
                
                {isPJ ? (
                  <>
                    <InfoRow icon={FileText} label="Inscrição Estadual" value={client.stateRegistration} actionType="copy" />
                    <InfoRow icon={FileText} label="Inscrição Municipal" value={client.municipalRegistration} actionType="copy" />
                    <InfoRow icon={Building} label="Razão Social" value={client.firstName} className="col-span-full" />
                    <InfoRow icon={Sparkles} label="Nome Fantasia" value={client.lastName} className="col-span-full" />
                  </>
                ) : (
                  <>
                    <InfoRow icon={FileText} label="RG" value={client.rg} actionType="copy" />
                    <InfoRow icon={Briefcase} label="Área Jurídica" value={client.legalArea} />
                    <InfoRow icon={User} label="Nome da Mãe" value={client.motherName} className="col-span-full" />
                    <InfoRow icon={FileText} label="CTPS" value={client.ctps} actionType="copy" />
                    <InfoRow icon={FileText} label="PIS/PASEP" value={client.pis} actionType="copy" />
                  </>
                )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-muted/20 p-6 rounded-2xl border border-border/50">
                <InfoRow icon={AtSign} label="E-mail" value={client.email} actionType="email" className="col-span-full" />
                <InfoRow icon={Smartphone} label="WhatsApp" value={client.mobile} actionType="whatsapp" />
                <InfoRow icon={Phone} label="Telefone" value={client.phone} actionType="phone" />
            </div>
          </section>

          {/* Sessão: Endereço */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-rose-500" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Localização</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-muted/20 p-6 rounded-2xl border border-border/50">
                <InfoRow 
                    icon={MapPin} 
                    label="Logradouro" 
                    value={client.address?.street ? `${client.address.street}, ${client.address.number || 'S/N'}` : undefined} 
                    actionType="copy"
                    className="col-span-full" 
                />
                <InfoRow icon={MapPin} label="Complemento" value={client.address?.complement} />
                <InfoRow icon={MapPin} label="Bairro" value={client.address?.neighborhood} />
                <InfoRow icon={MapPin} label="Cidade / UF" value={client.address?.city ? `${client.address.city} - ${client.address.state || ''}` : undefined} />
                <InfoRow icon={Hash} label="CEP" value={client.address?.zipCode} actionType="copy" />
            </div>
          </section>

          {/* Sessão: Financeiro */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-emerald-500" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Dados p/ Repasses</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-muted/20 p-6 rounded-2xl border border-border/50">
                <InfoRow 
                    icon={User} 
                    label="Favorecido" 
                    value={client.bankInfo?.bankBeneficiary || `${client.firstName} ${client.lastName || ''}`} 
                    actionType="copy"
                    className="col-span-full"
                />
                <InfoRow icon={CreditCard} label="Banco" value={client.bankInfo?.bankName} actionType="copy" />
                <InfoRow icon={CreditCard} label="Agência / Conta" value={client.bankInfo?.agency ? `${client.bankInfo.agency} / ${client.bankInfo.account || ''}` : undefined} actionType="copy" />
                <InfoRow icon={Smartphone} label="Chave PIX" value={client.bankInfo?.pixKey} actionType="copy" className="col-span-full" />
            </div>
          </section>

          <div className="pt-8 text-[10px] text-muted-foreground flex items-center justify-between print:mt-12 border-t">
            <div className="flex items-center gap-2 font-bold uppercase tracking-tighter">
                <Calendar className="h-3 w-3" />
                <span>Cadastrado em {formatDate(client.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
                <ShieldCheck className="h-3 w-3" /> {client.id}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
