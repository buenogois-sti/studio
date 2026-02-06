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
  ArrowRight
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import type { Lead, Client, Staff, LeadStatus } from '@/lib/types';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { createLead, updateLeadStatus, convertLeadToProcess } from '@/lib/lead-actions';
import { ClientSearchInput } from '@/components/process/ClientSearchInput';

const leadFormSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente.'),
  lawyerId: z.string().min(1, 'Selecione um advogado responsável.'),
  title: z.string().min(5, 'O título da ação deve ter pelo menos 5 caracteres.'),
  legalArea: z.string().min(1, 'Selecione a área jurídica.'),
  description: z.string().optional(),
});

const statusConfig: Record<LeadStatus, { label: string; color: string; icon: any }> = {
  NOVO: { label: 'Novo', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Zap },
  EM_ELABORACAO: { label: 'Em Elaboração', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  PRONTO: { label: 'Pronto p/ Protocolo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  CONVERTIDO: { label: 'Convertido em Processo', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: FolderKanban },
  REPROVADO: { label: 'Arquivado/Reprovado', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: AlertCircle },
};

export default function LeadsPage() {
  const { firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isNewLeadOpen, setIsNewLeadOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads'), orderBy('createdAt', 'desc')) : null), [firestore]);
  const { data: leadsData, isLoading: isLoadingLeads } = useCollection<Lead>(leadsQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'staff') : null), [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);
  const staffList = staffData?.filter(s => s.role === 'lawyer' || s.role === 'partner') || [];
  const staffMap = React.useMemo(() => new Map(staffData?.map(s => [s.id, s])), [staffData]);

  const form = useForm<z.infer<typeof leadFormSchema>>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      title: '',
      legalArea: 'Trabalhista',
      description: '',
    }
  });

  const onSubmit = async (values: z.infer<typeof leadFormSchema>) => {
    setIsProcessing('creating');
    try {
      await createLead(values);
      toast({ title: 'Lead Criado!', description: 'O advogado foi notificado para iniciar a elaboração.' });
      form.reset();
      setIsNewLeadOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUpdateStatus = async (id: string, status: LeadStatus) => {
    setIsProcessing(id);
    try {
      await updateLeadStatus(id, status);
      toast({ title: 'Status Atualizado' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleConvert = async (id: string) => {
    if (!confirm('Deseja converter este lead em um processo oficial? Isso moverá os dados para o módulo contencioso.')) return;
    setIsProcessing(id);
    try {
      await convertLeadToProcess(id);
      toast({ title: 'Conversão Concluída!', description: 'O processo já está disponível na lista ativa.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro na conversão', description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredLeads = React.useMemo(() => {
    if (!leadsData) return [];
    if (!searchTerm.trim()) return leadsData;
    const q = searchTerm.toLowerCase();
    return leadsData.filter(l => 
      l.title.toLowerCase().includes(q) || 
      clientsMap.get(l.clientId)?.firstName.toLowerCase().includes(q)
    );
  }, [leadsData, searchTerm, clientsMap]);

  const isLoading = isUserLoading || isLoadingLeads;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline flex items-center gap-3 text-white">
            <Zap className="h-8 w-8 text-primary" />
            Módulo de Leads
          </h1>
          <p className="text-sm text-muted-foreground">Triagem, elaboração de teses e conversão para o contencioso.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar leads..." 
              className="pl-8 bg-[#0f172a] border-white/10 text-white" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <Button onClick={() => setIsNewLeadOpen(true)} className="bg-primary text-primary-foreground font-black">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full bg-white/5 rounded-3xl" />)
        ) : filteredLeads.length > 0 ? (
          filteredLeads.map(lead => {
            const client = clientsMap.get(lead.clientId);
            const lawyer = staffMap.get(lead.lawyerId);
            const status = statusConfig[lead.status];
            const StatusIcon = status.icon;

            return (
              <Card key={lead.id} className={cn(
                "bg-[#0f172a] border-white/5 border-2 hover:border-primary/20 transition-all duration-300 group",
                lead.status === 'CONVERTIDO' && "opacity-60 grayscale"
              )}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Status e Info Principal */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn("gap-1.5 h-6 text-[9px] font-black uppercase tracking-widest", status.color)}>
                          <StatusIcon className="h-3 w-3" /> {status.label}
                        </Badge>
                        <Badge variant="secondary" className="bg-white/5 text-slate-400 text-[9px] font-black uppercase h-6">
                          <Scale className="h-3 w-3 mr-1" /> {lead.legalArea}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{lead.title}</h3>
                        <p className="text-sm text-slate-400 flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-blue-400" />
                          Cliente: <span className="font-bold text-white">{client ? `${client.firstName} ${client.lastName}` : '---'}</span>
                        </p>
                      </div>

                      {lead.description && (
                        <p className="text-xs text-slate-500 italic line-clamp-2 leading-relaxed">
                          {lead.description}
                        </p>
                      )}
                    </div>

                    {/* Advogado e Timeline */}
                    <div className="lg:w-72 space-y-4 pt-4 lg:pt-0 lg:border-l lg:border-white/5 lg:pl-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Elaboração por:</p>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                            {lawyer?.firstName.charAt(0)}{lawyer?.lastName.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-white">Dr(a). {lawyer?.firstName} {lawyer?.lastName}</span>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <p className="text-[9px] text-slate-600 font-bold uppercase">Entrada em: {format(lead.createdAt.toDate(), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-3 lg:ml-auto">
                      {lead.status !== 'CONVERTIDO' && (
                        <>
                          {lead.status === 'PRONTO' ? (
                            <Button 
                              onClick={() => handleConvert(lead.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] h-10 px-6 shadow-xl shadow-emerald-900/20"
                              disabled={isProcessing === lead.id}
                            >
                              {isProcessing === lead.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
                              Protocolar / Converter
                            </Button>
                          ) : (
                            <Button 
                              variant="outline"
                              onClick={() => handleUpdateStatus(lead.id, 'PRONTO')}
                              className="border-primary/20 text-primary hover:bg-primary/5 font-bold text-[10px] uppercase h-10 px-6"
                              disabled={isProcessing === lead.id}
                            >
                              Concluir Tese
                            </Button>
                          )}
                        </>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-white/30 hover:text-white rounded-xl">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-2xl">
                          <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5 tracking-widest">Opções do Lead</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(lead.id, 'EM_ELABORACAO')} className="gap-2 cursor-pointer">
                            <FileEdit className="h-4 w-4 text-amber-400" /> <span className="font-bold">Marcar em Elaboração</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => handleUpdateStatus(lead.id, 'REPROVADO')} className="text-rose-400 font-bold gap-2">
                            <AlertCircle className="h-4 w-4" /> Arquivar / Recusar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-32 bg-[#0f172a] rounded-3xl border-2 border-dashed border-white/5 opacity-40">
            <Zap className="h-12 w-12 mx-auto mb-4 text-slate-600" />
            <p className="font-bold text-white uppercase tracking-widest text-[10px]">Nenhum lead na fila de triagem</p>
          </div>
        )}
      </div>

      {/* Dialog Novo Lead */}
      <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
        <DialogContent className="sm:max-w-2xl bg-[#020617] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline">Novo Lead Pré-Processual</DialogTitle>
            <DialogDescription className="text-slate-400">Designe um advogado para elaborar a estratégia inicial do caso.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">Cliente *</FormLabel>
                      <FormControl>
                        <ClientSearchInput 
                          selectedClientId={field.value} 
                          onSelect={c => field.onChange(c.id)} 
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
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">Advogado p/ Elaboração *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-black/40 border-white/10">
                            <SelectValue placeholder="Selecione o responsável..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10">
                          {staffList.map(s => (
                            <SelectItem key={s.id} value={s.id}>Dr(a). {s.firstName} {s.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">Título / Objeto da Ação *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Reclamatória Trabalhista - Horas Extras e Dano Moral" className="h-11 bg-black/40 border-white/10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legalArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">Área Jurídica *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-black/40 border-white/10">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/10">
                          <SelectItem value="Trabalhista">Trabalhista</SelectItem>
                          <SelectItem value="Cível">Cível</SelectItem>
                          <SelectItem value="Criminal">Criminal</SelectItem>
                          <SelectItem value="Previdenciário">Previdenciário</SelectItem>
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
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">Notas de Triagem / Estratégia</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Breve resumo da demanda do cliente..." className="min-h-[100px] bg-black/40 border-white/10" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <DialogClose asChild><Button variant="ghost" className="text-slate-400">Cancelar</Button></DialogClose>
                <Button type="submit" className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] h-12" disabled={isProcessing === 'creating'}>
                  {isProcessing === 'creating' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Gerar Lead e Notificar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
