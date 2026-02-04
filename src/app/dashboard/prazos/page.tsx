
'use client';

import * as React from 'react';
import {
  Timer,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  Scale,
  MoreVertical,
  X,
  Loader2,
  Calendar,
  ExternalLink,
  Check
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { LegalDeadline, Process, LegalDeadlineStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isBefore, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { updateDeadlineStatus, deleteLegalDeadline } from '@/lib/deadline-actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function PrazosPage() {
  const { firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

  const deadlinesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'deadlines'), orderBy('endDate', 'asc')) : null, [firestore]);
  const { data: deadlinesData, isLoading: isLoadingDeadlines } = useCollection<LegalDeadline>(deadlinesQuery);

  const processesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'processes') : null, [firestore]);
  const { data: processesData } = useCollection<Process>(processesQuery);
  const processesMap = React.useMemo(() => new Map(processesData?.map(p => [p.id, p])), [processesData]);

  const isLoading = isUserLoading || isLoadingDeadlines;

  const filteredDeadlines = React.useMemo(() => {
    if (!deadlinesData) return [];
    return deadlinesData.filter(d => {
      const process = processesMap.get(d.processId);
      const matchesSearch = 
        d.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        process?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        process?.processNumber?.includes(searchTerm);
      return matchesSearch;
    });
  }, [deadlinesData, searchTerm, processesMap]);

  const pendentes = React.useMemo(() => filteredDeadlines.filter(d => d.status === 'PENDENTE'), [filteredDeadlines]);
  const cumpridos = React.useMemo(() => filteredDeadlines.filter(d => d.status === 'CUMPRIDO'), [filteredDeadlines]);
  const atrasados = React.useMemo(() => {
    const now = new Date();
    return filteredDeadlines.filter(d => d.status === 'PENDENTE' && isBefore(d.endDate.toDate(), now) && !isToday(d.endDate.toDate()));
  }, [filteredDeadlines]);

  const handleUpdateStatus = async (id: string, status: LegalDeadlineStatus) => {
    setIsProcessing(id);
    try {
      await updateDeadlineStatus(id, status);
      toast({ title: `Prazo marcado como ${status.toLowerCase()}!` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este prazo da agenda?')) return;
    try {
      await deleteLegalDeadline(id);
      toast({ title: 'Prazo removido.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline flex items-center gap-3 text-white">
            <Timer className="h-8 w-8 text-primary" />
            Agenda de Prazos
          </h1>
          <p className="text-sm text-muted-foreground">Controle fatal de obrigações processuais e protocolos.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar por processo ou tipo..." 
            className="pl-8 pr-8 bg-card border-border/50 text-white" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-white/50">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {atrasados.length > 0 && (
        <Card className="border-rose-500/20 bg-rose-500/5 animate-pulse">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle className="text-lg">Atenção: {atrasados.length} Prazo(s) Vencido(s)</CardTitle>
            </div>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="pendentes" className="w-full">
        <TabsList className="bg-[#0f172a] p-1 border border-border/50 mb-6">
          <TabsTrigger value="pendentes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Clock className="h-4 w-4" /> Pendentes
            <Badge variant="secondary" className="ml-1 px-1.5 h-4 text-[10px]">{pendentes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cumpridos" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CheckCircle2 className="h-4 w-4" /> Cumpridos
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="h-4 w-4" /> Histórico Completo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          <div className="grid gap-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full bg-card/50" />)
            ) : pendentes.length > 0 ? (
              pendentes.map(d => (
                <DeadlineCard 
                  key={d.id} 
                  deadline={d} 
                  process={processesMap.get(d.processId)} 
                  onStatusUpdate={handleUpdateStatus}
                  onDelete={handleDelete}
                  isProcessing={isProcessing === d.id}
                />
              ))
            ) : (
              <div className="text-center py-20 text-muted-foreground italic border-2 border-dashed rounded-2xl border-border/30">
                Nenhum prazo pendente encontrado.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cumpridos">
          <div className="grid gap-4">
            {cumpridos.map(d => (
              <DeadlineCard 
                key={d.id} 
                deadline={d} 
                process={processesMap.get(d.processId)} 
                onStatusUpdate={handleUpdateStatus}
                onDelete={handleDelete}
                isProcessing={isProcessing === d.id}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <Card className="bg-[#0f172a] border-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="px-6 py-4">Processo</th>
                      <th className="px-6 py-4">Vencimento</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {filteredDeadlines.map(d => (
                      <tr key={d.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{processesMap.get(d.processId)?.name}</td>
                        <td className="px-6 py-4 text-slate-300">{format(d.endDate.toDate(), 'dd/MM/yyyy')}</td>
                        <td className="px-6 py-4"><Badge variant="outline" className="text-[10px]">{d.type}</Badge></td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase",
                            d.status === 'PENDENTE' ? "text-amber-400 border-amber-500/30" : "text-emerald-400 border-emerald-500/30"
                          )}>{d.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}><X className="h-4 w-4 text-muted-foreground" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeadlineCard({ 
  deadline, 
  process, 
  onStatusUpdate, 
  onDelete,
  isProcessing 
}: { 
  deadline: LegalDeadline; 
  process?: Process; 
  onStatusUpdate: (id: string, status: LegalDeadlineStatus) => void;
  onDelete: (id: string) => void;
  isProcessing: boolean;
}) {
  const isExpired = isBefore(deadline.endDate.toDate(), new Date()) && !isToday(deadline.endDate.toDate());
  const isFulfilled = deadline.status === 'CUMPRIDO';
  
  const daysDiff = differenceInDays(deadline.endDate.toDate(), new Date());
  
  return (
    <Card className={cn(
      "border-l-4 transition-all duration-300 bg-[#0f172a] hover:bg-[#1e293b]",
      isFulfilled ? "border-l-emerald-500 opacity-70" : isExpired ? "border-l-rose-500" : "border-l-primary"
    )}>
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex gap-4">
            <div className={cn(
              "h-12 w-12 rounded-xl flex flex-col items-center justify-center border-2 shrink-0",
              isFulfilled ? "bg-emerald-500/10 border-emerald-500/20" : isExpired ? "bg-rose-500/10 border-rose-500/20" : "bg-primary/10 border-primary/20"
            )}>
              <span className="text-[10px] font-black uppercase leading-none text-muted-foreground">{format(deadline.endDate.toDate(), 'MMM', { locale: ptBR })}</span>
              <span className={cn("text-xl font-black leading-none", isFulfilled ? "text-emerald-500" : isExpired ? "text-rose-500" : "text-white")}>
                {format(deadline.endDate.toDate(), 'dd')}
              </span>
            </div>
            
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-white/5 text-primary border-primary/30 text-[9px] font-black uppercase tracking-widest">{deadline.type}</Badge>
                <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                  <Scale className="h-3 w-3" /> {deadline.isBusinessDays ? 'Dias Úteis (CPC)' : 'Dias Corridos'}
                </span>
              </div>
              <h3 className="text-base font-black text-white truncate">{process?.name || 'Processo não encontrado'}</h3>
              <p className="text-xs text-muted-foreground font-mono">{process?.processNumber || 'Nº não informado'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto md:ml-0">
            {!isFulfilled && (
              <div className="text-right hidden sm:block">
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-tighter",
                  isExpired ? "text-rose-500" : "text-amber-400"
                )}>
                  {isExpired ? 'Vencido' : `Vence ${formatDistanceToNow(deadline.endDate.toDate(), { addSuffix: true, locale: ptBR })}`}
                </p>
                <p className="text-xl font-black text-white">
                  {isExpired ? '-' : ''}{Math.abs(daysDiff)} <span className="text-[10px] text-muted-foreground">Dias</span>
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {isFulfilled ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 border-amber-500/20 text-amber-500 hover:bg-amber-500/10 text-[10px] font-black uppercase"
                  onClick={() => onStatusUpdate(deadline.id, 'PENDENTE')}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                  Reabrir
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase px-4"
                  onClick={() => onStatusUpdate(deadline.id, 'CUMPRIDO')}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                  Marcar Cumprido
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border">
                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => window.print()}><ExternalLink className="h-4 w-4 mr-2" /> Imprimir Publicação</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-rose-500" onClick={() => onDelete(deadline.id)}>Excluir Prazo</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
