import { Control, UseFieldArrayReturn } from 'react-hook-form';
import type { ProcessFormValues } from '@/hooks/use-process-form';
import type { Client, Staff } from '@/lib/types';
import {
  ClientsSection,
  PartiesSection,
  IdentificationSection,
  CourtSection,
  TeamSection,
  StrategySection,
} from './ProcessFormSections';

export type StepComponentProps = {
  control: Control<ProcessFormValues>;
};

export type PartiesSectionProps = StepComponentProps & {
  partyFields: UseFieldArrayReturn<ProcessFormValues, 'opposingParties'>['fields'];
  onAddParty: () => void;
  onRemoveParty: (index: number) => void;
};

export type TeamSectionProps = StepComponentProps & {
  staff: Staff[];
  teamFields: UseFieldArrayReturn<ProcessFormValues, 'teamParticipants'>['fields'];
  onAddMember: () => void;
  onRemoveMember: (index: number) => void;
};

export type ClientsSectionProps = StepComponentProps & {
  onClientSelect: (client: Client) => void;
};

export interface ProcessStep {
  id: string;
  label: string;
  component: React.ComponentType<any>;
}

export function createProcessSteps(
  form: any,
  staff: Staff[],
  partyFields: any,
  addParty: () => void,
  removeParty: (index: number) => void,
  teamFields: any,
  addMember: () => void,
  removeMember: (index: number) => void
): ProcessStep[] {
  return [
    {
      id: 'clients',
      label: 'Autores',
      component: () => (
        <ClientsSection 
          control={form.control} 
          onClientSelect={(c) => form.setValue('clientId', c.id, { shouldValidate: true })} 
        />
      ),
    },
    {
      id: 'defendants',
      label: 'Réus',
      component: () => (
        <PartiesSection 
          control={form.control} 
          partyFields={partyFields} 
          onAddParty={addParty} 
          onRemoveParty={removeParty} 
        />
      ),
    },
    {
      id: 'details',
      label: 'Processo',
      component: () => <IdentificationSection control={form.control} />,
    },
    {
      id: 'court',
      label: 'Juízo',
      component: () => <CourtSection control={form.control} />,
    },
    {
      id: 'team',
      label: 'Equipe',
      component: () => (
        <TeamSection 
          control={form.control} 
          staff={staff} 
          teamFields={teamFields} 
          onAddMember={addMember} 
          onRemoveMember={removeMember} 
        />
      ),
    },
    {
      id: 'strategy',
      label: 'Estratégia',
      component: () => <StrategySection control={form.control} />,
    },
  ];
}
