'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Phone, MapPin, MessageCircle, Scale, Star, Briefcase, Clock, Shield, HeartHandshake, Landmark, FileText, Users, Handshake, Building, ChevronRight, ArrowRight, Sparkles, Award, TrendingUp, Target } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function LandingLogo({ className }: { className?: string }) {
    return (
      <div className={className}>
        <Link href="/" className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground h-10 w-10 flex items-center justify-center rounded-md">
                <Scale size={44} />
            </div>
             <span className="font-bold text-lg text-white whitespace-nowrap">
              Dr. Alan Bueno De Gois
            </span>
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
        text: 'O Dr. Alan é incrível! Conseguiu recuperar todas as minhas verbas rescisórias que a empresa não queria pagar. Muito profissional e atencioso. Recomendo para todos que precisam de um advogado trabalhista de confiança!',
        avatar: '/image/testimonial-1.jpg',
        avatarHint: 'person happy'
    },
    {
        name: 'Roberto Oliveira',
        text: 'Super recomendo! O Dr. Alan resolveu meu caso de assédio moral rapidamente. Tava sofrendo muito no trabalho e ele conseguiu uma indenização justa. Definitivamente o melhor advogado trabalhista que já conheci!',
        avatar: '/image/testimonial-2.jpg',
        avatarHint: 'person happy'
    },
    {
        name: 'Maria Fernanda Costa',
        text: 'Nossa, o Dr. Alan salvou minha vida! Tava sendo demitida sem justa causa e ele conseguiu reverter tudo. Profissionalismo total e dedicação de verdade. Agradeço demais pelo trabalho que ele fez. Recomendo pra todo mundo!',
        avatar: '/image/testimonial-3.jpg',
        avatarHint: 'person happy'
    },
]

// Custom Hooks
function useMousePosition() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return mousePosition;
}

function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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

// Animated Components
function ParallaxLayer({ children, speed = 1, className = '' }: { children: React.ReactNode; speed?: number; className?: string }) {
  const scrollY = useScrollPosition();
  const transform = `translateY(${scrollY * speed}px)`;

  return (
    <div className={className} style={{ transform, willChange: 'transform' }}>
      {children}
    </div>
  );
}

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [ref, isIntersecting] = useIntersectionObserver();

  return (
    <div
      ref={ref as any}
      className={`transition-all duration-1000 ease-out ${
        isIntersecting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-primary/20"
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
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          25% { transform: translate(20px, -20px) scale(1.1); opacity: 0.8; }
          50% { transform: translate(-20px, 20px) scale(0.9); opacity: 0.6; }
          75% { transform: translate(20px, 10px) scale(1.05); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

function AnimatedGradientBg() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-bl from-accent/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-gradient-to-tr from-primary/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
    </div>
  );
}

function TypewriterEffect({ text, speed = 50 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(currentIndex + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return <span>{displayedText}<span className="animate-pulse">|</span></span>;
}

function StatsCounter({ end, duration = 2000, suffix = '', prefix = '' }: { end: number; duration?: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const [ref, isIntersecting] = useIntersectionObserver();
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!isIntersecting || hasAnimated) return;
    
    setHasAnimated(true);
    const steps = 60;
    const stepValue = end / steps;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep <= steps) {
        setCount(Math.floor(stepValue * currentStep));
      } else {
        setCount(end);
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isIntersecting, end, duration, hasAnimated]);

  return (
    <span ref={ref as any}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

export default function LandingPage() {
  const mousePosition = useMousePosition();
  const scrollY = useScrollPosition();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="bg-background text-foreground font-body overflow-x-hidden">
      {/* Custom Cursor Effect */}
      <div 
        className="fixed w-6 h-6 border-2 border-primary rounded-full pointer-events-none z-50 mix-blend-difference transition-transform duration-100 ease-out hidden lg:block"
        style={{
          left: `${mousePosition.x}px`,
          top: `${mousePosition.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      />
      
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
            <Link href="#inicio" className="hover:text-primary transition-all duration-300 hover:scale-110 relative group">
              Início
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link href="#servicos" className="hover:text-primary transition-all duration-300 hover:scale-110 relative group">
              Serviços
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link href="#sobre" className="hover:text-primary transition-all duration-300 hover:scale-110 relative group">
              Sobre
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link href="#depoimentos" className="hover:text-primary transition-all duration-300 hover:scale-110 relative group">
              Depoimentos
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link href="#contato" className="hover:text-primary transition-all duration-300 hover:scale-110 relative group">
              Contato
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          </nav>
          <Button 
            asChild 
            variant="outline" 
            className="hidden md:flex bg-transparent border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/50"
          >
            <Link href="/login">Área ADV</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative"
      >
        {/* Hero Section */}
        <section id="inicio" className="relative overflow-hidden">
          <div className="absolute inset-0 bg-background z-0">
             <div className="absolute bottom-0 left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[100px]" />
          </div>
          <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center pt-20 pb-28 relative z-10">
            <div className="space-y-6">
              <h1 className="font-headline text-4xl md:text-5xl xl:text-5xl font-bold leading-tight text-white">
                Advogado Trabalhista em São Bernardo do Campo - Defenda Seus Direitos com <span className="relative inline-block">Especialista<span className="absolute -bottom-2 left-0 w-full h-1 bg-primary" /></span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Advogado trabalhista com mais de 10 anos de experiência em{' '}
                <a href="#servicos" className="text-primary/80 hover:text-primary transition-colors underline">
                    direitos trabalhistas
                </a>
                . Atendo casos de {' '}
                <a href="#servicos" className="text-primary/80 hover:text-primary transition-colors underline">
                    rescisão de contrato
                </a>
                , {' '}
                <a href="#servicos" className="text-primary/80 hover:text-primary transition-colors underline">
                    horas extras
                </a>
                , {' '}
                <a href="#servicos" className="text-primary/80 hover:text-primary transition-colors underline">
                    assédio moral
                </a> e todos os seus direitos trabalhistas em São Bernardo do Campo.
              </p>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base py-7 px-8 rounded-lg shadow-[0_8px_30px_rgb(245_208_48_/_30%)] transition-transform transform hover:scale-105">
                <MessageCircle className="mr-3 h-5 w-5" />
                Consultar Gratuitamente
              </Button>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Rua Marechal Deodoro, 1594 - Sala 2, São Bernardo do Campo / SP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>(11) 98059-0128</span>
                </div>
              </div>
            </div>
             <div className="relative -mr-32 hidden lg:block h-[550px]">
               <img
                src="/lawyer-portrait.png"
                alt="Dr. Alan Bueno De Gois - Advogado especialista em direito trabalhista"
                width={700}
                height={750}
                className="object-contain object-bottom filter drop-shadow-[0_25px_25px_rgba(0,0,0,0.6)]"
                loading="eager"
              />
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="servicos" className="py-24 bg-card">
          <div className="container mx-auto text-center">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-white">
              Principais Serviços
            </h2>
            <div className="w-20 h-1 bg-primary mx-auto my-4"></div>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-16">
              Especializado em Direito do Trabalho, ofereço serviços completos para proteger seus direitos trabalhistas.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map((service, index) => {
                    const Icon = service.icon;
                    return (
                    <Card key={index} className="bg-background/40 text-left p-6 flex flex-col">
                        <div className="text-primary mb-4">
                            <Icon size={32} />
                        </div>
                        <h3 className="font-headline text-xl font-bold text-white mb-2">{service.title}</h3>
                        <p className="text-muted-foreground flex-grow">{service.description}</p>
                        <Button variant="link" className="p-0 mt-4 text-primary justify-start h-auto">
                            Consultar Gratuitamente
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </Card>
                )})}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="sobre" className="py-24 bg-background">
            <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
                <div className="relative h-[500px] w-full">
                     <img
                        src="/lawyer-action.jpg"
                        alt="Dr. Alan Bueno De Gois em seu escritório"
                        width={800}
                        height={500}
                        className="object-cover rounded-lg shadow-2xl"
                        loading="lazy"
                      />
                </div>
                 <div className="space-y-6">
                  <h2 className="font-headline text-3xl md:text-4xl font-bold text-white">
                    Dr. Alan Bueno De Gois <br/> Advogado Trabalhista
                  </h2>
                  <p className="italic text-primary">
                    &ldquo;Contra iniuriam, pro iustitia operarii&rdquo; <br/>
                    <span className="text-muted-foreground not-italic text-sm">Contra a injustiça, a favor da justiça do trabalhador.</span>
                  </p>
                  <p className="text-muted-foreground">
                    Seus direitos trabalhistas merecem proteção e respeito. Sou o Dr. Alan Bueno de Gois, advogado trabalhista com mais de 10 anos de experiência, dedicado exclusivamente à defesa de trabalhadores.
                  </p>
                   <p className="text-muted-foreground">
                    Por que escolher um especialista em Direito Trabalhista? Em ações trabalhistas, cada detalhe faz diferença. Minha experiência e atualização constante me permitem identificar oportunidades que muitas vezes passam despercebidas por outros profissionais.
                  </p>
                  <p className="text-muted-foreground font-semibold">
                    Disponibilidade imediata – Casos trabalhistas não têm hora marcada. Estou pronto para ouvir você e agir rapidamente para proteger seus direitos.
                  </p>
                </div>
            </div>
        </section>


        {/* Testimonials Section */}
        <section id="depoimentos" className="py-24 bg-card">
            <div className="container mx-auto text-center">
                 <h2 className="font-headline text-3xl md:text-4xl font-bold text-white">
                    O que nossos clientes dizem
                </h2>
                <div className="w-20 h-1 bg-primary mx-auto my-4"></div>
                <p className="text-lg text-muted-foreground mb-4">
                    Depoimentos reais de quem já conquistou seus direitos trabalhistas
                </p>

                <div className="flex justify-center items-center gap-4 mb-12">
                    <span className="font-bold text-white">EXCELENTE</span>
                     <div className="flex items-center">
                        {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />)}
                    </div>
                    <span className="text-muted-foreground">Com base em 28 avaliações</span>
                    <span className="font-bold text-blue-500">Google</span>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                         <Card key={index} className="bg-background/40 text-left p-6">
                            <div className="flex items-start gap-4">
                               <Avatar className="h-12 w-12 border-2 border-primary">
                                    <AvatarImage src={`https://picsum.photos/seed/t${index + 1}/100/100`} data-ai-hint={testimonial.avatarHint} />
                                    <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-bold text-white">{testimonial.name}</h4>
                                     <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}
                                    </div>
                                </div>
                            </div>
                            <p className="text-muted-foreground mt-4">&quot;{testimonial.text}&quot;</p>
                        </Card>
                    ))}
                </div>
            </div>
        </section>

        {/* Contact/Location Section */}
        <section id="contato" className="py-24 bg-background">
            <div className="container mx-auto text-center">
                 <h2 className="font-headline text-3xl md:text-4xl font-bold text-white mb-12">
                    Onde estamos
                </h2>
                <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-xl p-8 grid md:grid-cols-2 gap-8 items-center">
                    <div className="text-left space-y-4">
                        <h3 className="font-headline text-2xl font-bold text-white">Endereço</h3>
                        <p className="text-muted-foreground">
                            Rua Marechal Deodoro, 1594 - Sala 2 <br/>
                            São Bernardo do Campo / SP
                        </p>
                        <Button asChild>
                            <Link href="#">Abrir no Google Maps</Link>
                        </Button>
                    </div>
                    <div className="text-left space-y-4">
                         <h3 className="font-headline text-2xl font-bold text-white">Falar no WhatsApp</h3>
                        <p className="text-muted-foreground">
                           Clique no botão abaixo para iniciar uma conversa e tirar suas dúvidas.
                        </p>
                        <Button>
                           <MessageCircle className="mr-2 h-4 w-4"/> Fale com o Dr. Alan
                        </Button>
                    </div>
                </div>
            </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-8 bg-background border-t border-border">
          <div className="container mx-auto text-center text-muted-foreground text-sm">
            <p>&copy; {new Date().getFullYear()} Dr. Alan Bueno De Gois - Advocacia Trabalhista. Todos os direitos reservados.</p>
          </div>
      </footer>
    </div>
  );
}
