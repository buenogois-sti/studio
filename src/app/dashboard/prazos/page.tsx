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
  Check,
  Eye,
  Edit,
  ArrowRight,
  CalendarDays,
  RotateCcw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { format, formatDistanceToNow, isBefore, isToday, differenceInDays, startOfDay } from 'date-fns';
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
import { DeadlineDetailsSheet } from '@/components/process/DeadlineDetailsSheet';
import { LegalDeadlineDialog } from '@/components/process/LegalDeadlineDialog';
import { Progress } from '@/components/ui/progress';

export default function PrazosPage() {
  const { firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  
  const [selectedDeadlineDetails, setSelectedDeadlineDetails] = React.useState<LegalDeadline | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  
  const [editingDeadline, setEditingDeadline] = React.useState<LegalDeadline | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

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
    const now = startOfDay(new Date());
    return filteredDeadlines.filter(d => d.status === 'PENDENTE' && isBefore(d.endDate.toDate(), now) && !isToday(d.endDate.toDate()));
  }, [filteredDeadlines]);

  const handleUpdateStatus = async (id: string, status: LegalDeadlineStatus) => {
    setIsProcessing(id);
    try {
      await updateDeadlineStatus(id, status);
      toast({ title: status === 'PENDENTE' ? 'Prazo Reativado!' : `Prazo marcado como ${status.toLowerCase()}!` });
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

  const handleViewDetails = (d: LegalDeadline) => {
    setSelectedDeadlineDetails(d);
    setIsDetailsOpen(true);
  };

  const handleEdit = (d: LegalDeadline) => {
    setEditingDeadline(d);
    setIsEditOpen(true);
  };

  const handleGoToProcess = (processId: string) => {
    const process = processesMap.get(processId);
    if (process) {
      router.push(`/dashboard/processos?clientId=${process.clientId}`);
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
          <p className="text-sm text-muted-foreground">Controle fatal integrado ao Google Workspace.</p>
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
        <Card className="border-rose-500/20 bg-rose-500/5 border-2 animate-in fade-in duration-500">
          <CardHeader className="py-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center animate-pulse">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tighter">Atenção Crítica</CardTitle>
                <CardDescription className="text-rose-400/80 font-medium">Existem {atrasados.length} prazo(s) com vencimento expirado!</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="pendentes" className="w-full">
        <TabsList className="bg-[#0f172a] p-1 border border-border/50 mb-6 h-12">
          <TabsTrigger value="pendentes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10">
            <Clock className="h-4 w-4" /> Pendentes
            <Badge variant="secondary" className="ml-1 px-1.5 h-4 text-[10px] font-black">{pendentes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cumpridos" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10">
            <CheckCircle2 className="h-4 w-4" /> Cumpridos
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 h-10">
            <History className="h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full bg-card/50 rounded-2xl" />)
          ) : pendentes.length > 0 ? (
            pendentes.map(d => (
              <DeadlineCard 
                key={d.id} 
                deadline={d} 
                process={processesMap.get(d.processId)} 
                onStatusUpdate={handleUpdateStatus}
                onDelete={handleDelete}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onGoToProcess={handleGoToProcess}
                isProcessing={isProcessing === d.id}
              />
            ))
          ) : (
            <div className="text-center py-32 rounded-2xl border-2 border-dashed border-border/30 bg-muted/5 flex flex-col items-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500/20" />
              <div className="space-y-1">
                <p className="font-bold text-white text-lg">Tudo em dia!</p>
                <p className="text-sm text-muted-foreground">Nenhum prazo pendente foi encontrado na sua agenda.</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cumpridos" className="space-y-4">
          {cumpridos.map(d => (
            <DeadlineCard 
              key={d.id} 
              deadline={d} 
              process={processesMap.get(d.processId)} 
              onStatusUpdate={handleUpdateStatus}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onGoToProcess={handleGoToProcess}
              isProcessing={isProcessing === d.id}
            />
          ))}
          {cumpridos.length === 0 && (
            <div className="text-center py-20 text-muted-foreground italic">Nenhum prazo cumprido no histórico recente.</div>
          )}
        </TabsContent>

        <TabsContent value="historico">
          <Card className="bg-[#0f172a] border-border/50 overflow-hidden">
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
                      <tr key={d.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 font-bold text-white">
                          <div className="max-w-[250px] truncate">{processesMap.get(d.processId)?.name}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-mono text-xs">{format(d.endDate.toDate(), 'dd/MM/yyyy')}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-[10px] font-bold bg-white/5 border-primary/20 text-primary">{d.type}</Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase",
                            d.status === 'PENDENTE' ? "text-amber-400 border-amber-500/30 bg-amber-500/5" : "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
                          )}>{d.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-white">
                                {isProcessing === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border w-56">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Opções do Prazo</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewDetails(d)} className="gap-2 cursor-pointer">
                                <Eye className="h-4 w-4 text-blue-400" /> <span className="font-bold">Ver Detalhes</span>
                              </DropdownMenuItem>
                              
                              {d.status === 'CUMPRIDO' ? (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(d.id, 'PENDENTE')} className="gap-2 cursor-pointer text-amber-400">
                                  <RotateCcw className="h-4 w-4" /> <span className="font-bold">Reativar Prazo</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(d.id, 'CUMPRIDO')} className="gap-2 cursor-pointer text-emerald-400">
                                  <Check className="h-4 w-4" /> <span className="font-bold">Marcar Cumprido</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem onClick={() => handleEdit(d)} className="gap-2 cursor-pointer">
                                <Edit className="h-4 w-4 text-primary" /> <span className="font-bold">Editar</span>
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => handleGoToProcess(d.processId)} className="gap-2 cursor-pointer">
                                <ArrowRight className="h-4 w-4 text-slate-400" /> <span className="font-bold">Ver Processo</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem className="text-rose-500 gap-2 cursor-pointer" onClick={() => handleDelete(d.id)}>
                                <X className="h-4 w-4" /> <span className="font-bold">Excluir</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <DeadlineDetailsSheet 
        deadline={selectedDeadlineDetails} 
        process={selectedDeadlineDetails ? processesMap.get(selectedDeadlineDetails.processId) : undefined}
        open={isDetailsOpen} 
        onOpenChange={setIsDetailsOpen} 
      />

      <LegalDeadlineDialog 
        process={editingDeadline ? processesMap.get(editingDeadline.processId) || null : null}
        deadline={editingDeadline}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </div>
  );
}

function DeadlineCard({ 
  deadline, 
  process, 
  onStatusUpdate, 
  onDelete,
  onViewDetails,
  onEdit,
  onGoToProcess,
  isProcessing 
}: { 
  deadline: LegalDeadline; 
  process?: Process; 
  onStatusUpdate: (id: string, status: LegalDeadlineStatus) => void;
  onDelete: (id: string) => void;
  onViewDetails: (d: LegalDeadline) => void;
  onEdit: (d: LegalDeadline) => void;
  onGoToProcess: (id: string) => void;
  isProcessing: boolean;
}) {
  const now = new Date();
  const endDate = deadline.endDate.toDate();
  const startDate = deadline.startDate.toDate();
  const isExpired = isBefore(endDate, startOfDay(now)) && !isToday(endDate);
  const isFulfilled = deadline.status === 'CUMPRIDO';
  
  const daysDiff = differenceInDays(endDate, now);
  const totalDuration = Math.max(differenceInDays(endDate, startDate), 1);
  const daysElapsed = Math.max(differenceInDays(now, startDate), 0);
  const progressPercent = Math.min(Math.round((daysElapsed / totalDuration) * 100), 100);
  
  return (
    <Card className={cn(
      "border-l-4 transition-all duration-300 bg-[#0f172a] hover:bg-[#1e293b] group relative overflow-hidden",
      isFulfilled ? "border-l-emerald-500/50 opacity-80" : isExpired ? "border-l-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]" : "border-l-primary"
    )}>
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Data Section */}
          <div className="flex gap-4 min-w-[280px]">
            <div className={cn(
              "h-14 w-14 rounded-2xl flex flex-col items-center justify-center border-2 shrink-0 transition-transform group-hover:scale-105",
              isFulfilled ? "bg-emerald-500/10 border-emerald-500/20" : isExpired ? "bg-rose-500/10 border-rose-500/20 animate-pulse" : "bg-primary/10 border-primary/20"
            )}>
              <span className="text-[10px] font-black uppercase leading-none text-muted-foreground mb-0.5">{format(endDate, 'MMM', { locale: ptBR })}</span>
              <span className={cn("text-2xl font-black leading-none", isFulfilled ? "text-emerald-500" : isExpired ? "text-rose-500" : "text-white")}>
                {format(endDate, 'dd')}
              </span>
            </div>
            
            <div className="min-w-0 space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-white/5 text-primary border-primary/30 text-[9px] font-black uppercase tracking-widest">{deadline.type}</Badge>
                <span className="text-[9px] text-muted-foreground uppercase font-black flex items-center gap-1">
                  <Scale className="h-3 w-3" /> {deadline.isBusinessDays ? 'Úteis (CPC)' : 'Corridos'}
                </span>
              </div>
              <h3 className="text-base font-black text-white truncate leading-tight group-hover:text-primary transition-colors">{process?.name || 'Processo não encontrado'}</h3>
              <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
                <span className="font-mono">{process?.processNumber || 'N/A'}</span>
                {process?.legalArea && <span className="uppercase text-slate-500">• {process.legalArea}</span>}
              </div>
            </div>
          </div>

          {/* Progress & Countdown Section */}
          <div className="flex-1 flex flex-col justify-center space-y-3">
            {!isFulfilled && (
              <>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className={cn(isExpired ? "text-rose-500" : "text-amber-400")}>
                    {isExpired ? 'Prazo Expirado' : `Vencimento ${formatDistanceToNow(endDate, { addSuffix: true, locale: ptBR })}`}
                  </span>
                  <span className="text-white">
                    {isExpired ? '' : `${Math.max(daysDiff, 0)} Dias Restantes`}
                  </span>
                </div>
                <Progress 
                  value={progressPercent} 
                  className={cn(
                    "h-1.5 bg-white/5", 
                    isExpired ? "[&>div]:bg-rose-500" : progressPercent > 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"
                  )} 
                />
              </>
            )}
            {isFulfilled && (
              <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] tracking-widest">
                <CheckCircle2 className="h-4 w-4" /> Cumprido por {deadline.authorName}
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-2 justify-end lg:ml-4">
            {isFulfilled ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 border-amber-500/20 text-amber-500 hover:bg-amber-500/10 text-[10px] font-black uppercase px-4"
                onClick={() => onStatusUpdate(deadline.id, 'PENDENTE')}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                Reabrir
              </Button>
            ) : (
              <Button 
                size="sm" 
                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase px-6 shadow-lg shadow-emerald-900/20"
                onClick={() => onStatusUpdate(deadline.id, 'CUMPRIDO')}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                Marcar Cumprido
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border w-56 p-1 shadow-2xl">
                <DropdownMenuLabel className="text-[9px] font-black uppercase text-muted-foreground px-2 py-1.5 tracking-widest">Gerenciamento</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onViewDetails(deadline)} className="gap-2 cursor-pointer focus:bg-primary/10">
                  <Eye className="h-4 w-4 text-blue-400" /> <span className="font-bold">Ver Detalhes</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(deadline)} className="gap-2 cursor-pointer focus:bg-primary/10">
                  <Edit className="h-4 w-4 text-primary" /> <span className="font-bold">Editar Prazo</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onGoToProcess(deadline.processId)} className="gap-2 cursor-pointer focus:bg-primary/10">
                  <ArrowRight className="h-4 w-4 text-slate-400" /> <span className="font-bold">Ir para o Processo</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => window.print()} className="gap-2 cursor-pointer">
                  <ExternalLink className="h-4 w-4 text-slate-400" /> <span className="text-xs">Imprimir Publicação</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="text-rose-500 gap-2 cursor-pointer focus:bg-rose-500/10" onClick={() => onDelete(deadline.id)}>
                  <X className="h-4 w-4" /> <span className="font-bold">Excluir Prazo</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}