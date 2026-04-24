'use client';

import * as React from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  AlertCircle,
  RefreshCcw,
  Sparkles
} from 'lucide-react';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, where, Timestamp, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Task, TaskStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel 
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';

const taskSchema = z.object({
  title: z.string().min(3, 'Título muito curto'),
  notes: z.string().optional(),
  due: z.string().optional(),
});

export default function TasksPage() {
  const { firestore } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [filter, setFilter] = React.useState<TaskStatus | 'all'>('needsAction');
  const [search, setSearch] = React.useState('');
  const [isAdding, setIsAdding] = React.useState(false);

  const tasksQuery = React.useMemo(() => {
    if (!firestore) return null;
    let base = collection(firestore, 'tasks');
    if (filter === 'all') return query(base, orderBy('createdAt', 'desc'));
    return query(base, where('status', '==', filter), orderBy('createdAt', 'desc'));
  }, [firestore, filter]);

  const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      notes: '',
      due: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof taskSchema>) => {
    if (!firestore || !session?.user?.id) return;
    
    try {
      await addDoc(collection(firestore, 'tasks'), {
        title: values.title,
        notes: values.notes || '',
        status: 'needsAction',
        due: values.due ? Timestamp.fromDate(new Date(values.due)) : null,
        userId: session.user.id,
        userName: session.user.name,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      toast({ title: 'Sucesso', description: 'Tarefa criada com sucesso' });
      setIsAdding(false);
      form.reset();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao criar tarefa', variant: 'destructive' });
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    if (!firestore) return;
    const newStatus: TaskStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    
    try {
      await updateDoc(doc(firestore, 'tasks', task.id), {
        status: newStatus,
        completedAt: newStatus === 'completed' ? Timestamp.now() : null,
        updatedAt: Timestamp.now(),
      });
      toast({ title: 'Status Atualizado', description: newStatus === 'completed' ? 'Tarefa concluída!' : 'Tarefa reativada' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar tarefa', variant: 'destructive' });
    }
  };

  const deleteTask = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'tasks', id));
      toast({ title: 'Excluído', description: 'Tarefa removida com sucesso' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir tarefa', variant: 'destructive' });
    }
  };

  const filteredTasks = tasks?.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.notes?.toLowerCase().includes(search.toLowerCase()) ||
    t.userName?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = React.useMemo(() => {
    if (!tasks) return { pending: 0, completed: 0 };
    return {
      pending: tasks.filter(t => t.status === 'needsAction').length,
      completed: tasks.filter(t => t.status === 'completed').length,
    };
  }, [tasks]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header Estilizado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1 animate-in slide-in-from-left duration-500">
          <h1 className="text-4xl font-black text-white tracking-tight font-headline flex items-center gap-3">
            <CheckSquare className="h-10 w-10 text-primary" />
            Gestão de Tarefas
          </h1>
          <p className="text-slate-400 font-medium">Sincronização inteligente com Google Tasks e fluxos n8n</p>
        </div>
        
        <div className="flex items-center gap-3 animate-in slide-in-from-right duration-500">
          <Button variant="outline" className="border-white/10 bg-white/5 text-primary hover:bg-primary/10">
            <RefreshCcw className="h-4 w-4 mr-2" /> Forçar Sincronia
          </Button>
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground font-black uppercase tracking-tighter px-6 shadow-lg shadow-primary/20">
                <Plus className="h-5 w-5 mr-2" /> Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f172a] border-white/10 text-white shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black font-headline">Criar Tarefa Local</DialogTitle>
                <CardDescription>Esta tarefa será sincronizada automaticamente com o Google.</CardDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-500 uppercase text-[10px] font-black tracking-widest">Título da Tarefa</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Protocolar Petição Inicial..." className="bg-black/40 border-white/10 h-12" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-500 uppercase text-[10px] font-black tracking-widest">Observações / Detalhes</FormLabel>
                        <FormControl>
                          <Input placeholder="Mais contexto sobre a tarefa..." className="bg-black/40 border-white/10 h-12" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="due"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-500 uppercase text-[10px] font-black tracking-widest">Data Limite (Deadline)</FormLabel>
                        <FormControl>
                          <Input type="date" className="bg-black/40 border-white/10 h-12" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-6">
                    <Button type="submit" className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest py-6">
                      Salvar Tarefa
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grid de Stats Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-700">
        <StatsCard title="PENDENTES" value={stats.pending} icon={Clock} color="text-amber-500" />
        <StatsCard title="CONCLUÍDAS" value={stats.completed} icon={CheckCircle2} color="text-emerald-500" />
        <StatsCard title="EFICIÊNCIA" value={tasks?.length ? Math.round((stats.completed / tasks.length) * 100) : 0} icon={Sparkles} color="text-blue-400" suffix="%" />
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-[#0f172a] border border-white/5 p-4 rounded-3xl shadow-xl">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Pesquisar em tarefas, notas ou responsáveis..." 
            className="pl-11 bg-black/40 border-white/5 h-12 rounded-2xl focus:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/5">
          <Button 
            variant={filter === 'needsAction' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setFilter('needsAction')}
            className={cn("rounded-xl h-9 font-bold px-4", filter === 'needsAction' && "bg-primary text-black")}
          >
            Pendentes
          </Button>
          <Button 
            variant={filter === 'completed' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setFilter('completed')}
            className={cn("rounded-xl h-9 font-bold px-4", filter === 'completed' && "bg-primary text-black")}
          >
            Concluídas
          </Button>
          <Button 
            variant={filter === 'all' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setFilter('all')}
            className={cn("rounded-xl h-9 font-bold px-4", filter === 'all' && "bg-primary text-black")}
          >
            Todas
          </Button>
        </div>
      </div>

      {/* Inbox de Tarefas */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-white/5" />)}
          </div>
        ) : filteredTasks?.length ? (
          <div className="grid gap-3">
            {filteredTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={toggleTaskStatus} onDelete={deleteTask} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-30">
            <CheckSquare className="h-20 w-20" />
            <div>
              <p className="text-xl font-black font-headline text-white">Nenhuma tarefa encontrada</p>
              <p className="text-sm">Limpe os filtros ou sincronize com o Google.</p>
            </div>
          </div>
        )}
      </div>

      {/* Banner de Sincronia Google */}
      <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-6 mt-10">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#4285F4] flex items-center justify-center text-white shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-black text-white tracking-widest uppercase text-sm">Integração Google Tasks Ativa</h4>
            <p className="text-xs text-blue-400 font-bold uppercase">Webhooks configurados via n8n Bueno Gois</p>
          </div>
        </div>
        <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-black h-12 px-8 uppercase text-xs tracking-widest">
          Documentação de Fluxos
        </Button>
      </div>
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete }: { task: Task, onToggle: (t: Task) => void, onDelete: (id: string) => void }) {
  const isCompleted = task.status === 'completed';
  const hasDue = !!task.due;
  const isOverdue = hasDue && !isCompleted && task.due!.toDate() < new Date();

  return (
    <div className={cn(
      "group relative overflow-hidden transition-all duration-300",
      "bg-[#0f172a] border-l-4 rounded-r-3xl border-y border-r border-white/5",
      isCompleted ? "border-l-emerald-500/40 opacity-60" : isOverdue ? "border-l-rose-500 bg-rose-500/[0.02]" : "border-l-primary hover:bg-white/[0.02]"
    )}>
      <div className="flex items-center gap-4 p-5">
        <button 
          onClick={() => onToggle(task)}
          className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center transition-all",
            isCompleted ? "bg-emerald-500 text-black scale-90" : "border-2 border-slate-700 hover:border-primary text-transparent"
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
        
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className={cn("text-base font-bold text-white truncate group-hover:text-primary transition-colors", isCompleted && "line-through text-slate-500")}>
              {task.title}
            </h3>
            {task.googleTaskId && (
              <Badge variant="outline" className="text-[8px] h-4 font-black bg-blue-500/10 text-blue-400 border-blue-500/20">
                GOOGLE SYNC
              </Badge>
            )}
            {isOverdue && <Badge variant="destructive" className="text-[8px] h-4 font-black">ATRASADO</Badge>}
          </div>
          {task.notes && (
            <p className={cn("text-xs text-slate-400 line-clamp-1", isCompleted && "opacity-50")}>{task.notes}</p>
          )}
          
          <div className="flex items-center gap-4 mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span className="flex items-center gap-1.5"><User className="h-3 w-3" /> {task.userName || 'Sistema'}</span>
            {hasDue && (
              <span className={cn("flex items-center gap-1.5", isOverdue ? "text-rose-500" : "text-primary")}>
                <Clock className="h-3 w-3" /> {format(task.due!.toDate(), "dd 'de' MMM", { locale: ptBR })}
              </span>
            )}
            {task.processId && (
              <span className="flex items-center gap-1.5 text-blue-400"><ChevronRight className="h-3 w-3" /> {task.processName}</span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white"><MoreHorizontal className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 text-white">
            <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary">
              <ExternalLink className="h-4 w-4" /> Ver Dados Google
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem 
              className="gap-2 text-rose-500 cursor-pointer focus:bg-rose-500/10 focus:text-rose-500"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-4 w-4" /> Excluir Definitivo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color, suffix }: any) {
  return (
    <Card className="bg-[#0f172a] border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
      <div className={cn("absolute top-0 right-0 p-4 opacity-[0.03] transition-all group-hover:scale-110", color)}>
        <Icon className="h-16 w-16" />
      </div>
      <CardContent className="p-6">
        <p className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">{title}</p>
        <div className="flex items-end gap-2 mt-2">
          <span className={cn("text-4xl font-black", color)}>{value}</span>
          {suffix && <span className="text-xs font-bold text-slate-500 mb-2">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
