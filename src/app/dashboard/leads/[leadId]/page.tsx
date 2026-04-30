'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadDetailsContent } from '@/components/leads/LeadDetailsContent';
import { 
  updateLeadDetails, 
  updateLeadStatus, 
  updateLeadAiAnalysis, 
  archiveLead, 
  deleteLeadAction,
  convertLeadToProcess
} from '@/lib/lead-actions';
import { analyzeLead } from '@/ai/flows/analyze-lead-flow';
import { useToast } from '@/components/ui/use-toast';
import { STAGES } from '@/lib/leads-constants';
import type { Lead, Client, Staff } from '@/lib/types';

export default function LeadIndividualPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const leadId = params.leadId as string;

  const [isAdvancing, setIsAdvancing] = React.useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const leadRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'leads', leadId) : null),
    [firestore, leadId]
  );
  const { data: lead, isLoading: loadingLead } = useDoc<Lead>(leadRef);

  const clientRef = useMemoFirebase(
    () => (firestore && lead ? doc(firestore, 'clients', lead.clientId) : null),
    [firestore, lead]
  );
  const { data: client } = useDoc<Client>(clientRef);

  const staffQuery = useMemoFirebase(
    () => (firestore ? doc(firestore, 'staff', 'dummy').parent : null),
    [firestore]
  );
  const { data: staffData } = useCollection<Staff>(staffQuery);

  const lawyers = React.useMemo(() => staffData?.filter(s => s.role === 'lawyer' || s.role === 'partner') || [], [staffData]);
  const interviewers = React.useMemo(() => staffData?.filter(s => s.role === 'lawyer' || s.role === 'partner' || s.role === 'intern') || [], [staffData]);

  const handleUpdateTitle = async (newTitle: string) => {
    if (!lead) return;
    try {
      await updateLeadDetails(lead.id, { title: newTitle });
      toast({ title: 'Título atualizado!' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: e.message });
    }
  };

  const handleArchive = async () => {
    if (!lead) return;
    const reason = window.prompt("Motivo para arquivar:", "");
    if (reason === null) return;
    setIsArchiving(true);
    try {
      await archiveLead(lead.id, reason);
      router.push('/dashboard/leads');
      toast({ title: 'Lead Arquivado!' });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    const reason = window.prompt("Motivo da exclusão (obrigatório):", "");
    if (!reason) return;
    setIsDeleting(true);
    try {
      await deleteLeadAction(lead.id, reason);
      router.push('/dashboard/leads');
      toast({ title: 'Lead Excluído' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAiAnalyze = async () => {
    if (!lead) return;
    setIsAiAnalyzing(true);
    try {
      const result = await analyzeLead({
        leadTitle: lead.title,
        leadDescription: lead.description || '',
        legalArea: lead.legalArea,
        interviewAnswers: lead.interviewAnswers
      });
      await updateLeadAiAnalysis(lead.id, result);
      toast({ title: 'Análise Concluída!' });
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleToggleTask = async (task: string) => {
    if (!lead) return;
    const completed = lead.completedTasks || [];
    const updated = completed.includes(task) ? completed.filter(t => t !== task) : [...completed, task];
    await updateLeadDetails(lead.id, { completedTasks: updated });
  };

  const handleAdvanceStage = async () => {
    if (!lead) return;
    setIsAdvancing(true);
    try {
      const currentIndex = STAGES.indexOf(lead.status);
      if (currentIndex < STAGES.length - 1) {
        await updateLeadStatus(lead.id, STAGES[currentIndex + 1]);
        toast({ title: 'Avançado!' });
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleConfirmProtocol = async (values: any) => {
    if (!lead) return;
    try {
      await convertLeadToProcess(lead.id, values);
      toast({ title: 'Convertido em Processo!' });
      router.push('/dashboard/leads');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  if (loadingLead) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Carregando Ficha do Lead...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center">
        <h2 className="text-xl font-black text-white uppercase">Lead não encontrado</h2>
        <Button onClick={() => router.push('/dashboard/leads')} className="mt-4">Voltar ao Funil</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] -m-8 overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <LeadDetailsContent 
          lead={lead}
          client={client ?? undefined}
          lawyers={lawyers}
          interviewers={interviewers}
          onUpdateTitle={handleUpdateTitle}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onAiAnalyze={handleAiAnalyze}
          onToggleTask={handleToggleTask}
          onAdvanceStage={handleAdvanceStage}
          onConfirmProtocol={handleConfirmProtocol}
          isAiAnalyzing={isAiAnalyzing}
          isAdvancing={isAdvancing}
          isArchiving={isArchiving}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
