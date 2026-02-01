'use client';

import { Logo } from '@/components/logo';
import { Scale } from 'lucide-react';
import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col text-white lg:flex overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image 
            src="/login2.png"
            alt="Recepção Bueno Gois"
            fill
            className="object-cover"
            priority
            quality={95}
          />
          {/* Dark overlay for better text contrast */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-teal-950/70" />
        </div>
        
        {/* Content */}
                
        <div className="relative z-20 mt-auto p-10 animate-slide-up">
          <blockquote className="space-y-4 rounded-2xl bg-black/40 backdrop-blur-xl p-8 border border-white/20 shadow-2xl">
            <p className="text-lg font-headline leading-relaxed drop-shadow-md">
              &ldquo;Plataforma integrada de gestão jurídica com tecnologia e eficiência.&rdquo;
            </p>
            <footer className="text-sm font-semibold text-primary/90 pt-2">
              Sistema Interno
            </footer>
          </blockquote>
        </div>
      </div>
      
      <div className="relative flex items-center justify-center py-12 h-full bg-gradient-to-br from-slate-100 via-blue-50/50 to-teal-50/30 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
        {/* Decorative background patterns */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
        
        {/* Floating orbs */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 w-full max-w-md px-8 animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
