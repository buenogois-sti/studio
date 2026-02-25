
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  MapPin, 
  MessageCircle, 
  Star, 
  Briefcase, 
  Clock, 
  Shield, 
  HeartHandshake, 
  Landmark, 
  FileText, 
  Users, 
  Handshake, 
  Building, 
  ChevronRight, 
  ArrowRight, 
  Sparkles, 
  Target, 
  Quote, 
  CheckCircle2,
  Instagram,
  AtSign,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { WhatsAppFloating } from '@/components/WhatsAppFloating';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

function LandingLogo({ className }: { className?: string }) {
    return (
      <div className={className}>
        <Link href="/" className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Bueno Góis Advogados" 
              className="h-14 w-auto md:h-20"
            />
        </Link>
      </div>
    );
}

const services = [
    {
      icon: Briefcase,
      title: 'Rescisão de Contrato',
      description: 'Defendo casos de demissão sem justa causa, demissão por justa causa, pedido de demissão e rescisão indireta. Garanto o pagamento correto de todas as verbas.',
    },
    {
      icon: Clock,
      title: 'Horas Extras',
      description: 'Reivindico horas extras não pagas, adicional noturno, trabalho em feriados e domingos. Calculo corretamente todos os valores devidos.',
    },
    {
      icon: Shield,
      title: 'Assédio Moral',
      description: 'Defendo casos de assédio moral, assédio sexual, discriminação e danos morais no trabalho. Protejo sua dignidade e garanto indenizações justas.',
    },
    {
      icon: HeartHandshake,
      title: 'Acidentes de Trabalho',
      description: 'Atuo em casos de acidentes de trabalho, doenças ocupacionais e responsabilidade do empregador. Garanto todos os benefícios previdenciários.',
    },
    {
      icon: Landmark,
      title: 'FGTS e Benefícios',
      description: 'Reivindico depósitos FGTS não realizados, correção de valores e benefícios previdenciários. Garanto que você receba todos os direitos devidos.',
    },
    {
      icon: FileText,
      title: 'Verbas Rescisórias',
      description: 'Garanto o pagamento correto de férias, 13º salário, aviso prévio, multa do FGTS e outras verbas. Calculo todos os valores devidos.',
    },
    {
      icon: Users,
      title: 'Reconhecimento de Vínculo',
      description: 'Defendo reconhecimento de vínculo empregatício em casos de trabalho informal, terceirização irregular e falsa cooperativa.',
    },
    {
      icon: Handshake,
      title: 'Adicionais e Benefícios',
      description: 'Reivindico adicionais de insalubridade, periculosidade, transferência, gratificações e outros benefícios trabalhistas.',
    },
    {
      icon: Building,
      title: 'Direito Coletivo',
      description: 'Atuo em ações coletivas, dissídios coletivos, negociações sindicais e acordos coletivos. Defendo os interesses dos trabalhadores.',
    },
]

const testimonials = [
    {
        name: 'Ana Paula Santos',
        text: 'Olha, vou falar a verdade: achei que ia perder tudo. Fui mandada embora grávida e tava desesperada. O Dr. Alan e a equipe dele foram anjos na minha vida. Resolveram meu caso e hoje meu filho tem o que precisa. Só gratidão!',
    },
    {
        name: 'Roberto Oliveira',
        text: 'Tava há 3 meses sem receber e a empresa só me enrolando. Fui na Bueno Gois e no primeiro papo já senti confiança. Não é só sobre dinheiro, é sobre respeito. O pessoal luta pela gente de verdade. Nota 10!',
    },
    {
        name: 'Maria Fernanda Costa',
        text: 'Trabalhei feito doida fazendo hora extra que nunca via a cor do dinheiro. Eles botaram tudo no papel e ganharam a causa. São brutos na justiça mas muito humanos com a gente. Recomendo pra todo mundo que tá sendo injustiçado.',
    },
    {
        name: 'João Carlos Lima',
        text: 'Sofri um acidente feio na fábrica e me descartaram como se eu fosse lixo. Esse escritório me devolveru a dignidade. O processo demorou o tempo da justiça, mas eles nunca me deixaram sem resposta. Pode confiar sem medo.',
    },
    {
        name: 'Eliana Mendes',
        text: 'Gente, eu tava perdida! Meu patrão me mandou embora e não queria pagar nada. O pessoal da Bueno Gois resolveu tudo tão rápido que nem acreditei. Hoje durmo tranquila com meus direitos no bolso.',
    }
]

function useIntersectionObserver(options?: IntersectionObserverInit) {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, optionsRef.current);

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref]);

  return [setRef, isIntersecting] as const;
}

const ParallaxLayer = React.memo(({ children, speed = 1, className = '' }: { children: React.ReactNode; speed?: number; className?: string }) => {
  return (
    <div 
      className={cn("will-change-transform", className)} 
      style={{ 
        transform: `translateY(calc(var(--scroll-y, 0) * ${speed}))`,
      }}
    >
      {children}
    </div>
  );
});
ParallaxLayer.displayName = 'ParallaxLayer';

const AnimatedSection = React.memo(({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const [ref, isIntersecting] = useIntersectionObserver();

  return (
    <div
      ref={ref as any}
      className={cn(
        "transition-all duration-700 ease-out",
        isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
});
AnimatedSection.displayName = 'AnimatedSection';

const FloatingParticles = React.memo(() => {
  const particles = useMemo(() => 
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      size: Math.random() * 2 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 15 + 10,
      delay: i * 0.5,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-primary/30 will-change-transform"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animation: `float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); opacity: 0.3; }
          50% { transform: translate(-10px, 10px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
});
FloatingParticles.displayName = 'FloatingParticles';

const AnimatedGradientBg = React.memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-transparent rounded-full blur-3xl opacity-40" />
    <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-bl from-primary/5 via-transparent to-transparent rounded-full blur-2xl opacity-40" />
  </div>
));
AnimatedGradientBg.displayName = 'AnimatedGradientBg';

export function LandingClient({ initialSettings, initialSeo }: { initialSettings: any, initialSeo: any }) {
  const { firestore } = useFirebase();
  const [headerBg, setHeaderBg] = useState(false);
  const whatsappUrl = "https://wa.me/5511980590128?text=Olá!%20Vi%20o%20site%20da%20Bueno%20Gois%20Advogados%20e%20gostaria%20de%20saber%20mais%20sobre%20seus%20serviços.";

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system_settings', 'general') : null, [firestore]);
  const { data: settings } = useDoc<any>(settingsRef);
  
  const currentSettings = settings || initialSettings;
  const instagramUrl = currentSettings?.instagram || "https://www.instagram.com/buenogoisadvogado/";

  useEffect(() => {
    let rafId: number;
    let lastScrollY = 0;
    const root = document.documentElement;

    const handleScroll = () => {
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (Math.abs(scrollY - lastScrollY) < 10) return; // Debounce manual de 10px
        
        lastScrollY = scrollY;
        root.style.setProperty('--scroll-y', `${scrollY}px`);
        
        const isPastThreshold = scrollY > 50;
        setHeaderBg((prev) => prev !== isPastThreshold ? isPastThreshold : prev);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="bg-background text-foreground font-body overflow-x-hidden antialiased">
      <header className={cn(
        "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
        headerBg ? "bg-[#030712]/95 backdrop-blur-xl border-b border-white/5 py-2" : "bg-transparent py-4"
      )}>
        <div className="container mx-auto flex items-center justify-between px-4 text-white">
          <LandingLogo />
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            {['Início', 'Serviços', 'Sobre', 'Depoimentos', 'Contato'].map(item => (
              <Link key={item} href={`#${item.toLowerCase()}`} className="hover:text-primary transition-all duration-300 hover:scale-110 relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link href={instagramUrl} target="_blank" className="text-white hover:text-primary transition-all duration-300 hover:scale-110 p-2" aria-label="Siga-nos no Instagram">
              <Instagram className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        <section id="inicio" className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#152c4b] via-[#1a3557] to-[#152c4b]">
          <FloatingParticles />
          <div className="container mx-auto relative z-10 pt-32 pb-20 px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <AnimatedSection delay={200} className="relative">
                <div className="relative h-[600px] flex items-center justify-center">
                  <ParallaxLayer speed={0.03} className="w-full">
                    <div className="relative h-[600px]">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-3xl" />
                      <img
                        src="/lawyer-portrait.png"
                        alt="Dr. Alan Bueno De Gois"
                        width={500}
                        height={600}
                        className="relative object-contain object-bottom filter drop-shadow-[0_35px_60px_rgba(245,208,48,0.3)] mx-auto"
                        loading="eager"
                      />
                    </div>
                  </ParallaxLayer>
                </div>
              </AnimatedSection>
              <AnimatedSection className="space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-sm font-bold text-primary">+10 Anos de Experiência</span>
                </div>
                <h1 className="font-headline text-5xl md:text-6xl xl:text-7xl font-bold leading-tight text-white">Defenda <span className="text-primary">Seus Direitos</span> Trabalhistas</h1>
                <p className="text-xl text-white/90 max-w-2xl leading-relaxed text-justify">Advocacia trabalhista especializada em <span className="text-primary font-semibold">rescisão de contrato</span>, <span className="text-primary font-semibold">horas extras</span> e <span className="text-primary font-semibold">assédio moral</span>.</p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base py-7 px-8 rounded-xl shadow-[0_20px_60px_rgba(245,208,48,0.4)] transition-all duration-300 hover:scale-105" asChild>
                    <Link href={whatsappUrl} target="_blank"><MessageCircle className="mr-3 h-5 w-5" /> Consulta Gratuita <ArrowRight className="ml-3 h-5 w-5" /></Link>
                  </Button>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        <section id="servicos" className="relative py-40 bg-white overflow-hidden">
          <AnimatedGradientBg />
          <div className="container mx-auto relative z-10 px-4">
            <AnimatedSection className="text-center mb-16">
              <h2 className="font-headline text-4xl md:text-5xl font-bold text-gray-900 mb-6">Serviços Jurídicos</h2>
              <div className="w-24 h-1.5 bg-primary mx-auto mb-6 rounded-full" />
            </AnimatedSection>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <AnimatedSection key={index} delay={index * 50}>
                  <Card className="group relative bg-white border-2 border-gray-150 p-8 flex flex-col h-full hover:border-primary/40 transition-all duration-300 hover:shadow-2xl cursor-pointer shadow-sm">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary transition-all duration-300"><service.icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors" /></div>
                    <h3 className="font-headline text-2xl font-bold text-gray-900 mb-4">{service.title}</h3>
                    <p className="text-gray-600 flex-grow leading-relaxed mb-6 text-justify">{service.description}</p>
                    <Link href={whatsappUrl} target="_blank" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#152c4b] text-white font-semibold rounded-lg hover:bg-[#1a3659] transition-all">Consultar Gratuitamente <ChevronRight className="h-5 w-5" /></Link>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative bg-[#020617] text-white pt-20 pb-10 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 text-center md:text-left">
            <div className="space-y-6">
              <LandingLogo />
              <p className="text-sm text-slate-400 leading-relaxed">
                Justiça e excelência na defesa dos direitos do trabalhador. Atendimento estratégico e humanizado em São Bernardo do Campo.
              </p>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Contato Direto</h4>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-center justify-center md:justify-start gap-3">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <span>(11) 98059-0128</span>
                </li>
                <li className="flex items-center justify-center md:justify-start gap-3">
                  <AtSign className="h-4 w-4 text-primary" />
                  <span>contato@buenogoisadvogado.com.br</span>
                </li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Localização</h4>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-start justify-center md:justify-start gap-3">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <span>Rua Marechal Deodoro, 1594 - Sala 2<br />Centro, São Bernardo do Campo - SP<br />CEP 09715-070</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              &copy; {new Date().getFullYear()} {currentSettings?.officeName || 'Bueno Gois Advogados e Associados'}
            </p>
            <div className="flex items-center gap-6">
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">OAB/SP 00.000</span>
              <Link href="/login" className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors border border-white/10 px-3 py-1 rounded">Acesso Restrito</Link>
            </div>
          </div>
        </div>
      </footer>

      <WhatsAppFloating
        phoneNumber="5511980590128"
        message="Olá! Vi o site da Bueno Gois Advogados e gostaria de saber mais sobre os serviços de advocacia trabalhista."
        welcomeMessage="Olá! 👋 Sou da Bueno Gois Advogados. Como posso ajudar hoje?"
        userName="Bueno Gois Adv."
        delay={2500}
        autoHideDelay={10000}
      />
    </div>
  );
}
