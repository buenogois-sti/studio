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
  AlertCircle
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
import { LocationSearch } from '@/components/shared/LocationSearch';
import { ClientSearchInput } from './ClientSearchInput';
import { ClientCreationModal } from './ClientCreationModal';
import { cn } from '@/lib/utils';
import type { Client, Staff } from '@/lib/types';
import type { ProcessFormValues } from '@/hooks/use-process-form';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  isOptional?: boolean;
}

export function SectionHeader({ icon, title, description, isOptional }: SectionHeaderProps) {
  return (
    <div className="space-y-2 border-b pb-4 mb-6 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground">{title}</h3>
          {isOptional && <p className="text-[10px] text-muted-foreground">Opcional</p>}
        </div>
      </div>
      {description && <p className="text-xs text-muted-foreground ml-11">{description}</p>}
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
  
  const { fields: secondaryFields, append: addSecondary, remove: removeSecondary } = useFieldArray<ProcessFormValues, any>({
    control,
    name: 'secondaryClientIds' as any,
  });

  const clientId = useWatch({ control, name: 'clientId' });
  const hasMainClient = !!clientId;

  const handleClientCreated = (client: Client) => {
    onClientSelect(client);
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-8">
      <SectionHeader 
        icon={<Users className="h-4 w-4" />} 
        title="Partes do Processo"
        description="Identifique o cliente principal e, se aplicável, co-autores do processo"
      />
      
      <div className={cn(
        "space-y-6 p-6 rounded-2xl border-2 transition-colors",
        hasMainClient ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900" : "bg-muted/20 border-border/50"
      )}>
        <FormField
          control={control}
          name="clientRole"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold">Polo Processual *</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Polo Ativo">Polo Ativo</SelectItem>
                    <SelectItem value="Polo Passivo">Polo Passivo</SelectItem>
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
              <div className="flex items-center gap-2">
                <FormLabel className="text-sm font-bold">Cliente Principal *</FormLabel>
                {hasMainClient && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              </div>
              <FormControl>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ClientSearchInput 
                      selectedClientId={field.value} 
                      onSelect={onClientSelect}
                      onCreateNew={() => setShowCreateModal(true)}
                    />
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {hasMainClient && (
          <div className="space-y-4 pt-2 border-t border-border/50 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <FormLabel className="text-sm font-bold">Autores Secundários / Co-autores</FormLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSecondary('')}
                className="h-8 text-[10px] font-black uppercase border-primary/30 text-primary hover:bg-primary/5"
              >
                <UserPlus className="h-3 w-3 mr-1" /> Adicionar Autor
              </Button>
            </div>

            <div className="grid gap-3">
              {secondaryFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3 bg-background p-3 rounded-xl border-2 hover:border-primary/50 transition-colors animate-in fade-in duration-300">
                  <div className="flex-1">
                    <FormField
                      control={control}
                      name={`secondaryClientIds.${index}`}
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
                    className="text-destructive hover:bg-destructive/10 shrink-0 h-9 w-9"
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
  return (
    <div className="space-y-8">
      <SectionHeader 
        icon={<Scale className="h-4 w-4" />} 
        title="Parte Contrária (Réus)"
        description="Adicione todos os réus/partes contrárias no processo"
        isOptional
      />

      <div className="space-y-6 bg-muted/20 p-6 rounded-2xl border-2 border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FormLabel className="text-sm font-bold">Polo passivo</FormLabel>
            {partyFields.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">
                {partyFields.length}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddParty}
            className="h-8 text-[10px] font-black uppercase text-primary border-primary/30 hover:bg-primary/5"
          >
            <Plus className="h-3 w-3 mr-1" /> Novo Réu
          </Button>
        </div>

        <div className="grid gap-4">
          {partyFields.length > 0 ? (
            partyFields.map((field, index) => (
              <div key={field.id} className="p-4 rounded-xl border-2 bg-background hover:border-primary/50 transition-colors space-y-3 animate-in fade-in duration-300">
                <div className="flex items-start justify-between gap-4">
                  <FormField
                    control={control}
                    name={`opposingParties.${index}.name`}
                    render={({ field: nameField }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-[10px] uppercase font-bold flex items-center gap-1.5">
                          Nome do Réu / Empresa 
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Digite o nome completo..."
                            className="h-10"
                            onKeyDown={(e) => e.stopPropagation()}
                            {...nameField}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveParty(index)}
                    className="mt-6 text-destructive hover:bg-destructive/10 h-9 w-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/30">
                  <FormField
                    control={control}
                    name={`opposingParties.${index}.email`}
                    render={({ field: emailField }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                              placeholder="E-mail de contato" 
                              className="pl-9 h-9 text-xs" 
                              {...emailField} 
                              onKeyDown={(e) => e.stopPropagation()} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`opposingParties.${index}.phone`}
                    render={({ field: phoneField }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                              placeholder="Telefone / WhatsApp" 
                              className="pl-9 h-9 text-xs" 
                              {...phoneField} 
                              onKeyDown={(e) => e.stopPropagation()} 
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto opacity-30" />
              <p className="text-sm italic">Nenhum réu adicionado ainda.</p>
              <p className="text-xs">Adicione os réus/partes contrárias ao processo</p>
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
  const caseValue = useWatch({ control, name: 'caseValue' });
  const { setValue } = useFormContext<ProcessFormValues>();
  const isValid = !!name && !!legalArea;

  const formatCurrencyBRL = (value?: number | string) => {
    if (value === null || value === undefined || value === '') return '';
    const numericValue = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''));
    if (Number.isNaN(numericValue)) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
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
    <div className="space-y-8">
      <SectionHeader 
        icon={<LayoutGrid className="h-4 w-4" />} 
        title="Dados do Processo"
        description="Informações essenciais de identificação do caso"
      />

      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl border-2 transition-colors",
        isValid ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900" : "bg-muted/20 border-border/50"
      )}>
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <div className="flex items-center gap-2">
                <FormLabel className="text-sm font-bold">Título / Nome do Processo *</FormLabel>
                {name && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
              </div>
              <FormControl>
                <Input
                  placeholder="Ex: Reclamatória Trabalhista - João Silva"
                  className="h-11 border-2"
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
              <FormLabel className="text-sm font-bold">Status Operacional *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 border-2">
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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
                      <span className="h-2 w-2 bg-gray-500 rounded-full" /> Arquivado
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
              <div className="flex items-center gap-2">
                <FormLabel className="text-sm font-bold">Área Jurídica *</FormLabel>
                {legalArea && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
              </div>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 border-2">
                    <SelectValue placeholder="Tipo de Ação..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Trabalhista">Trabalhista</SelectItem>
                  <SelectItem value="Cível">Cível</SelectItem>
                  <SelectItem value="Criminal">Criminal</SelectItem>
                  <SelectItem value="Tributário">Tributário</SelectItem>
                  <SelectItem value="Empresarial">Empresarial</SelectItem>
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
                  <SelectItem value="Consumidor">Consumidor</SelectItem>
                  <SelectItem value="Imobiliário">Imobiliário</SelectItem>
                  <SelectItem value="Ambiental">Ambiental</SelectItem>
                  <SelectItem value="Eleitoral">Eleitoral</SelectItem>
                  <SelectItem value="Bancário">Bancário</SelectItem>
                  <SelectItem value="Previdenciário">Previdenciário</SelectItem>
                  <SelectItem value="Família">Família</SelectItem>
                  <SelectItem value="Sucessões">Sucessões</SelectItem>
                  <SelectItem value="Propriedade Intelectual">Propriedade Intelectual</SelectItem>
                  <SelectItem value="Trânsito">Trânsito</SelectItem>
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
              <FormLabel className="text-sm font-bold">Número CNJ</FormLabel>
              <FormControl>
                <Input 
                  placeholder="0000000-00.0000.0.00.0000" 
                  className="h-11 font-mono border-2" 
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field} 
                />
              </FormControl>
              <p className="text-[10px] text-muted-foreground">Opcional</p>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="caseValue"
          render={() => (
            <FormItem>
              <FormLabel className="text-sm font-bold">Valor da Causa (R$)</FormLabel>
              <FormControl>
                <Input 
                  type="text"
                  inputMode="decimal"
                  className="h-11 border-2"
                  onKeyDown={(e) => e.stopPropagation()}
                  value={formatCurrencyBRL(caseValue)}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                />
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
    <div className="space-y-8">
      <SectionHeader 
        icon={<Building className="h-4 w-4" />} 
        title="Juízo e Localização"
        description="Localização do tribunal ou fórum responsável"
        isOptional
      />

      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl border-2 transition-colors",
        hasLocation ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900" : "bg-muted/20 border-border/50"
      )}>
        <div className="md:col-span-2">
          <FormField
            control={control}
            name="court"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel className="text-sm font-bold">Busca de Tribunal / Fórum</FormLabel>
                  {hasLocation && <CheckCircle2 className="h-4 w-4 text-purple-600" />}
                </div>
                <FormControl>
                  <LocationSearch
                    value={field.value || ''}
                    onSelect={(val) => field.onChange(val)}
                    placeholder="Digite o nome do fórum ou um endereço..."
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
              <FormLabel className="text-sm font-bold">Vara / Câmara / Turma</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: 2ª Vara do Trabalho de SBC" 
                  className="h-11 border-2" 
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field} 
                />
              </FormControl>
              <p className="text-[10px] text-muted-foreground">Opcional</p>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="courtWebsite"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="text-sm font-bold">Link do Tribunal</FormLabel>
              <FormControl>
                <Input 
                  type="url"
                  placeholder="https://www.tst.jus.br/" 
                  className="h-11 border-2" 
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field} 
                />
              </FormControl>
              <p className="text-[10px] text-muted-foreground">Opcional</p>
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
  const lawyers = staff.filter((s) => s.role === 'lawyer');
  const leadLawyerId = useWatch({ control, name: 'leadLawyerId' });
  const hasLeadLawyer = !!leadLawyerId;

  return (
    <div className="space-y-8">
      <SectionHeader 
        icon={<ShieldCheck className="h-4 w-4" />} 
        title="Equipe e Honorários"
        description="Advogado responsável e membros de apoio"
      />

      <div className="space-y-6 bg-muted/20 p-6 rounded-2xl border-2 border-border/50">
        <FormField
          control={control}
          name="leadLawyerId"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel className="text-sm font-bold">Advogado Responsável (Titular) *</FormLabel>
                {hasLeadLawyer && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              </div>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 border-2">
                    <SelectValue placeholder="Selecione o advogado líder..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lawyers.length > 0 ? (
                    lawyers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        Dr(a). {s.firstName} {s.lastName}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">Nenhum advogado cadastrado</div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {hasLeadLawyer && (
          <div className="space-y-4 pt-2 border-t border-border/50 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FormLabel className="text-sm font-bold">Advogados de Apoio / Parcerias</FormLabel>
                {teamFields.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">
                    {teamFields.length}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddMember}
                className="h-8 text-[10px] font-black uppercase text-primary border-primary/30 hover:bg-primary/5"
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar Membro
              </Button>
            </div>

            <div className="grid gap-3">
              {teamFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-end p-3 rounded-xl border-2 bg-background hover:border-primary/50 transition-colors animate-in slide-in-from-right-2">
                  <div className="col-span-7">
                    <FormField
                      control={control}
                      name={`teamParticipants.${index}.staffId`}
                      render={({ field: memberField }) => (
                        <FormItem>
                          <Select onValueChange={memberField.onChange} value={memberField.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Selecionar..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {staff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.firstName} {s.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-3">
                    <FormField
                      control={control}
                      name={`teamParticipants.${index}.percentage`}
                      render={({ field: pctField }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="0" 
                                className="h-10 pl-7 text-xs" 
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
                      className="h-10 w-10 text-destructive hover:bg-destructive/10"
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
  const hasNotes = !!description?.trim();

  return (
    <div className="space-y-8">
      <SectionHeader 
        icon={<Sparkles className="h-4 w-4" />} 
        title="Notas e Estratégia Jurídica"
        description="Estratégia, prazos e observações importantes"
        isOptional
      />

      <div className={cn(
        "p-6 rounded-2xl border-2 transition-colors",
        hasNotes ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900" : "bg-muted/20 border-border/50"
      )}>
        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2 mb-2">
                <FormLabel className="text-sm font-bold">Ideias, Prazos e Observações</FormLabel>
                {hasNotes && <CheckCircle2 className="h-4 w-4 text-orange-600" />}
              </div>
              <FormControl>
                <Textarea
                  placeholder="Detalhamento estratégico para o advogado responsável e equipe de apoio..."
                  className="min-h-[250px] resize-none text-sm bg-background border-2 p-4 leading-relaxed"
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between items-center pt-2 text-[10px] text-muted-foreground">
                <FormMessage />
                <span>{description?.length || 0} caracteres</span>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}