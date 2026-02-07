
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
  FolderOpen
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, Timestamp, limit, updateDoc, where } from 'firebase/firestore';
import type { Lead, Client, Staff, LeadStatus, LeadPriority, UserProfile, OpposingParty } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function LeadsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isNewLeadOpen, setIsNewLeadOpen] = React.useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = React.useState(false);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
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
      try {
        await updateLeadStatus(leadId, newStatus);
        toast({ title: `Fase atualizada: ${stageConfig[newStatus].label}` });
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Erro ao mover', description: e.message });
      }
    }
  };

  const handleConvert = async (leadId: string) => {
    setIsProcessing(leadId);
    try {
      const result = await convertLeadToProcess(leadId);
      if (result.success) {
        toast({ title: 'Processo Protocolado!', description: 'O lead foi migrado para a área de processos ativos.' });
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
        onConvert={handleConvert}
        isProcessing={isProcessing === selectedLead?.id}
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
          <SortableContext items={leads.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
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

function LeadCard({ lead, client, lawyer, onClick }: { lead: Lead; client?: Client; lawyer?: Staff; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = { transform: CSS.Translate.toString(transform), transition };
  const priority = priorityConfig[lead.priority as LeadPriority];

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
          <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-none px-1.5 h-4.5", priority.color)}>
            {priority.label}
          </Badge>
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

function LeadDetailsSheet({ lead, client, open, onOpenChange, onConvert, isProcessing }: { lead: Lead | null; client?: Client; open: boolean; onOpenChange: (o: boolean) => void; onConvert: (id: string) => void; isProcessing: boolean }) {
  const [activeTab, setActiveTab] = React.useState('burocracia');
  const { toast } = useToast();

  const opposingForm = useForm<{ parties: OpposingParty[] }>({
    defaultValues: { parties: lead?.opposingParties || [] }
  });

  const { fields, append, remove } = useFieldArray({
    control: opposingForm.control,
    name: 'parties'
  });

  React.useEffect(() => {
    if (lead?.opposingParties) opposingForm.reset({ parties: lead.opposingParties });
  }, [lead, opposingForm]);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl w-full p-0 flex flex-col bg-[#020617] border-white/10 text-white">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <SheetHeader className="p-6 border-b border-white/5 bg-white/5">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="outline" className={cn("text-[9px] font-black uppercase mb-2", stageConfig[lead.status].color)}>Fase Atual: {stageConfig[lead.status].label}</Badge>
                <SheetTitle className="text-2xl font-black font-headline text-white">{lead.title}</SheetTitle>
                <SheetDescription className="text-slate-400">Origem: {lead.captureSource} | Ref: #{lead.id.substring(0, 6)}</SheetDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => onConvert(lead.id)} 
                  disabled={isProcessing || lead.status === 'DISTRIBUIDO'} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                  Protocolar Processo
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="px-6 bg-white/5 border-b border-white/5">
            <TabsList className="bg-transparent gap-8 h-14 p-0">
              <TabsTrigger value="burocracia" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest">Dados do Cliente</TabsTrigger>
              <TabsTrigger value="reclamadas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest">Polo Passivo (Réus)</TabsTrigger>
              <TabsTrigger value="documentos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest">Provas & Drive</TabsTrigger>
              <TabsTrigger value="historico" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest">Timeline</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 pb-32">
              <TabsContent value="burocracia" className="m-0 space-y-8 animate-in fade-in duration-300">
                <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-400 p-6 rounded-3xl">
                  <Info className="h-5 w-5" />
                  <AlertTitle className="font-black uppercase tracking-tighter text-base">Complemento de Cadastro</AlertTitle>
                  <AlertDescription className="text-xs font-medium mt-1">Para gerar a procuração e o contrato na fase seguinte, preencha o RG, CPF e Endereço completo abaixo.</AlertDescription>
                </Alert>
                <ClientForm client={client} onSave={() => toast({ title: 'Cadastro Atualizado!' })} />
              </TabsContent>

              <TabsContent value="reclamadas" className="m-0 space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xl font-black font-headline text-white">Reclamadas (Polo Passivo)</h3>
                    <p className="text-xs text-slate-500">Identifique todas as partes que figurarão no polo passivo da ação.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => append({ name: '', email: '', phone: '' })} className="font-bold border-primary/20 text-primary hover:bg-primary/10 rounded-xl">
                    <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Réu
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="bg-white/5 border-white/10 rounded-2xl overflow-hidden group/item">
                      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                        <div className="md:col-span-5 space-y-2">
                          <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Razão Social / Nome Fantasia *</Label>
                          <Input {...opposingForm.register(`parties.${index}.name`)} className="bg-black/40 border-white/10 h-11" placeholder="Nome oficial da empresa" />
                        </div>
                        <div className="md:col-span-4 space-y-2">
                          <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">E-mail Jurídico / RH</Label>
                          <Input {...opposingForm.register(`parties.${index}.email`)} className="bg-black/40 border-white/10 h-11" placeholder="rh@empresa.com.br" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Telefone</Label>
                          <Input {...opposingForm.register(`parties.${index}.phone`)} className="bg-black/40 border-white/10 h-11" placeholder="(00) 0000-0000" />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <Button variant="ghost" size="icon" onClick={() => remove(index)} className="text-rose-500 hover:bg-rose-500/10 h-11 w-11 rounded-xl"><Trash2 className="h-5 w-5" /></Button>
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
                <div className="text-center py-20 space-y-6">
                  <div className="h-24 w-24 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto shadow-2xl">
                    <FolderKanban className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Repositório de Provas</h3>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto">Organize fotos, áudios e documentos enviados pelo cliente durante a triagem.</p>
                  </div>
                  <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <Button className="bg-white/5 hover:bg-white/10 text-white font-bold h-12 gap-2 rounded-xl">
                      <Plus className="h-4 w-4" /> Enviar Prova
                    </Button>
                    {lead.driveFolderId ? (
                      <Button variant="outline" className="border-emerald-500/20 text-emerald-400 h-12 rounded-xl" asChild>
                        <a href={`https://drive.google.com/drive/folders/${lead.driveFolderId}`} target="_blank">
                          <FolderOpen className="h-4 w-4 mr-2" /> Acessar Pasta de Triagem
                        </a>
                      </Button>
                    ) : (
                      <p className="text-[10px] text-slate-500 uppercase font-black">Pasta será gerada no protocolo</p>
                    )}
                  </div>
                </div>
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
