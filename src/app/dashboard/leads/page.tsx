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
  ClipboardList
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
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
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
      <DialogContent className="sm:max-w-4xl max-w-[95vw] bg-[#020617] border-white/10 text-white shadow-2xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-white font-headline text-lg sm:text-2xl">
              <ArrowRightLeft className="h-5 w-5 sm:h-7 sm:w-7 text-emerald-500" />
              Distribuição Processual
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreFill}
              disabled={isPreFilling}
              className="h-8 sm:h-9 border-primary/30 text-primary hover:bg-primary/10 text-[9px] sm:text-[11px] font-black uppercase gap-1 sm:gap-2"
            >
              {isPreFilling ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Bot className="h-3 w-3 sm:h-4 sm:w-4" />}
              <span className="hidden sm:inline">Sugestão (IA)</span>
              <span className="sm:hidden">IA</span>
            </Button>
          </div>
          <DialogDescription className="text-slate-400 mt-1 sm:mt-2 text-xs sm:text-sm">
            Finalize os dados para integrar o lead ao sistema de processos ativos.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <Form {...form}>
            <form id="conversion-form" onSubmit={form.handleSubmit(onConfirm)} className="p-4 sm:p-8 space-y-8 sm:space-y-10">
              
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 text-[10px] sm:text-[12px] font-black uppercase text-primary tracking-[0.2em] sm:tracking-[0.25em]">
                  <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5" /> Dados da Ação
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                  <FormField
                    control={form.control}
                    name="processNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 tracking-widest">Número do Processo (CNJ) *</FormLabel>
                        <FormControl>
                          <Input placeholder="0000000-00.0000.0.00.0000" className="bg-black/40 border-white/10 h-10 sm:h-12 font-mono tracking-widest text-sm sm:text-base" {...field} />
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
                        <FormLabel className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 tracking-widest">Valor da Causa (R$) *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                            <Input 
                              placeholder="0,00" 
                              className="pl-10 bg-black/40 border-white/10 h-10 sm:h-12 font-bold text-base sm:text-lg"
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
                        <FormLabel className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 tracking-widest">Fórum / Comarca *</FormLabel>
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
                        <FormLabel className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 tracking-widest">Vara / Câmara *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 2ª Vara do Trabalho de SBC" className="bg-black/40 border-white/10 h-10 sm:h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leadLawyerId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 tracking-widest">Advogado Responsável (Equipe)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 sm:h-12 bg-black/40 border-white/10">
                              <SelectValue placeholder="Selecione o titular..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                            {lawyers.map(l => (
                              <SelectItem key={l.id} value={l.id} className="font-bold">
                                Dr(a). {l.firstName} {l.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] sm:text-[12px] font-black uppercase text-rose-400 tracking-[0.2em] sm:tracking-[0.25em]">
                    <Building className="h-4 w-4 sm:h-5 sm:w-5" /> Qualificação do Réu
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => append({ name: '', document: '', address: '' })}
                    className="h-8 text-[9px] sm:text-[11px] font-black uppercase text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Adicionar Outro Réu</span><span className="sm:hidden">Novo Réu</span>
                  </Button>
                </div>

                <div className="grid gap-4 sm:gap-6">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] bg-white/[0.02] border-2 border-white/5 space-y-4 sm:space-y-6 relative group hover:border-rose-500/20 transition-all duration-300">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 h-8 w-8 sm:h-9 sm:w-9 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-full"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <FormField
                          control={form.control}
                          name={`opposingParties.${index}.name` as any}
                          render={({ field: nameField }) => (
                            <FormItem>
                              <FormLabel className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">Razão Social / Nome Completo *</FormLabel>
                              <FormControl><Input placeholder="Ex: Empresa de Transportes LTDA" className="bg-black/40 border-white/5 h-10 sm:h-11" {...nameField} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`opposingParties.${index}.document` as any}
                          render={({ field: docField }) => (
                            <FormItem>
                              <FormLabel className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">CNPJ / CPF</FormLabel>
                              <FormControl><Input placeholder="00.000.000/0000-00" className="bg-black/40 border-white/5 h-10 sm:h-11 font-mono" {...docField} /></FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`opposingParties.${index}.address` as any}
                        render={({ field: addrField }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">Endereço Completo</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
                                <Textarea placeholder="Rua, número, bairro, cidade - UF..." className="pl-10 min-h-[80px] sm:min-h-[100px] bg-black/40 border-white/5 resize-none text-xs sm:text-sm leading-relaxed" {...addrField} />
                              </div>
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

        <DialogFooter className="p-4 sm:p-8 border-t border-white/5 bg-white/5 shrink-0 gap-3 sm:gap-4 flex-col sm:flex-row">
          <DialogClose asChild>
            <Button variant="ghost" className="text-slate-400 font-bold uppercase text-[10px] sm:text-[12px] tracking-widest px-4 sm:px-8 h-10 sm:h-14">Cancelar</Button>
          </DialogClose>
          <Button 
            type="submit" 
            form="conversion-form"
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] sm:text-[12px] h-10 sm:h-14 shadow-2xl shadow-emerald-900/30"
          >
            Finalizar Distribuição & Criar Processo
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
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className={cn("text-[7px] sm:text-[8px] font-black uppercase border-none px-1 h-4", priority.color)}>
              {priority.label}
            </Badge>
            <Badge variant="outline" className="text-[7px] sm:text-[8px] font-black uppercase bg-white/5 text-primary border-primary/20 px-1 h-4">
              {lead.legalArea}
            </Badge>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-[7px] sm:text-[8px] font-black uppercase tracking-tighter transition-colors",
            hoursInStage > 24 ? "text-rose-500 animate-pulse" : hoursInStage > 12 ? "text-amber-500" : "text-slate-500"
          )}>
            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {hoursInStage}h na fase
          </div>
        </div>
        
        <h4 className="text-sm sm:text-base font-black text-white group-hover/card:text-primary transition-colors line-clamp-2 leading-tight min-h-[36px] sm:min-h-[40px] uppercase tracking-tight">
          {lead.title}
        </h4>

        {totalTasks > 0 && (
          <div className="space-y-1.5 sm:space-y-2 pt-0.5 sm:pt-1">
            <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-black uppercase text-slate-500 tracking-[0.1em] sm:tracking-[0.15em]">
              <span className="flex items-center gap-1">
                <ShieldCheck className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3", progress === 100 ? "text-emerald-500" : "text-slate-600")} />
                Produção {completedCount}/{totalTasks}
              </span>
              <span className={cn(progress === 100 ? "text-emerald-500" : "text-white")}>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 sm:h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  progress === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-primary/40 to-primary shadow-[0_0_8px_rgba(245,208,48,0.2)]"
                )}
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-black/30 border border-white/5 group-hover/card:border-primary/20 transition-all duration-300">
          <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-inner">
            <UserCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-black text-slate-200 truncate leading-none mb-0.5 sm:mb-1">{client?.firstName} {client?.lastName}</p>
            <p className="text-[7px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
              <TrendingUp className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-primary" /> {lead.captureSource}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[8px] sm:text-[9px] font-black border border-primary/20 shadow-sm">
            {lawyer?.firstName?.charAt(0)}
          </div>
          <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter truncate max-w-[60px] sm:max-w-[80px]">
            {lawyer?.firstName}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[7px] sm:text-[9px] text-slate-600 font-black uppercase tracking-widest">
          <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {formatDistanceToNow(lead.updatedAt.toDate(), { locale: ptBR, addSuffix: false })}
        </div>
      </div>
    </Card>
  );
}

function KanbanColumn({ id, stage, leads, clientsMap, staffMap, onCardClick }: { id: string; stage: string; leads: Lead[]; clientsMap: Map<string, Client>; staffMap: Map<string, Staff>; onCardClick: (l: Lead) => void }) {
  const { setNodeRef } = useSortable({ id });
  const config = stageConfig[stage as LeadStatus] || stageConfig.NOVO;

  return (
    <div ref={setNodeRef} className="flex flex-col gap-3 sm:gap-4 min-w-[280px] sm:min-w-[320px] w-full max-w-[340px] bg-white/[0.01] p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 transition-colors hover:bg-white/[0.02] h-full overflow-hidden">
      <div className="flex items-center justify-between px-2 sm:px-3 mb-1 sm:mb-2 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full shadow-[0_0_12px] shadow-current animate-pulse", config.color.split(' ')[1])} />
          <h3 className="text-[10px] sm:text-[12px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white/90">{config.label}</h3>
        </div>
        <Badge variant="secondary" className="bg-white/5 text-slate-500 text-[9px] sm:text-[11px] font-black px-2 h-5 sm:h-6 border-none rounded-lg shadow-inner">{leads.length}</Badge>
      </div>
      
      <ScrollArea className="flex-1 h-full pr-1 sm:pr-2">
        <div className="flex flex-col gap-3 sm:gap-4 pb-10 sm:pb-20">
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
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 opacity-20 border-2 border-dashed border-white/5 rounded-[1.5rem] sm:rounded-[2rem] group transition-all hover:opacity-30">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-white/5 flex items-center justify-center mb-3 sm:mb-4">
                <Target className="h-6 w-6 sm:h-8 sm:w-8 text-slate-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400">Esteira Vazia</p>
                <p className="text-[7px] sm:text-[9px] text-slate-600 font-bold uppercase">Aguardando demandas</p>
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
  const { data: session } = useSession();
  const { toast } = useToast();
  const [files, setFiles] = React.useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = React.useState(false);
  const [newNote, setNewNote] = React.useState('');

  const interviewQuery = useMemoFirebase(
    () => (firestore && lead ? query(collection(firestore, 'checklist_templates'), where('category', '==', 'Entrevista de Triagem'), where('legalArea', '==', lead.legalArea), limit(1)) : null),
    [firestore, lead?.legalArea]
  );
  const { data: interviewTemplates } = useCollection<ChecklistTemplate>(interviewQuery);
  const activeInterview = interviewTemplates?.[0];

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

  const handleSaveInterviewAnswer = async (questionId: string, answer: string) => {
    if (!lead || !firestore) return;
    try {
      await updateDoc(doc(firestore, 'leads', lead.id), {
        [`interviewAnswers.${questionId}`]: answer,
        updatedAt: Timestamp.now()
      });
    } catch (e: any) { console.error(e); }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !lead || !firestore || !session?.user?.name) return;
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
    } catch (e: any) { toast({ variant: 'destructive', title: 'Erro', description: e.message }); }
  };

  if (!lead) return null;
  const stage = stageConfig[lead.status] || stageConfig.NOVO;
  const completedCount = lead.completedTasks?.length || 0;
  const totalTasks = stage.tasks.length;
  const isReadyToAdvance = totalTasks > 0 && completedCount === totalTasks;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl max-w-[100vw] bg-[#020617] border-white/10 text-white p-0 flex flex-col h-[100vh] overflow-hidden shadow-2xl">
        <SheetHeader className="p-4 sm:p-8 border-b border-white/5 bg-white/[0.02] shrink-0 text-left">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge variant="outline" className={cn("text-[9px] sm:text-[11px] font-black uppercase h-6 sm:h-7 px-2 sm:px-4 border-2 transition-all", stage.color)}>
                <stage.icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" /> {stage.label}
              </Badge>
              {isReadyToAdvance && (
                <Badge className="bg-emerald-600 text-white font-black text-[8px] sm:text-[10px] uppercase tracking-widest animate-in zoom-in h-6 sm:h-7 px-2 sm:px-4 shadow-lg shadow-emerald-900/40">
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" /> <span className="hidden sm:inline">Fase Concluída</span><span className="sm:hidden">OK</span>
                </Badge>
              )}
            </div>
            {lead.status === 'DISTRIBUICAO' && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[9px] sm:text-[11px] h-9 sm:h-11 px-4 sm:px-8 shadow-2xl shadow-emerald-900/30" onClick={() => onProtocolClick(lead)}>
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" /> Protocolar
              </Button>
            )}
          </div>
          <SheetTitle className="text-2xl sm:text-5xl font-black font-headline text-white leading-tight uppercase tracking-tight text-left mb-1 sm:mb-2">{lead.title}</SheetTitle>
          <SheetDescription className="text-slate-400 text-xs sm:text-base font-medium text-left">Gestão de micro-etapas e triagem de documentos pré-processuais.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-10 space-y-10 sm:space-y-16 pb-32">
            
            <section className="space-y-4 sm:space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[12px] font-black uppercase text-slate-500 tracking-[0.2em] sm:tracking-[0.25em]">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Checklist: {stage.label}
                </div>
                <span className="text-[9px] sm:text-[11px] font-black text-white bg-white/5 px-2 sm:py-1.5 py-1 rounded-lg sm:rounded-xl border border-white/10">{completedCount}/{totalTasks}</span>
              </div>
              
              <div className="grid gap-3 sm:gap-4">
                {stage.tasks.map(task => {
                  const isDone = lead.completedTasks?.includes(task);
                  return (
                    <div 
                      key={task} 
                      className={cn(
                        "flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 transition-all duration-300 group cursor-pointer",
                        isDone 
                          ? "bg-emerald-500/[0.03] border-emerald-500/20" 
                          : "bg-white/[0.03] border-white/5 hover:border-primary/30 hover:bg-white/[0.05]"
                      )} 
                      onClick={() => handleToggleTask(task)}
                    >
                      <div className={cn(
                        "h-6 w-6 sm:h-8 sm:w-8 rounded-xl sm:rounded-2xl border-2 flex items-center justify-center transition-all shadow-inner",
                        isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/10 group-hover:border-primary/50"
                      )}>
                        {isDone && <Check className="h-3 w-3 sm:h-4 sm:w-4 stroke-[3]" />}
                      </div>
                      <span className={cn(
                        "text-sm sm:text-lg font-bold tracking-tight flex-1",
                        isDone ? "text-emerald-400/70 line-through" : "text-slate-200"
                      )}>
                        {task}
                      </span>
                      {!isDone && <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-white/5 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4 sm:space-y-8">
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[12px] font-black uppercase text-slate-500 tracking-[0.2em] sm:tracking-[0.25em]">
                <UserCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" /> Cliente de Triagem
              </div>
              <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-br from-white/[0.02] to-white/[0.05] border-2 border-white/5 flex flex-col md:flex-row items-center gap-6 sm:gap-10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Bot className="h-24 w-24 sm:h-32 sm:w-32 text-primary" />
                </div>
                <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-[1.5rem] sm:rounded-[2.5rem] bg-blue-500/10 flex items-center justify-center border-2 border-blue-500/20 shrink-0 shadow-2xl">
                  <UserCircle className="h-10 w-10 sm:h-16 sm:w-16 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1 relative z-10 text-center md:text-left">
                  <h4 className="text-2xl sm:text-4xl font-black text-white truncate tracking-tighter mb-2 sm:mb-4">{client?.firstName} {client?.lastName}</h4>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 sm:gap-8 mt-2">
                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-base text-slate-400 font-bold group/link cursor-pointer hover:text-white transition-colors">
                      <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/link:border-primary/50"><Mail className="h-3 w-3 sm:h-4 sm:w-4 text-primary" /></div>
                      {client?.email || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-base text-slate-400 font-bold group/link cursor-pointer hover:text-white transition-colors">
                      <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/link:border-emerald-500/50"><Smartphone className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" /></div>
                      {client?.mobile || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {lead.status === 'NOVO' && (
              <section className="space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[12px] font-black uppercase text-amber-400 tracking-[0.2em] sm:tracking-[0.25em]">
                    <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" /> {activeInterview ? `Entrevista: ${activeInterview.legalArea}` : 'Entrevista de Triagem'}
                  </div>
                  {!activeInterview && (
                    <Badge variant="outline" className="text-[8px] font-bold border-white/10 text-slate-500 uppercase">Usando Padrão do Sistema</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:gap-6 bg-amber-500/[0.03] border-2 border-amber-500/10 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem]">
                  {activeInterview ? (
                    activeInterview.items.map((item) => (
                      <div key={item.id} className="space-y-2 sm:space-y-3">
                        <Label className="text-[9px] sm:text-[11px] font-black uppercase text-slate-500 tracking-widest ml-1">{item.label} {item.required && '*'}</Label>
                        {item.type === 'TEXT' ? (
                          <Textarea 
                            placeholder="Resposta..." 
                            className="bg-black/40 border-white/5 text-xs sm:text-sm rounded-lg sm:rounded-xl focus:border-amber-500/50 transition-all min-h-[80px]"
                            defaultValue={lead.interviewAnswers?.[item.id] || ''}
                            onBlur={(e) => handleSaveInterviewAnswer(item.id, e.target.value)}
                          />
                        ) : (
                          <Input 
                            placeholder="Resposta..." 
                            className="bg-black/40 border-white/5 h-10 sm:h-12 text-xs sm:text-sm rounded-lg sm:rounded-xl focus:border-amber-500/50 transition-all"
                            defaultValue={lead.interviewAnswers?.[item.id] || ''}
                            onBlur={(e) => handleSaveInterviewAnswer(item.id, e.target.value)}
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-40">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Nenhuma entrevista personalizada para {lead.legalArea}.</p>
                      <p className="text-[10px] mt-1 uppercase">Configure em Checklists &gt; Entrevistas.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="space-y-4 sm:space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[12px] font-black uppercase text-slate-500 tracking-[0.2em] sm:tracking-[0.25em]">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Evidências e Documentos
                </div>
                {lead.driveFolderId && (
                  <Button variant="ghost" size="sm" className="h-8 sm:h-9 text-[9px] sm:text-[11px] font-black uppercase text-primary hover:bg-primary/10 gap-2 sm:gap-3 border-2 border-primary/20 rounded-xl sm:rounded-2xl px-3 sm:px-6" asChild>
                    <a href={`https://drive.google.com/drive/folders/${lead.driveFolderId}`} target="_blank"><ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" /> Drive</a>
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {isLoadingFiles ? (
                  <>
                    <Skeleton className="h-16 sm:h-20 w-full bg-white/5 rounded-[1.5rem] sm:rounded-[2rem]" />
                    <Skeleton className="h-16 sm:h-20 w-full bg-white/5 rounded-[1.5rem] sm:rounded-[2rem]" />
                  </>
                ) : files.length > 0 ? (
                  files.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-black/40 border-2 border-white/5 hover:border-primary/30 transition-all group">
                      <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                        <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-lg sm:rounded-2xl bg-white/5 flex items-center justify-center border-2 border-white/10 group-hover:bg-primary/10 transition-colors shrink-0">
                          {f.iconLink ? <img src={f.iconLink} alt="icon" className="h-5 w-5 sm:h-6 sm:w-6" /> : <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] sm:text-sm font-bold text-slate-200 group-hover:text-white truncate max-w-[140px] sm:max-w-[180px]">{f.name}</span>
                          <span className="text-[8px] sm:text-[10px] text-slate-500 font-mono uppercase tracking-widest">{f.mimeType?.split('.').pop()}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg sm:rounded-2xl hover:bg-white/10" asChild>
                        <a href={f.webViewLink} target="_blank" title="Abrir"><Download className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-hover:text-primary" /></a>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-16 sm:py-20 border-2 border-dashed border-white/5 rounded-[2rem] sm:rounded-[3rem] opacity-30 flex flex-col items-center gap-3 sm:gap-4">
                    <FileUp className="h-10 w-10 sm:h-12 sm:w-12 text-slate-500" />
                    <p className="text-[10px] sm:text-[12px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-slate-400">Sem arquivos anexados</p>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[12px] font-black uppercase text-slate-500 tracking-[0.2em] sm:tracking-[0.25em]">
                <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Timeline de Atendimento
              </div>
              <div className="space-y-8 sm:space-y-10">
                <div className="flex gap-3 sm:gap-4 items-end">
                  <div className="flex-1 space-y-2 sm:space-y-3">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase text-slate-500 tracking-widest ml-2">Nova Anotação</Label>
                    <Textarea 
                      placeholder="Registre pontos relevantes da triagem..." 
                      className="bg-black/40 border-2 border-white/10 text-xs sm:text-base h-24 sm:h-32 rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-8 resize-none focus:border-primary transition-all shadow-inner leading-relaxed" 
                      value={newNote} 
                      onChange={e => setNewNote(e.target.value)} 
                    />
                  </div>
                  <Button 
                    className={cn(
                      "h-24 sm:h-32 w-14 sm:w-20 rounded-[1.5rem] sm:rounded-[2.5rem] transition-all shrink-0",
                      newNote.trim() ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30" : "bg-white/5 text-slate-600"
                    )} 
                    onClick={handleAddNote} 
                    disabled={!newNote.trim()}
                  >
                    <Plus className="h-6 w-6 sm:h-8 sm:w-8" />
                  </Button>
                </div>
                
                <div className="space-y-6 sm:space-y-8 relative before:absolute before:inset-0 before:ml-4 sm:before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/30 before:via-border/40 before:to-transparent">
                  {(lead as any).timeline?.sort((a: any, b: any) => b.date.seconds - a.date.seconds).map((event: any) => (
                    <div key={event.id} className="flex gap-4 sm:gap-8 items-start group relative animate-in slide-in-from-left-2">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-[#020617] border-2 border-primary/30 flex items-center justify-center shrink-0 z-10 shadow-lg group-hover:border-primary transition-colors">
                        <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2 sm:space-y-3 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] bg-white/[0.03] border-2 border-white/5 hover:border-white/10 transition-all shadow-2xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] sm:text-[11px] font-black uppercase text-primary tracking-widest">{event.authorName}</span>
                          <span className="text-[8px] sm:text-[10px] text-slate-500 font-mono">{format(event.date.toDate(), 'dd/MM/yy HH:mm')}</span>
                        </div>
                        <p className="text-xs sm:text-base text-slate-200 leading-relaxed font-medium">{event.description}</p>
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
      <SheetContent className="sm:max-w-3xl max-w-[100vw] bg-[#020617] border-white/10 text-white p-0 flex flex-col h-full shadow-2xl">
        <SheetHeader className="p-6 sm:p-8 border-b border-white/5 bg-white/[0.02] shrink-0 text-left">
          <SheetTitle className="text-2xl sm:text-4xl font-black font-headline text-white flex items-center gap-3 sm:gap-5 tracking-tight uppercase text-left">
            <div className="h-10 w-10 sm:h-14 w-14 rounded-lg sm:rounded-[1.5rem] bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-2xl shadow-primary/10 shrink-0">
              <PlusCircle className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
            </div>
            Novo Atendimento
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-6 sm:p-10">
            <Form {...form}>
              <form id="new-lead-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-10">
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] sm:text-[12px] font-black uppercase text-slate-500 tracking-[0.2em] sm:tracking-[0.25em] ml-1 sm:ml-2">Cliente Principal *</FormLabel>
                    <ClientSearchInput selectedClientId={field.value} onSelect={(c) => field.onChange(c.id)} onCreateNew={() => setShowClientModal(true)} />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] sm:text-[12px] font-black uppercase text-slate-500 tracking-[0.2em] sm:tracking-[0.25em] ml-1 sm:ml-2">Título da Demanda *</FormLabel>
                    <Input placeholder="Ex: Revisional de Horas Extras..." className="bg-black/40 border-2 border-white/5 h-12 sm:h-14 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold focus:border-primary/50 transition-all shadow-inner" {...field} />
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  <FormField control={form.control} name="lawyerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] sm:text-[12px] font-black uppercase text-slate-500 tracking-[0.2em] sm:tracking-[0.25em] ml-1 sm:ml-2">Responsável *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/40 border-2 border-white/5 h-12 sm:h-14 rounded-xl sm:rounded-2xl"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">{lawyers.map(l => <SelectItem key={l.id} value={l.id} className="font-bold">Dr(a). {l.firstName}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="legalArea" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] sm:text-[12px] font-black uppercase text-slate-500 tracking-[0.2em] sm:tracking-[0.25em] ml-1 sm:ml-2">Área Jurídica *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="bg-black/40 border-2 border-white/5 h-12 sm:h-14 rounded-xl sm:rounded-2xl"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                          {['Trabalhista', 'Cível', 'Previdenciário', 'Família', 'Outro'].map(area => <SelectItem key={area} value={area} className="font-bold">{area}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] sm:text-[12px] font-black uppercase text-slate-500 tracking-[0.2em] sm:tracking-[0.25em] ml-1 sm:ml-2">Relato Inicial / Briefing</FormLabel>
                    <Textarea className="bg-black/40 border-2 border-white/5 h-32 sm:h-48 rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-8 resize-none shadow-inner leading-relaxed text-sm sm:text-base font-medium focus:border-primary/50 transition-all" placeholder="Descreva os fatos principais narrados pelo cliente..." {...field} />
                  </FormItem>
                )} />
              </form>
            </Form>
          </div>
        </ScrollArea>
        <SheetFooter className="p-6 sm:p-10 border-t border-white/5 bg-white/[0.02] gap-4 sm:gap-6 shrink-0 flex-row">
          <Button variant="ghost" className="flex-1 text-slate-400 font-bold uppercase text-[10px] sm:text-[12px] tracking-widest px-4 sm:px-10 h-12 sm:h-14" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="new-lead-form" disabled={isSaving} className="flex-[2] bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] sm:text-[12px] h-12 sm:h-14 rounded-xl sm:rounded-[1.5rem] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">
            {isSaving ? <Loader2 className="h-4 w-4 sm:h-6 sm:w-6 animate-spin mr-2 sm:mr-4" /> : <Target className="h-4 w-4 sm:h-6 sm:w-6 mr-2 sm:mr-4" />} 
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 px-1">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-[2rem] bg-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-2xl shadow-primary/10 animate-in zoom-in duration-500 shrink-0">
            <Target className="h-6 w-6 sm:h-9 sm:w-9 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black font-headline text-white tracking-tight uppercase">CRM Jurídico</h1>
            <p className="text-[10px] sm:text-sm text-slate-500 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Esteira Bueno Gois</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 sm:w-72 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <Input placeholder="Pesquisar..." className="pl-11 bg-[#0f172a] border-white/5 border-2 h-10 sm:h-12 text-sm rounded-xl sm:rounded-2xl focus:border-primary/50 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Button onClick={() => setIsNewLeadOpen(true)} className="bg-primary text-primary-foreground font-black uppercase text-[9px] sm:text-[11px] tracking-[0.15em] sm:tracking-[0.2em] h-10 sm:h-12 px-6 sm:px-10 rounded-xl sm:rounded-2xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
            <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Novo Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 px-1 animate-in fade-in slide-in-from-top-4 duration-700">
        <Card className="bg-[#0f172a] border-white/5 group hover:border-blue-500/30 transition-all shadow-none">
          <CardHeader className="p-3 sm:p-5 flex items-center gap-3 sm:gap-5 flex-row">
            <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-lg sm:rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0"><TrendingUp className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            <div className="min-w-0"><p className="text-[7px] sm:text-[10px] font-black uppercase text-slate-500 tracking-widest truncate">Demanda</p><p className="text-sm sm:text-lg font-black text-white truncate">{stats.highDemand}</p></div>
          </CardHeader>
        </Card>
        <Card className="bg-[#0f172a] border-white/5 group hover:border-rose-500/30 transition-all shadow-none">
          <CardHeader className="p-3 sm:p-5 flex items-center gap-3 sm:gap-5 flex-row">
            <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-lg sm:rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0"><Timer className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            <div className="min-w-0"><p className="text-[7px] sm:text-[10px] font-black uppercase text-slate-500 tracking-widest truncate">Retenção</p><p className="text-sm sm:text-lg font-black text-white truncate">{stats.slowestStage}</p></div>
          </CardHeader>
        </Card>
        <Card className="bg-[#0f172a] border-white/5 group hover:border-amber-500/30 transition-all shadow-none">
          <CardHeader className="p-3 sm:p-5 flex items-center gap-3 sm:gap-5 flex-row">
            <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-lg sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0"><Flame className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            <div className="min-w-0"><p className="text-[7px] sm:text-[10px] font-black uppercase text-slate-500 tracking-widest truncate">Críticos</p><p className="text-sm sm:text-lg font-black text-white truncate">{stats.urgent}</p></div>
          </CardHeader>
        </Card>
        <Card className="bg-[#0f172a] border-white/5 group hover:border-emerald-500/30 transition-all shadow-none">
          <CardHeader className="p-3 sm:p-5 flex items-center gap-3 sm:gap-5 flex-row">
            <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-lg sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0"><FolderKanban className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            <div className="min-w-0"><p className="text-[7px] sm:text-[10px] font-black uppercase text-slate-500 tracking-widest truncate">Prontos</p><p className="text-sm sm:text-lg font-black text-white truncate">{stats.ready}</p></div>
          </CardHeader>
        </Card>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 sm:gap-8 overflow-x-auto pb-12 px-1 no-scrollbar min-h-[600px] scroll-smooth">
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
