'use client';

import * as React from 'react';
import { 
  History, 
  User, 
  Scale, 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  CheckCircle,
  FileText, 
  Flame, 
  MessageSquare, 
  ShieldCheck, 
  Zap, 
  MoreVertical, 
  Archive, 
  Trash2, 
  Bot, 
  RefreshCw, 
  ArrowRight, 
  Edit3, 
  Save, 
  X,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { STAGES, stageConfig } from '@/lib/leads-constants';
import type { Lead, Client, Staff } from '@/lib/types';

// Dialogs
import { TaskInteractionDialog } from './dialogs/TaskInteractionDialog';
import { ScheduleInterviewDialog } from './dialogs/ScheduleInterviewDialog';
import { DocumentDraftingDialog } from '@/components/process/DocumentDraftingDialog';
import { LeadChecklistDialog } from './dialogs/LeadChecklistDialog';
import { LeadConversionDialog } from './dialogs/LeadConversionDialog';
import { ExecuteInterviewDialog } from './dialogs/ExecuteInterviewDialog';

interface LeadDetailsContentProps {
  lead: Lead;
  client?: Client;
  lawyers: Staff[];
  interviewers: Staff[];
  onUpdateTitle: (newTitle: string) => Promise<void>;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  onAiAnalyze: () => Promise<void>;
  onToggleTask: (task: string) => Promise<void>;
  onAdvanceStage: () => Promise<void>;
  onConfirmProtocol: (values: any) => Promise<void>;
  isAiAnalyzing: boolean;
  isAdvancing: boolean;
  isArchiving: boolean;
  isDeleting: boolean;
}

export function LeadDetailsContent({
  lead,
  client,
  lawyers,
  interviewers,
  onUpdateTitle,
  onArchive,
  onDelete,
  onAiAnalyze,
  onToggleTask,
  onAdvanceStage,
  onConfirmProtocol,
  isAiAnalyzing,
  isAdvancing,
  isArchiving,
  isDeleting
}: LeadDetailsContentProps) {
  const [activeTab, setActiveTab] = React.useState<'ficha' | 'timeline' | 'arquivos'>('ficha');
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState(lead.title);
  const [isSavingTitle, setIsSavingTitle] = React.useState(false);
  const [isDraftingOpen, setIsDraftingOpen] = React.useState(false);
  const [isSchedulingOpen, setIsSchedulingOpen] = React.useState(false);
  const [activeTaskDialog, setActiveTaskDialog] = React.useState<string | null>(null);
  const [isChecklistOpen, setIsChecklistOpen] = React.useState(false);
  const [isConversionOpen, setIsConversionOpen] = React.useState(false);
  const [isExecutingInterviewOpen, setIsExecutingInterviewOpen] = React.useState(false);

  const clientIntegrity = React.useMemo(() => {
    if (!client) return 0;
    const fields = [
      client.firstName, client.document, client.email, client.mobile, 
      client.address?.street, client.address?.zipCode, client.rg,
      client.bankInfo?.pixKey
    ];
    const filled = fields.filter(f => !!f).length;
    return Math.round((filled / fields.length) * 100);
  }, [client]);

  const handleSaveTitle = async () => {
    setIsSavingTitle(true);
    try {
      await onUpdateTitle(editedTitle);
      setIsEditingTitle(false);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const nextStage = STAGES[STAGES.indexOf(lead.status) + 1];

  return (
    <div className="flex flex-col h-full bg-[#020617]">
      <header className="px-6 py-4 border-b border-white/5 bg-white/[0.02] shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-slate-500 hover:text-white hover:bg-white/5" 
              onClick={() => window.history.back()}
              title="Voltar ao Funil"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 shadow-sm", stageConfig[lead.status].color)}>
              {React.createElement(stageConfig[lead.status].icon, { className: "h-5 w-5" })}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-[11px] font-black uppercase tracking-widest px-1.5 py-0 border-0 bg-white/5", stageConfig[lead.status].color)}>
                  {stageConfig[lead.status].label}
                </Badge>
                {lead.priority === 'CRITICA' && (
                  <div className="flex items-center gap-1 bg-rose-500/10 px-1.5 py-0 rounded-md border border-rose-500/20">
                    <Flame className="h-2.5 w-2.5 text-rose-500" />
                    <span className="text-[10px] font-black text-rose-500 uppercase">Crítica</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {isEditingTitle ? (
                  <input 
                    autoFocus
                    className="bg-black/40 border border-primary/30 rounded-md px-2 py-0.5 text-base font-bold text-white outline-none"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  />
                ) : (
                  <h1 className="text-base font-bold text-white tracking-tight group flex items-center gap-2 cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                    {lead.title}
                    <Edit3 className="h-3 w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h1>
                )}
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-slate-600" /> <span>{lead.clientName}</span></div>
                  <div className="flex items-center gap-1.5"><Scale className="h-3.5 w-3.5 text-slate-600" /> <span>{lead.legalArea}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-[12px] font-bold uppercase tracking-wider bg-white/5 border-white/10 hover:bg-white/10" onClick={() => setIsDraftingOpen(true)}>
              <FileText className="h-3.5 w-3.5 mr-2 text-primary" /> Gerar Docs
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-white/5">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 text-white">
                <DropdownMenuItem onClick={onArchive} disabled={isArchiving} className="text-amber-500 text-[12px] font-bold uppercase">
                  <Archive className="mr-2 h-3.5 w-3.5" /> Arquivar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} disabled={isDeleting} className="text-rose-500 text-[12px] font-bold uppercase">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0">
        <div className="px-6 border-b border-white/5 bg-[#020617] shrink-0">
          <TabsList className="h-9 bg-transparent p-0 gap-6">
            <TabsTrigger value="ficha" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-white text-[11px] font-black uppercase tracking-widest px-0 transition-all">Ficha do Atendimento</TabsTrigger>
            <TabsTrigger value="timeline" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-white text-[11px] font-black uppercase tracking-widest px-0 transition-all">Linha do Tempo</TabsTrigger>
            <TabsTrigger value="arquivos" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-white text-[11px] font-black uppercase tracking-widest px-0 transition-all">Arquivos & Provas</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <TabsContent value="ficha" className="m-0 space-y-6 focus-visible:outline-none focus-visible:ring-0">
              {/* Executive Summary Section */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Agenda', value: lead.interviewDate ? format(new Date(`${lead.interviewDate}T${lead.interviewTime || '00:00'}`), "dd/MM 'às' HH:mm", { locale: ptBR }) : 'Pendente', icon: Calendar, color: 'text-primary', onClick: () => setIsSchedulingOpen(true) },
                  { label: 'Entrevistas', value: `${lead.interviews?.length || 0} Realizada(s)`, icon: ClipboardList, color: 'text-emerald-500', onClick: () => setIsExecutingInterviewOpen(true) },
                  { label: 'Integridade', value: `${clientIntegrity}%`, icon: Flame, color: 'text-rose-500' }
                ].map((item, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between hover:bg-white/[0.04] transition-colors cursor-pointer group" onClick={item.onClick}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</span>
                      <item.icon className={cn("h-3 w-3", item.color)} />
                    </div>
                    <span className="text-[11px] font-bold text-white truncate uppercase tracking-tight">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                  <section className="bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <ClipboardList className="h-3.5 w-3.5 text-emerald-500" /> Histórico Técnico
                      </h3>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] font-black uppercase text-emerald-500 hover:bg-emerald-500/10" onClick={() => setIsExecutingInterviewOpen(true)}>
                        Nova Execução
                      </Button>
                    </div>
                    <div className="divide-y divide-white/5">
                      {lead.interviews && lead.interviews.length > 0 ? (
                        lead.interviews.map((interview: any, idx: number) => (
                          <div key={interview.id || idx} className="p-3 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-[12px] font-bold text-slate-600">#{idx + 1}</span>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-200 uppercase leading-none mb-1">{interview.templateTitle}</span>
                                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{format(interview.executedAt?.toDate() || new Date(), 'dd MMM, HH:mm', { locale: ptBR })}</span>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"><ChevronRight className="h-4 w-4" /></Button>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center"><p className="text-[11px] font-black uppercase text-slate-700 tracking-widest">Nenhum atendimento registrado</p></div>
                      )}
                    </div>
                  </section>


                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" /> Análise de Viabilidade (IA)
                      </h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={onAiAnalyze}
                        disabled={isAiAnalyzing}
                        className="h-8 text-[11px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                      >
                        {isAiAnalyzing ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />} 
                        Recalcular
                      </Button>
                    </div>

                    {lead.aiAnalysis ? (
                      <div className="rounded-2xl bg-primary/[0.02] border border-primary/10 overflow-hidden shadow-sm animate-in fade-in duration-500">
                        <div className="p-6 space-y-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <p className="text-[12px] font-black uppercase text-primary tracking-widest">Resumo Estratégico</p>
                              <p className="text-sm text-slate-300 leading-relaxed font-medium">{lead.aiAnalysis.summary}</p>
                            </div>
                            <div className="flex flex-col items-center gap-1 bg-black/40 border border-primary/10 p-3 rounded-2xl min-w-[90px]">
                              <span className="text-2xl font-black text-primary">{lead.aiAnalysis.score}</span>
                              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Score</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-[12px] font-black uppercase text-primary tracking-widest">Parecer Técnico</p>
                            <div className="bg-black/40 rounded-xl p-4 border border-white/5 text-[11px] text-slate-400 font-bold leading-relaxed italic border-l-2 border-l-primary">
                              "{lead.aiAnalysis.legalAdvice}"
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-40 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <Bot className="h-10 w-10 text-slate-700" />
                        <div>
                          <p className="text-xs font-black uppercase text-slate-500">Inteligência Artificial em Espera</p>
                          <p className="text-[12px] text-slate-600 font-bold max-w-xs mt-1 uppercase">Clique em "Atualizar Análise" para processar os dados deste caso.</p>
                        </div>
                      </div>
                    )}
                  </section>
                </div>

                <div className="space-y-8">
                  <section className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Dados do Cliente</h3>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary text-black flex items-center justify-center text-xl font-black shadow-lg shadow-primary/20">
                          {client?.firstName.charAt(0) || 'C'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white uppercase truncate">{client?.firstName} {client?.lastName}</p>
                          <p className="text-[12px] font-bold text-slate-500 font-mono">{client?.document || 'Documento Pendente'}</p>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <div className="space-y-1">
                          <p className="text-[11px] font-black uppercase text-slate-600 tracking-widest">Integridade Cadastral</p>
                          <div className="flex items-center gap-3">
                            <Progress value={clientIntegrity} className="h-1.5 flex-1 bg-white/5" indicatorClassName={cn(clientIntegrity > 80 ? "bg-emerald-500" : "bg-amber-500")} />
                            <span className="text-[12px] font-black text-slate-400">{clientIntegrity}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="bg-black/40 border border-white/5 rounded-3xl p-6 space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Briefing Original</h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed italic">
                        "{lead.description || 'Nenhum detalhe informado na abertura.'}"
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="max-w-2xl mx-auto space-y-6 pt-6">
                {lead.timeline?.map((event) => (
                  <div key={event.id} className="relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-px before:bg-white/5">
                    <div className={cn("absolute -left-1 top-2 h-2 w-2 rounded-full", event.type === 'system' ? "bg-primary" : "bg-slate-700")} />
                    <div className="bg-white/[0.01] border border-white/5 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{format(event.date.toDate(), 'dd MMM yyyy • HH:mm', { locale: ptBR })}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full uppercase">{event.authorName}</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-300 leading-tight uppercase tracking-tight">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="arquivos" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="h-64 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-center p-6 space-y-3 mt-6">
                <Briefcase className="h-8 w-8 text-slate-800" />
                <div>
                  <p className="text-[12px] font-black uppercase text-slate-500 tracking-widest">Repositório de Provas</p>
                  <p className="text-[12px] text-slate-700 font-bold uppercase mt-1">Sincronização com Google Drive Pendente</p>
                </div>
              </div>
            </TabsContent>
          </div>
        </ScrollArea>

        <footer className="fixed bottom-0 left-0 right-0 h-14 bg-[#020617]/90 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Responsável</span>
              <span className="text-[12px] font-bold text-white uppercase">{lawyers.find(l => l.id === lead.lawyerId) ? `Dr. ${lawyers.find(l => l.id === lead.lawyerId)?.firstName}` : 'Não Designado'}</span>
            </div>
            <Separator orientation="vertical" className="h-6 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Próxima Etapa</span>
              <span className="text-[12px] font-bold text-primary uppercase">{nextStage ? stageConfig[nextStage].label : 'Finalizado'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" className="h-9 px-4 text-[11px] font-black uppercase text-slate-500 tracking-widest hover:text-white" onClick={() => window.history.back()}>Voltar ao Funil</Button>
            <Button 
              onClick={onAdvanceStage}
              disabled={isAdvancing || !nextStage}
              className="h-9 px-6 bg-primary text-black font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/10 hover:scale-105 transition-all gap-2"
            >
              {isAdvancing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
              Avançar para {nextStage ? stageConfig[nextStage].label : 'Conclusão'}
            </Button>
          </div>
        </footer>
      </Tabs>

      {/* Internal Dialogs */}
      <DocumentDraftingDialog lead={lead} open={isDraftingOpen} onOpenChange={setIsDraftingOpen} />
      <ScheduleInterviewDialog 
        lead={lead} 
        open={isSchedulingOpen} 
        onOpenChange={setIsSchedulingOpen} 
        onSuccess={() => {}} 
        lawyers={lawyers} 
        interviewers={interviewers} 
      />
      <TaskInteractionDialog 
        lead={lead} 
        task={activeTaskDialog || ''} 
        open={!!activeTaskDialog} 
        onOpenChange={(o) => !o && setActiveTaskDialog(null)}
        lawyers={lawyers}
        onSuccess={async () => setActiveTaskDialog(null)}
      />
      <LeadChecklistDialog 
        lead={lead} 
        open={isChecklistOpen} 
        onOpenChange={setIsChecklistOpen} 
        onSuccess={() => {}} 
      />
      <LeadConversionDialog 
        lead={lead} 
        open={isConversionOpen} 
        onOpenChange={setIsConversionOpen} 
        onConfirm={onConfirmProtocol} 
        lawyers={lawyers} 
        commissionableStaff={lawyers}
      />
      <ExecuteInterviewDialog 
        lead={lead} 
        open={isExecutingInterviewOpen} 
        onOpenChange={setIsExecutingInterviewOpen} 
        onSuccess={() => {}} 
      />
    </div>
  );
}
