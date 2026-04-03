'use client';

import React from 'react';
import { IntimacoesFeed } from '@/components/notifications/IntimacoesFeed';
import { Bell, ShieldAlert } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

export default function IntimacoesPage() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="animate-in slide-in-from-left duration-500">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-primary/20 p-2 rounded-lg">
                <Bell className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Monitoramento AASP</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight font-headline text-white italic">
            Central de <span className="text-primary italic">Intimações</span>
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            Gestão automatizada de diários oficiais e prazos fatais.
          </p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-rose-500 tracking-widest leading-none">Status do Sistema</span>
                <span className="text-xs font-bold text-rose-400">Prazos em Monitoramento</span>
            </div>
        </div>
      </div>

      <div className="w-full">
        <IntimacoesFeed />
      </div>
    </div>
  );
}
