'use client';

import React from 'react';
import { Building, Gavel, User, LayoutGrid, Plus, Trash2, ShieldCheck, Scale, Users, Mail, Phone, Percent } from 'lucide-react';
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
              <FormLabel>Status Operacional *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11">
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
              <FormLabel>Área Jurídica (Organização Drive) *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11">
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
              <FormLabel>Número do Processo (CNJ)</FormLabel>
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
              <FormLabel>Valor da Causa (R$)</FormLabel>
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
        <div className="md:col-span-2">
          <FormField
            control={control}
            name="court"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pesquisar Tribunal / Fórum (Mapas) *</FormLabel>
                <FormControl>
                  <LocationSearch
                    value={field.value || ''}
                    onSelect={(val) => {
                        field.onChange(val);
                        // Optional: trigger address update if val matches an OSM result
                    }}
                    placeholder="Busque o nome do fórum ou tribunal..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="courtAddress"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Endereço Completo</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Rua, número, cidade..." 
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
          name="courtBranch"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Vara / Câmara / Turma</FormLabel>
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
    </section>
  );
}

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
    <section>
      <SectionHeader
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Equipe Jurídica e Honorários"
      />

      <div className="space-y-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
        <FormField
          control={control}
          name="leadLawyerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Advogado Responsável (Titular) *</FormLabel>
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
            <FormLabel className="text-foreground font-bold">Colaboradores e Apoio</FormLabel>
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
        title="Parte Contrária (Réus)"
      />

      <div className="space-y-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-foreground font-bold">Réus Registrados</FormLabel>
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
                        <FormLabel className="text-[10px] uppercase font-bold">Nome da Parte *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Empresa ou Pessoa..."
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
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input placeholder="E-mail" className="pl-9 h-9 text-xs" {...emailField} onKeyDown={(e) => e.stopPropagation()} />
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
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input placeholder="Telefone" className="pl-9 h-9 text-xs" {...phoneField} onKeyDown={(e) => e.stopPropagation()} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground font-bold">Tese e Notas Estratégicas</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalhamento estratégico para o advogado responsável..."
                  className="min-h-[120px] resize-none text-sm bg-background border-2"
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
