'use client';

import React from 'react';
import { Building, Gavel, User, LayoutGrid, Plus, Trash2, ShieldCheck, Scale, Users } from 'lucide-react';
import { Control, FieldArrayWithId } from 'react-hook-form';

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
    <section>
      <SectionHeader icon={<Users className="h-4 w-4" />} title="Identificação do Caso" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
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
          name="name"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Título do Processo *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Reclamatória Trabalhista - João Silva"
                  className="h-11 border-2 focus:border-primary/50 transition-all"
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
              <FormLabel>Status Operacional *</FormLabel>
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
          name="processNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número do Processo (CNJ)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="0000000-00.0000.0.00.0000" 
                  className="h-11 font-mono border-2 focus:border-primary/50 transition-all" 
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
              <FormLabel>Valor Estimado da Causa (R$)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  className="h-11 border-2 focus:border-primary/50 transition-all" 
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field} 
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

interface CourtSectionProps {
  control: Control<ProcessFormValues>;
}

export function CourtSection({ control }: CourtSectionProps) {
  return (
    <section>
      <SectionHeader
        icon={<Building className="h-4 w-4" />}
        title="Juízo e Localização"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
        <FormField
          control={control}
          name="court"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tribunal / Fórum</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: TRT-2 / Fórum SBC" 
                  className="h-11 border-2 focus:border-primary/50 transition-all" 
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
          name="courtBranch"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vara / Câmara</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: 2ª Vara do Trabalho" 
                  className="h-11 border-2 focus:border-primary/50 transition-all" 
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
          name="defaultLocation"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="flex items-center gap-2">
                Local Sugerido para Audiências
                <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 h-4">API Maps</Badge>
              </FormLabel>
              <FormControl>
                <LocationSearch
                  value={field.value || ''}
                  onSelect={field.onChange}
                  placeholder="Busque o endereço do fórum ou local da audiência..."
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

interface TeamSectionProps {
  control: Control<ProcessFormValues>;
  staff: Staff[];
}

export function TeamSection({ control, staff }: TeamSectionProps) {
  const lawyers = staff.filter((s) => s.role === 'lawyer');

  return (
    <section>
      <SectionHeader
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Equipe Jurídica"
      />

      <div className="space-y-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
        <FormField
          control={control}
          name="leadLawyerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Advogado Responsável (Líder) *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 border-2">
                    <SelectValue placeholder="Selecione o advogado titular deste caso..." />
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

        <FormField
          control={control}
          name="responsibleStaffIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Equipe de Apoio (Colaboradores / Estagiários)</FormLabel>
              <div className="flex flex-wrap gap-2 p-4 rounded-xl border-2 bg-background/50">
                {staff.map((s) => {
                  const isSelected = field.value?.includes(s.id);
                  return (
                    <Badge
                      key={s.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer py-1.5 px-4 transition-all border-2',
                        isSelected ? 'bg-primary border-primary text-primary-foreground' : 'hover:border-primary/50'
                      )}
                      onClick={() => {
                        const currentValue = field.value || [];
                        const newValue = isSelected
                          ? currentValue.filter((id) => id !== s.id)
                          : [...currentValue, s.id];
                        field.onChange(newValue);
                      }}
                    >
                      {s.firstName} {s.lastName}
                    </Badge>
                  );
                })}
                {staff.length === 0 && <span className="text-xs text-muted-foreground italic">Nenhum membro cadastrado na equipe.</span>}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
}

interface PartiesSectionProps {
  control: Control<ProcessFormValues>;
  partyFields: FieldArrayWithId<ProcessFormValues, "opposingParties", "id">[];
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
    <section>
      <SectionHeader
        icon={<Scale className="h-4 w-4" />}
        title="Partes e Estratégia Interna"
      />

      <div className="space-y-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-foreground font-bold">Réus / Partes Contrárias</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddParty}
              className="h-8 text-[10px] font-black uppercase border-primary/30 text-primary hover:bg-primary/10"
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar Réu
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {partyFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                <FormField
                  control={control}
                  name={`opposingParties.${index}.name`}
                  render={({ field: partyField }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="Nome da empresa ou pessoa"
                          className="h-11 bg-background border-2"
                          onKeyDown={(e) => e.stopPropagation()}
                          {...partyField}
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
                  className="shrink-0 text-destructive hover:bg-destructive/10 h-11"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {partyFields.length === 0 && (
                <div className="md:col-span-2 text-center py-6 border-2 border-dashed rounded-xl opacity-40">
                    <p className="text-xs font-bold uppercase tracking-widest">Nenhuma parte contrária registrada.</p>
                </div>
            )}
          </div>
        </div>

        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground font-bold">Tese Jurídica e Notas Estratégicas</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalhamento estratégico para o advogado responsável..."
                  className="min-h-[150px] resize-none text-sm bg-background border-2 focus:border-primary/50"
                  onKeyDown={(e) => e.stopPropagation()}
                  {...field}
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
