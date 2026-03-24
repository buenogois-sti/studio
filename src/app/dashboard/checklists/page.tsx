'use client';

import * as React from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Loader2, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Play, 
  History, 
  CheckCircle2, 
  Info,
  ChevronRight,
  ListChecks,
  Target,
  FileText,
  Clock,
  User,
  ShieldCheck,
  X,
  AlertTriangle,
  MessageSquare,
  FolderKanban,
  ExternalLink,
  Calculator,
  Printer,
  Scale,
  Zap,
  Eye,
  EyeOff,
  Power,
  LayoutList
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { ChecklistTemplate, ChecklistExecution, ChecklistItem, ChecklistItemType, Process, Lead } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { upsertChecklistTemplate, deleteChecklistTemplate, saveChecklistExecution, toggleChecklistStatus, injectLibrary } from '@/lib/checklist-actions';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { searchProcesses } from '@/lib/process-actions';
import { searchLeads } from '@/lib/lead-actions';

export default function LaboratorioMatrizesPage() {
  const { firestore } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState('dna-triagem');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [isExecutorOpen, setIsExecutorOpen] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isInjecting, setIsInjecting] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<ChecklistTemplate | null>(null);
  const [selectedExecution, setSelectedExecution] = React.useState<ChecklistExecution | null>(null);
  
  const isAdmin = session?.user?.role === 'admin';

  const templatesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'checklist_templates'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: templates, isLoading: isLoadingTemplates } = useCollection<ChecklistTemplate>(templatesQuery);

  const executionsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'checklist_executions'), orderBy('executedAt', 'desc'), limit(50)) : null),
    [firestore]
  );
  const { data: executions, isLoading: isLoadingExecutions } = useCollection<ChecklistExecution>(executionsQuery);

  const filteredTemplates = React.useMemo(() => {
    if (!templates) return [];
    let list = [...templates];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || (t.legalArea || '').toLowerCase().includes(q));
    }
    return list;
  }, [templates, searchTerm]);

  const handleEditTemplate = React.useCallback((t: ChecklistTemplate) => {
    setSelectedTemplate(t);
    setIsEditorOpen(true);
  }, []);

  const handleExecuteTemplate = React.useCallback((t: ChecklistTemplate) => {
    setSelectedTemplate(t);
    setIsExecutorOpen(true);
  }, []);

  const handleViewTemplate = React.useCallback((t: ChecklistTemplate) => {
    setSelectedTemplate(t);
    setIsViewOpen(true);
  }, []);

  const handleToggleStatus = React.useCallback(async (id: string, current: boolean) => {
    try {
      await toggleChecklistStatus(id, current);
      toast({ title: 'Status Atualizado', description: 'O modelo foi atualizado com sucesso.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  }, [toast]);

  const handleInjectLibrary = async () => {
    setIsInjecting(true);
    try {
      await injectLibrary();
      toast({ title: 'Biblioteca Injetada!', description: 'Os modelos padrão foram adicionados ao seu laboratório.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao injetar', description: e.message });
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 pb-20 max-w-[1600px] mx-auto">
      {/* Header Premium: Laboratório de Matrizes */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-tighter mb-2">
            <span className="hover:text-primary cursor-pointer transition-colors">Início</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Arquitetura Jurídica</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight font-headline text-white leading-none uppercase">
            Laboratório <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/50">de Matrizes</span>
          </h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest opacity-80">Gestão de roteiros de triagem e inteligência de dados.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-72 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Filtrar modelos..." 
              className="h-12 pl-10 bg-white/[0.03] border-white/10 hover:border-white/20 focus:border-primary text-white rounded-xl transition-all" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          {isAdmin && (
            <>
              <Button 
                variant="ghost" 
                disabled={isInjecting}
                onClick={handleInjectLibrary}
                className="h-12 px-6 text-slate-400 hover:text-white hover:bg-white/5 font-black uppercase text-[10px] tracking-widest gap-2 border border-white/5 rounded-xl transition-all"
              >
                {isInjecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-primary" />}
                Injetar Biblioteca
              </Button>
              <Button 
                onClick={() => { setSelectedTemplate(null); setIsEditorOpen(true); }} 
                className="h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-2xl shadow-primary/20 hover:scale-[1.05] transition-all flex items-center justify-center p-0"
              >
                <Plus className="h-6 w-6 stroke-[3]" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <TabsList className="bg-white/5 p-1 border border-white/10 h-14 rounded-2xl w-fit">
            <TabsTrigger value="dna-triagem" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-8 h-12 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
              <Zap className="h-4 w-4" /> Matrizes de DNA (Triagem)
            </TabsTrigger>
            <TabsTrigger value="modelos-peticao" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-8 h-12 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
              <FileText className="h-4 w-4" /> Modelos de Petição
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-8 h-12 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
              <History className="h-4 w-4" /> Histórico de Utilização
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-primary bg-primary/10 rounded-lg"><LayoutList className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500"><History className="h-4 w-4" /></Button>
          </div>
        </div>

        <TabsContent value="dna-triagem" className="animate-in fade-in duration-500 slide-in-from-bottom-4">
          <div className="rounded-[32px] bg-[#0f172a]/50 border-2 border-white/5 overflow-hidden backdrop-blur-sm">
            <Table>
              <TableHeader className="bg-white/[0.02] border-b border-white/10 h-16">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-slate-500 text-[10px] font-black uppercase px-10 tracking-widest">DNA Triagem</TableHead>
                  <TableHead className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Categoria</TableHead>
                  <TableHead className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Área</TableHead>
                  <TableHead className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">Campos</TableHead>
                  <TableHead className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-right px-10">Comandos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTemplates ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell colSpan={5} className="p-4 px-10"><Skeleton className="h-12 w-full bg-white/5 rounded-xl" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTemplates.length > 0 ? (
                  filteredTemplates.map(template => (
                    <TableRow key={template.id} className={cn(
                      "border-white/5 group transition-colors h-16",
                      !template.isActive && "opacity-40 grayscale"
                    )}>
                      <TableCell className="px-10">
                        <div className="flex items-center gap-3">
                          <div className={cn("h-2 w-2 rounded-full", template.isActive ? "bg-primary animate-pulse" : "bg-slate-700")} />
                          <span className="font-black text-white group-hover:text-primary transition-colors text-sm uppercase tracking-tight">{template.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-white/5 text-[9px] font-black uppercase text-slate-400 border-white/10 rounded-lg px-2 py-1">
                          {template.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{template.legalArea || 'Geral'}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-black">
                          <ListChecks className="h-3.5 w-3.5 text-primary" /> {template.items.length}
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-10">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleViewTemplate(template)}
                            className="h-9 w-9 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditTemplate(template)}
                            className="h-9 w-9 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deleteChecklistTemplate(template.id)}
                              className="h-9 w-9 text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-40">
                        <Zap className="h-12 w-12" />
                        <p className="font-black uppercase tracking-widest text-[10px]">Nenhuma matriz de DNA encontrada.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="modelos-peticao" className="animate-in fade-in duration-500 slide-in-from-bottom-4">
          <div className="text-center py-40 bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[40px] opacity-40">
            <FileText className="h-16 w-16 mx-auto mb-6" />
            <h2 className="text-2xl font-black uppercase font-headline">Acervo de Petições</h2>
            <p className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-2">Módulo em integração com o Laboratório de Matrizes.</p>
          </div>
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in duration-300">
          <Card className="bg-[#0f172a]/80 border-white/5 overflow-hidden backdrop-blur-xl rounded-[32px]">
            <Table>
              <TableHeader className="bg-white/[0.02] border-b border-white/10 h-16">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-slate-500 text-[10px] font-black uppercase px-10">Matriz / Vínculo</TableHead>
                  <TableHead className="text-slate-500 text-[10px] font-black uppercase">Responsável</TableHead>
                  <TableHead className="text-slate-500 text-[10px] font-black uppercase">Data/Hora</TableHead>
                  <TableHead className="text-center text-slate-500 text-[10px] font-black uppercase">Resultado</TableHead>
                  <TableHead className="text-right text-slate-500 text-[10px] font-black uppercase px-10">Ficha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingExecutions ? (
                  [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5} className="p-6 px-10"><Skeleton className="h-10 w-full bg-white/5" /></TableCell></TableRow>)
                ) : executions?.map(exec => (
                  <TableRow key={exec.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <TableCell className="px-10">
                      <div className="flex flex-col">
                        <span className="font-black text-white text-sm uppercase tracking-tight">{exec.templateTitle}</span>
                        {(exec.processName || exec.leadTitle) && (
                          <div className="flex items-center gap-1.5 mt-1 text-primary">
                            {exec.processName ? <FolderKanban className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                            <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[250px]">
                              {exec.processName || exec.leadTitle}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-black border border-primary/20">
                          {exec.userName.charAt(0)}
                        </div>
                        <span className="text-xs text-slate-300 font-bold">{exec.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-400 font-mono">
                      {exec.executedAt && format(exec.executedAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[8px] font-black tracking-widest px-2 h-6 uppercase">CONCLUÍDO</Badge>
                    </TableCell>
                    <TableCell className="text-right px-10">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white/30 hover:text-primary hover:bg-primary/10 rounded-xl h-9 w-9 transition-all"
                        onClick={() => {
                          setSelectedExecution(exec);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <ChecklistEditorDialog 
        key={selectedTemplate?.id || 'new'}
        open={isEditorOpen} 
        onOpenChange={setIsEditorOpen} 
        template={selectedTemplate}
      />

      <ChecklistExecutorDialog 
        key={selectedTemplate?.id ? `exec-${selectedTemplate.id}` : 'exec-none'}
        open={isExecutorOpen} 
        onOpenChange={setIsExecutorOpen} 
        template={selectedTemplate}
      />

      <ChecklistDetailsDialog
        key={selectedExecution?.id || 'details-none'}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        execution={selectedExecution}
        templates={templates || []}
      />

      <ChecklistViewDialog
        key={selectedTemplate?.id ? `view-${selectedTemplate.id}` : 'view-none'}
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        template={selectedTemplate}
      />
    </div>
  );
}

const ChecklistViewDialog = React.memo(function ChecklistViewDialog({ open, onOpenChange, template }: { open: boolean; onOpenChange: (o: boolean) => void; template: ChecklistTemplate | null }) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[#020617] border-white/10 text-white flex flex-col p-0 shadow-2xl overflow-hidden h-[90vh]">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-inner">
              <Eye className="h-7 w-7 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black font-headline text-white leading-tight">Estrutura: {template.title}</DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">{template.category} • {template.items.length} itens de verificação</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {template.items.map((item, idx) => (
              <div key={item.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4 items-start">
                <div className="h-7 w-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-200 mb-2">{item.label} {item.required && <span className="text-rose-500 ml-1">*</span>}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white/5 text-[8px] font-black uppercase text-slate-500 border-none px-1.5 h-4.5">
                      Tipo: {item.type}
                    </Badge>
                    {item.required && <Badge className="bg-rose-500/10 text-rose-400 border-none text-[8px] font-black uppercase h-4.5">Obrigatório</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0">
          <DialogClose asChild><Button variant="ghost" className="w-full text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12">Fechar Visualização</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

const ChecklistEditorDialog = React.memo(function ChecklistEditorDialog({ open, onOpenChange, template }: { open: boolean; onOpenChange: (o: boolean) => void; template: ChecklistTemplate | null }) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('Operacional');
  const [legalArea, setLegalArea] = React.useState<string | undefined>(undefined);
  const [items, setItems] = React.useState<ChecklistItem[]>([]);
  const { toast } = useToast();

  React.useEffect(() => {
    if (template && open) {
      setTitle(template.title);
      setDescription(template.description);
      setCategory(template.category);
      setLegalArea(template.legalArea);
      setItems(template.items);
    } else if (!template && open) {
      setTitle('');
      setDescription('');
      setCategory('Operacional');
      setLegalArea(undefined);
      setItems([]);
    }
  }, [template, open]);

  const addItem = React.useCallback(() => {
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substr(2, 9),
      label: '',
      type: 'YES_NO',
      required: true
    };
    setItems(prev => [...prev, newItem]);
  }, []);

  const removeItem = React.useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateItem = React.useCallback((id: string, field: keyof ChecklistItem, value: any) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }, []);

  const handleSave = async () => {
    if (!title || items.length === 0) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Defina um título e pelo menos um item.' });
      return;
    }
    setIsSaving(true);
    try {
      await upsertChecklistTemplate({
        id: template?.id,
        title,
        description,
        category,
        legalArea,
        items,
        isActive: template?.isActive ?? true
      });
      toast({ title: 'Modelo Salvo!', description: 'O checklist já está disponível para uso.' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-[#020617] border-white/10 text-white h-[90vh] flex flex-col p-0 shadow-2xl overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
            <Edit className="h-6 w-6 text-primary" />
            Editor de Modelo
          </DialogTitle>
          <DialogDescription className="text-slate-400">Desenvolva o passo a passo padrão para as rotinas do escritório.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Título do Checklist *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Protocolo de Inicial Trabalhista" className="h-11 bg-black/40 border-white/10 focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 bg-black/40 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f172a] text-white border-white/10 shadow-2xl">
                    <SelectItem value="Operacional">⭐ Operacional</SelectItem>
                    <SelectItem value="Financeiro">💰 Financeiro</SelectItem>
                    <SelectItem value="Entrevista de Triagem">💬 Entrevista de Triagem</SelectItem>
                    <SelectItem value="Comercial">📢 Comercial</SelectItem>
                    <SelectItem value="Gestão">🛡️ Gestão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {category === 'Entrevista de Triagem' && (
                <div className="md:col-span-3 space-y-2 animate-in slide-in-from-top-2">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                    <Scale className="h-3 w-3" /> Área Jurídica Vinculada
                  </Label>
                  <Select value={legalArea} onValueChange={setLegalArea}>
                    <SelectTrigger className="h-11 bg-primary/5 border-primary/20 text-primary">
                      <SelectValue placeholder="Selecione a área para vincular esta entrevista..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f172a] text-white border-white/10">
                      {['Trabalhista', 'Cível', 'Previdenciário', 'Família', 'Outro'].map(area => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-slate-500 italic mt-1">Este formulário aparecerá automaticamente ao triar novos leads desta área.</p>
                </div>
              )}

              <div className="md:col-span-3 space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Descrição / Finalidade</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva quando e por quem este checklist deve ser executado..." className="bg-black/40 border-white/10 h-24 resize-none" />
              </div>
            </div>

            <Separator className="bg-white/5" />

            <div className="space-y-4 pb-10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <ListChecks className="h-4 w-4" /> Itens de Verificação
                </h3>
                <Button onClick={addItem} type="button" size="sm" variant="outline" className="h-8 border-primary/20 text-primary hover:bg-primary/10 text-[10px] font-black uppercase tracking-widest">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Passo
                </Button>
              </div>

              <div className="grid gap-3">
                {items.map((item, idx) => (
                  <div key={item.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row gap-4 items-start group hover:border-primary/20 transition-all">
                    <div className="h-8 w-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                      <Input 
                        value={item.label} 
                        onChange={e => updateItem(item.id, 'label', e.target.value)} 
                        placeholder="Pergunta ou instrução do passo..." 
                        className="bg-transparent border-0 border-b border-white/10 rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 font-bold text-base h-10"
                      />
                      <div className="flex items-center gap-6">
                        <Select value={item.type} onValueChange={val => updateItem(item.id, 'type', val)}>
                          <SelectTrigger className="h-9 w-48 text-[10px] font-black uppercase bg-black/40 border-white/5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0f172a] text-white border-white/10">
                            <SelectItem value="YES_NO">🔘 Sim / Não</SelectItem>
                            <SelectItem value="YES_NO_MAYBE">⚪ Sim / Não / Parcial</SelectItem>
                            <SelectItem value="TEXT">📝 Resposta em Texto</SelectItem>
                            <SelectItem value="NUMBER">🔢 Valor Numérico</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2 cursor-pointer group/check" onClick={() => updateItem(item.id, 'required', !item.required)}>
                          <div className={cn(
                            "h-4 w-4 rounded border flex items-center justify-center transition-all",
                            item.required ? "bg-primary border-primary text-primary-foreground" : "border-white/20 group-hover/check:border-primary"
                          )}>
                            {item.required && <ShieldCheck className="h-3 w-3" />}
                          </div>
                          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest select-none">Obrigatório</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-rose-500 hover:bg-rose-500/10 h-10 w-10 rounded-xl shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-16 bg-black/20 rounded-3xl border-2 border-dashed border-white/5 opacity-30 flex flex-col items-center gap-3">
                    <Target className="h-10 w-10" />
                    <p className="font-bold text-xs uppercase tracking-widest">Adicione o primeiro passo de verificação</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 gap-3 shrink-0">
          <DialogClose asChild><Button variant="ghost" className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</Button></DialogClose>
          <Button 
            disabled={isSaving} 
            className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] h-11 px-8 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
            onClick={handleSave}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Salvar e Disponibilizar na Banca
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

const ChecklistExecutorDialog = React.memo(function ChecklistExecutorDialog({ open, onOpenChange, template }: { open: boolean; onOpenChange: (o: boolean) => void; template: ChecklistTemplate | null }) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [observations, setObservations] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Array<{ type: 'process' | 'lead', data: any }>>([]);
  const [selectedTarget, setSelectedTarget] = React.useState<{ type: 'process' | 'lead', data: any } | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  
  const { toast } = useToast();

  React.useEffect(() => {
    if (template && open) {
      setAnswers({});
      setObservations('');
      setSelectedTarget(null);
      setSearchQuery('');
    }
  }, [template, open]);

  React.useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [processes, leads] = await Promise.all([
          searchProcesses(searchQuery),
          searchLeads(searchQuery)
        ]);
        
        const combinedResults: any[] = [
          ...processes.map(p => ({ type: 'process', data: p })),
          ...leads.map(l => ({ type: 'lead', data: l }))
        ];
        
        setSearchResults(combinedResults);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFinish = async () => {
    if (!template) return;
    
    const missing = template.items.filter(i => i.required && (answers[i.id] === undefined || answers[i.id] === ''));
    if (missing.length > 0) {
      toast({ variant: 'destructive', title: 'Pendência!', description: 'Complete todos os passos obrigatórios antes de finalizar.' });
      return;
    }

    setIsSaving(true);
    try {
      await saveChecklistExecution({
        templateId: template.id,
        templateTitle: template.title,
        processId: selectedTarget?.type === 'process' ? selectedTarget.data.id : undefined,
        processName: selectedTarget?.type === 'process' ? selectedTarget.data.name : undefined,
        leadId: selectedTarget?.type === 'lead' ? selectedTarget.data.id : undefined,
        leadTitle: selectedTarget?.type === 'lead' ? selectedTarget.data.title : undefined,
        answers,
        observations,
        status: 'COMPLETED'
      });
      toast({ title: 'Checklist Concluído!', description: 'O relatório foi transmitido à administração.' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-[#020617] border-white/10 text-white h-[90vh] flex flex-col p-0 shadow-2xl overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5 bg-primary/5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner">
              <Play className="h-7 w-7 text-primary animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black font-headline text-white leading-tight">Execução: {template.title}</DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">{template.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-10 pb-10">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Search className="h-3 w-3 text-primary" /> Vínculo (Lead ou Processo)
              </Label>
              {selectedTarget ? (
                <div className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border-2 animate-in zoom-in-95",
                  selectedTarget.type === 'process' ? "border-primary/30 bg-primary/5" : "border-emerald-500/30 bg-emerald-500/5"
                )}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    {selectedTarget.type === 'process' ? <FolderKanban className="h-5 w-5 text-primary shrink-0" /> : <Zap className="h-5 w-5 text-emerald-500 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-white truncate">{selectedTarget.type === 'process' ? selectedTarget.data.name : selectedTarget.data.title}</p>
                      <p className="text-[10px] text-muted-foreground font-mono tracking-widest">
                        {selectedTarget.type === 'process' 
                          ? `${selectedTarget.data.processNumber || 'Sem Nº'} - Cliente: ${selectedTarget.data.clientName || 'N/A'}` 
                          : `LEAD #${selectedTarget.data.id.substring(0,6)} - ${selectedTarget.data.clientName || 'Doc: ' + selectedTarget.data.clientDocument}`}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-white rounded-xl" onClick={() => setSelectedTarget(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input 
                    className="h-12 bg-black/40 border-white/10 pl-10 focus:border-primary transition-all rounded-xl" 
                    placeholder="Pesquisar por nome, CPF ou título..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                  
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <ScrollArea className="max-h-[250px]">
                        <div className="p-2 space-y-1">
                          {searchResults.map((item, idx) => (
                            <button
                              key={`${item.type}-${idx}`}
                              type="button"
                              className="w-full text-left p-4 hover:bg-white/5 transition-all rounded-xl border border-transparent hover:border-white/5 group flex items-start gap-3"
                              onClick={() => {
                                setSelectedTarget(item);
                                setSearchResults([]);
                                setSearchQuery('');
                              }}
                            >
                              {item.type === 'process' ? <FolderKanban className="h-4 w-4 text-primary shrink-0 mt-1" /> : <Zap className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                                  {item.type === 'process' ? item.data.name : item.data.title}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">
                                  {item.type === 'process' 
                                    ? `${item.data.processNumber || 'Sem Nº'} - Cliente: ${item.data.clientName || 'N/A'}` 
                                    : `Lead: ${item.data.clientName || 'Sem nome'} (${item.data.clientDocument || 'Sem CPF'})`}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator className="bg-white/5" />

            <div className="grid gap-6">
              {template.items.map((item, idx) => (
                <div key={item.id} className="space-y-4 p-6 rounded-3xl bg-white/5 border border-white/5 relative overflow-hidden group hover:bg-white/[0.07] transition-all">
                  <div className="flex items-start gap-5">
                    <div className="h-10 w-10 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-xs font-black text-primary shrink-0 shadow-inner">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-lg font-black text-white leading-tight block mb-6">
                        {item.label} {item.required && <span className="text-rose-500 ml-1">*</span>}
                      </Label>
                      
                      {item.type === 'YES_NO' && (
                        <RadioGroup value={answers[item.id]} onValueChange={val => setAnswers({...answers, [item.id]: val})} className="flex gap-6">
                          <div className={cn(
                            "flex items-center space-x-3 px-6 py-3 rounded-2xl border-2 transition-all cursor-pointer",
                            answers[item.id] === 'SIM' ? "bg-emerald-500/10 border-emerald-500/50" : "bg-black/20 border-transparent hover:border-white/10"
                          )} onClick={() => setAnswers({...answers, [item.id]: 'SIM'})}>
                            <RadioGroupItem value="SIM" id={`y-${item.id}`} className="border-emerald-500 text-emerald-500" />
                            <Label htmlFor={`y-${item.id}`} className="text-sm font-black text-emerald-400 cursor-pointer tracking-widest">SIM</Label>
                          </div>
                          <div className={cn(
                            "flex items-center space-x-3 px-6 py-3 rounded-2xl border-2 transition-all cursor-pointer",
                            answers[item.id] === 'NAO' ? "bg-rose-500/10 border-rose-500/50" : "bg-black/20 border-transparent hover:border-white/10"
                          )} onClick={() => setAnswers({...answers, [item.id]: 'NAO'})}>
                            <RadioGroupItem value="NAO" id={`n-${item.id}`} className="border-rose-500 text-rose-500" />
                            <Label htmlFor={`n-${item.id}`} className="text-sm font-black text-rose-400 cursor-pointer tracking-widest">NÃO</Label>
                          </div>
                        </RadioGroup>
                      )}

                      {item.type === 'YES_NO_MAYBE' && (
                        <RadioGroup value={answers[item.id]} onValueChange={val => setAnswers({...answers, [item.id]: val})} className="flex flex-wrap gap-4">
                          <div className={cn(
                            "flex items-center space-x-3 px-5 py-3 rounded-2xl border-2 transition-all cursor-pointer",
                            answers[item.id] === 'SIM' ? "bg-emerald-500/10 border-emerald-500/50" : "bg-black/20 border-transparent hover:border-white/10"
                          )} onClick={() => setAnswers({...answers, [item.id]: 'SIM'})}>
                            <RadioGroupItem value="SIM" id={`y-${item.id}`} />
                            <Label htmlFor={`y-${item.id}`} className="text-xs font-black text-emerald-400 cursor-pointer uppercase tracking-widest">Sim</Label>
                          </div>
                          <div className={cn(
                            "flex items-center space-x-3 px-5 py-3 rounded-2xl border-2 transition-all cursor-pointer",
                            answers[item.id] === 'NAO' ? "bg-rose-500/10 border-rose-500/50" : "bg-black/20 border-transparent hover:border-white/10"
                          )} onClick={() => setAnswers({...answers, [item.id]: 'NAO'})}>
                            <RadioGroupItem value="NAO" id={`n-${item.id}`} />
                            <Label htmlFor={`n-${item.id}`} className="text-xs font-black text-rose-400 cursor-pointer uppercase tracking-widest">Não</Label>
                          </div>
                          <div className={cn(
                            "flex items-center space-x-3 px-5 py-3 rounded-2xl border-2 transition-all cursor-pointer",
                            answers[item.id] === 'PARCIAL' ? "bg-amber-500/10 border-amber-500/50" : "bg-black/20 border-transparent hover:border-white/10"
                          )} onClick={() => setAnswers({...answers, [item.id]: 'PARCIAL'})}>
                            <RadioGroupItem value="PARCIAL" id={`m-${item.id}`} />
                            <Label htmlFor={`m-${item.id}`} className="text-xs font-black text-amber-400 cursor-pointer uppercase tracking-widest">Parcial</Label>
                          </div>
                        </RadioGroup>
                      )}

                      {item.type === 'TEXT' && (
                        <Textarea 
                          value={answers[item.id] || ''} 
                          onChange={e => setAnswers({...answers, [item.id]: e.target.value})} 
                          placeholder="Digite o detalhamento da verificação..." 
                          className="bg-black/40 border-white/10 text-sm h-32 focus:border-primary transition-all leading-relaxed"
                        />
                      )}

                      {item.type === 'NUMBER' && (
                        <div className="relative w-48">
                          <Input 
                            type="number" 
                            value={answers[item.id] || ''} 
                            onChange={e => setAnswers({...answers, [item.id]: e.target.value})} 
                            className="bg-black/40 border-white/10 h-12 text-lg font-black pl-10"
                          />
                          <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="bg-white/5" />

            <div className="space-y-3 pb-10">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <MessageSquare className="h-3 w-3 text-primary" /> Notas Finais da Operação
              </Label>
              <Textarea 
                value={observations} 
                onChange={e => setObservations(e.target.value)} 
                placeholder="Existem pontos de atenção que a diretoria deve saber sobre esta execução?" 
                className="bg-black/40 border-white/10 h-32 resize-none text-sm leading-relaxed"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 gap-3 shrink-0">
          <DialogClose asChild><Button variant="ghost" className="text-slate-400 font-bold uppercase text-[10px] tracking-widest h-14">Cancelar</Button></DialogClose>
          <Button 
            disabled={isSaving} 
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[11px] h-14 shadow-xl shadow-emerald-900/20 hover:scale-[1.02] transition-all"
            onClick={handleFinish}
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
            Finalizar e Transmitir Relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

const ChecklistDetailsDialog = React.memo(function ChecklistDetailsDialog({ 
  open, 
  onOpenChange, 
  execution, 
  templates 
}: { 
  open: boolean; 
  onOpenChange: (o: boolean) => void; 
  execution: ChecklistExecution | null;
  templates: ChecklistTemplate[];
}) {
  if (!execution) return null;

  const template = templates.find(t => t.id === execution.templateId);
  const items = template?.items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-[#020617] border-white/10 text-white h-[90vh] flex flex-col p-0 shadow-2xl overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5 bg-primary/5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-inner">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black font-headline text-white leading-tight">Relatório de Execução</DialogTitle>
                <DialogDescription className="text-slate-400 mt-1">{execution.templateTitle}</DialogDescription>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => window.print()} className="h-10 w-10 border-white/10">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-10 pb-10" id="checklist-print-area">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Responsável</Label>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-primary" /> {execution.userName}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data e Hora</Label>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-primary" /> {format(execution.executedAt.toDate(), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              {(execution.processName || execution.leadTitle) && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-1 col-span-full">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Vínculo Direto</Label>
                  <p className="text-sm font-black text-white flex items-center gap-2">
                    {execution.processName ? <FolderKanban className="h-4 w-4 text-primary" /> : <Zap className="h-4 w-4 text-emerald-500" />} 
                    {execution.processName || execution.leadTitle}
                  </p>
                </div>
              )}
            </div>

            <Separator className="bg-white/5" />

            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" /> Verificações Realizadas
              </h3>
              
              <div className="grid gap-4">
                {items.length > 0 ? items.map((item, idx) => {
                  const answer = execution.answers[item.id];
                  return (
                    <div key={item.id} className="p-5 rounded-2xl bg-black/40 border border-white/5 flex gap-5 items-start">
                      <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-300 mb-3">{item.label}</p>
                        
                        <div className="flex items-center gap-3">
                          {item.type === 'YES_NO' || item.type === 'YES_NO_MAYBE' ? (
                            <Badge className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-3 h-7 border-none",
                              answer === 'SIM' ? "bg-emerald-500/20 text-emerald-400" :
                              answer === 'NAO' ? "bg-rose-500/20 text-rose-400" :
                              "bg-amber-500/20 text-amber-400"
                            )}>
                              {answer || 'NÃO RESPONDIDO'}
                            </Badge>
                          ) : item.type === 'NUMBER' ? (
                            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl">
                              <Calculator className="h-3 w-3 text-blue-400" />
                              <span className="text-sm font-black text-white">{answer}</span>
                            </div>
                          ) : (
                            <div className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 leading-relaxed italic">
                              "{answer || 'Nenhuma resposta inserida.'}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                    <p className="text-xs font-bold uppercase">A estrutura deste checklist não está mais disponível.</p>
                  </div>
                )}
              </div>
            </div>

            {execution.observations && (
              <>
                <Separator className="bg-white/5" />
                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" /> Observações do Relatório
                  </h3>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-sm text-slate-200 leading-relaxed italic">
                    {execution.observations}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0">
          <DialogClose asChild><Button variant="ghost" className="w-full text-slate-400 font-bold uppercase text-[10px] tracking-widest">Fechar Relatório</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});