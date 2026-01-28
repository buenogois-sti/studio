'use client';

import { Logo } from '@/components/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Logo className="mr-2" />
          Dr. Alan Bueno De Gois
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;A plataforma de gestão que centraliza nossas operações e otimiza o atendimento ao cliente.&rdquo;
            </p>
            <footer className="text-sm">Equipe Jurídica</footer>
          </blockquote>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 h-full bg-background">
        {children}
      </div>
    </div>
  );
}
