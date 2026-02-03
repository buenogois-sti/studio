'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';

import type { Process, Client, Staff } from '@/lib/types';
import {
  IdentificationSection,
  CourtSection,
  TeamSection,
  PartiesSection,
} from './ProcessFormSections';

const processSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente.'),
  name: z.string().min(3, 'Nome do processo é obrigatório.'),
  processNumber: z.string().optional(),
  court: z.string().optional(),
  courtBranch: z.string().optional(),
  caseValue: z.coerce.number().min(0).default(0),
  opposingParties: z.array(z.string()).default([]),
  description: z.string().optional(),
  status: z.enum(['Ativo', 'Arquivado', 'Pendente']).default('Ativo'),
  responsibleStaffIds: z.array(z.string()).default([]),
  leadLawyerId: z.string().optional(),
  defaultLocation: z.string().optional(),
});

export type ProcessFormValues = z.infer<typeof processSchema>;

interface ProcessFormProps {
  onSave: () => void;
  process?: Process | null;
}

export function ProcessForm({ onSave, process }: ProcessFormProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch staff data
  const staffQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'staff') : null),
    [firestore]
  );
  const { data: staff } = useCollection<Staff>(staffQuery);

  // Initialize form
  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processSchema),
    defaultValues: getDefaultValues(process),
  });

  // Manage opposing parties field array
  const { fields: partyFields, append: addParty, remove: removeParty } = useFieldArray({
    control: form.control,
    name: 'opposingParties',
  });

  // Form submission handler
  async function onSubmit(values: ProcessFormValues) {
    if (!firestore) return;
    setIsSaving(true);

    try {
      const data = {
        ...values,
        updatedAt: serverTimestamp(),
      };

      if (process?.id) {
        // Update existing process
        const ref = doc(firestore, 'processes', process.id);
        await updateDoc(ref, data);
        toast({ title: 'Processo atualizado!' });
      } else {
        // Create new process
        const col = collection(firestore, 'processes');
        await addDoc(col, { ...data, createdAt: serverTimestamp() });
        toast({ title: 'Processo criado!' });
      }
      onSave();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleClientSelect = (client: Client) => {
    form.setValue('clientId', client.id);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 py-4 pr-6">
        <fieldset disabled={isSaving} className="space-y-10">
          {/* Identification and Status Section */}
          <IdentificationSection
            control={form.control}
            onClientSelect={handleClientSelect}
            selectedClientId={form.watch('clientId')}
          />

          {/* Court and Location Section */}
          <CourtSection control={form.control} />

          {/* Team Section */}
          <TeamSection control={form.control} staff={staff} />

          {/* Opposing Parties Section */}
          <PartiesSection
            control={form.control}
            partyFields={partyFields as any}
            onAddParty={() => addParty('')}
            onRemoveParty={removeParty}
          />
        </fieldset>

        {/* Form Footer */}
        <SheetFooter className="border-t pt-6">
          <Button type="button" variant="outline" onClick={onSave} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving} className="min-w-[150px]">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {process ? 'Salvar Alterações' : 'Cadastrar Processo'}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getDefaultValues(process?: Process | null): ProcessFormValues {
  if (!process) {
    return {
      clientId: '',
      name: '',
      processNumber: '',
      status: 'Ativo',
      opposingParties: [],
      responsibleStaffIds: [],
      leadLawyerId: '',
      defaultLocation: '',
      caseValue: 0,
    };
  }

  return {
    ...process,
    opposingParties: process.opposingParties || [],
    responsibleStaffIds: process.responsibleStaffIds || [],
    leadLawyerId: process.leadLawyerId || '',
    defaultLocation: process.defaultLocation || '',
  };
}
