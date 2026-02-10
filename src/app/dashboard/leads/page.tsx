
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
  ArrowRightLeft,
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
  MapPin,
  Smartphone,
  History,
  MessageSquare,
  Plus,
  ExternalLink,
  DollarSign,
  Activity,
  FileUp,
  Mail,
  Download,
  Check,
  Bot,
  RefreshCw,
  TrendingUp,
  Timer,
  Building,
  Hash,
  ClipboardList,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, Timestamp, limit, updateDoc, where, arrayUnion } from 'firebase/firestore';
import type { Lead, Client, Staff, LeadStatus, LeadPriority, UserProfile, TimelineEvent, OpposingParty, ChecklistTemplate } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, differenceInHours, startOfDay } from 'date-fns';
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
import { createLead, updateLeadStatus, convertLeadToProcess } from '@/lib/lead-actions';
import { ClientSearchInput } from '@/components/process/ClientSearchInput';
import { ClientCreationModal } from '@/components/process/ClientCreationModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { v4 as uuidv4 } from 'uuid';
import { listFiles } from '@/lib/drive-actions';
import { syncLeadToDrive } from '@/lib/drive';
import { extractProtocolData } from '@/ai/flows/extract-protocol-data-flow';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
    tasks: ['Emissão dos contratos/procuração', 'Assinatura colhida (Contrato)', 'Assinatura colhida (Procuração)', 'Check de integridade documental'] 
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

const priorityConfig: Record<LeadPriority, { label: string; color: string; icon: any }> = {
  BAIXA: { label: 'Baixa', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: Info },
  MEDIA: { label: 'Média', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Info },
  ALTA: { label: 'Alta', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: AlertCircle },
  CRITICA: { label: 'Crítica', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', icon: Flame },
};

const leadFormSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente.'),
  lawyerId: z.string().min(1, 'Selecione um advogado.'),
  title: z.string().min(5, 'Mínimo 5 caracteres.'),
  legalArea: z.string().min(1, 'Selecione a área.'),
  priority: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).default('MEDIA'),
  captureSource: z.string().min(1, 'Selecione a fonte.'),
  isUrgent: z.boolean().default(false),
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

function LeadConversionDialog({ 
  lead, 
  open, 
  onOpenChange, 
  onConfirm,
  lawyers
}: { 
  lead: Lead | null; 
  open: boolean; 
  onOpenChange: (o: boolean) => void;
  onConfirm: (data: z.infer<typeof conversionSchema>) => void;
  lawyers: Staff[];
}) {
  const [isPreFilling, setIsPreFilling] = React.useState(false);
  const { toast } = useToast();
  const form = useForm<z.infer<typeof conversionSchema>>({
    resolver: zodResolver(conversionSchema),
    defaultValues: {
      processNumber: '',
      court: '',
      courtBranch: '',
      caseValue: 0,
      leadLawyerId: '',
      opposingParties: [{ name: '', document: '', address: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'opposingParties'
  });

  React.useEffect(() => {
    if (lead && open) {
      form.setValue('leadLawyerId', lead.lawyerId);
    }
  }, [lead, open, form]);

  const handlePreFill = async () => {
    if (!lead) return;
    setIsPreFilling(true);
    try {
      const timelineNotes = lead.description ? [lead.description] : [];
      const result = await extractProtocolData({
        leadTitle: lead.title,
        leadDescription: lead.description || '',
        timelineNotes
      });

      if (result) {
        form.setValue('processNumber', result.suggestedProcessNumber || '');
        form.setValue('court', result.suggestedCourt || '');
        form.setValue('courtBranch', result.suggestedCourtBranch || '');
        form.setValue('caseValue', result.suggestedCaseValue || 0);
        toast({ title: 'Dados sugeridos!', description: result.reasoning });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Falha na IA', description: 'Não foi possível ler o histórico para sugestões.' });
    } finally {
      setIsPreFilling(false);
    }
  };

  const formatCurrencyBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const handleCurrencyChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const numericValue = Number(digits) / 100;
    form.setValue('caseValue', numericValue);
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-[95vw] bg-[#020617] border-white/10 text-white shadow-2xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
              <ArrowRightLeft className="h-6 w-6 text-emerald-500" />
              Distribuição Processual
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreFill}
              disabled={isPreFilling}
              className="h-9 border-primary/30 text-primary hover:bg-primary/10 text-[11px] font-black uppercase gap-2"
            >
              {isPreFilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              Sugestão IA
            </Button>
          </div>
          <DialogDescription className="text-slate-400 mt-1">
            Finalize os dados para integrar o lead ao sistema de processos ativos.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <Form {...form}>
            <form id="conversion-form" onSubmit={form.handleSubmit(onConfirm)} className="p-8 space-y-10">
              
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[12px] font-black uppercase text-primary tracking-[0.2em]">
                  <FolderKanban className="h-4 w-4" /> Dados da Ação
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="processNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Número do Processo (CNJ) *</FormLabel>
                        <FormControl>
                          <Input placeholder="0000000-00.0000.0.00.0000" className="bg-black/40 border-white/10 h-10 font-mono tracking-widest text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="caseValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Valor da Causa (R$) *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                            <Input 
                              placeholder="0,00" 
                              className="pl-10 bg-black/40 border-white/10 h-10 font-bold"
                              value={formatCurrencyBRL(field.value)}
                              onChange={(e) => handleCurrencyChange(e.target.value)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="court"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fórum / Comarca *</FormLabel>
                        <FormControl>
                          <LocationSearch value={field.value} onSelect={field.onChange} placeholder="Pesquisar tribunal..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="courtBranch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vara / Câmara *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 2ª Vara do Trabalho de SBC" className="bg-black/40 border-white/10 h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[12px] font-black uppercase text-rose-400 tracking-[0.2em]">
                    <Building className="h-4 w-4" /> Qualificação do Réu
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => append({ name: '', document: '', address: '' })}
                    className="h-8 text-[9px] font-black uppercase text-primary"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Novo Réu
                  </Button>
                </div>

                <div className="grid gap-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 relative group hover:border-rose-500/20">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="absolute top-2 right-2 h-7 w-7 text-rose-500/50 hover:text-rose-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`opposingParties.${index}.name` as any}
                          render={({ field: nameField }) => (
                            <FormItem>
                              <FormLabel className="text-[9px] font-black uppercase text-slate-500">Razão Social / Nome *</FormLabel>
                              <FormControl><Input placeholder="Empresa LTDA" className="bg-black/40 border-white/5 h-10" {...nameField} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`opposingParties.${index}.document` as any}
                          render={({ field: docField }) => (
                            <FormItem>
                              <FormLabel className="text-[9px] font-black uppercase text-slate-500">CNPJ / CPF</FormLabel>
                              <FormControl><Input placeholder="00.000.000/0000-00" className="bg-black/40 border-white/5 h-10 font-mono" {...docField} /></FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`opposingParties.${index}.address` as any}
                        render={({ field: addrField }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase text-slate-500">Endereço Completo</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Rua, número, bairro, cidade - UF..." className="min-h-[60px] bg-black/40 border-white/5 resize-none text-xs" {...addrField} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 gap-3">
          <DialogClose asChild>
            <Button variant="ghost" className="text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12">Cancelar</Button>
          </DialogClose>
          <Button 
            type="submit" 
            form="conversion-form"
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] h-12"
          >
            Protocolar Processo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadCard({ lead, client, lawyer, onClick }: { lead: Lead; client?: Client; lawyer?: Staff; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = { transform: CSS.Translate.toString(transform), transition };
  
  const priority = priorityConfig[lead.priority as LeadPriority] || priorityConfig.MEDIA;
  const stage = stageConfig[lead.status] || stageConfig.NOVO;
  
  const completedCount = lead.completedTasks?.length || 0;
  const totalTasks = stage.tasks.length;
  const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  const hoursInStage = React.useMemo(() => {
    const entryDate = lead.stageEntryDates?.[lead.status];
    if (!entryDate) return 0;
    return Math.abs(differenceInHours(new Date(), entryDate.toDate()));
  }, [lead.status, lead.stageEntryDates]);

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-[#0f172a] border-white/5 border-2 hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing group/card shadow-lg p-0 overflow-hidden",
        isDragging && "opacity-50 border-primary scale-105 z-50",
        lead.isUrgent && "border-rose-500/20 ring-1 ring-rose-500/10"
      )}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-none px-1 h-4", priority.color)}>
              {priority.label}
            </Badge>
            <Badge variant="outline" className="text-[8px] font-black uppercase bg-white/5 text-primary border-primary/20 px-1 h-4">
              {lead.legalArea}
            </Badge>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter",
            hoursInStage > 24 ? "text-rose-500 animate-pulse" : hoursInStage > 12 ? "text-amber-500" : "text-slate-500"
          )}>
            <Clock className="h-2.5 w-2.5" /> {hoursInStage}h
          </div>
        </div>
        
        <h4 className="text-sm font-black text-white group-hover/card:text-primary transition-colors line-clamp-2 leading-tight min-h-[32px] uppercase">
          {lead.title}
        </h4>

        {totalTasks > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[7px] font-black uppercase text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className={cn("h-2.5 w-2.5", progress === 100 ? "text-emerald-500" : "text-slate-600")} />
                Produção {completedCount}/{totalTasks}
              </span>
              <span className={cn(progress === 100 ? "text-emerald-500" : "text-white")}>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1 bg-white/5" />
          </div>
        )}

        <div className="flex items-center gap-2 p-2 rounded-xl bg-black/30 border border-white/5">
          <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <UserCircle className="h-4 w-4 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-slate-200 truncate leading-none">{client?.firstName} {client?.lastName}</p>
            <p className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">{lead.captureSource}</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[8px] font-black border border-primary/20">
            {lawyer?.firstName?.charAt(0)}
          </div>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter truncate max-w-[60px]">
            {lawyer?.firstName}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[7px] text-slate-600 font-black uppercase tracking-widest">
          <RefreshCw className="h-2.5 w-2.5" /> {formatDistanceToNow(lead.updatedAt.toDate(), { locale: ptBR, addSuffix: false })}
        </div>
      </div>
    </Card>
  );
}

function KanbanColumn({ id, stage, leads, clientsMap, staffMap, onCardClick }: { id: string; stage: string; leads: Lead[]; clientsMap: Map<string, Client>; staffMap: Map<string, Staff>; onCardClick: (l: Lead) => void }) {
  const { setNodeRef } = useSortable({ id });
  const config = stageConfig[stage as LeadStatus] || stageConfig.NOVO;

  return (
    <div ref={setNodeRef} className="flex flex-col gap-3 min-w-[280px] w-full max-w-[320px] bg-white/[0.01] p-3 rounded-[1.5rem] border border-white/5 h-full overflow-hidden">
      <div className="flex items-center justify-between px-2 mb-1 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full animate-pulse", config.color.split(' ')[1])} />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">{config.label}</h3>
        </div>
        <Badge variant="secondary" className="bg-white/5 text-slate-500 text-[9px] font-black h-5 border-none">{leads.length}</Badge>
      </div>
      
      <ScrollArea className="flex-1 h-full">
        <div className="flex flex-col gap-3 pb-10">
          <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
            {leads.map((lead: Lead) => (
              <LeadCard 
                key={lead.id} 
                lead={lead} 
                client={clientsMap.get(lead.clientId)} 
                lawyer={staffMap.get(lead.lawyerId)}
                onClick={() => onCardClick(lead)}
              />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
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
    const updated = isCompleted ? completed.filter(t => t !== task) : [...completed, task];
    
    try {
      await updateDoc(doc(firestore, 'leads', lead.id), { completedTasks: updated, updatedAt: Timestamp.now() });
    } catch (e: any) { toast({ variant: 'destructive', title: 'Erro ao atualizar tarefa' }); }
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
      toast({ title: 'Lead Avançado!', description: `Membro movido para a fase de ${stageConfig[nextStatus].label}.` });
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
  const completedCount = lead.completedTasks?.length || 0;
  const totalTasks = stage.tasks.length;
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
            {lead.status === 'DISTRIBUICAO' && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[9px] h-9 px-4" onClick={() => onProtocolClick(lead)}>
                Protocolar
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
                  return (
                    <div 
                      key={task} 
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                        isDone ? "bg-emerald-500/[0.03] border-emerald-500/20" : "bg-white/[0.02] border-white/5 hover:border-primary/30"
                      )} 
                      onClick={() => handleToggleTask(task)}
                    >
                      <div className={cn("h-5 w-5 rounded-lg border flex items-center justify-center transition-all", isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/10")}>
                        {isDone && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className={cn("text-xs font-bold tracking-tight", isDone ? "text-emerald-400/70" : "text-slate-200")}>{task}</span>
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
                          ) : item.type === 'YES_NO_MAYBE' ? (
                            <RadioGroup 
                              value={currentAnswer} 
                              onValueChange={(val) => handleSaveInterviewAnswer(item.id, val)}
                              className="flex flex-wrap gap-3"
                            >
                              <div className={cn("flex items-center space-x-2 px-4 py-2 rounded-lg border", currentAnswer === 'SIM' ? "bg-emerald-500/10 border-emerald-500/40" : "bg-black/20 border-transparent")} onClick={() => handleSaveInterviewAnswer(item.id, 'SIM')}>
                                <RadioGroupItem value="SIM" id={`qm-sim-${item.id}`} />
                                <Label htmlFor={`qm-sim-${item.id}`} className="text-[10px] font-bold text-emerald-400">SIM</Label>
                              </div>
                              <div className={cn("flex items-center space-x-2 px-4 py-2 rounded-lg border", currentAnswer === 'NAO' ? "bg-rose-500/10 border-rose-500/40" : "bg-black/20 border-transparent")} onClick={() => handleSaveInterviewAnswer(item.id, 'NAO')}>
                                <RadioGroupItem value="NAO" id={`qm-nao-${item.id}`} />
                                <Label htmlFor={`qm-nao-${item.id}`} className="text-[10px] font-bold text-rose-400">NÃO</Label>
                              </div>
                              <div className={cn("flex items-center space-x-2 px-4 py-2 rounded-lg border", currentAnswer === 'PARCIAL' ? "bg-amber-500/10 border-amber-500/40" : "bg-black/20 border-transparent")} onClick={() => handleSaveInterviewAnswer(item.id, 'PARCIAL')}>
                                <RadioGroupItem value="PARCIAL" id={`qm-parcial-${item.id}`} />
                                <Label htmlFor={`qm-parcial-${item.id}`} className="text-[10px] font-bold text-amber-400">PARCIAL</Label>
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
                      <p className="text-xs font-bold uppercase text-slate-500">Nenhuma entrevista configurada para {lead.legalArea}.</p>
                      <p className="text-[10px] mt-1 uppercase text-slate-600">Configure em Checklists &gt; Entrevistas.</p>
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

        {/* Rodapé de Ações de Elite */}
        <SheetFooter className="p-6 border-t border-white/5 bg-white/[0.02] shrink-0 flex items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            className="text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          
          <div className="flex gap-3 flex-1 justify-end">
            <Button
              className={cn(
                "h-12 px-8 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all duration-500",
                isReadyToAdvance 
                  ? "bg-primary text-primary-foreground shadow-[0_0_30px_rgba(245,208,48,0.3)] hover:scale-105" 
                  : "bg-white/5 text-slate-500 border border-white/10"
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
                : `Avançar para ${nextStage ? stageConfig[nextStage].label : 'Próxima Etapa'}`}
            </Button>
          </div>
        </SheetFooter>
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
    defaultValues: { clientId: '', lawyerId: '', title: '', legalArea: 'Trabalhista', priority: 'MEDIA', captureSource: 'Indicação', isUrgent: false, description: '', }
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

export default function LeadsPage() {
  const { firestore, user } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isNewLeadOpen, setIsNewLeadOpen] = React.useState(false);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isConversionOpen, setIsConversionOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

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

  const filteredLeads = React.useMemo(() => {
    if (!leadsData) return [];
    let list = [...leadsData].sort((a, b) => b.updatedAt.seconds - a.updatedAt.seconds);
    if (userProfile?.role === 'lawyer') list = list.filter(l => l.lawyerId === userProfile.id);
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(l => l.title.toLowerCase().includes(q) || clientsMap.get(l.clientId)?.firstName.toLowerCase().includes(q));
  }, [leadsData, searchTerm, clientsMap, userProfile]);

  const stats = React.useMemo(() => {
    if (!leadsData) return { total: 0, urgent: 0, ready: 0, slowestStage: '---', highDemand: '---' };
    
    const now = new Date();
    const stageTimes: Record<string, number[]> = {};
    const stageCounts: Record<string, number> = {};

    leadsData.forEach(l => {
      stageCounts[l.status] = (stageCounts[l.status] || 0) + 1;
      const entryDate = l.stageEntryDates?.[l.status]?.toDate();
      if (entryDate) {
        const hours = Math.abs(differenceInHours(now, entryDate));
        if (!stageTimes[l.status]) stageTimes[l.status] = [];
        stageTimes[l.status].push(hours);
      }
    });

    const avgTimes = Object.entries(stageTimes).map(([stage, times]) => ({
      stage,
      avg: times.reduce((a, b) => a + b, 0) / times.length
    })).sort((a, b) => b.avg - a.avg);

    const highDemandStage = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      total: leadsData.length,
      urgent: leadsData.filter(l => l.isUrgent).length,
      ready: leadsData.filter(l => l.status === 'DISTRIBUICAO').length,
      slowestStage: avgTimes[0] ? (stageConfig[avgTimes[0].stage as LeadStatus]?.label || '---') : '---',
      highDemand: highDemandStage ? (stageConfig[highDemandStage[0] as LeadStatus]?.label || '---') : '---'
    };
  }, [leadsData]);

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;
    const leadId = active.id;
    const newStatus = over.id as LeadStatus;
    const lead = leadsData?.find(l => l.id === leadId);
    if (lead && lead.status !== newStatus && STAGES.includes(newStatus)) {
      try {
        await updateLeadStatus(leadId, newStatus);
        toast({ title: `Lead movido para ${stageConfig[newStatus]?.label || newStatus}` });
      } catch (e: any) { toast({ variant: 'destructive', title: 'Erro ao mover' }); }
    }
  };

  const handleConfirmProtocol = async (data: z.infer<typeof conversionSchema>) => {
    if (!selectedLead) return;
    setIsProcessing(selectedLead.id);
    try {
      const result = await convertLeadToProcess(selectedLead.id, data);
      if (result.success) {
        toast({ title: 'Processo Protocolado!', description: 'Migrado para processos ativos.' });
        setIsConversionOpen(false);
        setIsDetailsOpen(false);
      }
    } catch (e: any) { toast({ variant: 'destructive', title: 'Erro', description: e.message }); } finally { setIsProcessing(null); }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-10 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-1">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-lg shrink-0">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-headline text-white tracking-tight uppercase">CRM Jurídico</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Esteira de Produção Bueno Gois</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input placeholder="Pesquisar..." className="pl-9 bg-[#0f172a] border-white/10 h-10 text-sm rounded-lg" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Button onClick={() => setIsNewLeadOpen(true)} className="bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-lg shadow-lg shadow-primary/20">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-1">
        <Card className="bg-[#0f172a] border-white/5 shadow-none p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0"><TrendingUp className="h-5 w-5" /></div>
          <div className="min-w-0"><p className="text-[8px] font-black uppercase text-slate-500 tracking-widest truncate">Demanda</p><p className="text-sm font-black text-white truncate">{stats.highDemand}</p></div>
        </Card>
        <Card className="bg-[#0f172a] border-white/5 shadow-none p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0"><Timer className="h-5 w-5" /></div>
          <div className="min-w-0"><p className="text-[8px] font-black uppercase text-slate-500 tracking-widest truncate">Retenção</p><p className="text-sm font-black text-white truncate">{stats.slowestStage}</p></div>
        </Card>
        <Card className="bg-[#0f172a] border-white/5 shadow-none p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0"><Flame className="h-5 w-5" /></div>
          <div className="min-w-0"><p className="text-[8px] font-black uppercase text-slate-500 tracking-widest truncate">Críticos</p><p className="text-sm font-black text-white truncate">{stats.urgent}</p></div>
        </Card>
        <Card className="bg-[#0f172a] border-white/5 shadow-none p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0"><FolderKanban className="h-5 w-5" /></div>
          <div className="min-w-0"><p className="text-[8px] font-black uppercase text-slate-500 tracking-widest truncate">Prontos</p><p className="text-sm font-black text-white truncate">{stats.ready}</p></div>
        </Card>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-8 px-1 no-scrollbar min-h-[500px]">
          {STAGES.map(stage => (
            <KanbanColumn key={stage} id={stage} stage={stage} leads={filteredLeads.filter(l => l.status === stage)} clientsMap={clientsMap} staffMap={staffMap} onCardClick={(l: Lead) => { setSelectedLead(l); setIsDetailsOpen(true); }} />
          ))}
        </div>
      </DndContext>

      <LeadDetailsSheet lead={selectedLead} client={selectedLead ? clientsMap.get(selectedLead.clientId) : undefined} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} onProtocolClick={(l) => { setSelectedLead(l); setIsConversionOpen(true); }} />
      <NewLeadSheet open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen} lawyers={lawyers} onCreated={() => {}} />
      <LeadConversionDialog lead={selectedLead} open={isConversionOpen} onOpenChange={setIsConversionOpen} onConfirm={handleConfirmProtocol} lawyers={lawyers} />
    </div>
  );
}
