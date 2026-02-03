'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';

import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';

import type { Process, Staff } from '@/lib/types';
import { useProcessForm, processSchema, type ProcessFormValues } from '@/hooks/use-process-form';
import { ProcessFormStepper } from './ProcessFormStepper';
import {
  ClientsSection,
  PartiesSection,
  IdentificationSection,
  CourtSection,
  TeamSection,
  StrategySection,
} from './ProcessFormSections';

interface ProcessFormProps {
  onSave: () => void;
  process?: Process | null;
}

const STEPS = [
  { id: 'clients', label: 'Autores' },
  { id: 'defendants', label: 'Réus' },
  { id: 'details', label: 'Processo' },
  { id: 'court', label: 'Juízo' },
  { id: 'team', label: 'Equipe' },
  { id: 'strategy', label: 'Estratégia' },
];

const STEP_VALIDATIONS: Record<number, (keyof ProcessFormValues)[]> = {
  0: ['clientId'],
  2: ['name', 'legalArea'],
  4: ['leadLawyerId'],
};

export function ProcessForm({ onSave, process }: ProcessFormProps) {
  const { firestore } = useFirebase();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { defaultValues, submitForm } = useProcessForm(process, onSave);

  const staffQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'staff') : null),
    [firestore]
  );
  const { data: staffData } = useCollection<Staff>(staffQuery);
  const staff = staffData || [];

  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processSchema),
    defaultValues,
  });

  const { fields: partyFields, append: addParty, remove: removeParty } = useFieldArray({
    control: form.control,
    name: 'opposingParties',
  });

  const { fields: teamFields, append: addMember, remove: removeMember } = useFieldArray({
    control: form.control,
    name: 'teamParticipants',
  });

  const validateStep = async () => {
    const fieldsToValidate = STEP_VALIDATIONS[currentStep];
    if (fieldsToValidate) {
      const isValid = await form.trigger(fieldsToValidate);
      if (!isValid) {
        const firstError = Object.keys(form.formState.errors)[0];
        const element = document.querySelector(`[name="${firstError}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
    }
    return true;
  };

  const handleStepChange = useCallback(async (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      const isValid = await validateStep();
      if (!isValid) return;
    }

    setIsTransitioning(true);
    setTimeout(() => {
      if (direction === 'next') {
        setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
      } else {
        setCurrentStep(prev => Math.max(prev - 1, 0));
      }
      setIsTransitioning(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  }, [currentStep, form]);

  const onSubmit = async (values: ProcessFormValues) => {
    setIsSaving(true);
    const success = await submitForm(values);
    if (!success) setIsSaving(false);
  };

  const StepContent = useMemo(() => {
    switch (currentStep) {
      case 0: return <ClientsSection control={form.control} onClientSelect={(c) => form.setValue('clientId', c.id, { shouldValidate: true })} />;
      case 1: return <PartiesSection control={form.control} partyFields={partyFields} onAddParty={() => addParty({ name: '', email: '', phone: '' })} onRemoveParty={removeParty} />;
      case 2: return <IdentificationSection control={form.control} />;
      case 3: return <CourtSection control={form.control} />;
      case 4: return <TeamSection control={form.control} staff={staff} teamFields={teamFields} onAddMember={() => addMember({ staffId: '', percentage: 0 })} onRemoveMember={removeMember} />;
      case 5: return <StrategySection control={form.control} />;
      default: return null;
    }
  }, [currentStep, form, partyFields, teamFields, staff]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full space-y-6">
        <ProcessFormStepper steps={STEPS} currentStep={currentStep} />

        <div className={cn(
          "flex-1 overflow-y-auto px-1 transition-opacity duration-300",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}>
          <fieldset 
            disabled={isSaving} 
            className="animate-in fade-in slide-in-from-right-2 duration-300"
            aria-busy={isSaving}
            aria-live="polite"
          >
            {StepContent}
          </fieldset>
        </div>

        <SheetFooter className="border-t pt-6 bg-background">
          <div className="flex items-center justify-between w-full">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleStepChange('prev')} 
              disabled={currentStep === 0 || isSaving}
              className="gap-2"
              aria-label="Voltar etapa"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button 
                type="button" 
                onClick={() => handleStepChange('next')} 
                className="gap-2 min-w-[120px]"
                aria-label="Próxima etapa"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={isSaving} 
                className="gap-2 min-w-[120px] bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Finalizar Cadastro
              </Button>
            )}
          </div>
        </SheetFooter>
      </form>
    </Form>
  );
}