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
  MessageSquare
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { ChecklistTemplate, ChecklistExecution, ChecklistItem, ChecklistItemType } from '@/lib/types';
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
import { upsertChecklistTemplate, deleteChecklistTemplate, saveChecklistExecution } from '@/lib/checklist-actions';
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

export default function ChecklistsPage() {
  const { firestore } = useFirebase();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = React.useState('templates');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [isExecutorOpen, setIsExecutorOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<ChecklistTemplate | null>(null);
  
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
    if (!searchTerm.trim()) return templates;
    const q = searchTerm.toLowerCase();
    return templates.filter(t => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }, [templates, searchTerm]);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline flex items-center gap-3 text-white">
            <CheckSquare className="h-8 w-8 text-primary" />
            Checklists Operacionais
          </h1>
          <p className="text-sm text-muted-foreground">Padronização de processos e garantia de qualidade do Bueno Gois.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button onClick={() => { setSelectedTemplate(null); setIsEditorOpen(true); }} className="bg-primary text-primary-foreground font-bold h-10 px-6">
              <Plus className="mr-2 h-4 w-4" /> Novo Modelo
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-[#0f172a] p-1 border border-white/5 h-12">
            <TabsTrigger value="templates" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
              <ListChecks className="h-4 w-4" /> Modelos Disponíveis
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10 font-bold">
              <History className="h-4 w-4" /> Histórico de Execuções
            </TabsTrigger>
          </TabsList>
          
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar..." 
              className="pl-8 bg-[#0f172a] border-white/10 text-white" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <TabsContent value="templates" className="animate-in fade-in duration-300">
          {isLoadingTemplates ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full bg-white/5 rounded-2xl" />)}
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => (
                <Card key={template.id} className="bg-[#0f172a] border-white/5 border-2 hover:border-primary/20 transition-all group overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">{template.category}</Badge>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 text-white">
                            <DropdownMenuItem onClick={() => { setSelectedTemplate(template); setIsEditorOpen(true); }} className="gap-2">
                              <Edit className="h-4 w-4" /> Editar Modelo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={() => deleteChecklistTemplate(template.id)} className="text-rose-500 gap-2">
                              <Trash2 className="h-4 w-4" /> Excluir Permanentemente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <CardTitle className="text-lg font-black text-white mt-2 leading-tight group-hover:text-primary transition-colors">{template.title}</CardTitle>
                    <CardDescription className="text-xs text-slate-400 line-clamp-2 mt-1">{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                      <Target className="h-3 w-3 text-primary" /> {template.items.length} Passos de Verificação
                    </div>
                  </CardContent>
                  <CardFooter className="bg-white/5 border-t border-white/5 p-4">
                    <Button 
                      className="w-full bg-white/5 hover:bg-primary hover:text-primary-foreground font-black uppercase tracking-widest text-[10px] h-10 gap-2 transition-all"
                      onClick={() => { setSelectedTemplate(template); setIsExecutorOpen(true); }}
                    >
                      <Play className="h-3 w-3" /> Executar Checklist
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 opacity-40">
              <CheckSquare className="h-12 w-12 mx-auto mb-4" />
              <p className="font-bold text-white uppercase tracking-widest text-[10px]">Nenhum modelo disponível</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in duration-300">
          <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5 border-b border-white/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-[10px] font-black uppercase">Checklist</TableHead>
                  <TableHead className="text-muted-foreground text-[10px] font-black uppercase">Responsável</TableHead>
                  <TableHead className="text-muted-foreground text-[10px] font-black uppercase">Data/Hora</TableHead>
                  <TableHead className="text-center text-muted-foreground text-[10px] font-black uppercase">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground text-[10px] font-black uppercase px-6">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingExecutions ? (
                  [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full bg-white/5" /></TableCell></TableRow>)
                ) : executions?.map(exec => (
                  <TableRow key={exec.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="font-bold text-white">{exec.templateTitle}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[8px] font-black">
                          {exec.userName.charAt(0)}
                        </div>
                        <span className="text-sm text-slate-300">{exec.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {exec.executedAt && format(exec.executedAt.toDate(), 'dd/MM/yy HH:mm')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] font-black">CONCLUÍDO</Badge>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <Button variant="ghost" size="icon" className="text-white/30"><Info className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {executions?.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-500 italic">Nenhuma execução registrada.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <ChecklistEditorDialog 
        open={isEditorOpen} 
        onOpenChange={setIsEditorOpen} 
        template={selectedTemplate}
      />

      <ChecklistExecutorDialog 
        open={isExecutorOpen} 
        onOpenChange={setIsExecutorOpen} 
        template={selectedTemplate}
      />
    </div>
  );
}

function ChecklistEditorDialog({ open, onOpenChange, template }: { open: boolean; onOpenChange: (o: boolean) => void; template: ChecklistTemplate | null }) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('Operacional');
  const [items, setItems] = React.useState<ChecklistItem[]>([]);
  const { toast } = useToast();

  React.useEffect(() => {
    if (template && open) {
      setTitle(template.title);
      setDescription(template.description);
      setCategory(template.category);
      setItems(template.items);
    } else if (!template && open) {
      setTitle('');
      setDescription('');
      setCategory('Operacional');
      setItems([]);
    }
  }, [template, open]);

  const addItem = () => {
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substr(2, 9),
      label: '',
      type: 'YES_NO',
      required: true
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof ChecklistItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

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
        items
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
      <DialogContent className="sm:max-w-3xl bg-[#020617] border-white/10 text-white max-h-[90vh] flex flex-col p-0 shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 bg-white/5">
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
            <Edit className="h-6 w-6 text-primary" />
            Editor de Modelo
          </DialogTitle>
          <DialogDescription className="text-slate-400">Desenvolva o passo a passo padrão para as rotinas do escritório.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Título do Checklist *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Protocolo de Inicial Trabalhista" className="h-11 bg-black/40 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 bg-black/40 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f172a] text-white">
                    <SelectItem value="Operacional">Operacional</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Comercial">Comercial</SelectItem>
                    <SelectItem value="Iniciativa">Iniciativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Descrição / Finalidade</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva quando e por quem este checklist deve ser executado..." className="bg-black/40 border-white/10 h-20" />
              </div>
            </div>

            <Separator className="bg-white/5" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <ListChecks className="h-4 w-4" /> Itens de Verificação
                </h3>
                <Button onClick={addItem} type="button" size="sm" variant="outline" className="h-8 border-primary/20 text-primary hover:bg-primary/10 text-[10px] font-black uppercase">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Passo
                </Button>
              </div>

              <div className="grid gap-3">
                {items.map((item, idx) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row gap-4 items-start group">
                    <div className="h-8 w-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 space-y-3 w-full">
                      <Input 
                        value={item.label} 
                        onChange={e => updateItem(item.id, 'label', e.target.value)} 
                        placeholder="Pergunta ou instrução do passo..." 
                        className="bg-transparent border-0 border-b border-white/10 rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 font-bold"
                      />
                      <div className="flex items-center gap-4">
                        <Select value={item.type} onValueChange={val => updateItem(item.id, 'type', val)}>
                          <SelectTrigger className="h-8 w-48 text-[10px] font-black uppercase bg-black/40 border-white/5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0f172a] text-white">
                            <SelectItem value="YES_NO">Sim / Não</SelectItem>
                            <SelectItem value="YES_NO_MAYBE">Sim / Não / Parcial</SelectItem>
                            <SelectItem value="TEXT">Resposta em Texto</SelectItem>
                            <SelectItem value="NUMBER">Valor Numérico</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id={`req-${item.id}`} 
                            checked={item.required} 
                            onChange={e => updateItem(item.id, 'required', e.target.checked)} 
                            className="accent-primary"
                          />
                          <Label htmlFor={`req-${item.id}`} className="text-[9px] font-black uppercase text-slate-500 cursor-pointer">Obrigatório</Label>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-rose-500 hover:bg-rose-500/10 h-8 w-8 rounded-lg shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-10 opacity-20 italic text-xs">Comece adicionando o primeiro passo de verificação.</div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 gap-3">
          <DialogClose asChild><Button variant="ghost" className="text-slate-400 font-bold uppercase text-[10px]">Cancelar</Button></DialogClose>
          <Button 
            disabled={isSaving} 
            className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20"
            onClick={handleSave}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Salvar e Disponibilizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistExecutorDialog({ open, onOpenChange, template }: { open: boolean; onOpenChange: (o: boolean) => void; template: ChecklistTemplate | null }) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [observations, setObservations] = React.useState('');
  const { toast } = useToast();

  React.useEffect(() => {
    if (template && open) {
      setAnswers({});
      setObservations('');
    }
  }, [template, open]);

  const handleFinish = async () => {
    if (!template) return;
    
    // Validar itens obrigatórios
    const missing = template.items.filter(i => i.required && (answers[i.id] === undefined || answers[i.id] === ''));
    if (missing.length > 0) {
      toast({ variant: 'destructive', title: 'Pendência', description: 'Complete todos os passos obrigatórios.' });
      return;
    }

    setIsSaving(true);
    try {
      await saveChecklistExecution({
        templateId: template.id,
        templateTitle: template.title,
        answers,
        observations,
        status: 'COMPLETED'
      });
      toast({ title: 'Checklist Concluído!', description: 'O resultado foi transmitido à administração.' });
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
      <DialogContent className="sm:max-w-2xl bg-[#020617] border-white/10 text-white max-h-[90vh] flex flex-col p-0 shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 bg-primary/5">
          <DialogTitle className="flex items-center gap-2 text-white font-headline text-xl">
            <Play className="h-6 w-6 text-primary" />
            Executando: {template.title}
          </DialogTitle>
          <DialogDescription className="text-slate-400">{template.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            <div className="grid gap-6">
              {template.items.map((item, idx) => (
                <div key={item.id} className="space-y-4 p-6 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden group">
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-black text-primary shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-base font-bold text-white leading-tight block mb-4">{item.label} {item.required && <span className="text-rose-500">*</span>}</Label>
                      
                      {item.type === 'YES_NO' && (
                        <RadioGroup value={answers[item.id]} onValueChange={val => setAnswers({...answers, [item.id]: val})} className="flex gap-4">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="SIM" id={`y-${item.id}`} /><Label htmlFor={`y-${item.id}`} className="text-xs font-bold text-emerald-400 cursor-pointer">SIM</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="NAO" id={`n-${item.id}`} /><Label htmlFor={`n-${item.id}`} className="text-xs font-bold text-rose-400 cursor-pointer">NÃO</Label></div>
                        </RadioGroup>
                      )}

                      {item.type === 'YES_NO_MAYBE' && (
                        <RadioGroup value={answers[item.id]} onValueChange={val => setAnswers({...answers, [item.id]: val})} className="flex flex-wrap gap-4">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="SIM" id={`y-${item.id}`} /><Label htmlFor={`y-${item.id}`} className="text-xs font-bold text-emerald-400 cursor-pointer">SIM</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="NAO" id={`n-${item.id}`} /><Label htmlFor={`n-${item.id}`} className="text-xs font-bold text-rose-400 cursor-pointer">NÃO</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="PARCIAL" id={`m-${item.id}`} /><Label htmlFor={`m-${item.id}`} className="text-xs font-bold text-amber-400 cursor-pointer">PARCIAL</Label></div>
                        </RadioGroup>
                      )}

                      {item.type === 'TEXT' && (
                        <Textarea 
                          value={answers[item.id] || ''} 
                          onChange={e => setAnswers({...answers, [item.id]: e.target.value})} 
                          placeholder="Digite sua resposta aqui..." 
                          className="bg-black/40 border-white/5 text-sm"
                        />
                      )}

                      {item.type === 'NUMBER' && (
                        <Input 
                          type="number" 
                          value={answers[item.id] || ''} 
                          onChange={e => setAnswers({...answers, [item.id]: e.target.value})} 
                          className="bg-black/40 border-white/5 w-32"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="bg-white/5" />

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <MessageSquare className="h-3 w-3" /> Observações Gerais da Execução
              </Label>
              <Textarea 
                value={observations} 
                onChange={e => setObservations(e.target.value)} 
                placeholder="Algo fora do comum ocorreu? Registre aqui para a administração..." 
                className="bg-white/5 border-white/10 h-24"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 gap-3">
          <DialogClose asChild><Button variant="ghost" className="text-slate-400 font-bold uppercase text-[10px]">Cancelar</Button></DialogClose>
          <Button 
            disabled={isSaving} 
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-emerald-900/20"
            onClick={handleFinish}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Finalizar e Transmitir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Separator = ({ className }: { className?: string }) => <div className={cn("h-px w-full bg-border", className)} />;
