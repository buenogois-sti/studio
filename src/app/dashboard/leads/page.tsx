
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
  Briefcase,
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
  FolderOpen,
  Lock,
  ExternalLink,
  DollarSign,
  Gavel,
  Activity,
  FileUp,
  Mail,
  Phone
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
import type { Lead, Client, Staff, LeadStatus, LeadPriority, UserProfile, OpposingParty, TimelineEvent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
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
import { createLead, updateLeadStatus, convertLeadToProcess, updateLeadOpposingParties } from '@/lib/lead-actions';
import { ClientSearchInput } from '@/components/process/ClientSearchInput';
import { ClientCreationModal } from '@/components/process/ClientCreationModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { v4 as uuidv4 } from 'uuid';
import { listFiles } from '@/lib/drive-actions';

const STAGES: LeadStatus[] = ['NOVO', 'ENTREVISTA', 'DOCUMENTACAO', 'CONTRATUAL', 'PRONTO'];

const stageConfig: Record<LeadStatus, { label: string; color: string; icon: any; description: string }> = {
  NOVO: { label: 'Triagem', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Zap, description: 'Novos contatos' },
  ENTREVISTA: { label: 'Atendimento', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: UserCircle, description: 'Entrevista técnica' },
  DOCUMENTACAO: { label: 'Burocracia', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock, description: 'Dados e provas' },
  CONTRATUAL: { label: 'Contratual', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: ShieldCheck, description: 'Asssignatures' },
  PRONTO: { label: 'Protocolo', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: CheckCircle2, description: 'Pronto p/ distribuir' },
  DISTRIBUIDO: { label: 'Distribuído', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: FolderKanban, description: 'Migrado' },
  ABANDONADO: { label: 'Abandonado', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: AlertCircle, description: 'Arquivado' },
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
  const form = useForm<z.infer<typeof conversionSchema>>({
    resolver: zodResolver(conversionSchema),
    defaultValues: {
      processNumber: '',
      court: '',
      courtBranch: '',
      caseValue: 0,
    }
  });

  const formatCurrencyBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const handleCurrencyChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const numericValue = Number(digits) / 100;
    form.setValue('caseValue', numericValue, { shouldDirty: true, shouldValidate: true });
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#020617] border-white/10 text-white shadow-2xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
            <ArrowRightLeft className="h-6 w-6 text-emerald-500" />
            Protocolar Processo
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Preencha os dados judiciais definitivos para converter este lead em processo.
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
            Confirmar Protocolo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadCard({ lead, client, lawyer, onClick }: { lead: Lead; client?: Client; lawyer?: Staff; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = { transform: CSS.Translate.toString(transform), transition };
  const priority = priorityConfig[lead.priority as LeadPriority];

  const lastUpdateLabel = React.useMemo(() => {
    return formatDistanceToNow(lead.updatedAt.toDate(), { locale: ptBR, addSuffix: true });
  }, [lead.updatedAt]);

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
          {lead.isUrgent && (
            <div className="flex items-center gap-1 text-rose-500 animate-pulse">
              <Flame className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        
        <h4 className="text-sm font-bold text-slate-200 group-hover/card:text-primary transition-colors line-clamp-2 leading-snug min-h-[40px]">
          {lead.title}
        </h4>

        <div className="space-y-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <UserCircle className="h-4 w-4 text-blue-400" />
            </div>
            <div className="min-w-0">
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
              <Clock className="h-2.5 w-2.5" /> {lastUpdateLabel}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ id, stage, leads, clientsMap, staffMap, onCardClick }: { id: string; stage: string; leads: Lead[]; clientsMap: Map<string, Client>; staffMap: Map<string, Staff>; onCardClick: (l: Lead) => void }) {
  const { setNodeRef } = useSortable({ id });
  const config = stageConfig[stage as LeadStatus];

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
              <Target className="h-10 w-10 mb-3 text-slate-500 transition-transform group-hover:scale-110" />
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fila Limpa</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Aguardando novas demandas</p>
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
  isProcessing 
}: { 
  lead: Lead | null; 
  client?: Client; 
  open: boolean; 
  onOpenChange: (o: boolean) => void;
  onProtocolClick: (l: Lead) => void;
  isProcessing: boolean;
}) {
  const { firestore } = useFirebase();
  const { data: session } = useSession();
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [lead?.driveFolderId]);

  React.useEffect(() => {
    if (open && lead) {
      fetchFiles();
    }
  }, [open, lead, fetchFiles]);

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
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  if (!lead) return null;

  const stage = stageConfig[lead.status];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl bg-[#020617] border-white/10 text-white p-0 flex flex-col overflow-hidden shadow-2xl">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className={cn("text-[9px] font-black uppercase h-5 px-2", stage.color)}>
              <stage.icon className="h-3 w-3 mr-1" /> {stage.label}
            </Badge>
            {lead.status === 'PRONTO' && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] h-8" onClick={() => onProtocolClick(lead)}>
                <ArrowRightLeft className="h-3 w-3 mr-1.5" /> Protocolar Agora
              </Button>
            )}
          </div>
          <SheetTitle className="text-2xl font-black font-headline text-white">{lead.title}</SheetTitle>
          <SheetDescription className="text-slate-400">Gerenciamento de atendimento e triagem técnica.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-10 pb-20">
            {/* Seção Cliente */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                <UserCircle className="h-3.5 w-3.5" /> Informações do Cliente
              </div>
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-6">
                <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                  <UserCircle className="h-10 w-10 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xl font-black text-white truncate">{client?.firstName} {client?.lastName}</h4>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Mail className="h-3.5 w-3.5 text-primary" /> {client?.email || 'N/A'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Smartphone className="h-3.5 w-3.5 text-emerald-500" /> {client?.mobile || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Seção Documentação */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                  <FileText className="h-3.5 w-3.5" /> Provas & Documentos
                </div>
                {lead.driveFolderId && (
                  <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase text-primary gap-1.5" asChild>
                    <a href={`https://drive.google.com/drive/folders/${lead.driveFolderId}`} target="_blank">
                      <ExternalLink className="h-3 w-3" /> Abrir no Drive
                    </a>
                  </Button>
                )}
              </div>
              <div className="grid gap-3">
                {isLoadingFiles ? (
                  <Skeleton className="h-20 w-full bg-white/5 rounded-2xl" />
                ) : files.length > 0 ? (
                  files.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-primary/20 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                          {f.iconLink ? <img src={f.iconLink} className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <span className="text-sm font-bold text-slate-300">{f.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                        <a href={f.webViewLink} target="_blank"><Download className="h-4 w-4" /></a>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-3xl opacity-30 italic text-xs">
                    Nenhum documento anexado ainda.
                  </div>
                )}
              </div>
            </section>

            {/* Timeline do Lead */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                <History className="h-3.5 w-3.5" /> Histórico de Triagem
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Adicionar nota de atendimento..." 
                    className="bg-black/40 border-white/10 text-sm h-20 resize-none" 
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                  />
                  <Button className="h-20 w-12" onClick={handleAddNote} disabled={!newNote.trim()}>
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  {(lead as any).timeline?.sort((a: any, b: any) => b.date.seconds - a.date.seconds).map((event: any) => (
                    <div key={event.id} className="flex gap-4 items-start group">
                      <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-primary">{event.authorName}</span>
                          <span className="text-[9px] text-slate-500">{format(event.date.toDate(), 'dd/MM/yy HH:mm')}</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t border-white/5 bg-white/5">
          <Button variant="ghost" className="w-full text-slate-500 hover:text-white font-bold uppercase text-[10px]" onClick={() => onOpenChange(false)}>
            Fechar Ficha
          </Button>
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
    defaultValues: {
      clientId: '',
      lawyerId: '',
      title: '',
      legalArea: 'Trabalhista',
      priority: 'MEDIA',
      captureSource: 'Indicação',
      isUrgent: false,
      description: '',
    }
  });

  const onSubmit = async (values: z.infer<typeof leadFormSchema>) => {
    setIsSaving(true);
    try {
      const result = await createLead(values);
      if (result.success) {
        // Sync drive folder for lead
        await syncLeadToDrive(result.id);
        toast({ title: 'Lead Criado!', description: 'O atendimento foi iniciado e a pasta no Drive organizada.' });
        onCreated();
        onOpenChange(false);
        form.reset();
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl bg-[#020617] border-white/10 text-white p-0 flex flex-col h-full shadow-2xl">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <SheetTitle className="text-2xl font-black font-headline text-white flex items-center gap-3">
            <PlusCircle className="h-6 w-6 text-primary" /> Iniciar Atendimento
          </SheetTitle>
          <SheetDescription className="text-slate-400">Preencha a triagem inicial para designar um advogado.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <Form {...form}>
              <form id="new-lead-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cliente Principal *</FormLabel>
                      <FormControl>
                        <ClientSearchInput 
                          selectedClientId={field.value} 
                          onSelect={(c) => field.onChange(c.id)} 
                          onCreateNew={() => setShowClientModal(true)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Título da Demanda *</FormLabel>
                      <FormControl><Input placeholder="Ex: Revisional de Horas Extras e Rescisão" className="bg-black/40 border-white/10 h-11" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lawyerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Responsável *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                            {lawyers.map(l => <SelectItem key={l.id} value={l.id}>Dr(a). {l.firstName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="legalArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Área Jurídica *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                            <SelectItem value="Trabalhista">Trabalhista</SelectItem>
                            <SelectItem value="Cível">Cível</SelectItem>
                            <SelectItem value="Previdenciário">Previdenciário</SelectItem>
                            <SelectItem value="Família">Família</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Prioridade *</FormLabel>
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
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="captureSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Origem / Canal *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                            <SelectItem value="Google">Google Search</SelectItem>
                            <SelectItem value="Instagram">Instagram</SelectItem>
                            <SelectItem value="Indicação">Indicação</SelectItem>
                            <SelectItem value="Passagem">Passagem / Presencial</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Relato Inicial do Caso</FormLabel>
                      <FormControl><Textarea placeholder="Descreva brevemente os fatos narrados pelo cliente..." className="bg-black/40 border-white/10 h-32 resize-none" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t border-white/5 bg-white/5 gap-3 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 font-bold uppercase text-[10px]">Cancelar</Button>
          <Button 
            type="submit" 
            form="new-lead-form" 
            disabled={isSaving} 
            className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />}
            Criar Lead e Abrir Drive
          </Button>
        </SheetFooter>

        <ClientCreationModal open={showClientModal} onOpenChange={setShowClientModal} onClientCreated={(c) => form.setValue('clientId', c.id)} />
      </SheetContent>
    </Sheet>
  );
}

export default function LeadsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isNewLeadOpen, setIsNewLeadOpen] = React.useState(false);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isConversionOpen, setIsConversionOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const userProfileRef = useMemoFirebase(
    () => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads'), where('status', '!=', 'DISTRIBUIDO')) : null), [firestore]);
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
    
    if (userProfile?.role === 'lawyer') {
        list = list.filter(l => l.lawyerId === userProfile.id);
    }
    
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(l => 
      l.title.toLowerCase().includes(q) || 
      clientsMap.get(l.clientId)?.firstName.toLowerCase().includes(q) ||
      clientsMap.get(l.clientId)?.lastName?.toLowerCase().includes(q)
    );
  }, [leadsData, searchTerm, clientsMap, userProfile]);

  const stats = React.useMemo(() => {
    return {
      total: filteredLeads.length,
      urgent: filteredLeads.filter(l => l.isUrgent).length,
      ready: filteredLeads.filter(l => l.status === 'PRONTO').length,
    };
  }, [filteredLeads]);

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id;
    const newStatus = over.id as LeadStatus;
    const lead = leadsData?.find(l => l.id === leadId);

    if (lead && lead.status !== newStatus && STAGES.includes(newStatus)) {
      if (newStatus === 'CONTRATUAL' || newStatus === 'PRONTO') {
        const client = clientsMap.get(lead.clientId);
        if (client) {
          const isPJ = client.clientType === 'Pessoa Jurídica';
          const hasDocument = !!client.document;
          const hasAddress = !!client.address?.street && !!client.address?.zipCode;
          const hasRG = isPJ || !!client.rg;

          if (!hasDocument || !hasAddress || !hasRG) {
            toast({
              variant: 'destructive',
              title: 'Impedimento: Dados Faltantes',
              description: 'Preencha RG, CPF e Endereço do cliente para avançar.',
            });
            return;
          }
        }
      }

      try {
        await updateLeadStatus(leadId, newStatus);
        toast({ title: `Lead movido para ${stageConfig[newStatus].label}` });
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Erro ao mover', description: e.message });
      }
    }
  };

  const handleConfirmProtocol = async (data: z.infer<typeof conversionSchema>) => {
    if (!selectedLead) return;
    setIsProcessing(selectedLead.id);
    try {
      const result = await convertLeadToProcess(selectedLead.id, data);
      if (result.success) {
        toast({ title: 'Processo Protocolado!', description: 'O lead foi migrado para processos ativos.' });
        setIsConversionOpen(false);
        setIsDetailsOpen(false);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro na conversão', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-xl">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight font-headline text-white leading-tight">CRM & Triagem Jurídica</h1>
            <p className="text-sm text-slate-500 font-medium">Pipeline de prospecção e conversão de elite.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Pesquisar leads..." 
              className="pl-10 bg-[#0f172a] border-white/5 h-11 text-sm focus:border-primary/50" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <Button onClick={() => setIsNewLeadOpen(true)} className="bg-primary text-primary-foreground font-black uppercase text-[11px] tracking-widest h-11 px-8 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/[0.02] border-white/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Leads Ativos</p>
              <p className="text-2xl font-black text-white">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-rose-500/[0.02] border-rose-500/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest">Urgentes</p>
              <p className="text-2xl font-black text-white">{stats.urgent}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/[0.02] border-emerald-500/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Prontos p/ Protocolo</p>
              <p className="text-2xl font-black text-white">{stats.ready}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar min-h-[650px]">
          {STAGES.map(stage => (
            <KanbanColumn 
              key={stage} 
              id={stage} 
              stage={stage}
              leads={filteredLeads.filter(l => l.status === stage)}
              clientsMap={clientsMap}
              staffMap={staffMap}
              onCardClick={(l: Lead) => { setSelectedLead(l); setIsDetailsOpen(true); }}
            />
          ))}
        </div>
      </DndContext>

      <LeadDetailsSheet 
        lead={selectedLead} 
        client={selectedLead ? clientsMap.get(selectedLead.clientId) : undefined}
        open={isDetailsOpen} 
        onOpenChange={setIsDetailsOpen}
        onProtocolClick={(l) => { setSelectedLead(l); setIsConversionOpen(true); }}
        isProcessing={isProcessing === selectedLead?.id}
      />

      <NewLeadSheet 
        open={isNewLeadOpen} 
        onOpenChange={setIsNewLeadOpen} 
        lawyers={lawyers} 
        onCreated={() => {}} 
      />

      <LeadConversionDialog 
        lead={selectedLead}
        open={isConversionOpen}
        onOpenChange={setIsConversionOpen}
        onConfirm={handleConfirmProtocol}
      />
    </div>
  );
}
