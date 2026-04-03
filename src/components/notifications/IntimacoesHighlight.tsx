'use client';

import React from 'react';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { Intimacao } from '@/lib/types';
import { AlertCircle, ArrowRight, Bell, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn, extractSortDate } from '@/lib/utils';

export function IntimacoesHighlight() {
  const { firestore, isUserLoading, user } = useFirebase();
  
  const unreadQuery = React.useMemo(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
      collection(firestore, 'intimacoes'),
      limit(50)
    );
  }, [firestore, isUserLoading, user]);

  const { data: allData, isLoading } = useCollection<Intimacao>(unreadQuery);
  const unreadIntimacoes = React.useMemo(() => {
     if (!allData) return [];
     const filtered = allData.filter(i => !i.lida);
     filtered.sort((a, b) => {
        const valA = extractSortDate(a);
        const valB = extractSortDate(b);
        return valB.localeCompare(valA);
     });
     return filtered;
  }, [allData]);

  if (isLoading || !unreadIntimacoes || unreadIntimacoes.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 animate-in slide-in-from-top duration-500">
      <Card className="border-2 border-primary/30 bg-primary/5 shadow-[0_0_20px_rgba(245,208,48,0.1)] overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row items-stretch">
            {/* Left side: Alert Info */}
            <div className="bg-primary/10 p-6 flex flex-col justify-center items-center text-center md:w-64 border-b md:border-b-0 md:border-r border-primary/20">
              <div className="relative">
                <Bell className="w-10 h-10 text-primary animate-bounce" />
                <Badge className="absolute -top-1 -right-1 h-6 min-w-[24px] flex items-center justify-center p-0 text-[10px] font-black border-2 border-[#0f172a]">
                  {unreadIntimacoes.length}
                </Badge>
              </div>
              <h3 className="mt-4 text-sm font-black uppercase tracking-widest text-primary">Intimações</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1">AÇÃO REQUERIDA</p>
            </div>

            {/* Right side: List & Action */}
            <div className="flex-1 p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-rose-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-tighter italic font-headline">Atenção aos Prazos Fatais!</span>
                </div>
                <div className="grid gap-2">
                  {unreadIntimacoes.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-black/40 border border-white/5 group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                        <p className="text-xs font-bold text-slate-200 truncate pr-4">
                          {item.orgao}: <span className="font-normal text-slate-400">"{item.descricao.substring(0, 100)}..."</span>
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 font-mono text-[9px] border-primary/20 text-primary/70">
                        {item.processo || 'S/ PROC'}
                      </Badge>
                    </div>
                  ))}
                  {unreadIntimacoes.length > 2 && (
                    <p className="text-[10px] text-slate-500 italic pl-1">
                      + {unreadIntimacoes.length - 2} outras intimações não lidas aguardando sua revisão.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-slate-400 hover:text-white" asChild>
                  <Link href="/dashboard/prazos">Ver no Calendário</Link>
                </Button>
                <Button size="sm" className="bg-primary text-primary-foreground font-black uppercase text-[10px] px-6 h-9 group shadow-lg shadow-primary/10" asChild>
                  <Link href="/dashboard/intimacoes" className="flex items-center gap-2">
                    Acessar Central de Intimações
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
