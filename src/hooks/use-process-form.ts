import { useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { useFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc, updateDoc } from 'firebase/firestore';
import type { Process } from '@/lib/types';

export const processSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente principal.'),
  secondaryClientIds: z.array(z.string()).default([]),
  name: z.string()
    .min(3, 'O título deve ter no mínimo 3 caracteres.')
    .max(200, 'O título deve ter no máximo 200 caracteres.'),
  processNumber: z.string().optional(),
  status: z.enum(['Ativo', 'Arquivado', 'Pendente']).default('Ativo'),
  legalArea: z.string().min(1, 'Selecione a área jurídica.'),
  caseValue: z.coerce.number().min(0, 'O valor não pode ser negativo.').default(0),
  court: z.string().optional(),
  courtAddress: z.string().optional(),
  courtBranch: z.string().optional(),
  leadLawyerId: z.string().min(1, 'Defina o advogado responsável.'),
  teamParticipants: z.array(z.object({
    staffId: z.string().min(1, 'Selecione um membro.'),
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

export const useProcessForm = (process?: Process | null, onSave?: () => void) => {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const defaultValues = useMemo<ProcessFormValues>(() => {
    if (!process) {
      return {
        clientId: '',
        secondaryClientIds: [],
        name: '',
        processNumber: '',
        status: 'Ativo',
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
      status: process.status || 'Ativo',
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
  }, [process]);

  const submitForm = useCallback(async (values: ProcessFormValues) => {
    if (!firestore) return false;

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
        toast({ title: 'Processo criado!', description: 'O novo caso foi registrado e organizado.' });
      }
      
      onSave?.();
      return true;
    } catch (error: any) {
      console.error("Save process error:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar os dados do processo.',
      });
      return false;
    }
  }, [firestore, process, toast, onSave]);

  return { defaultValues, submitForm };
};