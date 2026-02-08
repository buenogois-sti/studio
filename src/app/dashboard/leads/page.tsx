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
  LayoutGrid,
  List,
  UserPlus,
  ChevronRight,
  ShieldCheck,
  FileText,
  MapPin,
  Smartphone,
  CreditCard,
  Building,
  History,
  MessageSquare,
  Plus,
  FolderOpen,
  Lock,
  ExternalLink,
  Download,
  Hash,
  Mail,
  Phone,
  DollarSign,
  Gavel
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
import { collection, query, orderBy, doc, Timestamp, limit, updateDoc, where } from 'firebase/firestore';
import type { Lead, Client, Staff, LeadStatus, LeadPriority, UserProfile, OpposingParty, TimelineEvent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { createLead, updateLeadStatus, convertLeadToProcess, updateLeadOpposingParties } from '@/lib/lead-actions';
import { ClientSearchInput } from '@/components/process/ClientSearchInput';
import { ClientCreationModal } from '@/components/process/ClientCreationModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ClientForm } from '@/components/client/ClientForm';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { uploadFile, listFiles } from '@/lib/drive-actions';
import { syncLeadToDrive } from '@/lib/drive';
import { LocationSearch } from '@/components/shared/LocationSearch';

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

  const handleCurrencyChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const numericValue = Number(digits) / 100;
    form.setValue('caseValue', numericValue, { shouldDirty: true, shouldValidate: true });
  };

  const formatCurrencyBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
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

  const isLocked = React.useMemo(() => {
    if (lead.status === 'DOCUMENTACAO') {
      const isPJ = client?.clientType === 'Pessoa Jurídica';
      const hasBasic = !!client?.document && !!client?.address?.street && !!client?.address?.zipCode;
      const hasPF = !isPJ && !!client?.rg;
      return !hasBasic || (!isPJ && !hasPF);
    }
    return false;
  }, [lead.status, client]);

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
        lead.isUrgent && "border-rose-500/20"
      )}
    >
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-none px-1.5 h-4.5", priority.color)}>
              {priority.label}
            </Badge>
            {isLocked && (
              <Badge variant="outline" className="text-[8px] font-black uppercase bg-amber-500/10 text-amber-400 border-amber-500/20 px-1.5 h-4.5 gap-1">
                <Lock className="h-2.5 w-2.5" /> Pendência
              </Badge>
            )}
          </div>
          {lead.isUrgent && (
            <div className="flex items-center gap-1 text-rose-500 animate-pulse">
              <span className="text-[8px] font-black uppercase">Urgente</span>
              <Flame className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        
        <h4 className="text-sm font-bold text-slate-200 group-hover/card:text-primary transition-colors line-clamp-2 leading-tight min-h-[40px]">
          {lead.title}
        </h4>

        <div className="space-y-2 pt-2 border-t border-white/5">
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
            <UserCircle className="h-3.5 w-3.5 text-blue-400" /> 
            <span className="truncate">{client?.firstName} {client?.lastName}</span>
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[8px] font-black border border-primary/20">
                {lawyer?.firstName?.charAt(0)}
              </div>
              <span className="text-[9px] text-slate-500 font-bold uppercase">Dr(a). {lawyer?.firstName}</span>
            </div>
            <span className="text-[8px] text-slate-600 font-mono">{format(lead.updatedAt.toDate(), 'dd/MM')}</span>
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
    <div ref={setNodeRef} className="flex flex-col gap-4 min-w-[300px] w-full max-w-[320px] bg-white/[0.02] p-4 rounded-3xl border border-white/5">
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-full shadow-lg", config.color.split(' ')[1])} />
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">{config.label}</h3>
        </div>
        <Badge variant="secondary" className="bg-white/5 text-slate-400 text-[10px] font-black px-2 h-5">{leads.length}</Badge>
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
            <div className="flex flex-col items-center justify-center py-12 opacity-20 border-2 border-dashed border-white/5 rounded-2xl">
              <Target className="h-8 w-8 mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Sem leads</p>
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
  onProtocolClick: (lead: Lead) => void; 
  isProcessing: boolean 
}) {
  const [activeTab, setActiveTab] = React.useState('burocracia');
  const [files, setFiles] = React.useState<any[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = React.useState(false);
  const [isSearchingCep, setIsSearchingCep] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const opposingForm = useForm<{ parties: OpposingParty[] }>({
    defaultValues: { parties: lead?.opposingParties || [] }
  });

  const { fields, append, remove } = useFieldArray({
    control: opposingForm.control,
    name: 'parties'
  });

  const fetchFiles = React.useCallback(async () => {
    if (!lead?.driveFolderId) {
      setFiles([]);
      return;
    }
    setIsLoadingFiles(true);
    try {
      const list = await listFiles(lead.driveFolderId);
      setFiles(list || []);
    } catch (e) {
      console.error('[LeadFiles] Error:', e);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [lead?.driveFolderId]);

  React.useEffect(() => {
    if (lead?.opposingParties) opposingForm.reset({ parties: lead.opposingParties });
    if (open && activeTab === 'documentos') {
      fetchFiles();
    }
  }, [lead, opposingForm, open, activeTab, fetchFiles]);

  const handleOpposingCepSearch = async (index: number) => {
    const cep = opposingForm.getValues(`parties.${index}.cep`)?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) {
      toast({ variant: 'destructive', title: 'CEP Inválido' });
      return;
    }

    setIsSearchingCep(index);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) {
        toast({ variant: 'destructive', title: 'CEP não encontrado' });
      } else {
        const address = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
        opposingForm.setValue(`parties.${index}.address`, address);
        toast({ title: 'Endereço localizado!' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao buscar CEP' });
    } finally {
      setIsSearchingCep(null);
    }
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Content = result.split(',')[1];
      if (base64Content) resolve(base64Content);
      else reject(new Error("Falha ao converter arquivo."));
    };
    reader.onerror = error => reject(error);
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lead) return;

    setIsUploading(true);
    try {
      let folderId = lead.driveFolderId;
      if (!folderId) {
        const res = await syncLeadToDrive(lead.id);
        if (res.success && res.id) {
          folderId = res.id;
        } else {
          throw new Error(res.error || "Falha ao criar pasta de triagem.");
        }
      }

      const base64 = await toBase64(file);
      await uploadFile(folderId!, file.name, file.type || 'application/octet-stream', base64);
      
      toast({ title: "Arquivo anexado!", description: "A prova foi salva na pasta de triagem." });
      fetchFiles();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no upload", description: err.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveParties = async () => {
    if (!lead) return;
    try {
      await updateLeadOpposingParties(lead.id, opposingForm.getValues().parties);
      toast({ title: 'Reclamadas Atualizadas!' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  if (!lead) return null;

  const isReadyToProtocol = lead.status === 'PRONTO';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl w-full p-0 flex flex-col bg-[#020617] border-white/10 text-white shadow-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <SheetHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="outline" className={cn("text-[9px] font-black uppercase mb-2", stageConfig[lead.status as LeadStatus].color)}>Fase Atual: {stageConfig[lead.status as LeadStatus].label}</Badge>
                <SheetTitle className="text-2xl font-black font-headline text-white">{lead.title}</SheetTitle>
                <SheetDescription className="text-slate-400">Origem: {lead.captureSource} | Ref: #{lead.id.substring(0, 6)}</SheetDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button 
                  onClick={() => onProtocolClick(lead)} 
                  disabled={isProcessing || lead.status === 'DISTRIBUIDO' || !isReadyToProtocol} 
                  className={cn(
                    "bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 transition-all",
                    !isReadyToProtocol && "opacity-50 grayscale cursor-not-allowed"
                  )}
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                  Protocolar Processo
                </Button>
                {!isReadyToProtocol && lead.status !== 'DISTRIBUIDO' && (
                  <p className="text-[9px] text-amber-500 font-bold uppercase flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Conclua a triagem para protocolar
                  </p>
                )}
              </div>
            </div>
          </SheetHeader>

          <div className="px-6 bg-white/5 border-b border-white/5 shrink-0">
            <TabsList className="bg-transparent gap-8 h-14 p-0">
              <TabsTrigger value="burocracia" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest">Dados do Cliente</TabsTrigger>
              <TabsTrigger value="reclamadas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 text-[10px] uppercase font-black tracking-widest">Polo Passivo (Réus)</TabsTrigger>
              <TabsTrigger value="documentos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 text-[10px] uppercase font-black tracking-widest">Provas & Drive</TabsTrigger>
              <TabsTrigger value="historico" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 text-[10px] uppercase font-black tracking-widest">Timeline</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 pb-32">
              <TabsContent value="burocracia" className="m-0 space-y-8 animate-in fade-in duration-300">
                <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-400 p-6 rounded-3xl">
                  <Info className="h-5 w-5" />
                  <AlertTitle className="font-black uppercase tracking-tighter text-base">Requisito para Fase Contratual</AlertTitle>
                  <AlertDescription className="text-xs font-medium mt-1">Para gerar a procuração e o contrato na fase seguinte, preencha obrigatoriamente o <strong>RG</strong>, <strong>CPF/CNPJ</strong> e <strong>Endereço Completo</strong> (com número e CEP) abaixo.</AlertDescription>
                </Alert>
                <ClientForm client={client} onSave={() => toast({ title: 'Cadastro Atualizado!' })} />
              </TabsContent>

              <TabsContent value="reclamadas" className="m-0 space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xl font-black font-headline text-white">Reclamadas (Polo Passivo)</h3>
                    <p className="text-xs text-slate-500">Identifique todas as partes que figurarão no polo passivo da ação.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => append({ name: '', document: '', email: '', phone: '', address: '', observation: '' })} className="font-bold border-primary/20 text-primary hover:bg-primary/10 rounded-xl">
                    <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Réu
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="bg-white/5 border-white/10 rounded-2xl overflow-hidden group/item">
                      <CardContent className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-black text-primary tracking-widest">Razão Social / Nome Completo *</Label>
                              <Input {...opposingForm.register(`parties.${index}.name`)} className="bg-black/40 border-white/10 h-11" placeholder="Nome oficial da empresa ou pessoa" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">CNPJ / CPF</Label>
                              <Input {...opposingForm.register(`parties.${index}.document`)} className="bg-black/40 border-white/10 h-11 font-mono" placeholder="00.000.000/0000-00" />
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => remove(index)} className="text-rose-500 hover:bg-rose-500/10 h-11 w-11 rounded-xl shrink-0"><Trash2 className="h-5 w-5" /></Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">E-mail Jurídico / RH</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                              <Input {...opposingForm.register(`parties.${index}.email`)} className="bg-black/40 border-white/10 h-11 pl-10" placeholder="rh@empresa.com.br" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Telefone de Contato</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                              <Input {...opposingForm.register(`parties.${index}.phone`)} className="bg-black/40 border-white/10 h-11 pl-10" placeholder="(00) 0000-0000" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-1 space-y-2">
                              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">CEP</Label>
                              <div className="relative">
                                <Input 
                                  {...opposingForm.register(`parties.${index}.cep`)} 
                                  className="bg-black/40 border-white/10 h-11 pr-10" 
                                  placeholder="00000-000" 
                                  maxLength={9}
                                />
                                <button 
                                  type="button" 
                                  onClick={() => handleOpposingCepSearch(index)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform"
                                >
                                  {isSearchingCep === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <div className="md:col-span-3 space-y-2">
                              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Endereço Completo</Label>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Textarea {...opposingForm.register(`parties.${index}.address`)} className="bg-black/40 border-white/10 min-h-[80px] pl-10 pt-2 resize-none" placeholder="Rua, número, bairro, cidade - UF" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Observações / Particularidades</Label>
                          <Input {...opposingForm.register(`parties.${index}.observation`)} className="bg-black/40 border-white/10 h-11" placeholder="Ex: Faz parte do grupo econômico X..." />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {fields.length > 0 ? (
                    <Button 
                      onClick={handleSaveParties} 
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[11px] h-12 shadow-xl shadow-blue-900/20"
                    >
                      Salvar Lista de Réus
                    </Button>
                  ) : (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 opacity-30">
                      <Building className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest">Nenhuma reclamada cadastrada</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="documentos" className="m-0 space-y-8 animate-in fade-in duration-300">
                <div className="text-center py-12 space-y-6">
                  <div className="h-24 w-24 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto shadow-2xl">
                    <FolderKanban className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Repositório de Provas</h3>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto">Organize fotos, áudios e documentos enviados pelo cliente durante a triagem.</p>
                  </div>
                  
                  <div className="flex flex-col gap-4 max-w-xs mx-auto">
                    <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
                    <Button 
                      variant="outline"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-primary text-white hover:bg-primary/10 h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-widest gap-3 shadow-xl shadow-primary/5 transition-all active:scale-95"
                    >
                      {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5 text-primary" />}
                      Enviar Prova
                    </Button>
                    {!lead.driveFolderId && (
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Pasta será gerada no primeiro upload</p>
                    )}
                  </div>
                </div>

                {lead.driveFolderId && (
                  <div className="space-y-4 pt-8 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-primary" /> Arquivos Sincronizados ({files.length})
                      </h4>
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-emerald-400 gap-2" asChild>
                        <a href={`https://drive.google.com/drive/folders/${lead.driveFolderId}`} target="_blank">
                          <ExternalLink className="h-3 w-3" /> Ver no Drive
                        </a>
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      {isLoadingFiles ? (
                        [...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)
                      ) : files.length > 0 ? (
                        files.map(file => (
                          <div key={file.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="h-9 w-9 rounded-lg bg-black/40 flex items-center justify-center shrink-0">
                                {file.iconLink ? <img src={file.iconLink} alt="" className="h-4 w-4" /> : <FileText className="h-4 w-4 text-blue-400" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">{file.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{file.mimeType?.split('.').pop()}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-primary transition-colors" asChild>
                                <a href={file.webViewLink} target="_blank"><ExternalLink className="h-4 w-4" /></a>
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 opacity-30 italic text-sm text-slate-500">Nenhum arquivo enviado ainda.</div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="historico" className="m-0 space-y-6 animate-in fade-in duration-300">
                <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/30 before:to-transparent">
                  <div className="relative flex items-start gap-6 group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0f172a] border-2 border-border/50 z-10 shadow-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black uppercase text-primary tracking-widest">ENTRADA NO CRM</span>
                        <span className="text-[10px] text-slate-500 font-bold">{format(lead.createdAt.toDate(), 'dd/MM/yy HH:mm')}</span>
                      </div>
                      <p className="text-sm text-slate-300 font-medium">Lead registrado via {lead.captureSource}.</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default function LeadsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isNewLeadOpen, setIsNewLeadOpen] = React.useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = React.useState(false);
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

  const form = useForm<z.infer<typeof leadFormSchema>>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      clientId: '',
      lawyerId: '',
      title: '',
      legalArea: 'Trabalhista',
      priority: 'MEDIA',
      captureSource: 'WhatsApp',
      isUrgent: false,
      description: '',
    }
  });

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
          const hasAddress = !!client.address?.street && !!client.address?.number && !!client.address?.zipCode && !!client.address?.city;
          const hasRG = isPJ || !!client.rg;

          if (!hasDocument || !hasAddress || !hasRG) {
            toast({
              variant: 'destructive',
              title: 'Impedimento: Dados Faltantes',
              description: 'Para avançar à fase contratual, você deve preencher o RG, CPF/CNPJ e Endereço Completo do cliente na aba "Burocracia".',
            });
            return;
          }
        }
      }

      try {
        await updateLeadStatus(leadId, newStatus);
        toast({ title: `Fase atualizada: ${stageConfig[newStatus].label}` });
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Erro ao mover', description: e.message });
      }
    }
  };

  const handleProtocolStart = (lead: Lead) => {
    setSelectedLead(lead);
    setIsConversionOpen(true);
  };

  const handleConfirmProtocol = async (data: z.infer<typeof conversionSchema>) => {
    if (!selectedLead) return;
    setIsProcessing(selectedLead.id);
    try {
      const result = await convertLeadToProcess(selectedLead.id, data);
      if (result.success) {
        toast({ title: 'Processo Protocolado!', description: 'O lead foi migrado para a área de processos ativos com os dados judiciais.' });
        setIsConversionOpen(false);
        setIsDetailsOpen(false);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro na conversão', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredLeads = React.useMemo(() => {
    if (!leadsData) return [];
    let list = [...leadsData].sort((a, b) => b.updatedAt.seconds - a.updatedAt.seconds);
    
    if (userProfile?.role === 'lawyer') {
        list = list.filter(l => l.lawyerId === userProfile.id);
    }
    
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(l => l.title.toLowerCase().includes(q) || clientsMap.get(l.clientId)?.firstName.toLowerCase().includes(q));
  }, [leadsData, searchTerm, clientsMap, userProfile]);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline flex items-center gap-3 text-white">
            <Target className="h-8 w-8 text-primary" />
            CRM & Triagem Jurídica
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie o pipeline de conversão de novos clientes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar leads..." 
              className="pl-8 bg-[#0f172a] border-white/10 h-10" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <Button onClick={() => setIsNewLeadOpen(true)} className="bg-primary text-primary-foreground font-black uppercase text-[10px] h-10 px-6">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar min-h-[600px]">
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
        onProtocolClick={handleProtocolStart}
        isProcessing={isProcessing === selectedLead?.id}
      />

      <LeadConversionDialog 
        lead={selectedLead}
        open={isConversionOpen}
        onOpenChange={setIsConversionOpen}
        onConfirm={handleConfirmProtocol}
      />

      <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
        <DialogContent className="bg-[#020617] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black font-headline">Nova Oportunidade</DialogTitle>
            <DialogDescription>Inicie a triagem de um novo caso jurídico.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(async (v) => { await createLead(v); setIsNewLeadOpen(false); form.reset(); })} className="space-y-5 pt-4">
              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500">Cliente *</FormLabel>
                  <ClientSearchInput selectedClientId={field.value} onSelect={c => field.onChange(c.id)} onCreateNew={() => setIsClientModalOpen(true)} />
                </FormItem>
              )} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500">Título do Caso *</FormLabel>
                  <Input {...field} placeholder="Ex: Reclamatória vs Empresa X" className="bg-black/40 border-white/10 h-11" />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="lawyerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">Responsável</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-11 bg-black/40 border-white/10"><SelectValue placeholder="Delegar..." /></SelectTrigger></FormControl>
                      <SelectContent className="bg-[#0f172a] text-white">
                        {lawyers.map(l => <SelectItem key={l.id} value={l.id}>{l.firstName} {l.lastName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-11 bg-black/40 border-white/10"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="bg-[#0f172a] text-white">
                        <SelectItem value="BAIXA">Baixa</SelectItem>
                        <SelectItem value="MEDIA">Média</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                        <SelectItem value="CRITICA">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full bg-primary text-primary-foreground font-black h-12 uppercase text-[11px] tracking-widest">Registrar Lead</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ClientCreationModal open={isClientModalOpen} onOpenChange={setIsClientModalOpen} onClientCreated={(c) => form.setValue('clientId', c.id)} />
    </div>
  );
}
