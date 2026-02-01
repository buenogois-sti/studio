'use client';

import { Logo } from '@/components/logo';
import { Scale, Briefcase, FileText, DollarSign } from 'lucide-react';

const FloatingIcon = ({ icon: Icon, className, style }: { icon: React.ElementType, className?: string, style?: React.CSSProperties }) => (
    <div className={`absolute text-primary/5 ${className}`} style={style}>
        <Icon className="h-full w-full" />
    </div>
);

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col p-10 text-white lg:flex overflow-hidden">
        {/* Background Gradient & Animated Shapes */}
        <div className="absolute inset-0 bg-gradient-to-br from-card via-background to-background" />
        <div className="absolute inset-0 z-0">
            <Scale className="absolute -top-20 -left-20 h-[30rem] w-[30rem] text-primary/5 opacity-50 animate-spin-slow" />
            <FloatingIcon icon={Briefcase} className="h-16 w-16 top-1/4 left-1/4 animate-float" />
            <FloatingIcon icon={FileText} className="h-24 w-24 top-1/2 right-1/4 animate-float" style={{ animationDelay: '2s' }} />
            <FloatingIcon icon={DollarSign} className="h-20 w-20 bottom-1/4 left-1/3 animate-float" style={{ animationDelay: '4s' }} />
        </div>

        {/* Content */}
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Logo className="mr-2 h-10 w-10" />
          Dr. Alan Bueno De Gois
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2 rounded-lg bg-black/20 backdrop-blur-sm p-6 border border-primary/20">
            <p className="text-lg font-headline">
              &ldquo;A plataforma de gestão que centraliza nossas operações e otimiza o atendimento ao cliente com tecnologia e eficiência.&rdquo;
            </p>
            <footer className="text-sm font-semibold text-primary">Equipe Jurídica</footer>
          </blockquote>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 h-full bg-background/95">
        {children}
      </div>
    </div>
  );
}
