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
  Bell, 
  CheckCircle2, 
  ExternalLink, 
  Calendar,
  Building2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IntimacaoDetailsDialog } from './IntimacaoDetailsDialog';
import { useMemo } from 'react';

export function IntimacoesFeed() {
  const [intimacoes, setIntimacoes] = useState<Intimacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [selectedIntimacao, setSelectedIntimacao] = useState<Intimacao | null>(null);
  const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});

  const { user, isUserLoading } = useFirebase();

  useEffect(() => {
    if (isUserLoading || !user || !db) return;

    const q = query(
      collection(db, 'intimacoes'),
      orderBy('dataPublicacaoISO', 'desc'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Intimacao[];
      
      setIntimacoes(docs);
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error("Erro ao ler intimações:", error);
      setError("Não foi possível carregar as intimações. Verifique sua conexão e tente novamente.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isUserLoading]);

  const unreadCount = useMemo(() => intimacoes.filter(i => !i.lida).length, [intimacoes]);
  
  const filteredIntimacoes = useMemo(() => {
    return filter === 'unread' ? intimacoes.filter(i => !i.lida) : intimacoes;
  }, [filter, intimacoes]);

  const toggleRead = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation(); 
    if (togglingMap[id]) return;
    
    setTogglingMap(prev => ({ ...prev, [id]: true }));
    try {
      const docRef = doc(db, 'intimacoes', id);
      await updateDoc(docRef, { lida: !currentStatus });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    } finally {
      setTogglingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleOpenDetails = (item: Intimacao) => {
    setSelectedIntimacao(item);
    if (!item.lida) {
      const docRef = doc(db, 'intimacoes', item.id);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/50 p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Intimações AASP
          </h2>
          <p className="text-muted-foreground text-sm">
            Monitoramento automático de diários oficiais (n8n + AI)
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
          <Button 
            variant={filter === 'all' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setFilter('all')}
            className="h-8"
          >
            Todas
          </Button>
          <Button 
            variant={filter === 'unread' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setFilter('unread')}
            className={cn("h-8 flex items-center gap-2", filter === 'unread' && "text-primary")}
          >
            Não Lidas
            {unreadCount > 0 && (
              <Badge variant="default" className="px-1.5 min-w-[20px] h-5 justify-center">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredIntimacoes.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
              <p>Tudo em dia! Nenhuma intimação pendente no momento.</p>
            </CardContent>
          </Card>
        ) : (
          filteredIntimacoes.map((item) => {
            const isUrgente = item.descricao?.toLowerCase().includes('prazo') || item.descricao?.toLowerCase().includes('audiência') || item.descricao?.toLowerCase().includes('urgente');
            
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
                      <CardTitle className="text-base font-semibold leading-none pt-2 flex items-center gap-2 group-hover:text-primary transition-colors">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {item.orgao || 'Tribunal / Órgão não identificado'}
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

      <IntimacaoDetailsDialog 
        item={selectedIntimacao}
        open={!!selectedIntimacao}
        onOpenChange={(open) => !open && setSelectedIntimacao(null)}
      />
    </div>
  );
}
