
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
  History
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
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
import { collection, query, orderBy, doc, deleteDoc, Timestamp, limit, updateDoc } from 'firebase/firestore';
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
import { createLead, updateLeadStatus, convertLeadToProcess, assignLeadToLawyer, updateLeadOpposingParties } from '@/lib/lead-actions';
import { ClientSearchInput } from '@/components/process/ClientSearchInput';
import { ClientCreationModal } from '@/components/process/ClientCreationModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ClientForm } from '@/components/client/ClientForm';

const STAGES: LeadStatus[] = ['NOVO', 'ENTREVISTA', 'DOCUMENTACAO', 'CONTRATUAL', 'PRONTO'];

const stageConfig: Record<LeadStatus, { label: string; color: string; icon: any; description: string }> = {
  NOVO: { label: 'Triagem', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Zap, description: 'Novos contatos' },
  ENTREVISTA: { label: 'Atendimento', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: UserCircle, description: 'Entrevista técnica' },
  DOCUMENTACAO: { label: 'Burocracia', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock, description: 'Dados e provas' },
  CONTRATUAL: { label: 'Contratual', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: ShieldCheck, description: 'Assinaturas' },
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
  const [viewMode, setViewMode] = React.useState<'kanban' | 'list'>('kanban');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const userProfileRef = useMemoFirebase(
    () => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads'), orderBy('updatedAt', 'desc')) : null), [firestore]);
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

    if (lead && lead.status !== newStatus) {
      try {
        await updateLeadStatus(leadId, newStatus);
        toast({ title: `Lead movido para ${stageConfig[newStatus].label}` });
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
        toast({ title: 'Processo Protocolado!', description: 'O lead foi migrado para a área de processos.' });
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
    let list = leadsData;
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
            CRM & Pipeline de Triagem
          </h1>
          <p className="text-sm text-muted-foreground">Converta interessados em processos de sucesso.</p>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            placeholder="Pesquisar..." 
            className="w-64 bg-[#0f172a] border-white/10 h-10" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
          <Button onClick={() => setIsNewLeadOpen(true)} className="bg-primary text-primary-foreground font-black uppercase text-[10px] h-10">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-6">
          {STAGES.map(stage => (
            <KanbanColumn 
              key={stage} 
              id={stage} 
              title={stageConfig[stage].label} 
              color={stageConfig[stage].color}
              leads={filteredLeads.filter(l => l.status === stage)}
              clientsMap={clientsMap}
              staffMap={staffMap}
              onCardClick={(l) => { setSelectedLead(l); setIsDetailsOpen(true); }}
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
        <DialogContent className="bg-[#020617] border-white/10 text-white">
          <DialogHeader><DialogTitle>Nova Oportunidade</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(async (v) => { await createLead(v); setIsNewLeadOpen(false); form.reset(); })} className="space-y-4">
              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem><FormLabel>Cliente</FormLabel><ClientSearchInput selectedClientId={field.value} onSelect={c => field.onChange(c.id)} onCreateNew={() => setIsClientModalOpen(true)} /></FormItem>
              )} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Título do Caso</FormLabel><Input {...field} className="bg-black/40 border-white/10" /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="lawyerId" render={({ field }) => (
                  <FormItem><FormLabel>Responsável</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Delegar..." /></SelectTrigger></FormControl><SelectContent>{lawyers.map(l => <SelectItem key={l.id} value={l.id}>{l.firstName}</SelectItem>)}</SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem><FormLabel>Prioridade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="BAIXA">Baixa</SelectItem><SelectItem value="MEDIA">Média</SelectItem><SelectItem value="ALTA">Alta</SelectItem><SelectItem value="CRITICA">Crítica</SelectItem></SelectContent></Select></FormItem>
                )} />
              </div>
              <DialogFooter><Button type="submit" className="w-full">Cadastrar Lead</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ClientCreationModal open={isClientModalOpen} onOpenChange={setIsClientModalOpen} onClientCreated={(c) => form.setValue('clientId', c.id)} />
    </div>
  );
}

function KanbanColumn({ id, title, color, leads, clientsMap, staffMap, onCardClick }: any) {
  const { setNodeRef } = useSortable({ id });

  return (
    <div ref={setNodeRef} className="flex flex-col gap-4 min-w-[280px]">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", color.split(' ')[1])} />
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">{title}</h3>
        </div>
        <Badge variant="secondary" className="bg-white/5 text-slate-400 text-[10px]">{leads.length}</Badge>
      </div>
      
      <div className="flex flex-col gap-3 min-h-[500px]">
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
      </div>
    </div>
  );
}

function LeadCard({ lead, client, lawyer, onClick }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = { transform: CSS.Translate.toString(transform), transition };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-[#0f172a] border-white/5 border-2 hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing group/card",
        isDragging && "opacity-50 border-primary"
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-none px-1.5 h-4.5", priorityConfig[lead.priority].color)}>
            {priorityConfig[lead.priority].label}
          </Badge>
          {lead.isUrgent && <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse" />}
        </div>
        <h4 className="text-sm font-bold text-white group-hover/card:text-primary transition-colors line-clamp-2 leading-tight">{lead.title}</h4>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5"><UserCircle className="h-3 w-3 text-blue-400" /> {client?.firstName} {client?.lastName}</p>
          <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[8px] font-black">{lawyer?.firstName.charAt(0)}</div>
            <span className="text-[9px] text-slate-500 font-bold uppercase">Dr(a). {lawyer?.firstName}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadDetailsSheet({ lead, client, open, onOpenChange, onConvert, isProcessing }: any) {
  const [activeTab, setActiveTab] = React.useState('burocracia');
  const { firestore } = useFirebase();
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
        <SheetHeader className="p-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className={cn("text-[9px] font-black uppercase mb-2", stageConfig[lead.status].color)}>Fase: {stageConfig[lead.status].label}</Badge>
              <SheetTitle className="text-2xl font-black font-headline text-white">{lead.title}</SheetTitle>
              <SheetDescription className="text-slate-400">Ref: #{lead.id.substring(0, 6)}</SheetDescription>
            </div>
            <Button 
              onClick={() => onConvert(lead.id)} 
              disabled={isProcessing || lead.status === 'DISTRIBUIDO'} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
              Protocolar Processo
            </Button>
          </div>
        </SheetHeader>

        <div className="px-6 bg-white/5 border-b border-white/5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent gap-6 h-12 p-0">
              <TabsTrigger value="burocracia" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-bold">Complemento de Dados</TabsTrigger>
              <TabsTrigger value="reclamadas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-bold">Reclamadas (Réus)</TabsTrigger>
              <TabsTrigger value="documentos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-bold">Provas & Docs</TabsTrigger>
              <TabsTrigger value="historico" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-bold">Histórico</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 pb-20">
            <TabsContent value="burocracia" className="m-0 space-y-6">
              <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-400">
                <Info className="h-4 w-4" />
                <AlertTitle>Requisito de Protocolo</AlertTitle>
                <AlertDescription>Complete o cadastro do cliente para gerar o contrato e a procuração automaticamente.</AlertDescription>
              </Alert>
              <ClientForm client={client} onSave={() => toast({ title: 'Dados do Cliente Salvos!' })} />
            </TabsContent>

            <TabsContent value="reclamadas" className="m-0 space-y-6">
              <div className="flex items-center justify-between">
                <H2 className="text-white border-none pb-0">Polo Passivo</H2>
                <Button variant="outline" size="sm" onClick={() => append({ name: '', email: '', phone: '' })} className="font-bold border-primary/20 text-primary">
                  <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Réu
                </Button>
              </div>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-5 space-y-2">
                        <Label className="text-[10px] uppercase text-slate-500">Razão Social / Nome</Label>
                        <Input {...opposingForm.register(`parties.${index}.name`)} className="bg-black/20" />
                      </div>
                      <div className="md:col-span-4 space-y-2">
                        <Label className="text-[10px] uppercase text-slate-500">Email Jurídico</Label>
                        <Input {...opposingForm.register(`parties.${index}.email`)} className="bg-black/20" />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] uppercase text-slate-500">Telefone</Label>
                        <Input {...opposingForm.register(`parties.${index}.phone`)} className="bg-black/20" />
                      </div>
                      <div className="md:col-span-1">
                        <Button variant="ghost" size="icon" onClick={() => remove(index)} className="text-rose-500 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {fields.length > 0 && <Button onClick={handleSaveParties} className="w-full bg-blue-600 hover:bg-blue-500">Salvar Reclamadas</Button>}
              </div>
            </TabsContent>

            <TabsContent value="documentos" className="m-0 text-center py-20 opacity-40">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center"><FolderKanban className="h-8 w-8" /></div>
                <p className="text-sm font-bold">Repositório de Provas (Google Drive)</p>
                <p className="text-xs max-w-xs">Anexe as fotos, áudios e documentos enviados pelo cliente aqui.</p>
                <Button variant="outline" className="mt-4 border-primary/20 text-primary">Abrir Pasta de Triagem</Button>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="m-0 space-y-4">
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle2 className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs font-bold text-white">Lead Criado</p>
                    <p className="text-[10px] text-slate-500">{format(lead.createdAt.toDate(), 'dd/MM/yy HH:mm')}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
