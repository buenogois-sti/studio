'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';

import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

import type { Process, Client, Staff } from '@/lib/types';
import {
  ClientsSection,
  PartiesSection,
  IdentificationSection,
  CourtSection,
  TeamSection,
  StrategySection,
} from './ProcessFormSections';

const processSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente principal.'),
  secondaryClientIds: z.array(z.string()).default([]),
  name: z.string().min(3, 'O título do processo é obrigatório.'),
  processNumber: z.string().optional(),
  status: z.enum(['Ativo', 'Arquivado', 'Pendente']).default('Ativo'),
  legalArea: z.string().min(1, 'Selecione a área jurídica.'),
  caseValue: z.coerce.number().min(0).default(0),
  court: z.string().optional(),
  courtAddress: z.string().optional(),
  courtBranch: z.string().optional(),
  leadLawyerId: z.string().min(1, 'Defina o advogado responsável.'),
  teamParticipants: z.array(z.object({
    staffId: z.string().min(1),
    percentage: z.coerce.number().min(0).max(100),
  })).default([]),
  opposingParties: z.array(z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido').optional().or(z.literal('')),
    phone: z.string().optional(),
  })).default([]),
  description: z.string().optional(),
});

export type ProcessFormValues = z.infer<typeof processSchema>;

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

export function ProcessForm({ onSave, process }: ProcessFormProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const staffQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'staff') : null),
    [firestore]
  );
  const { data: staffData } = useCollection<Staff>(staffQuery);
  const staff = staffData || [];

  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processSchema),
    defaultValues: React.useMemo(() => {
      if (!process) {
        return {
          clientId: '',
          secondaryClientIds: [],
          name: '',
          processNumber: '',
          status: 'Ativo' as const,
          legalArea: 'Trabalhista',
          caseValue: 0,
          court: '',
          courtAddress: '',
          courtBranch: '',
          leadLawyerId: '',
          teamParticipants: [],
          opposingParties: [],
          description: '',
        };
      }
      return {
        clientId: process.clientId || '',
        secondaryClientIds: process.secondaryClientIds || [],
        name: process.name || '',
        processNumber: process.processNumber || '',
        status: (process.status as 'Ativo' | 'Arquivado' | 'Pendente') || 'Ativo',
        legalArea: process.legalArea || 'Trabalhista',
        caseValue: process.caseValue || 0,
        court: process.court || '',
        courtAddress: process.courtAddress || '',
        courtBranch: process.courtBranch || '',
        leadLawyerId: process.leadLawyerId || '',
        teamParticipants: process.teamParticipants || [],
        opposingParties: process.opposingParties || [],
        description: process.description || '',
      };
    }, [process]),
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
    let fieldsToValidate: (keyof ProcessFormValues)[] = [];
    
    if (currentStep === 0) fieldsToValidate = ['clientId'];
    if (currentStep === 2) fieldsToValidate = ['name', 'legalArea'];
    if (currentStep === 4) fieldsToValidate = ['leadLawyerId'];

    if (fieldsToValidate.length > 0) {
      const result = await form.trigger(fieldsToValidate);
      return result;
    }
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  async function onSubmit(values: ProcessFormValues) {
    if (!firestore) return;
    setIsSaving(true);

    try {
      const data = {
        ...values,
        updatedAt: serverTimestamp(),
      };

      if (process?.id) {
        const ref = doc(firestore, 'processes', process.id);
        await updateDoc(ref, data);
        toast({ title: 'Processo atualizado!', description: 'As alterações foram salvas com sucesso.' });
      } else {
        const col = collection(firestore, 'processes');
        await addDoc(col, { ...data, createdAt: serverTimestamp() });
        toast({ title: 'Processo criado!', description: 'O novo caso foi registrado e organizado no Drive.' });
      }
      onSave();
    } catch (error: any) {
      console.error("Save process error:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar os dados do processo.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  const stepComponents = [
    <ClientsSection 
      key="step-0"
      control={form.control} 
      onClientSelect={(client) => form.setValue('clientId', client.id, { shouldValidate: true })} 
    />,
    <PartiesSection
      key="step-1"
      control={form.control}
      partyFields={partyFields}
      onAddParty={() => addParty({ name: '', email: '', phone: '' })}
      onRemoveParty={removeParty}
    />,
    <IdentificationSection
      key="step-2"
      control={form.control}
    />,
    <CourtSection key="step-3" control={form.control} />,
    <TeamSection 
      key="step-4"
      control={form.control} 
      staff={staff} 
      teamFields={teamFields}
      onAddMember={() => addMember({ staffId: '', percentage: 0 })}
      onRemoveMember={removeMember}
    />,
    <StrategySection key="step-5" control={form.control} />,
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full space-y-6">
        {/* Stepper Header */}
        <div className="flex items-center justify-between px-1 mb-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center gap-1.5 flex-1 relative">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all z-10",
                currentStep === index ? "bg-primary text-primary-foreground scale-110 shadow-lg" : 
                currentStep > index ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
              )}>
                {currentStep > index ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-tighter",
                currentStep === index ? "text-primary" : "text-muted-foreground"
              )}>{step.label}</span>
              
              {/* Line between steps */}
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors",
                  currentStep > index ? "bg-emerald-500" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-1">
          <fieldset disabled={isSaving} className="animate-in fade-in slide-in-from-right-2 duration-300">
            {stepComponents[currentStep]}
          </fieldset>
        </div>

        <SheetFooter className="border-t pt-6 bg-background">
          <div className="flex items-center justify-between w-full">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePrev} 
              disabled={currentStep === 0 || isSaving}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext} className="gap-2 min-w-[120px]">
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSaving} className="gap-2 min-w-[120px] bg-emerald-600 hover:bg-emerald-700">
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
