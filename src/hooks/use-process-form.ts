
import { useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { useFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc, updateDoc } from 'firebase/firestore';
import type { Process } from '@/lib/types';

export const processSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente principal.'),
  clientRole: z.enum(['Polo Ativo', 'Polo Passivo'], { required_error: 'Selecione o papel do cliente.' }),
  secondaryClientIds: z.array(z.object({ id: z.string() })).default([]),
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
  courtWebsite: z.string().url('Link inválido').optional().or(z.literal('')).or(z.string().length(0)),
  leadLawyerId: z.string().min(1, 'Defina o advogado responsável.'),
  teamParticipants: z.array(z.object({
    staffId: z.string().min(1, 'Selecione um membro.'),
    percentage: z.coerce.number().min(0),
  })).default([]),
  opposingParties: z.array(z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    document: z.string().optional().or(z.literal('')),
    email: z.string().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    cep: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    observation: z.string().optional().or(z.literal('')),
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
      secondaryClientIds: (process.secondaryClientIds || []).map(id => ({ id })),
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

  const loadDraft = useCallback((processId?: string) => {
    try {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY(processId));
      return draft ? JSON.parse(draft) : null;
    } catch (error) {
      console.error('Erro ao carregar rascunho:', error);
      return null;
    }
  }, []);

  const clearDraft = useCallback((processId?: string) => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY(processId));
    } catch (error) {
      console.error('Erro ao limpar rascunho:', error);
    }
  }, []);

  // Helper para remover campos undefined que quebram o Firestore
  const sanitizeData = (data: any) => {
    const clean: any = {};
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        if (Array.isArray(data[key])) {
          clean[key] = data[key].map((item: any) => 
            (typeof item === 'object' && item !== null) ? sanitizeData(item) : item
          );
        } else if (typeof data[key] === 'object' && data[key] !== null && !(data[key] instanceof Date)) {
          clean[key] = sanitizeData(data[key]);
        } else {
          clean[key] = data[key];
        }
      }
    });
    return clean;
  };

  const submitForm = useCallback(async (values: ProcessFormValues) => {
    if (!firestore) return false;

    try {
      let savedProcessId = process?.id;
      
      // Preparação e Limpeza de Dados (Crucial para evitar erro de undefined)
      const rawData = {
        ...values,
        secondaryClientIds: values.secondaryClientIds.map(item => item.id),
        updatedAt: serverTimestamp(),
      };

      const cleanData = sanitizeData(rawData);

      if (process?.id) {
        const ref = doc(firestore, 'processes', process.id);
        await updateDoc(ref, cleanData);
        clearDraft(process.id);
        toast({ 
          title: 'Processo atualizado!', 
          description: 'As alterações foram salvas com sucesso.',
        });
      } else {
        const col = collection(firestore, 'processes');
        const docRef = await addDoc(col, { ...cleanData, createdAt: serverTimestamp() });
        clearDraft();
        savedProcessId = docRef.id;
        toast({ 
          title: 'Processo criado!', 
          description: 'O novo caso foi registrado e organizado.',
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
        description: error.message || 'Não foi possível salvar os dados do processo. Verifique se todos os campos obrigatórios estão preenchidos.',
      });
      return false;
    }
  }, [firestore, process, toast, onSave, clearDraft]);

  return { defaultValues, submitForm, saveDraft, loadDraft, clearDraft };
};
