'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <CardDescription>Ajuste o tema de aparência do sistema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-base font-semibold mb-4">Tema do Sistema</h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Light Theme */}
            <button
              onClick={() => setTheme('light')}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                theme === 'light'
                  ? 'border-amber-500 bg-amber-50/5'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="w-12 h-12 rounded bg-gradient-to-b from-white to-slate-100 border border-slate-200 flex items-center justify-center">
                <div className="text-xl">☀️</div>
              </div>
              <span className="text-sm font-medium">Claro</span>
              {theme === 'light' && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>

            {/* Dark Theme */}
            <button
              onClick={() => setTheme('dark')}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                theme === 'dark'
                  ? 'border-cyan-500 bg-cyan-50/5'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="w-12 h-12 rounded bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 flex items-center justify-center">
                <div className="text-xl">🌙</div>
              </div>
              <span className="text-sm font-medium">Escuro</span>
              {theme === 'dark' && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-500 rounded-full" />
              )}
            </button>

            {/* Auto Theme */}
            <button
              onClick={() => {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setTheme(prefersDark ? 'dark' : 'light');
              }}
              className="relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-slate-700 hover:border-slate-600 transition-all"
            >
              <div className="w-12 h-12 rounded bg-gradient-to-r from-slate-100 to-slate-800 border border-slate-600 flex items-center justify-center">
                <div className="text-xl">🔄</div>
              </div>
              <span className="text-sm font-medium">Automático</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700">
          <p className="text-sm text-slate-400">
            O tema será automaticamente sincronizado em todas as páginas do sistema. Sua escolha é salva localmente no navegador.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
