'use client';

import React from 'react';
import { 
  Building, 
  User, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Users, 
  Mail, 
  Phone, 
  Percent,
  UserPlus,
  Scale,
  Sparkles,
  Search,
  LayoutGrid,
  AtSign,
  Smartphone
} from 'lucide-react';
import { Control, FieldArrayWithId, useFieldArray } from 'react-hook-form';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { ClientSearchInput } from './ClientSearchInput';
import { cn } from '@/lib/utils';
import type { Client, Staff } from '@/lib/types';
import type { ProcessFormValues } from './ProcessForm';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

export function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 border-b pb-3 mb-6">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
    </div>
  );
}

// STEP 1: CLIENTS
interface ClientsSectionProps {
  control: Control<ProcessFormValues>;
  onClientSelect: (client: Client) => void;
}

export function ClientsSection({ control, onClientSelect }: ClientsSectionProps) {
  const { fields: secondaryFields, append: addSecondary, remove: removeSecondary } = useFieldArray({
    control,
    name: 'secondaryClientIds' as any,
  });

  return (
    <div className="space-y-8">
      <SectionHeader icon={<Users className="h-4 w-4" />} title="Autores do Processo" />
      
      <div className="space-y-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
        <FormField
          control={control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold">Cliente Principal (Autor Titular) *</FormLabel>
              <FormControl>
                <ClientSearchInput selectedClientId={field.value} onSelect={onClientSelect} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-sm font-bold">Autores Secundários / Co-autores</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSecondary('')}
              className="h-8 text-[10px] font-black uppercase border-primary/30 text-primary"
            >
              <UserPlus className="h-3 w-3 mr-1" /> Adicionar Autor
            </Button>
          </div>

          <div className="grid gap-3">
            {secondaryFields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2 bg-background p-2 rounded-xl border-2 animate-in fade-in">
                <div className="flex-1">
                  <FormField
                    control={control}
                    name={`secondaryClientIds.${index}` as any}
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
                  className="text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// STEP 2: DEFENDANTS
interface PartiesSectionProps {
  control: Control<ProcessFormValues>;
  partyFields: FieldArrayWithId<ProcessFormValues, "opposingParties", "id">[];
  onAddParty: () => void;
  onRemoveParty: (index: number) => void;
}

export function PartiesSection({ control, partyFields, onAddParty, onRemoveParty }: PartiesSectionProps) {
  return (
    <div className="space-y-8">
      <SectionHeader icon={<Scale className="h-4 w-4" />} title="Parte Contrária (Réus)" />

      <div className="space-y-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
        <div className="flex items-center justify-between">
          <FormLabel className="text-sm font-bold">Réus Registrados</FormLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddParty}
            className="h-8 text-[10px] font-black uppercase border-primary/30 text-primary"
          >
            <Plus className="h-3 w-3 mr-1" /> Novo Réu
          </Button>
        </div>

        <div className="grid gap-4">
          {partyFields.map((field, index) => (
            <div key={field.id} className="p-4 rounded-xl border-2 bg-background space-y-3 animate-in fade-in">
              <div className="flex items-start justify-between gap-4">
                <FormField
                  control={control}
                  name={`opposingParties.${index}.name`}
                  render={({ field: nameField }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-[10px] uppercase font-bold">Nome do Réu / Empresa *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite o nome completo..."
                          className="h-10"
                          onKeyDown={(e) => e.stopPropagation()}
                          {...nameField}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveParty(index)}
                  className="mt-6 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={control}
                  name={`opposingParties.${index}.email`}
                  render={({ field: emailField }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input placeholder="E-mail de contato" className="pl-9 h-9 text-xs" {...emailField} onKeyDown={(e) => e.stopPropagation()} />
                        </div>
                      </FormControl>
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
                          <Input placeholder="Telefone / WhatsApp" className="pl-9 h-9 text-xs" {...phoneField} onKeyDown={(e) => e.stopPropagation()} />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
          {partyFields.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground text-sm italic">
              Nenhum réu adicionado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// STEP 3: IDENTIFICATION
export function IdentificationSection({ control }: { control: Control<ProcessFormValues> }) {
  return (
    <div className="space-y-8">
      <SectionHeader icon={<LayoutGrid className="h-4 w-4" />} title="Dados do Processo" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="text-sm font-bold">Título / Nome do Processo *</FormLabel>
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
                  <SelectItem value="Ativo">🟢 Ativo</SelectItem>
                  <SelectItem value="Pendente">🟡 Pendente</SelectItem>
                  <SelectItem value="Arquivado">⚪ Arquivado</SelectItem>
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
              <FormLabel className="text-sm font-bold">Área Jurídica *</FormLabel>
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
              <FormLabel className="text-sm font-bold">Número CNJ (Se houver)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="0000000-00.0000.0.00.0000" 
                  className="h-11 font-mono border-2" 
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
          name="caseValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold">Valor da Causa (R$)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  className="h-11 border-2" 
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field} 
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
  return (
    <div className="space-y-8">
      <SectionHeader icon={<Building className="h-4 w-4" />} title="Juízo e Localização" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
        <div className="md:col-span-2">
          <FormField
            control={control}
            name="court"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-bold">Busca de Tribunal / Fórum (Mapas)</FormLabel>
                <FormControl>
                  <LocationSearch
                    value={field.value || ''}
                    onSelect={(val) => field.onChange(val)}
                    placeholder="Digite o nome do fórum ou tribunal..."
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
              <FormMessage />
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
  teamFields: FieldArrayWithId<ProcessFormValues, "teamParticipants", "id">[];
  onAddMember: () => void;
  onRemoveMember: (index: number) => void;
}

export function TeamSection({ control, staff, teamFields, onAddMember, onRemoveMember }: TeamSectionProps) {
  const lawyers = staff.filter((s) => s.role === 'lawyer');

  return (
    <div className="space-y-8">
      <SectionHeader icon={<ShieldCheck className="h-4 w-4" />} title="Equipe e Honorários" />

      <div className="space-y-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
        <FormField
          control={control}
          name="leadLawyerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold">Advogado Responsável (Titular) *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 border-2">
                    <SelectValue placeholder="Selecione o advogado líder..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lawyers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      Dr(a). {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-sm font-bold">Advogados de Apoio / Parcerias</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddMember}
              className="h-8 text-[10px] font-black uppercase text-primary border-primary/30"
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar Membro
            </Button>
          </div>

          <div className="grid gap-3">
            {teamFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-3 items-end p-3 rounded-xl border-2 bg-background animate-in slide-in-from-right-2">
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
      </div>
    </div>
  );
}

// STEP 6: STRATEGY
export function StrategySection({ control }: { control: Control<ProcessFormValues> }) {
  return (
    <div className="space-y-8">
      <SectionHeader icon={<Sparkles className="h-4 w-4" />} title="Notas e Estratégia Jurídica" />

      <div className="bg-muted/20 p-6 rounded-2xl border border-border/50">
        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold">Ideias, Prazos e Observações Internas</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalhamento estratégico para o advogado responsável e equipe de apoio..."
                  className="min-h-[250px] resize-none text-sm bg-background border-2 p-4 leading-relaxed"
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field}
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
