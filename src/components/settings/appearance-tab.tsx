'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export function AppearanceTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <CardDescription>Visualize as configurações de design do sistema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold">Tema Unificado</p>
            <p className="text-xs">
              O sistema utiliza exclusivamente o tema Bueno Gois Premium (Light Mode) para garantir 
              a consistência da marca e máxima legibilidade documental.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Paleta Ativa</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-12 w-full rounded-lg bg-primary border" />
              <p className="text-[10px] font-bold text-center">Primary (Gold)</p>
            </div>
            <div className="space-y-2">
              <div className="h-12 w-full rounded-lg bg-slate-900 border" />
              <p className="text-[10px] font-bold text-center">Navy</p>
            </div>
            <div className="space-y-2">
              <div className="h-12 w-full rounded-lg bg-white border" />
              <p className="text-[10px] font-bold text-center">Background</p>
            </div>
            <div className="space-y-2">
              <div className="h-12 w-full rounded-lg bg-muted border" />
              <p className="text-[10px] font-bold text-center">Muted</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
