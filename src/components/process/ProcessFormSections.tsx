'use client';

import React from 'react';
import { Building, Gavel, User } from 'lucide-react';
import { Control, FieldArray } from 'react-hook-form';

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
import { H2 } from '@/components/ui/typography';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { ClientSearchInput } from './ClientSearchInput';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import type { Process, Client, Staff } from '@/lib/types';
import type { ProcessFormValues } from './ProcessForm';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

export function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 border-b pb-2">
      {icon}
      <H2 className="border-none pb-0">{title}</H2>
    </div>
  );
}

// ============================================================================
// IDENTIFICATION AND STATUS SECTION
// ============================================================================

interface IdentificationSectionProps {
  control: Control<ProcessFormValues>;
  onClientSelect: (client: Client) => void;
  selectedClientId: string;
}

export function IdentificationSection({
  control,
  onClientSelect,
  selectedClientId,
}: IdentificationSectionProps) {
  return (
    <section className="space-y-6">
      <SectionHeader icon={<Gavel className="h-5 w-5 text-primary" />} title="Identificação e Status" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name="clientId"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Cliente Principal *</FormLabel>
              <FormControl>
                <ClientSearchInput selectedClientId={field.value} onSelect={onClientSelect} />
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
              <FormLabel>Status Operacional *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título do Processo *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Reclamatória Trabalhista - João Silva"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="processNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número do Processo (CNJ)</FormLabel>
              <FormControl>
                <Input placeholder="0000000-00.0000.0.00.0000" className="h-11" {...field} />
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
              <FormLabel>Valor da Causa (R$)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
}

// ============================================================================
// COURT AND LOCATION SECTION
// ============================================================================

interface CourtSectionProps {
  control: Control<ProcessFormValues>;
}

export function CourtSection({ control }: CourtSectionProps) {
  return (
    <section className="space-y-6">
      <SectionHeader
        icon={<Building className="h-5 w-5 text-primary" />}
        title="Juízo e Localização"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name="court"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tribunal / Fórum</FormLabel>
              <FormControl>
                <Input placeholder="Ex: TRT-2 / Fórum SBC" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="courtBranch"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vara / Câmara</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 2ª Vara do Trabalho" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="defaultLocation"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Local Padrão de Audiências (Sugerido)</FormLabel>
              <FormControl>
                <LocationSearch
                  value={field.value || ''}
                  onSelect={field.onChange}
                  placeholder="Defina o local onde este processo costuma ter audiências..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
}

// ============================================================================
// TEAM AND RESPONSIBLE SECTION
// ============================================================================

interface TeamSectionProps {
  control: Control<ProcessFormValues>;
  staff?: Staff[];
}

export function TeamSection({ control, staff }: TeamSectionProps) {
  const lawyers = staff?.filter((s) => s.role === 'lawyer') ?? [];

  return (
    <section className="space-y-6">
      <SectionHeader
        icon={<User className="h-5 w-5 text-primary" />}
        title="Equipe e Responsáveis"
      />

      <div className="space-y-6">
        <FormField
          control={control}
          name="leadLawyerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Advogado Responsável (Líder) *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o advogado líder..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lawyers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="responsibleStaffIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outros Membros da Equipe (Apoio/Estagiários)</FormLabel>
              <div className="flex flex-wrap gap-2 p-3 rounded-xl border bg-muted/20">
                {staff?.map((s) => {
                  const isSelected = field.value.includes(s.id);
                  return (
                    <Badge
                      key={s.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer py-1.5 px-4 transition-all',
                        isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10'
                      )}
                      onClick={() => {
                        const newValue = isSelected
                          ? field.value.filter((id) => id !== s.id)
                          : [...field.value, s.id];
                        field.onChange(newValue);
                      }}
                    >
                      {s.firstName} {s.lastName}
                    </Badge>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
}

// ============================================================================
// OPPOSING PARTIES AND NOTES SECTION
// ============================================================================

interface PartiesSectionProps {
  control: Control<ProcessFormValues>;
  partyFields: FieldArray<ProcessFormValues, 'opposingParties'>;
  onAddParty: () => void;
  onRemoveParty: (index: number) => void;
}

export function PartiesSection({
  control,
  partyFields,
  onAddParty,
  onRemoveParty,
}: PartiesSectionProps) {
  return (
    <section className="space-y-6">
      <SectionHeader
        icon={<Building className="h-5 w-5 text-primary" />}
        title="Partes Contrárias e Notas"
      />

      {/* Opposing Parties */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <FormLabel>Réus / Opostos</FormLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddParty}
            className="h-8 text-xs font-bold uppercase"
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar Parte
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {partyFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <Input
                placeholder="Nome da empresa ou pessoa"
                className="h-11"
                {...control.register(`opposingParties.${index}`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemoveParty(index)}
                className="shrink-0 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Estratégia e Observações</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva detalhes estratégicos..."
                className="min-h-[120px] resize-none text-sm"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </section>
  );
}
