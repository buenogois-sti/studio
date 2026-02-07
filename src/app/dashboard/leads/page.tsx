'use client';

import * as React from 'react';
import { 
  Zap, 
  Search, 
  PlusCircle, 
  Loader2, 
  MoreVertical, 
  Trash2, 
  FileEdit, 
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
  Calendar,
  Flame,
  Target,
  ShieldAlert,
  Info,
  LayoutGrid,
  List,
  UserPlus
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { Lead, Client, Staff, LeadStatus, LeadPriority, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';
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
import { createLead, updateLeadStatus, convertLeadToProcess, assignLeadToLawyer } from '@/lib/lead-actions';
import { ClientSearchInput } from '@/components/process/ClientSearchInput';
import { ClientCreationModal } from '@/components/process/ClientCreationModal';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const STAGES: LeadStatus[] = ['NOVO', 'ENTREVISTA', 'DOCUMENTACAO', 'CONTRATUAL', 'PRONTO'];

const stageConfig: Record<LeadStatus, { label: string; color: string; icon: any; description: string }> = {
  NOVO: { label: 'Triagem', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Zap, description: 'Novos contatos pendentes de análise' },
  ENTREVISTA: { label: 'Atendimento', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: UserCircle, description: 'Entrevista técnica em andamento' },
  DOCUMENTACAO: { label: 'Burocracia', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock, description: 'Coleta de provas e documentos' },
  CONTRATUAL: { label: 'Contratual', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: ShieldAlert, description: 'Assinatura de contratos e custas' },
  PRONTO: { label: 'Protocolo', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: CheckCircle2, description: 'Tese pronta para protocolar' },
  CONVERTIDO: { label: 'Finalizado', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: FolderKanban, description: 'Migrado para contencioso' },
  REPROVADO: { label: 'Arquivado', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: AlertCircle, description: 'Caso recusado ou sem êxito' },
};

const priorityConfig: Record<LeadPriority, { label: string; color: string; icon: any }> = {
  BAIXA: { label: 'Baixa', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: Info },
  MEDIA: { label: 'Média', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Info },
  ALTA: { label: 'Alta', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: AlertCircle },
  CRITICA: { label: 'Crítica', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', icon: Flame },
};

const leadFormSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente.'),
  lawyerId: z.string().min(1, 'Selecione um advogado responsável.'),
  title: z.string().min(5, 'O título da ação deve ter pelo menos 5 caracteres.'),
  legalArea: z.string().min(1, 'Selecione a área jurídica.'),
  priority: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).default('MEDIA'),
  captureSource: z.string().min(1, 'Selecione a fonte de captação.'),
  isUrgent: z.boolean().default(false),
  prescriptionDate: z.string().optional().or(z.literal('')),
  description: z.string().optional(),
});

export default function LeadsPage() {
  const { firestore, isUserLoading, user } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isNewLeadOpen, setIsNewLeadOpen] = React.useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'kanban' | 'list'>('kanban');

  const userProfileRef = useMemoFirebase(
    () => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads'), orderBy('createdAt', 'desc')) : null), [firestore]);
  const { data: leadsData, isLoading: isLoadingLeads } = useCollection<Lead>(leadsQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients'), limit(500) : null), [firestore]);
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
      lawyerId: userProfile?.role === 'lawyer' ? userProfile.id : '',
      title: '',
      legalArea: 'Trabalhista',
      priority: 'MEDIA',
      captureSource: 'WhatsApp',
      isUrgent: false,
      prescriptionDate: '',
      description: '',
    }
  });

  const onSubmit = async (values: z.infer<typeof leadFormSchema>) => {
    setIsProcessing('creating');
    try {
      await createLead(values);
      toast({ title: 'Lead Criado!', description: 'Iniciando fase de triagem.' });
      form.reset();
      setIsNewLeadOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUpdateStage = async (id: string, stage: LeadStatus) => {
    setIsProcessing(id);
    try {
      await updateLeadStatus(id, stage);
      toast({ title: 'Pipeline Atualizado' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAssign = async (leadId: string, lawyerId: string) => {
    setIsProcessing(leadId);
    try {
      await assignLeadToLawyer(leadId, lawyerId);
      toast({ title: 'Lead Encaminhado', description: 'O advogado foi notificado.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao encaminhar', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleConvert = async (leadId: string) => {
    setIsProcessing(leadId);
    try {
      await convertLeadToProcess(leadId);
      toast({ title: 'Lead Convertido!', description: 'Processo oficializado com sucesso.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro na conversão', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredLeads = React.useMemo(() => {
    if (!leadsData) return [];
    let list = leadsData;
    
    // Filtro de Segurança: Advogados vêem apenas os seus leads
    if (userProfile?.role === 'lawyer') {
        list = list.filter(l => l.lawyerId === userProfile.id);
    }

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(l => 
      l.title.toLowerCase().includes(q) || 
      clientsMap.get(l.clientId)?.firstName.toLowerCase().includes(q)
    );
  }, [leadsData, searchTerm, clientsMap, userProfile]);

  const isLoading = isUserLoading || isLoadingLeads;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline flex items-center gap-3 text-white">
            <Target className="h-8 w-8 text-primary" />
            Pauta de Triagem (Leads)
          </h1>
          <p className="text-sm text-muted-foreground">Gestão do pipeline de novos casos e maturação documental.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar..." 
              className="pl-8 bg-[#0f172a] border-white/10 text-white" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)} className="bg-white/5 border border-white/10 p-1 rounded-lg">
            <TabsList className="bg-transparent h-8">
              <TabsTrigger value="kanban" className="h-6 px-3"><LayoutGrid className="h-3.5 w-3.5" /></TabsTrigger>
              <TabsTrigger value="list" className="h-6 px-3"><List className="h-3.5 w-3.5" /></TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setIsNewLeadOpen(true)} className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] h-10 px-6">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-6">
          {STAGES.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.status === stage);
            const config = stageConfig[stage];
            return (
              <div key={stage} className="flex flex-col gap-4 min-w-[280px]">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", config.color.split(' ')[1])} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">{config.label}</h3>
                  </div>
                  <Badge variant="secondary" className="bg-white/5 text-slate-400 text-[10px] font-black">{stageLeads.length}</Badge>
                </div>
                
                <ScrollArea className="h-[70vh]">
                  <div className="flex flex-col gap-3 pr-3">
                    {stageLeads.map(lead => (
                      <LeadKanbanCard 
                        key={lead.id} 
                        lead={lead} 
                        client={clientsMap.get(lead.clientId)} 
                        lawyer={staffMap.get(lead.lawyerId)}
                        lawyers={lawyers}
                        onMove={(s) => handleUpdateStage(lead.id, s)}
                        onAssign={(l) => handleAssign(lead.id, l)}
                        onConvert={() => handleConvert(lead.id)}
                        isProcessing={isProcessing === lead.id}
                        canManage={userProfile?.role === 'admin' || userProfile?.role === 'assistant'}
                      />
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="border-2 border-dashed border-white/5 rounded-2xl p-8 text-center opacity-20">
                        <p className="text-[10px] font-black uppercase">Vazio</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4">
          {/* List View implementation here if needed, but Kanban is preferred */}
          {filteredLeads.map(lead => (
             <LeadKanbanCard 
                key={lead.id} 
                lead={lead} 
                client={clientsMap.get(lead.clientId)} 
                lawyer={staffMap.get(lead.lawyerId)}
                lawyers={lawyers}
                onMove={(s) => handleUpdateStage(lead.id, s)}
                onAssign={(l) => handleAssign(lead.id, l)}
                onConvert={() => handleConvert(lead.id)}
                isProcessing={isProcessing === lead.id}
                canManage={userProfile?.role === 'admin' || userProfile?.role === 'assistant'}
                compact={false}
             />
          ))}
        </div>
      )}

      <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
        <DialogContent className="sm:max-w-2xl bg-[#020617] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline tracking-tighter">Novo Atendimento (Lead)</DialogTitle>
            <DialogDescription className="text-slate-400">Inicie o fluxo de triagem capturando os dados básicos do caso.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cliente *</FormLabel>
                      <FormControl>
                        <ClientSearchInput 
                          selectedClientId={field.value} 
                          onSelect={c => field.onChange(c.id)} 
                          onCreateNew={() => setIsClientModalOpen(true)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lawyerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Advogado Responsável *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-black/40 border-white/10">
                            <SelectValue placeholder="Delegar para..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10">
                          {lawyers.map(l => (
                            <SelectItem key={l.id} value={l.id}>Dr(a). {l.firstName} {l.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Objeto da Ação *</FormLabel>
                    <FormControl><Input placeholder="Ex: Reclamatória Trabalhista - Vínculo Empregatício" className="h-11 bg-black/40 border-white/10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Prioridade *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-11 bg-black/40 border-white/10"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10">
                          <SelectItem value="BAIXA">🔵 Baixa</SelectItem>
                          <SelectItem value="MEDIA">🟢 Média</SelectItem>
                          <SelectItem value="ALTA">🟡 Alta</SelectItem>
                          <SelectItem value="CRITICA">🔴 Crítica</SelectItem>
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
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fonte *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-11 bg-black/40 border-white/10"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10">
                          <SelectItem value="Google Ads">Google Ads</SelectItem>
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                          <SelectItem value="Indicação">Indicação</SelectItem>
                          <SelectItem value="Orgânico">Site / Blog</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-4 gap-3">
                <DialogClose asChild><Button variant="ghost" className="text-slate-400">Cancelar</Button></DialogClose>
                <Button type="submit" className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20" disabled={isProcessing === 'creating'}>
                  {isProcessing === 'creating' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Lançar no Pipeline
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ClientCreationModal 
        open={isClientModalOpen}
        onOpenChange={setIsClientModalOpen}
        onClientCreated={(client) => {
          form.setValue('clientId', client.id);
          setIsClientModalOpen(false);
        }}
      />
    </div>
  );
}

function LeadKanbanCard({ 
    lead, client, lawyer, lawyers, onMove, onAssign, onConvert, isProcessing, canManage, compact = true 
}: { 
    lead: Lead; client?: Client; lawyer?: Staff; lawyers: Staff[]; onMove: (s: LeadStatus) => void; onAssign: (l: string) => void; onConvert: () => void; isProcessing: boolean; canManage: boolean; compact?: boolean;
}) {
    const priority = priorityConfig[lead.priority || 'MEDIA'];
    const stage = stageConfig[lead.status];
    const isUrgent = lead.isUrgent;

    return (
        <Card className={cn(
            "bg-[#0f172a] border-white/5 border-2 hover:border-primary/20 transition-all duration-300 group/card cursor-default",
            isUrgent && "border-rose-500/30 bg-rose-500/[0.02]"
        )}>
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-none px-1.5 h-4.5", priority.color)}>
                        {priority.label}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                        {isUrgent && <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse" />}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/20 hover:text-white"><MoreVertical className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-[#0f172a] border-white/10 text-white">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-500 px-2 py-1.5 tracking-widest">Pipeline Bueno Gois</DropdownMenuLabel>
                                {STAGES.map(s => (
                                    <DropdownMenuItem key={s} onClick={() => onMove(s)} className="gap-2 focus:bg-primary/10">
                                        <div className={cn("h-2 w-2 rounded-full", stageConfig[s].color.split(' ')[1])} />
                                        <span className="text-xs font-bold">Mover para {stageConfig[s].label}</span>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator className="bg-white/5" />
                                {canManage && (
                                    <DropdownMenuSubMenu label="Encaminhar para..." icon={<UserPlus className="h-4 w-4" />}>
                                        {lawyers.map(l => (
                                            <DropdownMenuItem key={l.id} onClick={() => onAssign(l.id)} className="text-xs font-bold">
                                                Dr(a). {l.firstName}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubMenu>
                                )}
                                <DropdownMenuSeparator className="bg-white/5" />
                                <DropdownMenuItem onClick={onConvert} className="text-emerald-400 font-black gap-2 focus:bg-emerald-500/10">
                                    <ArrowRightLeft className="h-4 w-4" /> Protocolar Processo
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white group-hover/card:text-primary transition-colors line-clamp-2 leading-snug">
                        {lead.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                        <UserCircle className="h-3 w-3 text-blue-400" /> 
                        {client ? `${client.firstName} ${client.lastName}` : '---'}
                    </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[8px] font-black">
                            {lawyer?.firstName.charAt(0)}{lawyer?.lastName.charAt(0)}
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Dr(a). {lawyer?.firstName || 'Pendente'}</span>
                    </div>
                    <span className="text-[8px] text-slate-600 font-mono">#{lead.id.substring(0, 6)}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function DropdownMenuSubMenu({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <div className="relative">
            <button 
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold hover:bg-white/5 outline-none rounded-sm transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    {icon} {label}
                </div>
                <ChevronRight className={cn("h-3 w-3 transition-transform", isOpen && "rotate-90")} />
            </button>
            {isOpen && <div className="pl-4 py-1 bg-white/5 border-l border-primary/20 mt-1">{children}</div>}
        </div>
    );
}