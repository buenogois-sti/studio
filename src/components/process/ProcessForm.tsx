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
import { collection, serverTimestamp, doc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
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
  opposingParties: z.array(z.object({ name: z.string().min(1, 'Nome da parte é obrigatório') })).default([]),
  description: z.string().optional(),
  status: z.enum(['Ativo', 'Arquivado', 'Pendente']).default('Ativo'),
  responsibleStaffIds: z.array(z.string()).default([]),
  leadLawyerId: z.string().min(1, 'Defina o advogado responsável.'),
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
          name: '',
          processNumber: '',
          status: 'Ativo' as const,
          opposingParties: [],
          responsibleStaffIds: [],
          leadLawyerId: '',
          defaultLocation: '',
          caseValue: 0,
          description: '',
        };
      }
      return {
        clientId: process.clientId || '',
        name: process.name || '',
        processNumber: process.processNumber || '',
        status: (process.status as 'Ativo' | 'Arquivado' | 'Pendente') || 'Ativo',
        opposingParties: process.opposingParties?.map(name => ({ name })) || [],
        responsibleStaffIds: process.responsibleStaffIds || [],
        leadLawyerId: process.leadLawyerId || '',
        defaultLocation: process.defaultLocation || '',
        caseValue: process.caseValue || 0,
        description: process.description || '',
      };
    }, [process]),
  });

  const { fields: partyFields, append: addParty, remove: removeParty } = useFieldArray({
    control: form.control,
    name: 'opposingParties',
  });

  async function onSubmit(values: ProcessFormValues) {
    if (!firestore) return;
    setIsSaving(true);

    try {
      const data = {
        ...values,
        opposingParties: values.opposingParties.map(p => p.name),
        updatedAt: serverTimestamp(),
      };

      if (process?.id) {
        const ref = doc(firestore, 'processes', process.id);
        await updateDoc(ref, data);
        toast({ title: 'Processo atualizado!', description: 'As alterações foram salvas com sucesso.' });
      } else {
        const col = collection(firestore, 'processes');
        await addDoc(col, { ...data, createdAt: serverTimestamp() });
        toast({ title: 'Processo criado!', description: 'O novo caso foi registrado na plataforma.' });
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

  const handleClientSelect = (client: Client) => {
    form.setValue('clientId', client.id, { shouldValidate: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 py-4">
        <fieldset disabled={isSaving} className="space-y-10">
          <IdentificationSection
            control={form.control}
            onClientSelect={handleClientSelect}
            selectedClientId={form.watch('clientId')}
          />

          <CourtSection control={form.control} />

          <TeamSection control={form.control} staff={staff} />

          <PartiesSection
            control={form.control}
            partyFields={partyFields}
            onAddParty={() => addParty({ name: '' })}
            onRemoveParty={removeParty}
          />
        </fieldset>

        <SheetFooter className="border-t pt-8">
          <Button type="button" variant="outline" onClick={onSave} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving} className="min-w-[180px] font-bold">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {process ? 'Salvar Alterações' : 'Cadastrar Processo'}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}
