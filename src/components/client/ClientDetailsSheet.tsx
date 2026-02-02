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
  Hash
} from 'lucide-react';
import type { Client } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientDetailsSheetProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailsSheet({ client, open, onOpenChange }: ClientDetailsSheetProps) {
  const { toast } = useToast();

  if (!client) return null;

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const d = typeof date === 'string' ? new Date(date) : date.toDate();
      return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const handleCopyAll = () => {
    const summary = `
FICHA CADASTRAL - ${client.firstName} ${client.lastName}
--------------------------------------------------
DADOS PESSOAIS
Tipo: ${client.clientType || 'Não informado'}
CPF/CNPJ: ${client.document}
RG: ${client.rg || 'Não informado'}
Nome da Mãe: ${client.motherName || 'Não informado'}
CTPS: ${client.ctps || 'Não informado'}
PIS/PASEP: ${client.pis || 'Não informado'}
Área: ${client.legalArea || 'Não informado'}

CONTATO
E-mail: ${client.email}
Celular: ${client.mobile || 'Não informado'}
Telefone: ${client.phone || 'Não informado'}
Emergência: ${client.emergencyContact || 'Não informado'}

ENDEREÇO
Rua: ${client.address?.street || 'Não informado'}, ${client.address?.number || 'S/N'}
Complemento: ${client.address?.complement || '-'}
Bairro: ${client.address?.neighborhood || 'Não informado'}
Cidade/UF: ${client.address?.city || 'Não informado'} - ${client.address?.state || ''}
CEP: ${client.address?.zipCode || 'Não informado'}

DADOS BANCÁRIOS
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

  const InfoRow = ({ icon: Icon, label, value, className = "" }: { icon: any, label: string, value?: string, className?: string }) => (
    <div className={`flex items-start gap-3 py-2 ${className}`}>
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">{label}</span>
        <span className="text-sm font-medium">{value || 'Não informado'}</span>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* IMPROVED: Much wider sheet for desktop viewing */}
      <SheetContent className="sm:max-w-3xl w-full overflow-y-auto print:p-0 print:shadow-none print:border-none">
        <div className="print:block hidden mb-8">
            <h1 className="text-2xl font-bold">FICHA DO CLIENTE</h1>
            <p className="text-sm text-muted-foreground">Escritório Bueno Gois Advogados e Associados</p>
            <Separator className="my-4" />
        </div>

        <SheetHeader className="print:hidden">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex flex-col text-left">
                <SheetTitle className="text-2xl font-headline">{client.firstName} {client.lastName}</SheetTitle>
                <SheetDescription>Ficha completa de dados cadastrais</SheetDescription>
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

        <div id="print-area" className="space-y-8 mt-6">
          {/* Sessão: Dados Pessoais */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg uppercase tracking-tight">Dados Pessoais</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-muted/30 p-4 rounded-xl border">
                <InfoRow icon={Hash} label="Documento Principal" value={client.document} />
                <InfoRow icon={FileText} label="Tipo de Cliente" value={client.clientType} />
                <InfoRow icon={FileText} label="RG" value={client.rg} />
                <InfoRow icon={Briefcase} label="Área Jurídica" value={client.legalArea} />
                <InfoRow icon={User} label="Nome da Mãe" value={client.motherName} className="col-span-1 sm:col-span-2" />
                <InfoRow icon={FileText} label="CTPS" value={client.ctps} />
                <InfoRow icon={FileText} label="PIS/PASEP" value={client.pis} />
            </div>
          </section>

          {/* Sessão: Contato */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <Phone className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg uppercase tracking-tight">Canais de Contato</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-muted/30 p-4 rounded-xl border">
                <InfoRow icon={AtSign} label="E-mail" value={client.email} className="col-span-1 sm:col-span-2" />
                <InfoRow icon={Smartphone} label="Celular / WhatsApp" value={client.mobile} />
                <InfoRow icon={Phone} label="Telefone Fixo" value={client.phone} />
                <InfoRow icon={Smartphone} label="Contato Emergência" value={client.emergencyContact} className="col-span-1 sm:col-span-2" />
            </div>
          </section>

          {/* Sessão: Endereço */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg uppercase tracking-tight">Endereço Residencial</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-muted/30 p-4 rounded-xl border">
                <InfoRow icon={MapPin} label="Logradouro" value={`${client.address?.street || ''}, ${client.address?.number || ''}`} className="col-span-1 sm:col-span-2" />
                <InfoRow icon={MapPin} label="Complemento" value={client.address?.complement} />
                <InfoRow icon={MapPin} label="Bairro" value={client.address?.neighborhood} />
                <InfoRow icon={MapPin} label="Cidade" value={client.address?.city} />
                <InfoRow icon={MapPin} label="Estado" value={client.address?.state} />
                <InfoRow icon={Hash} label="CEP" value={client.address?.zipCode} />
            </div>
          </section>

          {/* Sessão: Financeiro */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg uppercase tracking-tight">Dados Financeiros</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-muted/30 p-4 rounded-xl border">
                <InfoRow icon={CreditCard} label="Banco" value={client.bankInfo?.bankName} />
                <InfoRow icon={CreditCard} label="Agência / Conta" value={`${client.bankInfo?.agency || ''} / ${client.bankInfo?.account || ''}`} />
                <InfoRow icon={Smartphone} label="Chave PIX" value={client.bankInfo?.pixKey} className="col-span-1 sm:col-span-2" />
            </div>
          </section>

          <div className="pt-4 text-[10px] text-muted-foreground flex items-center justify-between print:mt-12">
            <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Cliente desde: {formatDate(client.createdAt)}</span>
            </div>
            <span>ID: {client.id}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
