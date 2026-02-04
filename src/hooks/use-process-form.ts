import { useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { useFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc, updateDoc } from 'firebase/firestore';
import type { Process } from '@/lib/types';

export const processSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente principal.'),
  clientRole: z.enum(['Polo Ativo', 'Polo Passivo'], { required_error: 'Selecione o papel do cliente.' }),
  secondaryClientIds: z.array(z.string()).default([]),
  name: z.string()
    .min(3, 'O título deve ter no mínimo 3 caracteres.')
    .max(200, 'O título deve ter no máximo 200 caracteres.'),
  processNumber: z.string().optional().or(z.literal('')),
  status: z.enum(['Ativo', 'Arquivado', 'Pendente']).default('Ativo'),
  legalArea: z.string().min(1, 'Selecione a área jurídica.'),
  caseValue: z.coerce.number().min(0, 'O valor não pode ser negativo.').default(0),
  court: z.string().optional().or(z.literal('')),
  courtAddress: z.string().optional().or(z.literal('')),
  courtBranch: z.string().optional().or(z.literal('')),
  courtWebsite: z.string().url('Link inválido').optional().or(z.literal('')),
  leadLawyerId: z.string().min(1, 'Defina o advogado responsável.'),
  teamParticipants: z.array(z.object({
    staffId: z.string().min(1, 'Selecione um membro.'),
    percentage: z.coerce.number().min(0),
  })).default([]),
  opposingParties: z.array(z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
  })).default([]),
  description: z.string().optional().or(z.literal('')),
});

export type ProcessFormValues = z.infer<typeof processSchema>;

const DRAFT_STORAGE_KEY = (processId?: string) => `process_draft_${processId || 'new'}`;

export const useProcessForm = (process?: Process | null, onSave?: () => void) => {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const normalizeClientRole = (role?: string) => {
    if (role === 'Autor') return 'Polo Ativo';
    if (role === 'Réu') return 'Polo Passivo';
    if (role === 'Polo Ativo' || role === 'Polo Passivo') return role;
    return 'Polo Ativo';
  };

  const defaultValues = useMemo<ProcessFormValues>(() => {
    if (!process) {
      return {
        clientId: '',
        clientRole: 'Polo Ativo',
        secondaryClientIds: [],
        name: '',
        processNumber: '',
        status: 'Ativo',
        legalArea: 'Trabalhista',
        caseValue: 0,
        court: '',
        courtAddress: '',
        courtBranch: '',
        courtWebsite: '',
        leadLawyerId: '',
        teamParticipants: [],
        opposingParties: [],
        description: '',
      };
    }
    return {
      clientId: process.clientId || '',
      clientRole: normalizeClientRole(process.clientRole),
      secondaryClientIds: process.secondaryClientIds || [],
      name: process.name || '',
      processNumber: process.processNumber || '',
      status: process.status || 'Ativo',
      legalArea: process.legalArea || 'Trabalhista',
      caseValue: process.caseValue || 0,
      court: process.court || '',
      courtAddress: process.courtAddress || '',
      courtBranch: process.courtBranch || '',
      courtWebsite: process.courtWebsite || '',
      leadLawyerId: process.leadLawyerId || '',
      teamParticipants: process.teamParticipants || [],
      opposingParties: process.opposingParties || [],
      description: process.description || '',
    };
  }, [process]);

  // Salva rascunho no localStorage
  const saveDraft = useCallback(async (values: ProcessFormValues, processId?: string) => {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY(processId),
        JSON.stringify({
          ...values,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
    }
  }, []);

  // Carrega rascunho do localStorage
  const loadDraft = useCallback((processId?: string) => {
    try {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY(processId));
      return draft ? JSON.parse(draft) : null;
    } catch (error) {
      console.error('Erro ao carregar rascunho:', error);
      return null;
    }
  }, []);

  // Remove rascunho após salvar com sucesso
  const clearDraft = useCallback((processId?: string) => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY(processId));
    } catch (error) {
      console.error('Erro ao limpar rascunho:', error);
    }
  }, []);

  const submitForm = useCallback(async (values: ProcessFormValues) => {
    if (!firestore) return false;

    try {
      let savedProcessId = process?.id;
      const data = {
        ...values,
        updatedAt: serverTimestamp(),
      };

      if (process?.id) {
        const ref = doc(firestore, 'processes', process.id);
        await updateDoc(ref, data);
        clearDraft(process.id);
        toast({ 
          title: 'Processo atualizado!', 
          description: 'As alterações foram salvas com sucesso.',
          variant: 'default'
        });
      } else {
        const col = collection(firestore, 'processes');
        const docRef = await addDoc(col, { ...data, createdAt: serverTimestamp() });
        clearDraft();
        savedProcessId = docRef.id;
        toast({ 
          title: 'Processo criado!', 
          description: 'O novo caso foi registrado e organizado.',
          variant: 'default'
        });
      }

      if (savedProcessId) {
        try {
          await fetch('/api/drive/sync-process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ processId: savedProcessId }),
          });
        } catch (error) {
          console.error('Erro ao sincronizar processo no Drive:', error);
        }
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
  }, [firestore, process, toast, onSave, clearDraft]);

  return { defaultValues, submitForm, saveDraft, loadDraft, clearDraft };
};