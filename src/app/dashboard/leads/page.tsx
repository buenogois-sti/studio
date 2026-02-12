
'use client';

import * as React from 'react';
import { 
  Zap, 
  Search, 
  PlusCircle, 
  Loader2, 
  MoreVertical, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  UserCircle,
  FolderKanban,
  AlertCircle,
  Scale,
  ArrowRight,
  X,
  Target,
  Flame,
  Info,
  UserPlus,
  ShieldCheck,
  FileText,
  Smartphone,
  History,
  MessageSquare,
  Plus,
  Activity,
  Check,
  Bot,
  RefreshCw,
  CalendarDays,
  Video,
  FilePlus2,
  ClipboardList,
  DollarSign,
  Mail,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  TrendingUp,
  Thermometer,
  Timer
} from 'lucide-react';

import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, Timestamp, limit, updateDoc, where, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import type { Lead, Client, Staff, LeadStatus, LeadPriority, UserProfile, TimelineEvent, OpposingParty, ChecklistTemplate } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isBefore, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { createLead, updateLeadStatus, convertLeadToProcess, scheduleLeadInterview } from '@/lib/lead-actions';
import { ClientSearchInput } from '@/components/process/ClientSearchInput';
import { ClientCreationModal } from '@/components/process/ClientCreationModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { v4 as uuidv4 } from 'uuid';
import { syncLeadToDrive } from '@/lib/drive';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DocumentDraftingDialog } from '@/components/process/DocumentDraftingDialog';
import { extractProtocolData } from '@/ai/flows/extract-protocol-data-flow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STAGES: LeadStatus[] = ['NOVO', 'ATENDIMENTO', 'BUROCRACIA', 'CONTRATUAL', 'DISTRIBUICAO'];

const stageConfig: Record<LeadStatus, { label: string; color: string; icon: any; tasks: string[] }> = {
  NOVO: { 
    label: 'Triagem', 
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', 
    icon: Zap, 
    tasks: ['Relato inicial do cliente', 'Identificação da área jurídica', 'Verificação de conflito de interesse'] 
  },
  ATENDIMENTO: { 
    label: 'Atendimento', 
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', 
    icon: UserCircle, 
    tasks: ['Agendamento de entrevista', 'Entrevista realizada', 'Análise de provas iniciais', 'Parecer de viabilidade jurídica'] 
  },
  BUROCRACIA: { 
    label: 'Burocracia', 
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', 
    icon: Clock, 
    tasks: ['Coleta de dados pessoais completos', 'Qualificação completa do Réu', 'Organização do acervo de provas', 'Preparação de procuração/subst'] 
  },
  CONTRATUAL: { 
    label: 'Contratual', 
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', 
    icon: ShieldCheck, 
    tasks: ['Emissão dos contratos/procuração', 'Asssignature colhida (Contrato)', 'Asssignature colhida (Procuração)', 'Check de integridade documental'] 
  },
  DISTRIBUICAO: { 
    label: 'Distribuição', 
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', 
    icon: FolderKanban, 
    tasks: ['Elaboração da Peça Inicial', 'Juntada de provas e documentos', 'Revisão final de viabilidade', 'Designação de equipe final'] 
  },
  CONVERTIDO: { label: 'Convertido', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: CheckCircle2, tasks: [] },
  ABANDONADO: { label: 'Abandonado', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: AlertCircle, tasks: [] },
};

const leadFormSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente.'),
  lawyerId: z.string().min(1, 'Selecione um advogado.'),
  title: z.string().min(5, 'Mínimo 5 caracteres.'),
  legalArea: z.string().min(1, 'Selecione a área.'),
  priority: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).default('MEDIA'),
  captureSource: z.string().min(1, 'Selecione a fonte.'),
  isUrgent: z.boolean().default(false),
  prescriptionDate: z.string().optional().or(z.literal('')),
  description: z.string().optional(),
});

const conversionSchema = z.object({
  processNumber: z.string().min(10, 'O número CNJ é obrigatório para protocolar.'),
  court: z.string().min(3, 'O fórum/comarca é obrigatório.'),
  courtBranch: z.string().min(3, 'A vara judiciária é obrigatória.'),
  caseValue: z.coerce.number().min(0, 'Informe o valor da causa.'),
  leadLawyerId: z.string().min(1, 'Defina o advogado responsável.'),
  opposingParties: z.array(z.object({
    name: z.string().min(1, 'Nome do réu é obrigatório'),
    document: z.string().optional(),
    address: z.string().optional(),
  })).min(1, 'Pelo menos um réu deve ser qualificado.'),
});

const scheduleInterviewSchema = z.object({
  date: z.string().min(1, 'Selecione a data.'),
  time: z.string().min(1, 'Selecione o horário.'),
  location: z.string().min(1, 'Selecione o local/modo.'),
  notes: z.string().optional(),
});

function ScheduleInterviewDialog({ 
  lead, 
  open, 
  onOpenChange,
  onSuccess
}: { 
  lead: Lead | null; 
  open: boolean; 
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const form = useForm<z.infer<typeof scheduleInterviewSchema>>({
    resolver: zodResolver(scheduleInterviewSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '09:00',
      location: 'Sede - Bueno Gois Advogados',
      notes: ''
    }
  });

  const onSubmit = async (values: z.infer<typeof scheduleInterviewSchema>) => {
    if (!lead) return;
    setIsSaving(true);
    try {
      await scheduleLeadInterview(lead.id, values);
      toast({ title: 'Entrevista Agendada!', description: 'O compromisso foi salvo na sua agenda Google.' });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Falha no agendamento', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#020617] border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Agendar Entrevista Técnica
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            O compromisso será sincronizado com o Google Agenda do responsável.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">Data</FormLabel>
                    <FormControl><Input type="date" className="bg-black/40 border-white/10 h-10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">Horário</FormLabel>
                    <FormControl><Input type="time" className="bg-black/40 border-white/10 h-10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500">Local / Modo de Atendimento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-black/40 border-white/10 h-10">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#0f172a] text-white">
                      <SelectItem value="Sede - Bueno Gois Advogados">🏢 Presencial na Sede</SelectItem>
                      <SelectItem value="Reunião Online (Google Meet)">🎥 Reunião Online (Meet)</SelectItem>
                      <SelectItem value="Atendimento via WhatsApp Video">📱 WhatsApp Vídeo</SelectItem>
                      <SelectItem value="Diligência Externa">🚗 Diligência Externa</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500">Notas Adicionais</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ex: Cliente virá com as CTPS originais..." className="bg-black/40 border-white/10 text-xs resize-none h-20" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
              <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px]">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Confirmar Agendamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function LeadDetailsSheet({ 
  lead, 
  client, 
  open, 
  onOpenChange, 
  onProtocolClick,
}: { 
  lead: Lead | null; 
  client?: Client; 
  open: boolean; 
  onOpenChange: (o: boolean) => void;
  onProtocolClick: (l: Lead) => void;
}) {
  const { firestore } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isAdvancing, setIsAdvancing] = React.useState(false);
  const [newNote, setNewNote] = React.useState('');
  const [isDraftingOpen, setIsDraftingOpen] = React.useState(false);
  const [isSchedulingOpen, setIsSchedulingOpen] = React.useState(false);

  const interviewQuery = useMemoFirebase(
    () => (firestore && lead ? query(collection(firestore, 'checklist_templates'), where('category', '==', 'Entrevista de Triagem'), where('legalArea', '==', lead.legalArea), limit(1)) : null),
    [firestore, lead?.legalArea]
  );
  const { data: interviewTemplates } = useCollection<ChecklistTemplate>(interviewQuery);
  const activeInterview = interviewTemplates?.[0];

  const handleToggleTask = async (task: string) => {
    if (!lead || !firestore) return;
    const completed = lead.completedTasks || [];
    const isCompleted = completed.includes(task);
    
    if (task === 'Agendamento de entrevista' && !isCompleted) {
      setIsSchedulingOpen(true);
      return;
    }

    try {
      const leadRef = doc(firestore, 'leads', lead.id);
      await updateDoc(leadRef, { 
        completedTasks: isCompleted ? arrayRemove(task) : arrayUnion(task), 
        updatedAt: Timestamp.now() 
      });
    } catch (e: any) { 
      toast({ variant: 'destructive', title: 'Erro ao atualizar tarefa' }); 
    }
  };

  const handleSaveInterviewAnswer = async (questionId: string, answer: string) => {
    if (!lead || !firestore) return;
    try {
      await updateDoc(doc(firestore, 'leads', lead.id), {
        [`interviewAnswers.${questionId}`]: answer,
        updatedAt: Timestamp.now()
      });
    } catch (e: any) { console.error(e); }
  };

  const handleAdvanceStage = async () => {
    if (!lead || isAdvancing) return;
    
    const currentIndex = STAGES.indexOf(lead.status);
    if (currentIndex === -1 || currentIndex === STAGES.length - 1) {
      if (lead.status === 'DISTRIBUICAO') onProtocolClick(lead);
      return;
    }

    const nextStatus = STAGES[currentIndex + 1];
    setIsAdvancing(true);
    try {
      await updateLeadStatus(lead.id, nextStatus);
      toast({ title: 'Lead Avançado!', description: `Movido para a fase de ${stageConfig[nextStatus].label}.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !lead || !firestore || !session?.user?.name) return;
    setIsSaving(true);
    try {
      const event: TimelineEvent = {
        id: uuidv4(),
        type: 'note',
        description: newNote.trim(),
        date: Timestamp.now() as any,
        authorName: session.user.name,
      };
      await updateDoc(doc(firestore, 'leads', lead.id), {
        timeline: arrayUnion(event),
        updatedAt: Timestamp.now()
      });
      setNewNote('');
      toast({ title: 'Nota adicionada!' });
    } catch (e: any) { toast({ variant: 'destructive', title: 'Erro', description: e.message }); } finally { setIsSaving(false); }
  };

  if (!lead) return null;
  
  const stage = stageConfig[lead.status] || stageConfig.NOVO;
  const currentStageTasks = stage.tasks;
  const completedInCurrentStage = lead.completedTasks?.filter(t => currentStageTasks.includes(t)) || [];
  const completedCount = completedInCurrentStage.length;
  const totalTasks = currentStageTasks.length;
  
  const isReadyToAdvance = totalTasks > 0 && completedCount === totalTasks;
  const nextStage = STAGES[STAGES.indexOf(lead.status) + 1];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl max-w-[100vw] bg-[#020617] border-white/10 text-white p-0 flex flex-col h-[100vh] overflow-hidden shadow-2xl">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/[0.02] shrink-0 text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-[9px] font-black uppercase h-6 px-2 border-2", stage.color)}>
                <stage.icon className="h-3 w-3 mr-1.5" /> {stage.label}
              </Badge>
              {isReadyToAdvance && (
                <Badge className="bg-emerald-600 text-white font-black text-[8px] uppercase tracking-widest animate-in zoom-in h-6 px-2">
                  <CheckCircle2 className="h-3 w-3 mr-1.5" /> FASE CONCLUÍDA
                </Badge>
              )}
            </div>
            {lead.status === 'CONTRATUAL' && (
              <Button 
                size="sm" 
                className="bg-primary text-primary-foreground font-black uppercase text-[9px] h-9 px-4 gap-2"
                onClick={() => setIsDraftingOpen(true)}
              >
                <FilePlus2 className="h-3.5 w-3.5" /> Gerar Contratos/Procurações
              </Button>
            )}
          </div>
          <SheetTitle className="text-2xl sm:text-3xl font-black font-headline text-white leading-tight uppercase tracking-tight text-left">{lead.title}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8 pb-32">
            
            <div className="p-4 rounded-2xl bg-white/[0.03] border-2 border-white/5 flex items-center gap-4 relative overflow-hidden group">
              <div className="h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center border-2 border-blue-500/20 shrink-0">
                <UserCircle className="h-8 w-8 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-lg font-black text-white truncate tracking-tight">{client?.firstName} {client?.lastName}</h4>
                <div className="flex gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                    <Mail className="h-3 w-3 text-primary" /> {client?.email || 'N/A'}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                    <Smartphone className="h-3 w-3 text-emerald-500" /> {client?.mobile || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  <Activity className="h-3.5 w-3.5 text-primary" /> Fase: {stage.label}
                </div>
                <span className="text-[10px] font-black text-white bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">{completedCount}/{totalTasks}</span>
              </div>
              
              <div className="grid gap-2">
                {stage.tasks.map(task => {
                  const isDone = lead.completedTasks?.includes(task);
                  const isScheduling = task === 'Agendamento de entrevista';
                  return (
                    <div 
                      key={task} 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                        isDone ? "bg-emerald-500/[0.03] border-emerald-500/20" : "bg-white/[0.02] border-white/5 hover:border-primary/30"
                      )} 
                      onClick={() => handleToggleTask(task)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-5 w-5 rounded-lg border flex items-center justify-center transition-all",
                          isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/10 group-hover:border-primary/50"
                        )}>
                          {isDone && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className={cn("text-xs font-bold tracking-tight", isDone ? "text-emerald-400/70" : "text-slate-200")}>{task}</span>
                      </div>
                      
                      {isScheduling && !isDone && (
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase animate-pulse">
                          <Video className="h-3.5 w-3.5" /> Abrir Agenda
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {lead.status === 'NOVO' && (
              <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-400 tracking-widest">
                  <ClipboardList className="h-3.5 w-3.5" /> Entrevista de Triagem
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {activeInterview ? (
                    activeInterview.items.map((item) => {
                      const currentAnswer = lead.interviewAnswers?.[item.id] || '';
                      return (
                        <div key={item.id} className="space-y-3 p-5 rounded-2xl bg-white/[0.03] border border-white/5 group hover:border-primary/20 transition-all">
                          <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2 group-hover:text-primary transition-colors">{item.label} {item.required && '*'}</Label>
                          
                          {item.type === 'YES_NO' ? (
                            <RadioGroup 
                              value={currentAnswer} 
                              onValueChange={(val) => handleSaveInterviewAnswer(item.id, val)}
                              className="flex flex-wrap gap-4"
                            >
                              <div 
                                className={cn(
                                  "flex items-center space-x-3 px-5 py-3 rounded-xl border-2 transition-all cursor-pointer",
                                  currentAnswer === 'SIM' ? "bg-emerald-500/10 border-emerald-500/50" : "bg-black/20 border-transparent hover:border-white/10"
                                )} 
                                onClick={() => handleSaveInterviewAnswer(item.id, 'SIM')}
                              >
                                <RadioGroupItem value="SIM" id={`q-sim-${item.id}`} className="border-emerald-500 text-emerald-500" />
                                <Label htmlFor={`q-sim-${item.id}`} className="text-xs font-black text-emerald-400 cursor-pointer tracking-widest">SIM</Label>
                              </div>
                              <div 
                                className={cn(
                                  "flex items-center space-x-3 px-5 py-3 rounded-xl border-2 transition-all cursor-pointer",
                                  currentAnswer === 'NAO' ? "bg-rose-500/10 border-rose-500/50" : "bg-black/20 border-transparent hover:border-white/10"
                                )} 
                                onClick={() => handleSaveInterviewAnswer(item.id, 'NAO')}
                              >
                                <RadioGroupItem value="NAO" id={`q-nao-${item.id}`} className="border-rose-500 text-rose-500" />
                                <Label htmlFor={`q-nao-${item.id}`} className="text-xs font-black text-rose-400 cursor-pointer tracking-widest">NÃO</Label>
                              </div>
                            </RadioGroup>
                          ) : (
                            <Textarea 
                              placeholder="Digite o relato detalhado..." 
                              className="bg-black/40 border-white/5 text-sm rounded-xl min-h-[100px] leading-relaxed"
                              defaultValue={currentAnswer}
                              onBlur={(e) => handleSaveInterviewAnswer(item.id, e.target.value)}
                            />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 opacity-40 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                      <p className="text-xs font-bold uppercase text-slate-500">Nenhuma entrevista personalizada para {lead.legalArea}.</p>
                      <p className="text-[10px] mt-1 uppercase">Configure em Checklists > Entrevistas.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">
                <History className="h-3.5 w-3.5 text-primary" /> Histórico & Notas
              </div>
              <div className="space-y-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-[9px] font-bold uppercase text-slate-600 ml-1">Nova anotação</Label>
                    <Textarea 
                      placeholder="Registre pontos relevantes da triagem..." 
                      className="bg-black/40 border border-white/10 text-sm h-24 rounded-2xl" 
                      value={newNote} 
                      onChange={e => setNewNote(e.target.value)} 
                    />
                  </div>
                  <Button className="h-24 px-6 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20" onClick={handleAddNote} disabled={isSaving || !newNote.trim()}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t border-white/5 bg-white/[0.02] shrink-0 flex items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            className="text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          
          <div className="flex gap-3 flex-1 justify-end min-h-[48px]">
            {isReadyToAdvance && (
              <Button
                className={cn(
                  "h-12 px-8 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all duration-500 animate-in zoom-in slide-in-from-right-4",
                  "bg-primary text-primary-foreground shadow-[0_0_30px_rgba(245,208,48,0.3)] hover:scale-105"
                )}
                onClick={handleAdvanceStage}
                disabled={isAdvancing}
              >
                {isAdvancing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : lead.status === 'DISTRIBUICAO' ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {lead.status === 'DISTRIBUICAO' 
                  ? 'Protocolar Processo' 
                  : `Avançar para ${nextStage ? stageConfig[nextStage as LeadStatus].label : 'Próxima Etapa'}`}
              </Button>
            )}
          </div>
        </SheetFooter>
        <DocumentDraftingDialog 
          lead={lead} 
          open={isDraftingOpen} 
          onOpenChange={setIsDraftingOpen} 
        />
        <ScheduleInterviewDialog
          lead={lead}
          open={isSchedulingOpen}
          onOpenChange={setIsSchedulingOpen}
          onSuccess={() => {}}
        />
      </SheetContent>
    </Sheet>
  );
}

function NewLeadSheet({ open, onOpenChange, lawyers, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; lawyers: Staff[]; onCreated: () => void }) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [showClientModal, setShowClientModal] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof leadFormSchema>>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: { 
      clientId: '', lawyerId: '', title: '', legalArea: 'Trabalhista', 
      priority: 'MEDIA', captureSource: 'Indicação', isUrgent: false, 
      prescriptionDate: '', description: '', 
    }
  });

  const onSubmit = async (values: z.infer<typeof leadFormSchema>) => {
    setIsSaving(true);
    try {
      const result = await createLead(values);
      if (result.success && result.id) {
        await syncLeadToDrive(result.id);
        toast({ title: 'Lead Criado!', description: 'Atendimento iniciado.' });
        onCreated();
        onOpenChange(false);
        form.reset();
      }
    } catch (e: any) { toast({ variant: 'destructive', title: 'Erro', description: e.message }); } finally { setIsSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl max-w-[100vw] bg-[#020617] border-white/10 text-white p-0 flex flex-col h-full shadow-2xl">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/[0.02] shrink-0 text-left">
          <SheetTitle className="text-2xl font-black font-headline text-white flex items-center gap-4 tracking-tight uppercase">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <PlusCircle className="h-5 w-5 text-primary" />
            </div>
            Novo Atendimento
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            <Form {...form}>
              <form id="new-lead-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Cliente Principal *</FormLabel>
                    <ClientSearchInput selectedClientId={field.value} onSelect={(c) => field.onChange(c.id)} onCreateNew={() => setShowClientModal(true)} />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Título da Demanda *</FormLabel>
                    <Input placeholder="Ex: Revisional de Horas Extras..." className="h-11 bg-black/40 border-white/10 rounded-lg font-bold" {...field} />
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="lawyerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Responsável *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">{lawyers.map(l => <SelectItem key={l.id} value={l.id} className="font-bold">Dr(a). {l.firstName}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="legalArea" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Área Jurídica *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                          {['Trabalhista', 'Cível', 'Previdenciário', 'Família', 'Outro'].map(area => <SelectItem key={area} value={area} className="font-bold">{area}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                          <SelectItem value="BAIXA">Baixa</SelectItem>
                          <SelectItem value="MEDIA">Média</SelectItem>
                          <SelectItem value="ALTA">Alta</SelectItem>
                          <SelectItem value="CRITICA">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="prescriptionDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-rose-500 tracking-widest ml-1 flex items-center gap-1.5"><AlertCircle className="h-3 w-3" /> Data de Prescrição</FormLabel>
                      <FormControl><Input type="date" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="captureSource" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Fonte de Captação *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                        <SelectItem value="Indicação">🤝 Indicação</SelectItem>
                        <SelectItem value="Google Search">🔍 Google Search</SelectItem>
                        <SelectItem value="Instagram">📸 Instagram</SelectItem>
                        <SelectItem value="Facebook">👥 Facebook</SelectItem>
                        <SelectItem value="Site Oficial">🌐 Site Oficial</SelectItem>
                        <SelectItem value="Antigo Cliente">🔄 Antigo Cliente</SelectItem>
                        <SelectItem value="Outros">🔘 Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Relato Inicial / Briefing</FormLabel>
                    <Textarea className="bg-black/40 border-white/10 h-32 rounded-xl p-4 resize-none leading-relaxed text-sm font-medium" placeholder="Descreva os fatos principais narrados pelo cliente..." {...field} />
                  </FormItem>
                )} />
              </form>
            </Form>
          </div>
        </ScrollArea>
        <SheetFooter className="p-6 border-t border-white/5 bg-white/[0.02] gap-4 shrink-0 flex-row">
          <Button variant="ghost" className="flex-1 text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="new-lead-form" disabled={isSaving} className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] h-12 rounded-lg shadow-lg shadow-primary/20">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />} 
            Criar Lead
          </Button>
        </SheetFooter>
        <ClientCreationModal open={showClientModal} onOpenChange={setShowClientModal} onClientCreated={(c) => form.setValue('clientId', c.id)} />
      </SheetContent>
    </Sheet>
  );
}

function LeadConversionDialog({ lead, open, onOpenChange, onConfirm, lawyers }: { lead: Lead | null; open: boolean; onOpenChange: (o: boolean) => void; onConfirm: (data: any) => void; lawyers: Staff[] }) {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof conversionSchema>>({
    resolver: zodResolver(conversionSchema),
    defaultValues: { processNumber: '', court: '', courtBranch: '', caseValue: 0, leadLawyerId: '', opposingParties: [{ name: '', document: '', address: '' }] }
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "opposingParties" });

  React.useEffect(() => {
    if (lead && open) {
      form.setValue('leadLawyerId', lead.lawyerId);
      form.setValue('caseValue', 0);
    }
  }, [lead, open, form]);

  const handleAIAnalysis = async () => {
    if (!lead) return;
    setIsAnalyzing(true);
    try {
      const result = await extractProtocolData({
        leadTitle: lead.title,
        leadDescription: lead.description || '',
        timelineNotes: lead.timeline?.map((e: TimelineEvent) => e.description) || []
      });
      if (result) {
        form.setValue('processNumber', result.suggestedProcessNumber);
        form.setValue('court', result.suggestedCourt);
        form.setValue('courtBranch', result.suggestedCourtBranch);
        form.setValue('caseValue', result.suggestedCaseValue);
        toast({ title: 'Análise Concluída!', description: result.reasoning });
      }
    } catch (e) { toast({ variant: 'destructive', title: 'Falha na IA', description: 'Não foi possível extrair dados automáticos.' }); } finally { setIsAnalyzing(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-[95vw] bg-[#020617] border-white/10 text-white p-0 h-[90vh] flex flex-col shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-black font-headline">Distribuição Processual</DialogTitle>
                <DialogDescription className="text-slate-400">Converta o lead em um processo ativo na pauta do escritório.</DialogDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleAIAnalysis} disabled={isAnalyzing} className="h-10 border-primary/20 text-primary gap-2 font-bold px-4">
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} Sugestão IA
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Form {...form}>
              <form id="conversion-form" onSubmit={form.handleSubmit(onConfirm)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="processNumber" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Número CNJ *</FormLabel><FormControl><Input placeholder="0000000-00.0000.0.00.0000" className="bg-black/40 border-white/10 font-mono" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="caseValue" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Valor da Causa *</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" /><Input type="number" step="0.01" className="bg-black/40 border-white/10 pl-9 font-bold" {...field} /></div></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="court" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Tribunal / Fórum *</FormLabel><FormControl><Input placeholder="Ex: TRT2 - São Bernardo do Campo" className="bg-black/40 border-white/10" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="courtBranch" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Vara / Câmara *</FormLabel><FormControl><Input placeholder="Ex: 2ª Vara do Trabalho" className="bg-black/40 border-white/10" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="leadLawyerId" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Advogado Responsável (Requalificação) *</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-12 text-base font-bold"><SelectValue placeholder="Selecione o titular do caso..." /></SelectTrigger></FormControl>
                    <SelectContent className="bg-[#0f172a] border-white/10 text-white">{lawyers.map(l => <SelectItem key={l.id} value={l.id} className="font-bold">Dr(a). {l.firstName}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between"><FormLabel className="text-[10px] font-black uppercase text-slate-500">Qualificação dos Réus *</FormLabel><Button type="button" variant="ghost" size="sm" onClick={() => append({ name: '', document: '', address: '' })} className="text-primary font-bold uppercase text-[9px] h-7 gap-1"><Plus className="h-3 w-3" /> Adicionar Réu</Button></div>
                  <div className="grid gap-4">{fields.map((field, index) => (
                    <div key={field.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4 animate-in slide-in-from-right-2">
                      <div className="flex gap-4"><FormField control={form.control} name={`opposingParties.${index}.name` as any} render={({ field: nameF }) => (<FormItem className="flex-1"><FormControl><Input placeholder="Nome do Réu..." className="bg-black/20 border-white/5" {...nameF} /></FormControl></FormItem>)} /><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-rose-500 hover:bg-rose-500/10 h-10 w-10 shrink-0"><Trash2 className="h-4 w-4" /></Button></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={form.control} name={`opposingParties.${index}.document` as any} render={({ field: docF }) => (<FormItem><FormControl><Input placeholder="CNPJ/CPF..." className="bg-black/20 border-white/5 font-mono text-xs" {...docF} /></FormControl></FormItem>)} /><FormField control={form.control} name={`opposingParties.${index}.address` as any} render={({ field: addrF }) => (<FormItem><FormControl><Input placeholder="Endereço Completo..." className="bg-black/20 border-white/5 text-xs" {...addrF} /></FormControl></FormItem>)} /></div>
                    </div>
                  ))}</div>
                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>
        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 gap-3"><DialogClose asChild><Button variant="ghost" className="flex-1 text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12">Cancelar</Button></DialogClose><Button type="submit" form="conversion-form" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] h-12 shadow-xl shadow-emerald-900/20">Protocolar e Migrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LeadsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<LeadStatus>('NOVO');
  const [isNewLeadOpen, setIsNewLeadOpen] = React.useState(false);
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isConversionOpen, setIsConversionOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  
  // Filtros Avançados
  const [sourceFilter, setSourceFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');

  const userProfileRef = useMemoFirebase(() => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null), [firestore, user?.uid]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads'), where('status', '!=', 'CONVERTIDO')) : null), [firestore]);
  const { data: leadsData, isLoading: isLoadingLeads } = useCollection<Lead>(leadsQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'clients'), limit(500)) : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);
  const lawyers = staffData?.filter(s => s.role === 'lawyer' || s.role === 'partner') || [];
  const staffMap = React.useMemo(() => new Map(staffData?.map(s => [s.id, s])), [staffData]);

  const activeLead = React.useMemo(() => {
    if (!selectedLeadId || !leadsData) return null;
    return leadsData.find(l => l.id === selectedLeadId) || null;
  }, [selectedLeadId, leadsData]);

  const filteredLeads = React.useMemo(() => {
    if (!leadsData) return [];
    let list = [...leadsData].sort((a, b) => b.updatedAt.seconds - a.updatedAt.seconds);
    
    if (userProfile?.role === 'lawyer') list = list.filter(l => l.lawyerId === userProfile.id);
    
    // Aplicar Filtros Avançados
    if (sourceFilter !== 'all') list = list.filter(l => l.captureSource === sourceFilter);
    if (priorityFilter !== 'all') list = list.filter(l => l.priority === priorityFilter);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(l => 
        l.title.toLowerCase().includes(q) || 
        clientsMap.get(l.clientId)?.firstName.toLowerCase().includes(q) ||
        clientsMap.get(l.clientId)?.document?.includes(q)
      );
    }

    return list;
  }, [leadsData, searchTerm, clientsMap, userProfile, sourceFilter, priorityFilter]);

  const handleConfirmProtocol = async (data: z.infer<typeof conversionSchema>) => {
    if (!activeLead) return;
    setIsProcessing(activeLead.id);
    try {
      const result = await convertLeadToProcess(activeLead.id, data);
      if (result.success) {
        toast({ title: 'Processo Protocolado!', description: 'Migrado para processos ativos.' });
        setIsConversionOpen(false);
        setIsDetailsOpen(false);
      }
    } catch (e: any) { 
      toast({ variant: 'destructive', title: 'Erro', description: e.message }); 
    } finally { 
      setIsProcessing(null); 
    }
  };

  const getHeatColor = (lead: Lead) => {
    if (lead.priority === 'CRITICA' || lead.isUrgent) return 'text-rose-500';
    if (lead.priority === 'ALTA') return 'text-orange-500';
    if (lead.priority === 'MEDIA') return 'text-amber-500';
    return 'text-blue-400';
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!firestore || !confirm('Deseja realmente excluir este lead permanentemente?')) return;
    try {
      await deleteDoc(doc(firestore, 'leads', leadId));
      toast({ title: 'Lead removido com sucesso.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover lead' });
    }
  };

  const isLoading = isLoadingLeads;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline text-white flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            Cockpit de Leads
          </h1>
          <p className="text-sm text-muted-foreground">Triagem e conversão estratégica Bueno Gois.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Busque pelo ID, nome ou CPF..." 
              className="pl-9 pr-20 bg-[#0f172a] border-white/10 h-11 text-sm rounded-xl text-white" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black uppercase text-primary hover:text-white transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
          <Button onClick={() => setIsNewLeadOpen(true)} className="bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-11 px-8 rounded-xl shadow-lg shadow-primary/20">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-white/5 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Leads Ativos</p>
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-white">{leadsData?.length || 0}</p>
        </div>
        <div className="bg-[#0f172a] border border-white/5 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Urgência Crítica</p>
            <Flame className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-white">{leadsData?.filter(l => l.isUrgent).length || 0}</p>
        </div>
        <div className="bg-[#0f172a] border border-white/5 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Na fase Distribuição</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-white">{leadsData?.filter(l => l.status === 'DISTRIBUICAO').length || 0}</p>
        </div>
        <div className="bg-[#0f172a] border border-white/5 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Aging Médio</p>
            <Timer className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">4.2 <span className="text-[10px] font-normal text-slate-500">dias</span></p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeadStatus)} className="w-full">
        <div className="flex flex-col lg:flex-row items-end justify-between gap-4 mb-8">
          <TabsList className="bg-[#0f172a] p-1 border border-white/5 h-12 flex overflow-x-auto no-scrollbar justify-start gap-1 w-full lg:w-auto">
            {STAGES.map(stage => {
              const config = stageConfig[stage];
              const count = leadsData?.filter(l => l.status === stage).length || 0;
              return (
                <TabsTrigger 
                  key={stage} 
                  value={stage} 
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-6 h-10 shrink-0 rounded-lg transition-all"
                >
                  <config.icon className="h-3.5 w-3.5" />
                  {config.label}
                  <Badge variant="secondary" className="ml-1.5 px-1.5 h-4 text-[9px] bg-white/10 border-none text-inherit">{count}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9 bg-[#0f172a] border-white/10 text-[10px] font-black uppercase w-[140px] rounded-lg">
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f172a] border-white/10">
                <SelectItem value="all">Todas as Fontes</SelectItem>
                <SelectItem value="Indicação">Indicação</SelectItem>
                <SelectItem value="Google Search">Google</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Antigo Cliente">Antigo Cliente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 bg-[#0f172a] border-white/10 text-[10px] font-black uppercase w-[140px] rounded-lg">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f172a] border-white/10">
                <SelectItem value="all">Qualquer Nível</SelectItem>
                <SelectItem value="BAIXA">Baixa</SelectItem>
                <SelectItem value="MEDIA">Média</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="CRITICA">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={activeTab} className="animate-in fade-in duration-500">
          <Card className="bg-[#0f172a] border-white/5 overflow-hidden shadow-2xl">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 px-6 py-4">Status / Saúde</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Lead / Atendimento</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Origem / Canal</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Prescrição</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 text-center">Fase Aging</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 text-right px-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell colSpan={6} className="p-6"><Skeleton className="h-10 w-full bg-white/5" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLeads.filter(l => l.status === activeTab).length > 0 ? (
                  filteredLeads.filter(l => l.status === activeTab).map(lead => {
                    const client = clientsMap.get(lead.clientId);
                    const lawyer = staffMap.get(lead.lawyerId);
                    const stage = stageConfig[lead.status];
                    
                    // Lógica de Aging (há quanto tempo nesta fase)
                    const entryDate = lead.stageEntryDates?.[lead.status];
                    const agingDays = entryDate ? differenceInDays(new Date(), entryDate.toDate()) : 0;
                    
                    // Lógica de Prescrição
                    const prescriptionDate = lead.prescriptionDate?.toDate();
                    const isPrescriptionClose = prescriptionDate && differenceInDays(prescriptionDate, new Date()) < 30;

                    const completedTasks = lead.completedTasks || [];
                    const currentStageTasks = stage.tasks;
                    const completedInStage = completedTasks.filter(t => currentStageTasks.includes(t)).length;
                    const progress = currentStageTasks.length > 0 ? (completedInStage / currentStageTasks.length) * 100 : 0;

                    return (
                      <TableRow 
                        key={lead.id} 
                        className={cn(
                          "border-white/5 hover:bg-white/5 transition-colors group cursor-pointer",
                          lead.priority === 'CRITICA' && "bg-rose-500/[0.02]"
                        )}
                        onClick={() => { setSelectedLeadId(lead.id); setIsDetailsOpen(true); }}
                      >
                        <TableCell className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <Thermometer className={cn("h-5 w-5", getHeatColor(lead))} />
                            <div className="flex flex-col">
                              <span className={cn("text-[9px] font-black uppercase tracking-widest", getHeatColor(lead))}>{lead.priority}</span>
                              <span className="text-[10px] font-mono text-slate-500">#{lead.id.substring(0, 6)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-black text-xs">
                              {client?.firstName.charAt(0)}
                            </div>
                            <div className="flex flex-col max-w-[220px]">
                              <span className="font-bold text-white truncate text-sm">{lead.title}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Cliente: {client?.firstName} {client?.lastName}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-primary/80">{lead.captureSource}</span>
                            <span className="text-[10px] text-slate-500 font-bold">{lawyer?.firstName || 'Pendente'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {prescriptionDate ? (
                            <div className={cn(
                              "flex flex-col",
                              isPrescriptionClose ? "text-rose-500 animate-pulse" : "text-slate-400"
                            )}>
                              <span className="font-bold text-[11px]">{format(prescriptionDate, 'dd/MM/yyyy')}</span>
                              <span className="text-[9px] font-black uppercase tracking-tighter">
                                {isPrescriptionClose ? '⚠️ RISCO ALTO' : `${differenceInDays(prescriptionDate, new Date())} dias p/ fim`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-700 italic text-[10px]">Não definida</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center w-[180px]">
                          <div className="flex flex-col gap-1.5 items-center">
                            <div className="flex items-center justify-between w-full text-[9px] font-black uppercase text-slate-500">
                              <span>{agingDays}d nesta fase</span>
                              <span className={cn(progress === 100 ? "text-emerald-500" : "text-white")}>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={cn("h-full transition-all duration-500", progress === 100 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-primary")}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="text-white/20 hover:text-white">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 w-56 p-1">
                              <DropdownMenuItem className="font-bold gap-2 focus:bg-primary/10">
                                <Info className="h-4 w-4 text-primary" /> Ficha de Triagem
                              </DropdownMenuItem>
                              <DropdownMenuItem className="font-bold gap-2">
                                <History className="h-4 w-4" /> Timeline
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuItem className="text-rose-500 font-bold gap-2" onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}>
                                <Trash2 className="h-4 w-4" /> Excluir Atendimento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-60 text-center opacity-30 italic text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <Activity className="h-12 w-12" />
                        <p className="font-black uppercase tracking-widest text-[10px]">Nenhum pedido nesta fase</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <LeadDetailsSheet 
        lead={activeLead} 
        client={activeLead ? clientsMap.get(activeLead.clientId) : undefined} 
        open={isDetailsOpen} 
        onOpenChange={setIsDetailsOpen} 
        onProtocolClick={(l) => { setSelectedLeadId(l.id); setIsConversionOpen(true); }} 
      />
      
      <NewLeadSheet open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen} lawyers={lawyers} onCreated={() => {}} />
      
      <LeadConversionDialog lead={activeLead} open={isConversionOpen} onOpenChange={setIsConversionOpen} onConfirm={handleConfirmProtocol} lawyers={lawyers} />
    </div>
  );
}
