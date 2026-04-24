'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  limit
} from 'firebase/firestore';
import { db, useFirebase } from '@/firebase';
import { Intimacao } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Bell,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Building2,
  Clock,
  AlertTriangle,
  Search,
  Loader2,
  FlaskConical,
  LifeBuoy,
  LayoutGrid,
  List,
  UserPlus
} from 'lucide-react';
import { cn, extractFullOrgao, extractSortDate } from '@/lib/utils';
import { IntimacaoDetailsDialog } from './IntimacaoDetailsDialog';
import { useMemo } from 'react';

export function IntimacoesFeed() {
  const [intimacoes, setIntimacoes] = useState<Intimacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'no_process' | 'hearing'>('unread');
  const [selectedIntimacao, setSelectedIntimacao] = useState<Intimacao | null>(null);
  const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});
  const { user, isUserLoading, firestore } = useFirebase();
  const [collectionName, setCollectionName] = useState('intimacoes');
  const [currentPage, setCurrentPage] = useState(1);

  // Inicialização inteligente da fila baseada no usuário
  useEffect(() => {
    if (user?.displayName) {
      const name = user.displayName.toLowerCase();
      if (name.includes('natalia')) setCollectionName('intimacoes_natalia');
      else if (name.includes('alan')) setCollectionName('intimacoes_alan');
    }
  }, [user]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const itemsPerPage = 20;

  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid && firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          setUserRole(doc.data().role);
        }
      });
    }
  }, [user, firestore]);

  const isAssistant = userRole === 'assistant';

  useEffect(() => {
    if (isUserLoading || !user || !db) return;

    const q = query(
      collection(db, collectionName),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lida: !!data.lida,
        }
      }) as Intimacao[];

      docs.sort((a, b) => {
        const valA = extractSortDate(a);
        const valB = extractSortDate(b);
        return valB.localeCompare(valA);
      });

      setIntimacoes(docs);
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error("Erro ao ler intimações:", error);
      setError("Não foi possível carregar as intimações. Verifique sua conexão e tente novamente.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isUserLoading, collectionName]);

  const unreadCount = useMemo(() => intimacoes.filter(i => !i.lida).length, [intimacoes]);
  const readCount = useMemo(() => intimacoes.filter(i => i.lida).length, [intimacoes]);
  const noProcessCount = useMemo(() => intimacoes.filter(i => !i.processo).length, [intimacoes]);
  const hearingCount = useMemo(() => intimacoes.filter(i => i.descricao?.toLowerCase().includes('audiência') || i.descricao?.toLowerCase().includes('audiencia')).length, [intimacoes]);

  const filteredIntimacoes = useMemo(() => {
    switch (filter) {
      case 'unread': return intimacoes.filter(i => !i.lida);
      case 'read': return intimacoes.filter(i => i.lida);
      case 'no_process': return intimacoes.filter(i => !i.processo);
      case 'hearing': return intimacoes.filter(i => i.descricao?.toLowerCase().includes('audiência') || i.descricao?.toLowerCase().includes('audiencia'));
      case 'all': default: return intimacoes.filter(i => !i.lida); // O Feed Principal prioriza não lidas
    }
  }, [filter, intimacoes]);

  useEffect(() => { setCurrentPage(1); }, [filter]);

  const totalPages = Math.ceil(filteredIntimacoes.length / itemsPerPage);
  const currentItems = filteredIntimacoes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleRead = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    if (togglingMap[id]) return;

    setTogglingMap(prev => ({ ...prev, [id]: true }));
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, { lida: !currentStatus });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    } finally {
      setTogglingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  const changeFilter = (newFilter: typeof filter) => {
    if (filter === newFilter) return;
    setIsFiltering(true);
    setTimeout(() => {
      setFilter(newFilter);
      setIsFiltering(false);
    }, 400);
  };

  const handleOpenDetails = (item: Intimacao) => {
    setSelectedIntimacao(item);
    if (!item.lida) {
      const docRef = doc(db, collectionName, item.id);
      updateDoc(docRef, { lida: true }).catch(err => console.error("Erro ao marcar lida", err));
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 border rounded-xl bg-destructive/5 text-destructive border-destructive/20">
        <AlertTriangle className="w-12 h-12" />
        <h3 className="font-bold text-lg">Erro no Sinal</h3>
        <p className="text-center opacity-80">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Clock className="w-12 h-12 text-muted-foreground animate-spin" />
        <p className="text-muted-foreground animate-pulse">Sincronizando com os diários oficiais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-xl flex items-start gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-[0.03] pointer-events-none">
          <FlaskConical className="w-32 h-32" />
        </div>
        <div className="mt-1 bg-blue-500/20 p-2 rounded-md">
          <FlaskConical className="w-5 h-5 animate-pulse text-blue-300" />
        </div>
        <div className="space-y-1.5 flex-1 z-10">
          <h4 className="font-bold text-sm tracking-wide uppercase text-blue-300 flex items-center gap-2">
            Beta de Automação Ativado
            <Badge variant="outline" className="text-[9px] bg-blue-500/20 border-blue-400/30 text-blue-300 py-0 h-4">TESTE</Badge>
          </h4>
          <p className="text-xs leading-relaxed opacity-90 text-blue-200">
            O fluxo de extração e a IA de Parsing estão em fase de calibração <strong className="text-white">BETA</strong>.
            É crucial que os advogados realizem a <strong className="text-white border-b border-blue-400/50">dupla checagem obrigatória</strong> de todos os prazos nas plataformas oficiais para contornar riscos.
          </p>
          <div className="pt-2 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-blue-400/80">
            <LifeBuoy className="w-3 h-3" /> Reporte qualquer divergência entrar em contato com o Suporte.
          </div>
        </div>
      </div>

      {isAssistant && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="bg-amber-500/20 p-2 rounded-lg shrink-0">
            <UserPlus className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 leading-none mb-1">Modo de Auxilio à Equipe</h4>
            <p className="text-[11px] text-amber-200/70 font-medium">Você está visualizando as intimações para auxiliar no monitoramento e triagem dos advogados.</p>
          </div>
          <Badge className="bg-amber-500/20 text-amber-400 border-none px-3 font-bold">SECRETARIA / ESTAGIÁRIO</Badge>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/50 p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Central de Intimações
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            Sincronização em tempo real com diários oficiais e AASP.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fila Ativa:</span>
            <Select value={collectionName} onValueChange={(val) => {
              setLoading(true);
              setCollectionName(val);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="h-7 bg-transparent border-none text-xs font-black focus:ring-0 w-[160px] p-0 text-primary">
                <SelectValue placeholder="Selecionar Fila" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                <SelectItem value="intimacoes" className="text-xs font-bold">📂 Fila Geral (Todos)</SelectItem>
                <SelectItem value="intimacoes_natalia" className="text-xs font-bold">⚖️ Dra. Natalia</SelectItem>
                <SelectItem value="intimacoes_alan" className="text-xs font-bold">⚖️ Dr. Alan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={cn("bg-[#0f172a] border-white/10 shadow-lg relative overflow-hidden group cursor-pointer transition-all hover:bg-white/5", filter === 'unread' && "ring-1 ring-rose-500 shadow-[0_0_15px_rgba(243,24,73,0.3)] bg-rose-500/5")}
          onClick={() => changeFilter(filter === 'unread' ? 'all' : 'unread')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><AlertTriangle className="h-16 w-16" /></div>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <div className="text-3xl font-black text-rose-500">{unreadCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Não Lidas</div>
          </CardContent>
        </Card>
        <Card
          className={cn("bg-[#0f172a] border-white/10 shadow-lg relative overflow-hidden group cursor-pointer transition-all hover:bg-white/5", filter === 'read' && "ring-1 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-emerald-500/5")}
          onClick={() => changeFilter(filter === 'read' ? 'all' : 'read')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><CheckCircle2 className="h-16 w-16" /></div>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <div className="text-3xl font-black text-emerald-500">{readCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Lidas</div>
          </CardContent>
        </Card>
        <Card
          className={cn("bg-[#0f172a] border-white/10 shadow-lg relative overflow-hidden group cursor-pointer transition-all hover:bg-white/5", filter === 'no_process' && "ring-1 ring-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] bg-amber-500/5")}
          onClick={() => changeFilter(filter === 'no_process' ? 'all' : 'no_process')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Search className="h-16 w-16" /></div>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <div className="text-3xl font-black text-amber-500">{noProcessCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">S/ Processo</div>
          </CardContent>
        </Card>
        <Card
          className={cn("bg-[#0f172a] border-white/10 shadow-lg relative overflow-hidden group cursor-pointer transition-all hover:bg-white/5", filter === 'hearing' && "ring-1 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] bg-blue-500/5")}
          onClick={() => changeFilter(filter === 'hearing' ? 'all' : 'hearing')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Calendar className="h-16 w-16" /></div>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <div className="text-3xl font-black text-blue-400">{hearingCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Audiências</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 relative min-h-[400px]">
        {isFiltering && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Aplicando Filtro...</p>
          </div>
        )}

        {currentItems.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
              <p>Tudo em dia! Nenhuma intimação pendente no momento.</p>
            </CardContent>
          </Card>
        ) : (
          currentItems.map((item) => {
            const isUrgente = item.descricao?.toLowerCase().includes('prazo') || item.descricao?.toLowerCase().includes('audiência') || item.descricao?.toLowerCase().includes('urgente');

            if (viewMode === 'list') {
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetails(item)}
                  className={cn(
                    "flex flex-col md:flex-row md:items-center gap-4 py-3 px-5 rounded-xl border bg-[#0f172a]/80 hover:bg-[#1e293b]/80 transition-colors cursor-pointer group shadow-sm",
                    !item.lida && "border-l-4 border-l-primary bg-primary/[0.02]",
                    !item.processo && "border-l-4 border-l-amber-500",
                    isUrgente && !item.lida && "border-l-rose-500"
                  )}
                >
                  <div className="flex-1 space-y-1.5 md:max-w-[40%]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-[9px] py-0 border-white/10">{item.tipo}</Badge>
                      {item.processo ? (
                        <Badge variant="default" className="font-mono text-[9px] py-0 bg-blue-500/10 text-blue-400 border border-blue-500/20">{item.processo}</Badge>
                      ) : (
                        <Badge variant="destructive" className="font-mono text-[9px] py-0 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20">SEM PROCESSO</Badge>
                      )}
                      {!item.lida && <Badge className={cn("text-[8px] px-1.5 py-0 h-4", isUrgente ? "bg-rose-500 animate-pulse" : "bg-primary border-primary")}>NOVA</Badge>}
                    </div>
                    <p className="text-[13px] font-semibold text-white/90 line-clamp-1 group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {extractFullOrgao(item)}
                    </p>
                  </div>

                  <div className="hidden md:block w-px h-10 bg-white/5" />

                  <div className="flex-1 min-w-[200px]">
                    <p className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Resumo da Movimentação</p>
                    <p className="text-xs text-slate-300 line-clamp-1 mt-0.5 opacity-80 italic">"{item.descricao?.substring(0, 100) || 'Sem resumo'}..."</p>
                  </div>

                  <div className="hidden md:block w-px h-10 bg-white/5" />

                  <div className="flex items-center justify-between md:justify-end gap-6 min-w-[140px]">
                    <div className="flex flex-col md:items-end">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3" /> Disposição</p>
                      <p className="text-[11px] text-slate-200 mt-0.5 font-mono">{item.dataDisponibilizacao}</p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={togglingMap[item.id]}
                      className={cn("h-8 w-8 rounded-full border-white/5 border bg-white/5 hover:bg-primary/20", item.lida ? "opacity-30" : "text-primary")}
                      onClick={(e) => toggleRead(e, item.id, item.lida)}
                    >
                      {togglingMap[item.id] ? <Clock className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <Card
                key={item.id}
                onClick={() => handleOpenDetails(item)}
                className={cn(
                  "transition-all duration-200 hover:shadow-md cursor-pointer group",
                  !item.lida && "border-l-4 border-l-primary bg-primary/[0.02]",
                  !item.processo && "border-l-4 border-l-amber-500 bg-amber-500/[0.02]",
                  isUrgente && !item.lida && "border-l-rose-500"
                )}
              >
                <CardHeader className="pb-3 px-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs font-bold uppercase tracking-wider">
                          {item.tipo}
                        </Badge>
                        {item.processo ? (
                          <Badge variant="default" className="font-mono bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-800">
                            {item.processo}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600">
                            <AlertTriangle className="w-3 h-3" />
                            Sem Processo
                          </Badge>
                        )}
                        {!item.lida && (
                          <Badge variant="default" className={cn(isUrgente ? "bg-rose-500 hover:bg-rose-600 animate-pulse" : "animate-pulse")}>
                            {isUrgente ? 'Prioridade' : 'Nova'}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-semibold leading-tight pt-2 flex items-center gap-2 group-hover:text-primary transition-colors pr-4">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        {extractFullOrgao(item)}
                      </CardTitle>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                      <Calendar className="w-3 h-3" />
                      Disp: {item.dataDisponibilizacao}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-6 pb-4">
                  <div className="relative">
                    <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2 italic">
                      "{item.descricao?.substring(0, 200) || 'Conteúdo não disponibilizado no feed.'}..."
                    </p>
                    <div className="pt-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={togglingMap[item.id]}
                          className={cn("h-8 text-xs px-2", item.lida ? "opacity-30" : "text-primary hover:bg-primary/10")}
                          onClick={(e) => toggleRead(e, item.id, item.lida)}
                        >
                          {togglingMap[item.id] ? <Clock className="w-3 h-3 animate-spin mr-1" /> : null}
                          {item.lida ? 'Marcar não lida' : 'Marcar lida'}
                        </Button>

                        {item.processo && (
                          <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                            <CheckCircle2 className="w-3 h-3" />
                            Identificado
                          </div>
                        )}
                      </div>

                      <Button variant="outline" size="sm" className="h-8 text-xs font-semibold">
                        Ver Íntegra
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button variant="outline" className="h-9 px-4 text-xs font-bold uppercase tracking-widest border-white/10 bg-black/40 hover:bg-white/10" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white/5 px-4 py-2 rounded-lg border border-white/5">Página {currentPage} de {totalPages}</span>
          <Button variant="outline" className="h-9 px-4 text-xs font-bold uppercase tracking-widest border-white/10 bg-black/40 hover:bg-white/10" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próxima</Button>
        </div>
      )}

      <IntimacaoDetailsDialog
        item={selectedIntimacao}
        open={!!selectedIntimacao}
        onOpenChange={(open) => !open && setSelectedIntimacao(null)}
      />
    </div>
  );
}
