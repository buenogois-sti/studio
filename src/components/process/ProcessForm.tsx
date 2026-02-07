'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

import { Form } from '@/components/ui/form';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import type { Process, Staff } from '@/lib/types';
import { useProcessForm, processSchema, type ProcessFormValues } from '@/hooks/use-process-form';
import { ProcessFormHeader } from './ProcessFormHeader';
import { ProcessFormFooter } from './ProcessFormFooter';
import { createProcessSteps } from './ProcessSteps';

interface ProcessFormProps {
  onSave: () => void;
  process?: Process | null;
}

const STEP_VALIDATIONS: Record<number, (keyof ProcessFormValues)[]> = {
  0: ['clientId', 'clientRole'],
  2: ['name', 'legalArea'],
  4: ['leadLawyerId'],
};

const AUTOSAVE_INTERVAL = 30000;

export function ProcessForm({ onSave, process }: ProcessFormProps) {
  const { firestore } = useFirebase();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(new Array(6).fill(false));
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [draftExists, setDraftExists] = useState(false);

  const { defaultValues, submitForm, saveDraft, loadDraft } = useProcessForm(process, onSave);

  const staffQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'staff') : null),
    [firestore]
  );
  const { data: staffData } = useCollection<Staff>(staffQuery);
  const staff = staffData || [];

  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const { fields: partyFields, append: addParty, remove: removeParty } = useFieldArray({
    control: form.control,
    name: 'opposingParties',
  });

  const { fields: teamFields, append: addMember, remove: removeMember } = useFieldArray({
    control: form.control,
    name: 'teamParticipants',
  });

  // Carrega draft se existir
  useEffect(() => {
    const draft = loadDraft(process?.id);
    if (draft) {
      setDraftExists(true);
    }
  }, [process?.id, loadDraft]);

  // Autosave: salva draft a cada intervalo
  useEffect(() => {
    const interval = setInterval(async () => {
      if (form.formState.isDirty && !isSaving) {
        setIsAutoSaving(true);
        await saveDraft(form.getValues(), process?.id);
        setLastSaveTime(new Date());
        setIsAutoSaving(false);
      }
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [form, isSaving, saveDraft, process?.id]);

  // Marca etapa como concluída quando seus campos são válidos
  const markStepAsCompleted = useCallback(async (stepIndex: number) => {
    const fieldsToValidate = STEP_VALIDATIONS[stepIndex];
    if (fieldsToValidate) {
      const isValid = await form.trigger(fieldsToValidate);
      if (isValid) {
        setCompletedSteps(prev => {
          const updated = [...prev];
          updated[stepIndex] = true;
          return updated;
        });
      }
    }
  }, [form]);

  const validateStep = useCallback(async () => {
    const fieldsToValidate = STEP_VALIDATIONS[currentStep];
    if (fieldsToValidate) {
      const isValid = await form.trigger(fieldsToValidate as (keyof ProcessFormValues)[]);
      if (!isValid) {
        const errors = form.formState.errors;
        const firstErrorField = fieldsToValidate.find(field => field in errors);
        if (firstErrorField) {
          const element = document.querySelector(`[name="${firstErrorField}"]`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return false;
      }
    }
    return true;
  }, [currentStep, form]);

  const handleStepChange = useCallback(async (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      const isValid = await validateStep();
      if (!isValid) return;
      await markStepAsCompleted(currentStep);
    }

    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setCurrentStep(prev => {
        const newStep = direction === 'next' 
          ? Math.min(prev + 1, 5) 
          : Math.max(prev - 1, 0);
        return newStep;
      });
      setIsTransitioning(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
    
    return () => clearTimeout(timer);
  }, [currentStep, validateStep, markStepAsCompleted]);

  const handleStepClick = useCallback((stepIndex: number) => {
    if (completedSteps[stepIndex] || stepIndex < currentStep || stepIndex === currentStep) {
      setCurrentStep(stepIndex);
    }
  }, [completedSteps, currentStep]);

  const onSubmit = useCallback(async (values: ProcessFormValues) => {
    setIsSaving(true);
    const success = await submitForm(values);
    if (!success) setIsSaving(false);
  }, [submitForm]);

  const STEPS = useMemo(() => [
    { id: 'clients', label: 'Autores' },
    { id: 'defendants', label: 'Réus' },
    { id: 'details', label: 'Processo' },
    { id: 'court', label: 'Juízo' },
    { id: 'team', label: 'Equipe' },
    { id: 'strategy', label: 'Estratégia' },
  ], []);

  const processSteps = useMemo(() => 
    createProcessSteps(
      form,
      staff,
      partyFields,
      () => addParty({ name: '', email: '', phone: '' }),
      removeParty,
      teamFields,
      () => addMember({ staffId: '', percentage: 0 }),
      removeMember
    ),
    [form, staff, partyFields, teamFields, addParty, removeParty, addMember, removeMember]
  );

  const StepContent = useMemo(() => {
    const Step = processSteps[currentStep]?.component;
    return Step ? <Step /> : null;
  }, [currentStep, processSteps]);

  const hasErrors = Object.keys(form.formState.errors).length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-screen relative">
        <ProcessFormHeader
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          completionStatus={completedSteps}
          isAutoSaving={isAutoSaving}
          lastSaveTime={lastSaveTime}
          draftExists={draftExists}
          hasErrors={hasErrors}
          processId={process?.id}
        />

        <div className="relative flex-1 overflow-hidden">
          {isTransitioning && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] animate-in fade-in duration-200">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-4">Processando Etapa...</p>
            </div>
          )}
          
          <div className={cn(
            "h-full overflow-y-auto px-1 pb-28 transition-all duration-300",
            isTransitioning ? "opacity-0 scale-95 blur-sm" : "opacity-100 scale-100 blur-0"
          )}>
            <fieldset 
              disabled={isSaving} 
              className="animate-in fade-in slide-in-from-right-2 duration-300 h-full"
              aria-busy={isSaving}
              aria-live="polite"
            >
              {StepContent}
            </fieldset>

            <div className="sticky bottom-0 w-full border-t bg-background/95 backdrop-blur-sm z-50 shadow-lg mt-auto">
              <ProcessFormFooter
                currentStep={currentStep}
                totalSteps={STEPS.length}
                isSaving={isSaving}
                hasErrors={hasErrors}
                onPrevious={() => handleStepChange('prev')}
                onNext={() => handleStepChange('next')}
                onSubmit={() => form.handleSubmit(onSubmit)()}
              />
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
