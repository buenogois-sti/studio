'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Phone, MapPin, MessageCircle, Star, Briefcase, Clock, Shield, HeartHandshake, Landmark, FileText, Users, Handshake, Building, ChevronRight, ArrowRight, Sparkles, Target } from 'lucide-react';
import { WhatsAppFloating } from '@/components/WhatsAppFloating';
import { Card } from '@/components/ui/card';

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
        text: 'A equipe da Bueno Gois Advogados é incrível! Conseguiram recuperar todas as minhas verbas rescisórias que a empresa não queria pagar. Muito profissionais e atenciosos. Recomendo para todos que precisam de um advogado trabalhista de confiança!',
    },
    {
        name: 'Roberto Oliveira',
        text: 'Super recomendo! O time da Bueno Gois resolveu meu caso de assédio moral rapidamente. Estava sofrendo muito no trabalho e eles conseguiram uma indenização justa. Definitivamente o melhor escritório trabalhista que já conheci!',
    },
    {
        name: 'Maria Fernanda Costa',
        text: 'Nossa, a Bueno Gois Advogados salvou minha vida! Estava sendo demitida sem justa causa e eles conseguiram reverter tudo. Profissionalismo total e dedicação de verdade. Agradeço demais pelo trabalho que fizeram. Recomendo pra todo mundo!',
    },
]

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
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

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

export default function LandingPage() {
  const scrollY = useScrollPosition();
  const whatsappUrl = "https://wa.me/5511980590128?text=Olá!%20Vi%20o%20site%20da%20Bueno%20Gois%20Advogados%20e%20gostaria%20de%20saber%20mais%20sobre%20seus%20serviços.";

  return (
    <div className="bg-background text-foreground font-body overflow-x-hidden">
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
      <main className="relative">
        {/* Hero Section with Parallax */}
        <section id="inicio" className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#152c4b] via-[#1a3557] to-[#152c4b]">
          <FloatingParticles />
          
          {/* Parallax Layers */}
          <ParallaxLayer speed={-0.3} className="absolute inset-0 z-0">
            <div className="absolute top-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          </ParallaxLayer>
          
          <ParallaxLayer speed={-0.15} className="absolute inset-0 z-0">
            <div className="absolute bottom-32 left-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
          </ParallaxLayer>

          <div className="container mx-auto relative z-10 pt-32 pb-20 px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Hero Image with 3D Effect */}
              <AnimatedSection delay={200} className="relative">
                <div className="relative h-[600px] perspective-1000">
                  <ParallaxLayer speed={0.1}>
                    <div className="relative h-[600px]">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl" />
                      <img
                        src="/lawyer-portrait.png"
                        alt="Advogado Bueno Gois"
                        width={500}
                        height={600}
                        className="relative object-contain object-bottom filter drop-shadow-[0_35px_60px_rgba(245,208,48,0.3)]"
                      />
                    </div>
                  </ParallaxLayer>
                </div>
              </AnimatedSection>

              {/* Content */}
              <AnimatedSection className="space-y-8">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-sm font-bold text-primary">+10 Anos de Experiência</span>
                </div>

                {/* Title - Clean and Simple */}
                <h1 className="font-headline text-5xl md:text-6xl xl:text-7xl font-bold leading-tight text-white">
                  Defenda <span className="text-primary">Seus</span>
                  <br />
                  <span className="text-primary">Direitos</span>
                  <br />
                  Trabalhistas
                </h1>

                {/* Description */}
                <p className="text-xl text-white/90 max-w-2xl leading-relaxed text-justify">
                  Advocacia trabalhista especializada em{' '}
                  <span className="text-primary font-semibold">rescisão de contrato</span>,{' '}
                  <span className="text-primary font-semibold">horas extras</span>,{' '}
                  <span className="text-primary font-semibold">assédio moral</span> e mais.
                  Atendimento em São Bernardo do Campo com resultados comprovados.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4">
                  <Button 
                    size="lg" 
                    className="group bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base py-7 px-8 rounded-xl shadow-[0_20px_60px_rgba(245,208,48,0.4)] hover:shadow-[0_20px_60px_rgba(245,208,48,0.6)] transition-all duration-300 hover:scale-105"
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
                      (11) 98059-0128
                    </Link>
                  </Button>
                </div>

                {/* Location Info */}
                <div className="flex flex-wrap items-center gap-6 pt-8 text-sm text-white/80">
                  <div className="flex items-center gap-2 group cursor-pointer">
                    <MapPin className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    <span>São Bernardo do Campo / SP</span>
                  </div>
                  <div className="flex items-center gap-2 group cursor-pointer">
                    <Clock className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    <span>Atendimento 24/7</span>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-primary rounded-full flex justify-center p-2">
              <div className="w-1 h-3 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="servicos" className="relative py-40 bg-white overflow-hidden">
          <AnimatedGradientBg />
          
          <div className="container mx-auto relative z-10 px-4">
            <AnimatedSection className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Especialidades</span>
              </div>
              <h2 className="font-headline text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Principais Serviços
              </h2>
              <div className="w-24 h-1.5 bg-gradient-to-r from-primary to-accent mx-auto mb-6 rounded-full"></div>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Especializado em Direito do Trabalho, ofereço serviços completos para proteger seus direitos trabalhistas.
              </p>
            </AnimatedSection>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <AnimatedSection key={index} delay={index * 100}>
                    <Card className="group relative bg-white border-2 border-gray-150 p-8 flex flex-col h-full hover:border-[#152c4b]/40 transition-all duration-300 hover:shadow-2xl cursor-pointer overflow-hidden">
                      {/* Clean hover effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/5 transition-all duration-300" />
                      
                      <div className="relative z-10">
                        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary transition-all duration-300">
                          <Icon className="w-8 h-8 text-primary group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="font-headline text-2xl font-bold text-gray-900 mb-4">
                          {service.title}
                        </h3>
                        <p className="text-gray-600 flex-grow leading-relaxed mb-6 text-justify">
                          {service.description}
                        </p>
                        <Link
                          href={whatsappUrl}
                          target="_blank"
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#152c4b] text-white font-semibold rounded-lg hover:bg-[#1a3659] transition-all duration-300"
                        >
                          Consultar Gratuitamente
                          <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </Card>
                  </AnimatedSection>
                );
              })}
            </div>
          </div>
        </section>

        {/* About Section with Parallax */}
        <section id="sobre" className="relative py-40 bg-gray-50 overflow-hidden">
          <ParallaxLayer speed={-0.2} className="absolute inset-0">
            <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          </ParallaxLayer>
          
          <div className="container mx-auto relative z-10 px-4">
            {/* Title Section - Centered */}
            <AnimatedSection className="text-center mb-12">
              <h2 className="font-headline text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Sobre Bueno Gois Advogados e Associados
                <br />
                <span className="text-[#152c4b] font-black">Trabalhista Especialista</span>
              </h2>
              
              {/* Quote Section - Centered */}
              <div className="max-w-2xl mx-auto pl-6 border-l-4 border-primary/50 bg-primary/10 p-4 rounded-lg inline-block">
                <p className="italic text-primary text-lg mb-2 font-bold">
                  &ldquo;Contra iniuriam, pro iustitia operarii&rdquo;
                </p>
                <p className="text-gray-700 text-sm font-medium">
                  Contra a injustiça, a favor da justiça do trabalhador.
                </p>
              </div>
            </AnimatedSection>
            
            {/* Content Grid */}
            <div className="grid lg:grid-cols-3 gap-16 items-start">
              {/* Left Column - Text */}
              <div className="lg:col-span-2">
                <div className="space-y-6">
                  <AnimatedSection>
                    <p className="text-lg text-gray-600 leading-relaxed text-justify">
                      Seus direitos trabalhistas merecem <span className="font-bold text-gray-900">proteção e respeito</span>. Somos a <span className="font-bold text-gray-900">Bueno Gois Advogados</span>, um escritório com <span className="font-bold text-gray-900">mais de 10 anos de experiência</span>, dedicado exclusivamente à defesa de trabalhadores.
                    </p>
                  </AnimatedSection>
                  
                  <AnimatedSection delay={100}>
                    <p className="text-lg text-gray-600 leading-relaxed text-justify">
                      <span className="font-bold text-gray-900">Por que escolher um especialista em Direito Trabalhista?</span> Em ações trabalhistas, <span className="font-bold text-gray-900">cada detalhe faz diferença</span>. Nossa <span className="font-bold text-gray-900">experiência e atualização constante</span> nos permitem identificar <span className="font-bold text-gray-900">oportunidades</span> que muitas vezes passam despercebidas por outros profissionais.
                    </p>
                  </AnimatedSection>
                  
                  <AnimatedSection delay={200}>
                    <div className="bg-[#152c4b]/10 border-2 border-[#152c4b]/30 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all" style={{ boxShadow: '0 8px 24px rgba(21, 44, 75, 0.15)' }}>
                      <p className="text-gray-900 font-bold text-lg flex items-start gap-3">
                        <Sparkles className="w-6 h-6 text-[#152c4b] flex-shrink-0 mt-1" />
                        <span className="text-justify">Disponibilidade imediata – Casos trabalhistas não têm hora marcada. Estamos prontos para ouvir você e agir rapidamente para proteger seus direitos.</span>
                      </p>
                    </div>
                  </AnimatedSection>

                  <AnimatedSection delay={300}>
                    <Button 
                      size="lg"
                      className="group bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base py-7 px-8 rounded-xl shadow-[0_20px_60px_rgba(245,208,48,0.4)] transition-all duration-300 hover:scale-105"
                      asChild
                    >
                      <Link href={whatsappUrl} target="_blank">
                        <MessageCircle className="mr-3 h-5 w-5 group-hover:rotate-12 transition-transform" />
                        Fale Conosco Agora
                        <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </AnimatedSection>
                </div>
              </div>
              
              {/* Right Column - Image */}
              <AnimatedSection delay={150}>
                <div className="relative h-[450px] w-full rounded-2xl overflow-hidden group shadow-xl border-4 border-primary/20" style={{ perspective: '1200px' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-primary/10 z-10" />
                  <img
                    src="/lawyer-action.jpg"
                    alt="Escritório Bueno Gois"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 filter brightness-105"
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-sm p-4 rounded-xl z-20 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <div className="flex items-center gap-3">
                      <div className="text-sm">
                        <div className="font-bold text-white">Bueno Gois Advogados</div>
                        <div className="text-xs text-muted-foreground">OAB/SP 123.456</div>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="depoimentos" className="relative py-40 bg-white overflow-hidden">
          <AnimatedGradientBg />
          
          <div className="container mx-auto relative z-10 px-4">
            <AnimatedSection className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Depoimentos</span>
              </div>
              
              <h2 className="font-headline text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                O que nossos clientes dizem
              </h2>
              <div className="w-24 h-1.5 bg-gradient-to-r from-primary to-accent mx-auto mb-8 rounded-full"></div>
              
              <p className="text-xl text-gray-600 mb-8">
                Depoimentos reais de quem já conquistou seus direitos trabalhistas
              </p>

              <div className="flex justify-center items-center gap-6 mb-12 flex-wrap">
                <span className="font-bold text-white text-lg">EXCELENTE</span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <span className="text-muted-foreground">Com base em 28 avaliações</span>
                <span className="font-bold text-blue-500 text-lg">Google</span>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <AnimatedSection key={index} delay={index * 150}>
                  <Card className="group bg-white border-2 border-gray-150 p-8 hover:border-[#152c4b]/30 transition-all duration-300 hover:shadow-2xl h-full flex flex-col cursor-pointer">
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 text-lg mb-3">{testimonial.name}</h4>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed flex-1 text-justify">
                      &quot;{testimonial.text}&quot;
                    </p>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Rights Section */}
        <section id="direitos" className="relative py-40 bg-gray-50 overflow-hidden">
          <div className="container mx-auto relative z-10 px-4">
            <AnimatedSection className="text-center mb-12">
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-[#152c4b] mb-4">
                Seus Direitos Trabalhistas em São Bernardo do Campo
              </h2>
              <div className="w-16 h-1 bg-primary mx-auto mb-4 rounded-full" />
              <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
                Conheça os principais direitos trabalhistas que todo trabalhador deve saber e como um advogado especialista pode ajudá-lo.
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
              <Card className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                <h3 className="font-headline text-lg font-bold text-[#152c4b] mb-4">
                  Quando Procurar um Advogado Trabalhista?
                </h3>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
                  <li>Demissão sem justa causa com verbas incorretas</li>
                  <li>Horas extras não pagas ou calculadas incorretamente</li>
                  <li>Assédio moral ou discriminação no trabalho</li>
                  <li>Acidentes de trabalho sem assistência adequada</li>
                  <li>FGTS não depositado pelo empregador</li>
                  <li>Trabalho sem carteira assinada</li>
                </ul>
              </Card>

              <Card className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                <h3 className="font-headline text-lg font-bold text-[#152c4b] mb-4">
                  Principais Verbas Rescisórias
                </h3>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
                  <li>Saldo de salário proporcional</li>
                  <li>Férias vencidas e proporcionais + 1/3</li>
                  <li>13º salário proporcional</li>
                  <li>Aviso prévio (trabalhado ou indenizado)</li>
                  <li>Multa de 40% sobre o FGTS</li>
                  <li>Seguro-desemprego (quando aplicável)</li>
                </ul>
              </Card>

              <Card className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                <h3 className="font-headline text-lg font-bold text-[#152c4b] mb-4">
                  Prazos Importantes na CLT
                </h3>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
                  <li>2 anos após o fim do contrato para entrar com ação</li>
                  <li>5 anos retroativos para cobrar direitos</li>
                  <li>10 dias para pagamento das verbas rescisórias</li>
                  <li>30 dias para anotação da CTPS</li>
                  <li>48 horas para entrega de documentos</li>
                </ul>
              </Card>
            </div>

            <AnimatedSection delay={200}>
              <div className="bg-gradient-to-b from-[#2b4fb6] to-[#1f3f9c] rounded-2xl p-8 md:p-10 text-white text-center shadow-xl">
                <h3 className="font-headline text-xl md:text-2xl font-bold mb-3">
                  Por que Escolher um Advogado Trabalhista Especialista?
                </h3>
                <p className="text-white/90 max-w-3xl mx-auto mb-8 text-sm md:text-base">
                  Com mais de 10 anos de experiência exclusiva em Direito do Trabalho, conheço todas as nuances da legislação trabalhista e sei exatamente como defender seus direitos.
                </p>
                <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
                  <div>
                    <div className="text-2xl font-bold">+500</div>
                    <div className="text-xs text-white/80">Casos Resolvidos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">95%</div>
                    <div className="text-xs text-white/80">Taxa de Sucesso</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">10+</div>
                    <div className="text-xs text-white/80">Anos de Experiência</div>
                  </div>
                </div>
                <Button className="bg-white text-[#1f3f9c] hover:bg-white/90 font-semibold px-6 py-2 rounded-lg" asChild>
                  <Link href={whatsappUrl} target="_blank">
                    Consulta Gratuita Agora
                  </Link>
                </Button>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contato" className="relative py-40 bg-gray-50 overflow-hidden">
          <ParallaxLayer speed={-0.1} className="absolute inset-0">
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          </ParallaxLayer>
          
          <div className="container mx-auto relative z-10 px-4">
            <AnimatedSection className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Localização</span>
              </div>
              <h2 className="font-headline text-4xl md:text-5xl font-bold text-gray-900">
                Onde estamos
              </h2>
            </AnimatedSection>
            
            <AnimatedSection delay={200}>
              <div className="max-w-6xl mx-auto bg-white border border-gray-200 rounded-3xl shadow-2xl p-10 md:p-14">
                <div className="grid lg:grid-cols-3 gap-10">
                  {/* Map Column */}
                  <div className="relative rounded-2xl overflow-hidden h-[460px] lg:h-full min-h-[420px] lg:col-span-2 shadow-xl ring-1 ring-gray-200">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3644.684!2d-46.5556!3d-23.6936!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce4278d2c00001%3A0xa1b2c3d4e5f6!2sRua%20Marechal%20Deodoro%2C%201594%20-%20Sala%202%2C%20S%C3%A3o%20Bernardo%20do%20Campo%20-%20SP%2C%2009715-070!5e0!3m2!1spt-BR!2sbr!4v1701890000000"
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="rounded-2xl"
                    />
                  </div>

                  {/* Info Column */}
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-headline text-2xl font-bold text-gray-900 mb-3">Endereço</h3>
                          <p className="text-gray-600 text-lg leading-relaxed">
                            Rua Marechal Deodoro, 1594 - Sala 2 <br />
                            São Bernardo do Campo / SP
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="rounded-xl border border-gray-200 p-5 flex items-start gap-3 bg-gray-50/60">
                        <Clock className="w-5 h-5 text-primary mt-1" />
                        <div>
                          <p className="font-semibold text-gray-900">Horário de atendimento</p>
                          <p className="text-sm text-gray-600">Seg a Sex • 09:00 – 18:00</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-200 p-5 flex items-start gap-3 bg-gray-50/60">
                        <Phone className="w-5 h-5 text-primary mt-1" />
                        <div>
                          <p className="font-semibold text-gray-900">Telefone direto</p>
                          <p className="text-sm text-gray-600">(11) 98059-0128</p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      asChild
                      className="w-full bg-[#152c4b] hover:bg-[#1a3659] text-white font-bold py-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                    >
                      <Link href="https://www.google.com/maps/place/Rua+Marechal+Deodoro,+1594+-+Sa%CC%81+la+2,+Sa%CC%83o+Bernardo+do+Campo+-+SP" target="_blank">
                        <MapPin className="mr-2 h-5 w-5" />
                        Abrir no Google Maps
                      </Link>
                    </Button>
                  </div>
                </div>
                
                <div className="mt-10 border-t border-gray-200 pt-10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-headline text-2xl font-bold text-gray-900 mb-3">Falar no WhatsApp</h3>
                      <p className="text-gray-600 text-lg leading-relaxed">
                        Clique no botão abaixo para iniciar uma conversa e tirar suas dúvidas.
                      </p>
                    </div>
                  </div>
                  <Button
                    className="mt-6 w-full group bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-xl shadow-[0_20px_60px_rgba(245_208_48_0.4)] hover:shadow-[0_20px_60px_rgba(245,208,48_0.6)] transition-all duration-300 hover:scale-105"
                    asChild
                  >
                    <Link href={whatsappUrl} target="_blank">
                      <MessageCircle className="mr-3 h-5 w-5 group-hover:rotate-12 transition-transform" />
                      Fale com nossa equipe
                      <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative py-16 bg-[#0b1324] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="container mx-auto relative z-10 px-4">
          <div className="grid gap-10 md:grid-cols-3 lg:grid-cols-4 items-start">
            <div className="lg:col-span-2">
              <LandingLogo className="mb-6" />
              <p className="text-white/70 leading-relaxed max-w-md">
                Advocacia trabalhista especializada em São Bernardo do Campo.
                Atendimento estratégico, humano e focado em resultados.
              </p>
              <div className="mt-6">
                <Button
                  asChild
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  <Link href={whatsappUrl} target="_blank">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Falar no WhatsApp
                  </Link>
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-headline text-lg font-bold">Contato</h4>
              <div className="flex items-center gap-3 text-white/70">
                <Phone className="h-4 w-4 text-primary" />
                <span>(11) 98059-0128</span>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Rua Marechal Deodoro, 1594 - Sala 2</span>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <Clock className="h-4 w-4 text-primary" />
                <span>Seg a Sex • 09:00 – 18:00</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-headline text-lg font-bold">Links rápidos</h4>
              <div className="flex flex-col gap-2 text-white/70">
                <Link href="#inicio" className="hover:text-white transition-colors">Início</Link>
                <Link href="#servicos" className="hover:text-white transition-colors">Serviços</Link>
                <Link href="#sobre" className="hover:text-white transition-colors">Sobre</Link>
                <Link href="#depoimentos" className="hover:text-white transition-colors">Depoimentos</Link>
                <Link href="#contato" className="hover:text-white transition-colors">Contato</Link>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 text-center text-white/60 text-sm">
            &copy; {new Date().getFullYear()} Bueno Gois Advogados e Associados. Todos os direitos reservados.
          </div>
          <div className="text-center text-white/40 text-xs mt-2">
            Desenvolvido com tecnologia de ponta e design moderno
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Widget */}
      <WhatsAppFloating
        phoneNumber="5511980590128"
        message="Olá! Vi o site da Bueno Gois Advogados e gostaria de saber mais sobre os serviços de advocacia trabalhista."
        welcomeMessage="Olá! 👋 Sou da Bueno Gois Advogados. Como posso ajudar com seus direitos trabalhistas?"
        userName="Bueno Gois Adv."
        delay={3000}
        autoHideDelay={10000}
      />
    </div>
  );
}
