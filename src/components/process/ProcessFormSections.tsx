
'use client';

import React, { useState } from 'react';
import { 
  Building, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Users, 
  Percent,
  UserPlus,
  Scale,
  LayoutGrid,
  AtSign,
  Smartphone,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  MapPin,
  FileText,
  Search,
  Loader2,
  Mail,
  Phone,
  Gavel,
  Calendar,
  Clock
} from 'lucide-react';
import { Control, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { ClientSearchInput } from './ClientSearchInput';
import { ClientCreationModal } from './ClientCreationModal';
import { cn } from '@/lib/utils';
import type { Client, Staff } from '@/lib/types';
import type { ProcessFormValues } from '@/hooks/use-process-form';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '../ui/separator';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  isOptional?: boolean;
}

export function SectionHeader({ icon, title, description, isOptional }: SectionHeaderProps) {
  return (
    <div className="space-y-2 border-b border-white/5 pb-4 mb-6 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">{title}</h3>
          {isOptional && <p className="text-[9px] text-muted-foreground font-bold uppercase">Opcional</p>}
        </div>
      </div>
      {description && <p className="text-xs text-slate-400 ml-11 font-medium">{description}</p>}
    </div>
  );
}

// STEP 1: CLIENTS
interface ClientsSectionProps {
  control: Control<ProcessFormValues>;
  onClientSelect: (client: Client) => void;
}

export function ClientsSection({ control, onClientSelect }: ClientsSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { fields: secondaryFields, append: addSecondary, remove: removeSecondary } = useFieldArray<any>({
    control,
    name: 'secondaryClientIds',
  });

  const clientId = useWatch({ control, name: 'clientId' });
  const hasMainClient = !!clientId;

  const handleClientCreated = (client: Client) => {
    onClientSelect(client);
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <SectionHeader 
        icon={<Users className="h-4 w-4" />} 
        title="Partes do Processo"
        description="Identifique o cliente principal e, se aplicável, co-autores do processo"
      />
      
      <div className={cn(
        "space-y-6 p-8 rounded-3xl border-2 transition-all duration-500",
        hasMainClient 
          ? "bg-emerald-500/[0.03] border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.05)]" 
          : "bg-white/[0.02] border-white/5"
      )}>
        <FormField
          control={control}
          name="clientRole"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Polo Processual *</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-12 bg-black/40 border-white/10 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Selecione o papel do cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Polo Ativo">Polo Ativo (Autor/Reclamante)</SelectItem>
                    <SelectItem value="Polo Passivo">Polo Passivo (Réu/Reclamado)</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between mb-1">
                <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Cliente Principal *</FormLabel>
                {hasMainClient && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1 text-[9px] font-black h-5">
                    <CheckCircle2 className="h-3 w-3" /> SELECIONADO
                  </Badge>
                )}
              </div>
              <FormControl>
                <ClientSearchInput 
                  selectedClientId={field.value} 
                  onSelect={onClientSelect}
                  onCreateNew={() => setShowCreateModal(true)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {hasMainClient && (
          <div className="space-y-4 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
              <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Co-autores / Litisconsortes</FormLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addSecondary({ id: '' })}
                className="h-8 text-[10px] font-black uppercase text-primary hover:bg-primary/10"
              >
                 UserPlus className="h-3 w-3 mr-1.5" /> Adicionar Outro
              </Button>
            </div>

            <div className="grid gap-3">
              {secondaryFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300 animate-in zoom-in-95">
                  <div className="flex-1">
                    <FormField
                      control={control}
                      name={`secondaryClientIds.${index}.id` as any}
                      render={({ field: subField }) => (
                        <ClientSearchInput 
                          selectedClientId={subField.value} 
                          onSelect={(c) => subField.onChange(c.id)} 
                        />
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSecondary(index)}
                    className="text-rose-500 hover:bg-rose-500/10 shrink-0 h-10 w-10 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ClientCreationModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        onClientCreated={handleClientCreated}
      />
    </div>
  );
}

// STEP 2: DEFENDANTS
interface PartiesSectionProps {
  control: Control<ProcessFormValues>;
  partyFields: any[];
  onAddParty: () => void;
  onRemoveParty: (index: number) => void;
}

export function PartiesSection({ control, partyFields, onAddParty, onRemoveParty }: PartiesSectionProps) {
  const { setValue, getValues } = useFormContext<ProcessFormValues>();
  const [isSearchingCep, setIsSearchingCep] = useState<number | null>(null);
  const { toast } = useToast();

  const handleOpposingCepSearch = async (index: number) => {
    const cep = (getValues(`opposingParties.${index}.cep` as any) as string)?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) {
      toast({ variant: 'destructive', title: 'CEP Inválido' });
      return;
    }

    setIsSearchingCep(index);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) {
        toast({ variant: 'destructive', title: 'CEP não encontrado' });
      } else {
        const address = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
        setValue(`opposingParties.${index}.address` as any, address, { shouldDirty: true });
        toast({ title: 'Endereço localizado!' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao buscar CEP' });
    } finally {
      setIsSearchingCep(null);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <SectionHeader 
        icon={<Scale className="h-4 w-4" />} 
        title="Polo Passivo (Réus)"
        description="Identifique todas as empresas ou pessoas físicas processadas"
        isOptional
      />

      <div className="space-y-6 bg-white/[0.02] p-8 rounded-3xl border-2 border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Lista de Réus</FormLabel>
            {partyFields.length > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black">
                {partyFields.length}
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddParty}
            className="h-9 text-[10px] font-black uppercase text-primary border-primary/20 hover:bg-primary/10"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo Réu
          </Button>
        </div>

        <div className="grid gap-4">
          {partyFields.length > 0 ? (
            partyFields.map((field, index) => (
              <div key={field.id} className="p-6 rounded-2xl border border-white/10 bg-black/40 hover:border-primary/40 transition-all duration-300 space-y-6 animate-in slide-in-from-right-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name={`opposingParties.${index}.name` as any}
                      render={({ field: nameField }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-black text-primary tracking-widest">
                            Razão Social / Nome Completo *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Digite o nome oficial..."
                              className="h-11 bg-black/20 border-white/10"
                              onKeyDown={(e) => e.stopPropagation()}
                              {...nameField}
                              value={nameField.value as any}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`opposingParties.${index}.document` as any}
                      render={({ field: docField }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                            CNPJ / CPF
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="00.000.000/0000-00"
                              className="h-11 bg-black/20 border-white/10 font-mono"
                              onKeyDown={(e) => e.stopPropagation()}
                              {...docField}
                              value={docField.value as any}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveParty(index)}
                    className="mt-7 text-rose-500 hover:bg-rose-500/10 h-10 w-10 rounded-xl shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name={`opposingParties.${index}.email` as any}
                    render={({ field: emailField }) => (
                      <FormItem>
                        <FormLabel className="text-[9px] uppercase font-bold text-slate-500">Email Jurídico / RH</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                            <Input 
                              placeholder="juridico@empresa.com" 
                              className="pl-10 h-10 text-xs bg-black/20" 
                              {...emailField} 
                              onKeyDown={(e) => e.stopPropagation()} 
                              value={emailField.value as any}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`opposingParties.${index}.phone` as any}
                    render={({ field: phoneField }) => (
                      <FormItem>
                        <FormLabel className="text-[9px] uppercase font-bold text-slate-500">Telefone</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                            <Input 
                              placeholder="(00) 0000-0000" 
                              className="pl-10 h-10 text-xs bg-black/20" 
                              {...phoneField} 
                              onKeyDown={(e) => e.stopPropagation()} 
                              value={phoneField.value as any}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-1 space-y-2">
                    <FormField
                      control={control}
                      name={`opposingParties.${index}.cep` as any}
                      render={({ field: cepField }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] uppercase font-bold text-slate-500">CEP</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="00000-000" 
                                className="h-10 pr-10 text-xs bg-black/20" 
                                {...cepField} 
                                onKeyDown={(e) => e.stopPropagation()} 
                                maxLength={9}
                                value={cepField.value as any}
                              />
                              <button 
                                type="button" 
                                onClick={() => handleOpposingCepSearch(index)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform"
                              >
                                {isSearchingCep === index ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <FormField
                      control={control}
                      name={`opposingParties.${index}.address` as any}
                      render={({ field: addrField }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] uppercase font-bold text-slate-500">Endereço Completo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                              <Textarea 
                                placeholder="Rua, número, bairro, cidade - UF..." 
                                className="pl-10 min-h-[80px] text-xs bg-black/20 resize-none pt-2" 
                                {...addrField} 
                                onKeyDown={(e) => e.stopPropagation()} 
                                value={addrField.value as any}
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={control}
                  name={`opposingParties.${index}.observation` as any}
                  render={({ field: obsField }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] uppercase font-bold text-slate-500">Observações do Réu</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Faz parte do grupo econômico X..." 
                          className="h-10 text-xs bg-black/20" 
                          {...obsField} 
                          onKeyDown={(e) => e.stopPropagation()} 
                          value={obsField.value as any}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-3xl text-slate-500 space-y-3">
              <div className="h-12 w-12 rounded-full bg-white/[0.02] flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6 opacity-20" />
              </div>
              <p className="text-sm font-medium italic">Nenhum réu adicionado ao polo passivo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// STEP 3: IDENTIFICATION
export function IdentificationSection({ control }: { control: Control<ProcessFormValues> }) {
  const name = useWatch({ control, name: 'name' });
  const legalArea = useWatch({ control, name: 'legalArea' });
  const { setValue } = useFormContext<ProcessFormValues>();
  const isValid = !!name && !!legalArea;

  const formatCurrencyBRL = (value?: number | string) => {
    if (value === null || value === undefined || value === '') return '';
    const numericValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^\d.-]/g, ''));
    if (isNaN(numericValue)) return '';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numericValue);
  };

  const handleCurrencyChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const numericValue = Number(digits) / 100;
    setValue('caseValue', Number.isNaN(numericValue) ? 0 : numericValue, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <SectionHeader 
        icon={<LayoutGrid className="h-4 w-4" />} 
        title="Dados do Processo"
        description="Informações essenciais de identificação do caso"
      />

      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-6 p-8 rounded-3xl border-2 transition-all duration-500",
        isValid 
          ? "bg-blue-500/[0.03] border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.05)]" 
          : "bg-white/[0.02] border-white/5"
      )}>
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Título do Processo *</FormLabel>
                {name && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
              </div>
              <FormControl>
                <Input
                  placeholder="Ex: Reclamatória Trabalhista - João Silva"
                  className="h-12 bg-black/40 border-white/10 text-base font-bold focus:border-primary transition-all"
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Status Operacional *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 bg-black/40 border-white/10">
                    <SelectValue placeholder="Defina o status..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-[#0f172a] border-white/10">
                  <SelectItem value="Ativo">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-emerald-500 rounded-full" /> Ativo
                    </span>
                  </SelectItem>
                  <SelectItem value="Pendente">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-amber-500 rounded-full" /> Pendente
                    </span>
                  </SelectItem>
                  <SelectItem value="Arquivado">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-slate-500 rounded-full" /> Arquivado
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="legalArea"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Área Jurídica *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 bg-black/40 border-white/10">
                    <SelectValue placeholder="Tipo de Ação..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-[#0f172a] border-white/10">
                  <SelectItem value="Trabalhista">Trabalhista</SelectItem>
                  <SelectItem value="Cível">Cível</SelectItem>
                  <SelectItem value="Criminal">Criminal</SelectItem>
                  <SelectItem value="Tributário">Tributário</SelectItem>
                  <SelectItem value="Previdenciário">Previdenciário</SelectItem>
                  <SelectItem value="Família">Família</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="processNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Número CNJ</FormLabel>
              <FormControl>
                <Input 
                  placeholder="0000000-00.0000.0.00.0000" 
                  className="h-11 font-mono text-sm bg-black/40 border-white/10 tracking-widest" 
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field} 
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="caseValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Valor da Causa (R$)</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-black text-sm">R$</span>
                  <Input 
                    type="text"
                    inputMode="decimal"
                    className="h-11 bg-black/40 border-white/10 pl-10 font-bold text-white"
                    onKeyDown={(e) => e.stopPropagation()}
                    value={formatCurrencyBRL(field.value)}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

// STEP 4: COURT
export function CourtSection({ control }: { control: Control<ProcessFormValues> }) {
  const court = useWatch({ control, name: 'court' });
  const hasLocation = !!court;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <SectionHeader 
        icon={<Building className="h-4 w-4" />} 
        title="Juízo e Localização"
        description="Localização do tribunal ou fórum responsável"
        isOptional
      />

      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-6 p-8 rounded-3xl border-2 transition-all duration-500",
        hasLocation 
          ? "bg-purple-500/[0.03] border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.05)]" 
          : "bg-white/[0.02] border-white/5"
      )}>
        <div className="md:col-span-2">
          <FormField
            control={control}
            name="court"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-1">
                  <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Pesquisar Fórum / Comarca</FormLabel>
                  {hasLocation && <CheckCircle2 className="h-3 w-3 text-purple-400" />}
                </div>
                <FormControl>
                  <LocationSearch
                    value={field.value || ''}
                    onSelect={(val) => field.onChange(val)}
                    placeholder="Digite o nome do fórum..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="courtBranch"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Vara / Câmara / Turma</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: 2ª Vara do Trabalho de São Bernardo do Campo" 
                  className="h-11 bg-black/40 border-white/10" 
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field} 
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="courtWebsite"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Link de Acompanhamento (Tribunal)</FormLabel>
              <FormControl>
                <Input 
                  type="url"
                  placeholder="https://pje.trt2.jus.br/pjekz/..." 
                  className="h-11 bg-black/40 border-white/10 font-mono text-[10px]" 
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field} 
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

// STEP 5: TEAM
interface TeamSectionProps {
  control: Control<ProcessFormValues>;
  staff: Staff[];
  teamFields: any[];
  onAddMember: () => void;
  onRemoveMember: (index: number) => void;
}

export function TeamSection({ control, staff, teamFields, onAddMember, onRemoveMember }: TeamSectionProps) {
  const lawyers = staff.filter((s) => s.role === 'lawyer' || s.role === 'partner');
  const leadLawyerId = useWatch({ control, name: 'leadLawyerId' });
  const hasLeadLawyer = !!leadLawyerId;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <SectionHeader 
        icon={<ShieldCheck className="h-4 w-4" />} 
        title="Equipe Responsável"
        description="Defina o advogado líder e membros de apoio para este processo"
      />

      <div className={cn(
        "space-y-6 p-8 rounded-3xl border-2 transition-all duration-500",
        hasLeadLawyer 
          ? "bg-emerald-500/[0.03] border-emerald-500/30" 
          : "bg-white/[0.02] border-white/5"
      )}>
        <FormField
          control={control}
          name="leadLawyerId"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between mb-1">
                <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Advogado Titular *</FormLabel>
                {hasLeadLawyer && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
              </div>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12 bg-black/40 border-white/10 text-base font-bold">
                    <SelectValue placeholder="Selecione o responsável pelo caso..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-[#0f172a] border-white/10">
                  {lawyers.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="font-bold">
                      Dr(a). {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {hasLeadLawyer && (
          <div className="space-y-4 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
              <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Equipe de Apoio / Parcerias</FormLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onAddMember}
                className="h-8 text-[10px] font-black uppercase text-primary hover:bg-primary/10"
              >
                <Plus className="h-3 w-3 mr-1.5" /> Adicionar Membro
              </Button>
            </div>

            <div className="grid gap-3">
              {teamFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-center p-4 rounded-2xl border border-white/5 bg-black/20 hover:border-primary/30 transition-all duration-300">
                  <div className="col-span-7">
                    <FormField
                      control={control}
                      name={`teamParticipants.${index}.staffId` as any}
                      render={({ field: memberField }) => (
                        <FormItem>
                          <Select onValueChange={memberField.onChange} value={memberField.value}>
                            <FormControl>
                              <SelectTrigger className="h-10 bg-black/20 border-white/5">
                                <SelectValue placeholder="Selecionar profissional..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#0f172a] border-white/10">
                              {staff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.firstName} {s.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-3">
                    <FormField
                      control={control}
                      name={`teamParticipants.${index}.percentage` as any}
                      render={({ field: pctField }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="0" 
                                className="h-10 pl-8 text-sm bg-black/20 border-white/5 font-bold" 
                                onKeyDown={(e) => e.stopPropagation()}
                                {...pctField} 
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveMember(index)}
                      className="h-10 w-10 text-rose-500 hover:bg-rose-500/10 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// STEP 6: STRATEGY
export function StrategySection({ control }: { control: Control<ProcessFormValues> }) {
  const description = useWatch({ control, name: 'description' });
  const quickHearingDate = useWatch({ control, name: 'quickHearingDate' });
  const hasNotes = !!description?.trim();

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <SectionHeader 
        icon={<Sparkles className="h-4 w-4" />} 
        title="Notas & Estratégia"
        description="Defina as diretrizes, riscos e observações críticas para o caso"
        isOptional
      />

      <div className={cn(
        "p-8 rounded-3xl border-2 transition-all duration-500",
        hasNotes 
          ? "bg-amber-500/[0.03] border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.05)]" 
          : "bg-white/[0.02] border-white/5"
      )}>
        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between mb-2">
                <FormLabel className="text-xs font-black uppercase text-slate-400 tracking-wider">Observações Internas</FormLabel>
                <div className="text-[10px] font-bold text-slate-500 uppercase">{description?.length || 0} caracteres</div>
              </div>
              <FormControl>
                <Textarea
                  placeholder="Detalhamento estratégico para o advogado responsável e equipe de apoio. Cite prazos, teses jurídicas e particularidades do cliente..."
                  className="min-h-[250px] resize-none text-sm bg-black/40 border-white/10 p-6 leading-relaxed font-medium focus:border-primary transition-all"
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="mt-10 pt-8 border-t border-white/10 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Gavel className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white">Agendamento de Audiência (Opcional)</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Se houver uma data designada, registre-a aqui</p>
            </div>
          </div>

          <div className={cn(
            "grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl border-2 transition-all duration-300",
            quickHearingDate ? "bg-primary/[0.03] border-primary/20" : "bg-black/20 border-white/5"
          )}>
            <FormField
              control={control}
              name="quickHearingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tipo de Ato</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 bg-black/40 border-white/10">
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#0f172a] border-white/10">
                      <SelectItem value="UNA">Audiência Una</SelectItem>
                      <SelectItem value="CONCILIACAO">Conciliação</SelectItem>
                      <SelectItem value="INSTRUCAO">Instrução</SelectItem>
                      <SelectItem value="JULGAMENTO">Sentença / Julgamento</SelectItem>
                      <SelectItem value="PERICIA">Perícia</SelectItem>
                      <SelectItem value="OUTRA">Outra</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={control}
                name="quickHearingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                        <Input type="date" className="h-11 bg-black/40 border-white/10 pl-8 text-xs font-bold" {...field} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="quickHearingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Horário</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                        <Input type="time" className="h-11 bg-black/40 border-white/10 pl-8 text-xs font-bold" {...field} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="quickHearingLocation"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <MapPin className="h-3 w-3" /> Local ou Link da Sala
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Fórum, sala virtual ou endereço..." 
                      className="h-11 bg-black/40 border-white/10" 
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
