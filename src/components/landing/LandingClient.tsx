
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Scale,
  AtSign,
  ShieldCheck,
  Lock,
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
        text: 'Sofri um acidente feio na fábrica e me descartaram como se eu fosse lixo. Esse escritório me devolveu a dignidade. O processo demorou o tempo da justiça, mas eles nunca me deixaram sem resposta. Pode confiar sem medo.',
    },
    {
        name: 'Eliana Mendes',
        text: 'Gente, eu tava perdida! Meu patrão me mandou embora e não queria pagar nada. O pessoal da Bueno Gois resolveu tudo tão rápido que nem acreditei. Hoje durmo tranquila com meus direitos no bolso.',
    }
]

function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    let rafId: number;
    let lastScrollY = 0;

    const handleScroll = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      rafId = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        if (Math.abs(currentScrollY - lastScrollY) > 10) {
          setScrollPosition(currentScrollY);
          lastScrollY = currentScrollY;
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return scrollPosition;
}

function useIntersectionObserver(options = {}) {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, { threshold: 0.1, ...options });

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, options]);

  return [setRef, isIntersecting] as const;
}

const ParallaxLayer = React.memo(({ children, speed = 1, className = '' }: { children: React.ReactNode; speed?: number; className?: string }) => {
  const scrollY = useScrollPosition();
  const transform = useMemo(() => `translateY(${Math.round(scrollY * speed * 10) / 10}px)`, [scrollY, speed]);

  return (
    <div className={className} style={{ transform, willChange: 'transform' }}>
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
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 15 + 10,
      delay: i * 0.5,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
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
          0%, 100% { transform: translate(0, 0); opacity: 0.4; }
          50% { transform: translate(-15px, 15px); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
});
FloatingParticles.displayName = 'FloatingParticles';

const AnimatedGradientBg = React.memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-full blur-3xl opacity-50" />
    <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-bl from-primary/5 via-transparent to-transparent rounded-full blur-2xl opacity-60" />
  </div>
));
AnimatedGradientBg.displayName = 'AnimatedGradientBg';

export function LandingClient({ initialSettings, initialSeo }: { initialSettings: any, initialSeo: any }) {
  const scrollY = useScrollPosition();
  const { firestore } = useFirebase();
  const whatsappUrl = "https://wa.me/5511980590128?text=Olá!%20Vi%20o%20site%20da%20Bueno%20Gois%20Advogados%20e%20gostaria%20de%20saber%20mais%20sobre%20seus%20serviços.";

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system_settings', 'general') : null, [firestore]);
  const { data: settings } = useDoc<any>(settingsRef);
  
  const currentSettings = settings || initialSettings;
  const instagramUrl = currentSettings?.instagram || "https://www.instagram.com/buenogoisadvogado/";

  return (
    <div className="bg-background text-foreground font-body overflow-x-hidden antialiased">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          background: scrollY > 50 ? 'rgba(3, 7, 18, 0.95)' : 'transparent',
          backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 50 ? '1px solid rgba(245, 208, 48, 0.1)' : 'none',
        }}
      >
        <div className="container mx-auto flex items-center justify-between p-4 text-white">
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
            <Link 
              href={instagramUrl} 
              target="_blank" 
              className="text-white hover:text-primary transition-all duration-300 hover:scale-110 p-2" 
              aria-label="Siga-nos no Instagram"
            >
              <Instagram className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        <section id="inicio" className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#152c4b] via-[#1a3557] to-[#152c4b]">
          <FloatingParticles />
          
          <div className="container mx-auto relative z-10 pt-32 pb-20 px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <AnimatedSection delay={200} className="relative">
                <div className="relative h-[600px]">
                  <ParallaxLayer speed={0.05}>
                    <div className="relative h-[600px]">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-3xl" />
                      <img
                        src="/lawyer-portrait.png"
                        alt="Dr. Alan Bueno De Gois - Advogado Trabalhista Especialista em SBC"
                        width={500}
                        height={600}
                        className="relative object-contain object-bottom filter drop-shadow-[0_35px_60px_rgba(245,208,48,0.3)]"
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

                <h1 className="font-headline text-5xl md:text-6xl xl:text-7xl font-bold leading-tight text-white">
                  Defenda <span className="text-primary">Seus</span>
                  <br />
                  <span className="text-primary">Direitos</span>
                  <br />
                  Trabalhistas
                </h1>

                <p className="text-xl text-white/90 max-w-2xl leading-relaxed text-justify">
                  Advocacia trabalhista especializada em <span className="text-primary font-semibold">rescisão de contrato</span>, <span className="text-primary font-semibold">horas extras</span> e <span className="text-primary font-semibold">assédio moral</span>. Atendimento especializado em São Bernardo do Campo.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Button 
                    size="lg" 
                    className="group bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base py-7 px-8 rounded-xl shadow-[0_20px_60px_rgba(245,208,48,0.4)] transition-all duration-300 hover:scale-105"
                    asChild
                  >
                    <Link href={whatsappUrl} target="_blank">
                      <MessageCircle className="mr-3 h-5 w-5 group-hover:rotate-12 transition-transform" />
                      Consulta Gratuita
                      <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="group border-2 border-primary/30 bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary font-bold text-base py-7 px-8 rounded-xl transition-all duration-300 hover:scale-105"
                    asChild
                  >
                    <Link href={whatsappUrl} target="_blank">
                      <Phone className="mr-3 h-5 w-5 group-hover:rotate-12 transition-transform" />
                      (11) 2897-5218
                    </Link>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-8 text-sm text-white/80">
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span>Rua Marechal Deodoro, 1594 - SBC/SP</span></div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span>Atendimento Jurídico Especializado</span></div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        <section id="servicos" className="relative py-40 bg-white overflow-hidden">
          <AnimatedGradientBg />
          <div className="container mx-auto relative z-10 px-4">
            <AnimatedSection className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Especialidades</span>
              </div>
              <h2 className="font-headline text-4xl md:text-5xl font-bold text-gray-900 mb-6">Principais Serviços Jurídicos</h2>
              <div className="w-24 h-1.5 bg-primary mx-auto mb-6 rounded-full" />
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">Proteção integral para os seus direitos trabalhistas com foco em resultados.</p>
            </AnimatedSection>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <AnimatedSection key={index} delay={index * 100}>
                    <Card className="group relative bg-white border-2 border-gray-150 p-8 flex flex-col h-full hover:border-primary/40 transition-all duration-300 hover:shadow-2xl cursor-pointer shadow-sm">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary transition-all duration-300">
                        <Icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <h3 className="font-headline text-2xl font-bold text-gray-900 mb-4">{service.title}</h3>
                      <p className="text-gray-600 flex-grow leading-relaxed mb-6 text-justify">{service.description}</p>
                      <Link href={whatsappUrl} target="_blank" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#152c4b] text-white font-semibold rounded-lg hover:bg-[#1a3659] transition-all">
                        Consultar Gratuitamente <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Card>
                  </AnimatedSection>
                );
              })}
            </div>
          </div>
        </section>

        <section id="sobre" className="relative py-40 bg-gray-50 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <AnimatedSection>
                  <h2 className="font-headline text-4xl md:text-5xl font-bold text-gray-900">Bueno Gois Advogados<br /><span className="text-primary">Excelência Jurídica em SBC</span></h2>
                </AnimatedSection>
                <AnimatedSection delay={100}>
                  <div className="pl-6 border-l-4 border-primary bg-primary/5 p-6 rounded-r-xl">
                    <p className="italic text-primary text-xl mb-2 font-bold">&ldquo;Contra iniuriam, pro iustitia operarii&rdquo;</p>
                    <p className="text-gray-700 text-sm font-medium uppercase tracking-wider">Justiça para o trabalhador acima de tudo.</p>
                  </div>
                </AnimatedSection>
                <p className="text-lg text-gray-600 leading-relaxed text-justify">Somos um escritório com foco exclusivo na defesa do trabalhador, aliando tecnologia e experiênca para garantir resultados sólidos e proteção aos seus direitos fundamentais.</p>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-7 px-8 rounded-xl shadow-lg transition-all hover:scale-105" asChild>
                  <Link href={whatsappUrl} target="_blank"><MessageCircle className="mr-3 h-5 w-5" /> Fale com um Especialista</Link>
                </Button>
              </div>
              <AnimatedSection delay={150}>
                <div className="relative h-[550px] w-full rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
                  <img src="/lawyer-action.jpg" alt="Equipe Bueno Gois Advogados em Atendimento" className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#152c4b]/80 to-transparent" />
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        <section id="depoimentos" className="relative py-40 bg-[#0b1324] overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <AnimatedSection className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Voz do Cliente</span>
              </div>
              <h2 className="font-headline text-4xl md:text-5xl font-bold text-white mb-6">Histórias de Sucesso</h2>
              <div className="w-24 h-1.5 bg-primary mx-auto mb-6 rounded-full" />
              <p className="text-xl text-slate-400 max-w-3xl mx-auto">O que dizem aqueles que recuperaram seus direitos e dignidade conosco.</p>
            </AnimatedSection>

            <AnimatedSection delay={200} className="relative px-12">
              <Carousel 
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-4">
                  {testimonials.map((testimonial, index) => (
                    <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                      <Card className="bg-white/5 border-white/10 p-8 rounded-3xl h-full flex flex-col justify-between hover:border-primary/30 transition-all duration-300 relative group/card overflow-hidden">
                        <Quote className="absolute -top-4 -right-4 h-24 w-24 text-primary/5 group-hover/card:text-primary/10 transition-colors" />
                        <div className="space-y-6 relative z-10">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                            ))}
                          </div>
                          <p className="text-slate-200 italic leading-relaxed text-lg">
                            &ldquo;{testimonial.text}&rdquo;
                          </p>
                        </div>
                        <div className="mt-8 flex items-center gap-4 relative z-10">
                          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black border border-primary/30">
                            {testimonial.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white font-bold">{testimonial.name}</p>
                            <p className="text-[9px] text-primary font-black uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Cliente Verificado
                            </p>
                          </div>
                        </div>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="hidden lg:block">
                  <CarouselPrevious className="bg-white/5 border-white/10 text-white hover:bg-primary hover:text-primary-foreground -left-12" />
                  <CarouselNext className="bg-white/5 border-white/10 text-white hover:bg-primary hover:text-primary-foreground -right-12" />
                </div>
              </Carousel>
            </AnimatedSection>
          </div>
        </section>

        <section id="contato" className="relative py-40 bg-white overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-6xl mx-auto bg-gray-50 rounded-3xl shadow-2xl overflow-hidden grid lg:grid-cols-3">
              <div className="lg:col-span-2 h-[500px]">
                <iframe 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  title="Mapa de Localização Bueno Gois"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3644.684!2d-46.5556!3d-23.6936!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce4278d2c00001%3A0xa1b2c3d4e5f6!2sRua%20Marechal%20Deodoro%2C%201594%20-%20Sala%202%2C%20S%C3%A3o%20Bernardo%20do%20Campo%20-%20SP%2C%2009715-070!5e0!3m2!1spt-BR!2sbr!4v1701890000000" 
                  loading="lazy" 
                  className="grayscale hover:grayscale-0 transition-all duration-700" 
                />
              </div>
              <div className="p-12 bg-[#152c4b] text-white flex flex-col justify-center space-y-8">
                <h3 className="font-headline text-3xl font-bold">Contato Direto</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4"><MapPin className="w-6 h-6 text-primary shrink-0" /><p className="text-lg">Rua Marechal Deodoro, 1594 - SBC/SP</p></div>
                  <div className="flex items-start gap-4"><Phone className="w-6 h-6 text-primary shrink-0" /><p className="text-lg">(11) 2897-5218</p></div>
                  <div className="flex items-start gap-4"><MessageCircle className="w-6 h-6 text-primary shrink-0" /><p className="text-lg">(11) 98059-0128 | (11) 96085-6744</p></div>
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 shadow-xl shadow-primary/20" asChild>
                  <Link href={whatsappUrl} target="_blank">Falar no WhatsApp</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Evoluído */}
      <footer className="relative bg-[#020617] text-white pt-24 pb-12 border-t-2 border-primary/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
            
            {/* Coluna 1: Branding */}
            <div className="space-y-6">
              <div className="p-2 rounded-xl inline-block bg-[#152c4b] shadow-inner border border-white/5">
                <img src="/logo.png" alt="Bueno Gois" className="h-16 w-auto" />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed text-justify">
                {currentSettings?.officeName || 'Bueno Gois Advogados e Associados'}. 
                Especialistas em Direito do Trabalho, unindo tradição e tecnologia para proteger os direitos de quem constrói o país.
              </p>
              <div className="flex items-center gap-4">
                <Link href={instagramUrl} target="_blank" className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                  <Instagram className="h-6 w-6" />
                </Link>
                <Link href="#" className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                  <AtSign className="h-6 w-6" />
                </Link>
              </div>
            </div>

            {/* Coluna 2: Especialidades */}
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Especialidades
              </h4>
              <ul className="grid gap-3 text-sm text-slate-400 font-medium">
                {['Rescisão de Contrato', 'Horas Extras', 'Assédio no Trabalho', 'Acidente de Trabalho', 'Danos Morais'].map(item => (
                  <li key={item} className="hover:text-primary transition-colors flex items-center gap-2 group">
                    <ChevronRight className="h-3 w-3 text-primary/40 group-hover:translate-x-1 transition-transform" />
                    <Link href="#servicos">{item}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coluna 3: Links Rápidos */}
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <Building className="h-4 w-4" /> Escritório
              </h4>
              <ul className="grid gap-3 text-sm text-slate-400 font-medium">
                {['Início', 'Sobre Nós', 'Depoimentos', 'Localização'].map(item => (
                  <li key={item} className="hover:text-primary transition-colors flex items-center gap-2 group">
                    <ChevronRight className="h-3 w-3 text-primary/40 group-hover:translate-x-1 transition-transform" />
                    <Link href={`#${item.toLowerCase().replace(' ', '')}`}>{item}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coluna 4: Contato */}
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Contato
              </h4>
              <div className="space-y-4 text-sm text-slate-400">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <p className="leading-tight">
                    {currentSettings?.address || 'Rua Marechal Deodoro, 1594 - Sala 2, São Bernardo do Campo / SP'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <p className="font-bold text-white">(11) 2897-5218</p>
                </div>
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-primary shrink-0" />
                  <p className="font-bold text-white text-xs">011 9 8059-0128 | 011 96085-6744</p>
                </div>
                <div className="pt-4">
                  <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5 text-[9px] font-black uppercase py-1 px-3">
                    <CheckCircle2 className="h-3 w-3 mr-1.5" /> Atendimento Online Ativo
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <p>&copy; {new Date().getFullYear()} {currentSettings?.officeName || 'Bueno Gois Advogados e Associados'} </p>
            <div className="flex gap-8">
              <Link href="/login" className="hover:text-primary transition-colors flex items-center gap-1.5 group">
                <Lock className="h-3 w-3 opacity-50 group-hover:opacity-100" /> Área do Advogado
              </Link>
              <Link href="#" className="hover:text-primary transition-colors">Privacidade</Link>
              <p className="text-primary/40">Powered by LexFlow Elite</p>
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
