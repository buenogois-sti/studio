
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
  Timer
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
import type { Lead, Client, Staff, LeadStatus, LeadPriority, UserProfile, TimelineEvent } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
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
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';
import { syncLeadToDrive } from '@/lib/drive';
import { extractProtocolData } from '@/ai/flows/extract-protocol-data-flow';
import { Progress } from '@/components/ui/progress';

const STAGES: LeadStatus[] = ['NOVO', 'ATENDIMENTO', 'BUROCRACIA', 'CONTRATUAL', 'DISTRIBUICAO'];

const stageConfig: Record<LeadStatus, { label: string; color: string; icon: any; description: string; tasks: string[] }> = {
  NOVO: { label: 'Triagem', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Zap, description: 'Novos contatos', tasks: ['Captar contatos', 'Identificar área jurídica', 'Verificar conflito de interesse'] },
  ATENDIMENTO: { label: 'Atendimento', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: UserCircle, description: 'Entrevista técnica', tasks: ['Entrevista realizada', 'Relato completo do caso', 'Definição estratégica inicial'] },
  BUROCRACIA: { label: 'Burocracia', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock, description: 'Dados e provas', tasks: ['RG/CPF anexados', 'Comprovante de residência', 'CTPS/PIS conferidos', 'Provas iniciais validadas'] },
  CONTRATUAL: { label: 'Contratual', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: ShieldCheck, description: 'Asssignatures', tasks: ['Elaborar contrato', 'Procuração assinada', 'Termo de hipossuficiência'] },
  DISTRIBUICAO: { label: 'Distribuição', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: FolderKanban, description: 'Pronto p/ protocolar', tasks: ['Réu qualificado', 'Valor da causa definido', 'Peça inicial revisada'] },
  CONVERTIDO: { label: 'Convertido', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: CheckCircle2, description: 'Migrado', tasks: [] },
  ABANDONADO: { label: 'Abandonado', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: AlertCircle, description: 'Arquivado', tasks: [] },
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
});

function LeadConversionDialog({ 
  lead, 
  open, 
  onOpenChange, 
  onConfirm 
}: { 
  lead: Lead | null; 
  open: boolean; 
  onOpenChange: (o: boolean) => void;
  onConfirm: (data: z.infer<typeof conversionSchema>) => void;
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
    }
  });

  const handlePreFill = async () => {
    if (!lead) return;
    setIsPreFilling(true);
    try {
      const timelineNotes = (lead as any).timeline?.map((e: any) => e.description) || [];
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
      setIsParsingAI(false);
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
      <DialogContent className="sm:max-w-md bg-[#020617] border-white/10 text-white shadow-2xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
              <ArrowRightLeft className="h-6 w-6 text-emerald-500" />
              Distribuição Processual
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreFill}
              disabled={isPreFilling}
              className="h-8 border-primary/30 text-primary hover:bg-primary/10 text-[10px] font-black uppercase gap-2"
            >
              {isPreFilling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
              Pré-preencher (IA)
            </Button>
          </div>
          <DialogDescription className="text-slate-400 mt-2">
            Finalize os dados para integrar o lead ao sistema de processos ativos.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <Form {...form}>
            <form id="conversion-form" onSubmit={form.handleSubmit(onConfirm)} className="p-6 space-y-6">
              <FormField
                control={form.control}
                name="processNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Número do Processo (CNJ) *</FormLabel>
                    <FormControl>
                      <Input placeholder="0000000-00.0000.0.00.0000" className="bg-black/40 border-white/10 h-11 font-mono tracking-widest" {...field} />
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
                      <Input placeholder="Ex: 2ª Vara do Trabalho de SBC" className="bg-black/40 border-white/10 h-11" {...field} />
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
                          className="pl-9 bg-black/40 border-white/10 h-11 font-bold"
                          value={formatCurrencyBRL(field.value)}
                          onChange={(e) => handleCurrencyChange(e.target.value)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 gap-3">
          <DialogClose asChild>
            <Button variant="ghost" className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</Button>
          </DialogClose>
          <Button 
            type="submit" 
            form="conversion-form"
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-emerald-900/20"
          >
            Finalizar Distribuição
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
        "bg-[#0f172a] border-white/5 border-2 hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing group/card shadow-lg",
        isDragging && "opacity-50 border-primary scale-105 z-50",
        lead.isUrgent && "border-rose-500/20 ring-1 ring-rose-500/10"
      )}
    >
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-none px-1.5 h-4.5", priority.color)}>
              {priority.label}
            </Badge>
            <Badge variant="outline" className="text-[8px] font-black uppercase bg-white/5 text-primary border-primary/20 px-1.5 h-4.5">
              {lead.legalArea}
            </Badge>
          </div>
          {hoursInStage > 24 ? (
            <div className="flex items-center gap-1 text-[8px] font-black text-rose-500 animate-pulse">
              <Clock className="h-3 w-3" /> {Math.floor(hoursInStage / 24)}d
            </div>
          ) : (
            <span className="text-[8px] font-black text-slate-600 uppercase">{hoursInStage}h na fase</span>
          )}
        </div>
        
        <h4 className="text-sm font-bold text-slate-200 group-hover/card:text-primary transition-colors line-clamp-2 leading-snug min-h-[40px]">
          {lead.title}
        </h4>

        {totalTasks > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-500 tracking-widest">
              <span>Produção {completedCount}/{totalTasks}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1 bg-white/5 [&>div]:bg-primary/60" />
          </div>
        )}

        <div className="space-y-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <UserCircle className="h-4 w-4 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-300 truncate">{client?.firstName} {client?.lastName}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{lead.captureSource}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-primary text-[8px] font-black border border-primary/20">
                {lawyer?.firstName?.charAt(0)}
              </div>
              <span className="text-[9px] text-slate-500 font-bold uppercase">Dr(a). {lawyer?.firstName}</span>
            </div>
            <div className="flex items-center gap-1 text-[8px] text-slate-600 font-black uppercase tracking-tighter">
              <History className="h-2.5 w-2.5" /> {formatDistanceToNow(lead.updatedAt.toDate(), { locale: ptBR, addSuffix: true })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ id, stage, leads, clientsMap, staffMap, onCardClick }: { id: string; stage: string; leads: Lead[]; clientsMap: Map<string, Client>; staffMap: Map<string, Staff>; onCardClick: (l: Lead) => void }) {
  const { setNodeRef } = useSortable({ id });
  const config = stageConfig[stage as LeadStatus] || stageConfig.NOVO;

  return (
    <div ref={setNodeRef} className="flex flex-col gap-4 min-w-[300px] w-full max-w-[320px] bg-white/[0.01] p-4 rounded-3xl border border-white/5 transition-colors hover:bg-white/[0.02]">
      <div className="flex items-center justify-between px-2 mb-2 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_8px] shadow-current", config.color.split(' ')[1])} />
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">{config.label}</h3>
        </div>
        <Badge variant="secondary" className="bg-white/5 text-slate-500 text-[10px] font-black px-2 h-5 border-none">{leads.length}</Badge>
      </div>
      
      <ScrollArea className="flex-1 h-full pr-3">
        <div className="flex flex-col gap-3 pb-4">
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
          {leads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20 border-2 border-dashed border-white/5 rounded-3xl group transition-all hover:opacity-30">
              <Target className="h-10 w-10 mb-3 text-slate-500" />
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fila Limpa</p>
              </div>
            </div>
          )}
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
  const { data: nextSession } = useSession();
  const { toast } = useToast();
  const [files, setFiles] = React.useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = React.useState(false);
  const [newNote, setNewNote] = React.useState('');

  const fetchFiles = React.useCallback(async () => {
    if (!lead?.driveFolderId) return;
    setIsLoadingFiles(true);
    try {
      const driveFiles = await listFiles(lead.driveFolderId);
      setFiles(driveFiles);
    } catch (e) { console.error(e); } finally { setIsLoadingFiles(false); }
  }, [lead?.driveFolderId]);

  React.useEffect(() => { if (open && lead) fetchFiles(); }, [open, lead, fetchFiles]);

  const handleToggleTask = async (task: string) => {
    if (!lead || !firestore) return;
    const completed = lead.completedTasks || [];
    const isCompleted = completed.includes(task);
    const updated = isCompleted ? completed.filter(t => t !== task) : [...completed, task];
    
    try {
      await updateDoc(doc(firestore, 'leads', lead.id), { completedTasks: updated, updatedAt: Timestamp.now() });
    } catch (e: any) { toast({ variant: 'destructive', title: 'Erro ao atualizar tarefa' }); }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !lead || !firestore || !nextSession?.user?.name) return;
    try {
      const event: TimelineEvent = {
        id: uuidv4(),
        type: 'note',
        description: newNote.trim(),
        date: Timestamp.now() as any,
        authorName: nextSession.user.name,
      };
      await updateDoc(doc(firestore, 'leads', lead.id), {
        timeline: arrayUnion(event),
        updatedAt: Timestamp.now()
      });
      setNewNote('');
      toast({ title: 'Nota adicionada!' });
    } catch (e: any) { toast({ variant: 'destructive', title: 'Erro', description: e.message }); }
  };

  if (!lead) return null;
  const stage = stageConfig[lead.status] || stageConfig.NOVO;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl bg-[#020617] border-white/10 text-white p-0 flex flex-col h-[100vh] overflow-hidden shadow-2xl">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className={cn("text-[9px] font-black uppercase h-5 px-2", stage.color)}>
              <stage.icon className="h-3 w-3 mr-1" /> {stage.label}
            </Badge>
            {lead.status === 'DISTRIBUICAO' && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] h-8" onClick={() => onProtocolClick(lead)}>
                <RefreshCw className="h-3 w-3 mr-1.5" /> Protocolar Agora
              </Button>
            )}
          </div>
          <SheetTitle className="text-2xl font-black font-headline text-white">{lead.title}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-10 pb-20">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                <Activity className="h-3.5 w-3.5" /> Checklist da Etapa: {stage.label}
              </div>
              <div className="grid gap-2">
                {stage.tasks.map(task => (
                  <div key={task} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 group cursor-pointer hover:bg-white/10 transition-all" onClick={() => handleToggleTask(task)}>
                    <div className={cn(
                      "h-5 w-5 rounded border flex items-center justify-center transition-all",
                      lead.completedTasks?.includes(task) ? "bg-primary border-primary text-primary-foreground" : "border-white/20"
                    )}>
                      {lead.completedTasks?.includes(task) && <Check className="h-3 w-3" />}
                    </div>
                    <span className={cn("text-sm font-bold", lead.completedTasks?.includes(task) ? "text-primary line-through opacity-50" : "text-slate-300")}>
                      {task}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                <UserCircle className="h-3.5 w-3.5" /> Cliente Principal
              </div>
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-6">
                <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                  <UserCircle className="h-10 w-10 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xl font-black text-white truncate">{client?.firstName} {client?.lastName}</h4>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400"><Mail className="h-3.5 w-3.5 text-primary" /> {client?.email || 'N/A'}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400"><Smartphone className="h-3.5 w-3.5 text-emerald-500" /> {client?.mobile || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                  <FileText className="h-3.5 w-3.5" /> Documentação de Triagem
                </div>
                {lead.driveFolderId && (
                  <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase text-primary gap-1.5" asChild>
                    <a href={`https://drive.google.com/drive/folders/${lead.driveFolderId}`} target="_blank"><ExternalLink className="h-3 w-3" /> Abrir Drive</a>
                  </Button>
                )}
              </div>
              <div className="grid gap-3">
                {isLoadingFiles ? <Skeleton className="h-20 w-full bg-white/5 rounded-2xl" /> : files.length > 0 ? (
                  files.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-primary/20 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">{f.iconLink ? <img src={f.iconLink} className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</div>
                        <span className="text-sm font-bold text-slate-300">{f.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" asChild><a href={f.webViewLink} target="_blank"><Download className="h-4 w-4" /></a></Button>
                    </div>
                  ))
                ) : <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-3xl opacity-30 italic text-xs">Nenhum documento anexado.</div>}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                <History className="h-3.5 w-3.5" /> Histórico de Atendimento
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Textarea placeholder="Adicionar nota..." className="bg-black/40 border-white/10 text-sm h-20" value={newNote} onChange={e => setNewNote(e.target.value)} />
                  <Button className="h-20 w-12" onClick={handleAddNote} disabled={!newNote.trim()}><Plus className="h-5 w-5" /></Button>
                </div>
                <div className="space-y-4 pt-4 border-t border-white/5">
                  {(lead as any).timeline?.sort((a: any, b: any) => b.date.seconds - a.date.seconds).map((event: any) => (
                    <div key={event.id} className="flex gap-4 items-start group">
                      <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0"><MessageSquare className="h-3.5 w-3.5 text-primary" /></div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-primary">{event.authorName}</span><span className="text-[9px] text-slate-500">{format(event.date.toDate(), 'dd/MM/yy HH:mm')}</span></div>
                        <p className="text-sm text-slate-300 leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
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
      <SheetContent className="sm:max-w-xl bg-[#020617] border-white/10 text-white p-0 flex flex-col h-full shadow-2xl">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <SheetTitle className="text-2xl font-black font-headline text-white flex items-center gap-3"><PlusCircle className="h-6 w-6 text-primary" /> Iniciar Atendimento</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Form {...form}>
              <form id="new-lead-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">Cliente Principal *</FormLabel>
                    <ClientSearchInput selectedClientId={field.value} onSelect={(c) => field.onChange(c.id)} onCreateNew={() => setShowClientModal(true)} />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">Título da Demanda *</FormLabel>
                    <Input placeholder="Ex: Revisional de Horas Extras" className="bg-black/40 border-white/10 h-11" {...field} />
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="lawyerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">Responsável *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">{lawyers.map(l => <SelectItem key={l.id} value={l.id}>Dr(a). {l.firstName}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="legalArea" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">Área Jurídica *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white"><SelectItem value="Trabalhista">Trabalhista</SelectItem><SelectItem value="Cível">Cível</SelectItem><SelectItem value="Previdenciário">Previdenciário</SelectItem></SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">Relato Inicial</FormLabel>
                    <Textarea className="bg-black/40 border-white/10 h-32" {...field} />
                  </FormItem>
                )} />
              </form>
            </Form>
          </div>
        </ScrollArea>
        <SheetFooter className="p-6 border-t border-white/5 bg-white/5 gap-3 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="new-lead-form" disabled={isSaving} className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20">{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />} Criar Lead</Button>
        </SheetFooter>
        <ClientCreationModal open={showClientModal} onOpenChange={setShowClientModal} onClientCreated={(c) => form.setValue('clientId', c.id)} />
      </SheetContent>
    </Sheet>
  );
}

export default function LeadsPage() {
  const { firestore, user } = useFirebase();
  const { data: nextSession } = useSession();
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

    const highDemand = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      total: leadsData.length,
      urgent: leadsData.filter(l => l.isUrgent).length,
      ready: leadsData.filter(l => l.status === 'DISTRIBUICAO').length,
      slowestStage: avgTimes[0] ? (stageConfig[avgTimes[0].stage as LeadStatus]?.label || '---') : '---',
      highDemand: highDemand ? (stageConfig[highDemand[0] as LeadStatus]?.label || '---') : '---'
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
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-xl"><Target className="h-8 w-8 text-primary" /></div>
          <div><h1 className="text-3xl font-black font-headline text-white">CRM Jurídico & Triagem</h1><p className="text-sm text-slate-500">Linha de produção e conversão de elite.</p></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64 group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" /><Input placeholder="Pesquisar leads..." className="pl-10 bg-[#0f172a] border-white/5 h-11 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
          <Button onClick={() => setIsNewLeadOpen(true)} className="bg-primary text-primary-foreground font-black uppercase text-[11px] tracking-widest h-11 px-8 shadow-xl shadow-primary/20 transition-all"><PlusCircle className="mr-2 h-4 w-4" /> Novo Lead</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-500">
        <Card className="bg-[#0f172a] border-white/5">
          <CardHeader className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400"><TrendingUp className="h-5 w-5" /></div>
            <div><p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Maior Demanda</p><p className="text-sm font-black text-white">{stats.highDemand}</p></div>
          </CardHeader>
        </Card>
        <Card className="bg-[#0f172a] border-white/5">
          <CardHeader className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400"><Timer className="h-5 w-5" /></div>
            <div><p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Gargalo (Tempo)</p><p className="text-sm font-black text-white">{stats.slowestStage}</p></div>
          </CardHeader>
        </Card>
        <Card className="bg-[#0f172a] border-white/5">
          <CardHeader className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400"><Flame className="h-5 w-5" /></div>
            <div><p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Casos Urgentes</p><p className="text-sm font-black text-white">{stats.urgent}</p></div>
          </CardHeader>
        </Card>
        <Card className="bg-[#0f172a] border-white/5">
          <CardHeader className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400"><FolderKanban className="h-5 w-5" /></div>
            <div><p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Pronto p/ Protocolo</p><p className="text-sm font-black text-white">{stats.ready}</p></div>
          </CardHeader>
        </Card>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar min-h-[650px]">
          {STAGES.map(stage => (
            <KanbanColumn key={stage} id={stage} stage={stage} leads={filteredLeads.filter(l => l.status === stage)} clientsMap={clientsMap} staffMap={staffMap} onCardClick={(l: Lead) => { setSelectedLead(l); setIsDetailsOpen(true); }} />
          ))}
        </div>
      </DndContext>

      <LeadDetailsSheet lead={selectedLead} client={selectedLead ? clientsMap.get(selectedLead.clientId) : undefined} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} onProtocolClick={(l) => { setSelectedLead(l); setIsConversionOpen(true); }} />
      <NewLeadSheet open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen} lawyers={lawyers} onCreated={() => {}} />
      <LeadConversionDialog lead={selectedLead} open={isConversionOpen} onOpenChange={setIsConversionOpen} onConfirm={handleConfirmProtocol} />
    </div>
  );
}
