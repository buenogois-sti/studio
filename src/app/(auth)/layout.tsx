'use client';

import { Logo } from '@/components/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col p-10 text-white lg:flex overflow-hidden">
        {/* Background Gradient & Noise Texture */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-teal-950 noise-bg" />
        
        {/* Content */}
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Logo className="mr-2 h-10 w-10" />
          Bueno Gois Advogados e Associados
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2 rounded-lg bg-black/20 backdrop-blur-sm p-6 border border-primary/20">
            <p className="text-lg font-headline">
              &ldquo;A plataforma de gestão que centraliza nossas operações e otimiza o atendimento ao cliente com tecnologia e eficiência.&rdquo;
            </p>
            <footer className="text-sm font-semibold text-primary">Bueno Gois Advogados e Associados</footer>
          </blockquote>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 h-full bg-background/95">
        {children}
      </div>
    </div>
  );
}
