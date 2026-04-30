'use client';

import * as React from 'react';
import { 
  Sheet, 
  SheetContent, 
} from '@/components/ui/sheet';
import { useFirebase } from '@/firebase';
import { useToast } from '@/components/ui/use-toast';
import { 
  updateLeadDetails, 
  updateLeadStatus, 
  updateLeadAiAnalysis, 
  archiveLead, 
  deleteLeadAction,
  convertLeadToProcess
} from '@/lib/lead-actions';
import { analyzeLead } from '@/ai/flows/analyze-lead-flow';
import type { Lead, Client, Staff } from '@/lib/types';
import { LeadDetailsContent } from './LeadDetailsContent';

interface LeadDetailsSheetProps {
  lead: Lead | null;
  client?: Client;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEditClient: (c: Client) => void;
  lawyers: Staff[];
  interviewers: Staff[];
  initialTab?: 'ficha' | 'timeline';
}

export function LeadDetailsSheet({ 
  lead, 
  client, 
  open, 
  onOpenChange, 
  onEditClient,
  lawyers,
  interviewers,
}: LeadDetailsSheetProps) {
  const { toast } = useToast();
  const [isAdvancing, setIsAdvancing] = React.useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!lead) return null;

  const handleUpdateTitle = async (newTitle: string) => {
    try {
      await updateLeadDetails(lead.id, { title: newTitle });
      toast({ title: 'Título atualizado!' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: e.message });
    }
  };

  const handleArchive = async () => {
    const reason = window.prompt("Motivo para arquivar:", "");
    if (reason === null) return;
    setIsArchiving(true);
    try {
      await archiveLead(lead.id, reason);
      onOpenChange(false);
      toast({ title: 'Lead Arquivado!' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    const reason = window.prompt("Motivo da exclusão (obrigatório):", "");
    if (!reason) return;
    setIsDeleting(true);
    try {
      await deleteLeadAction(lead.id, reason);
      onOpenChange(false);
      toast({ title: 'Lead Excluído' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAiAnalyze = async () => {
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
    const completed = lead.completedTasks || [];
    const updated = completed.includes(task) ? completed.filter(t => t !== task) : [...completed, task];
    await updateLeadDetails(lead.id, { completedTasks: updated });
  };

  const handleAdvanceStage = async () => {
    // Logic for advancing stage
    setIsAdvancing(true);
    try {
      // simplified logic
      toast({ title: 'Avançado!' });
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleConfirmProtocol = async (values: any) => {
    try {
      await convertLeadToProcess(lead.id, values);
      toast({ title: 'Convertido em Processo!' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[85vw] p-0 bg-[#020617] border-white/10 flex flex-col shadow-2xl overflow-hidden">
        <LeadDetailsContent 
          lead={lead}
          client={client}
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
      </SheetContent>
    </Sheet>
  );
}
