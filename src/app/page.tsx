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
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-bl from-primary/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
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
          
          <div className="container mx-auto relative z-10 pt-32 pb-20 px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Hero Image */}
              <AnimatedSection delay={200} className="relative">
                <div className="relative h-[600px]">
                  <ParallaxLayer speed={0.1}>
                    <div className="relative h-[600px]">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-3xl" />
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
                  Advocacia trabalhista especializada em{' '}
                  <span className="text-primary font-semibold">rescisão de contrato</span>,{' '}
                  <span className="text-primary font-semibold">horas extras</span>,{' '}
                  <span className="text-primary font-semibold">assédio moral</span> e mais.
                  Atendimento em São Bernardo do Campo com resultados comprovados.
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
                      (11) 98059-0128
                    </Link>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-8 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>São Bernardo do Campo / SP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Atendimento 24/7</span>
                  </div>
                </div>
              </AnimatedSection>
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
              <div className="w-24 h-1.5 bg-primary mx-auto mb-6 rounded-full"></div>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Especializado em Direito do Trabalho, oferecemos serviços completos para proteger seus direitos trabalhistas.
              </p>
            </AnimatedSection>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <AnimatedSection key={index} delay={index * 100}>
                    <Card className="group relative bg-white border-2 border-gray-150 p-8 flex flex-col h-full hover:border-primary/40 transition-all duration-300 hover:shadow-2xl cursor-pointer overflow-hidden">
                      <div className="relative z-10">
                        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary transition-all duration-300">
                          <Icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
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

        {/* About Section */}
        <section id="sobre" className="relative py-40 bg-gray-50 overflow-hidden">
          <div className="container mx-auto relative z-10 px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <AnimatedSection>
                  <h2 className="font-headline text-4xl md:text-5xl font-bold text-gray-900">
                    Bueno Gois Advogados
                    <br />
                    <span className="text-primary">Especialistas em Você</span>
                  </h2>
                </AnimatedSection>
                
                <AnimatedSection delay={100}>
                  <div className="pl-6 border-l-4 border-primary bg-primary/5 p-6 rounded-r-xl">
                    <p className="italic text-primary text-xl mb-2 font-bold">
                      &ldquo;Contra iniuriam, pro iustitia operarii&rdquo;
                    </p>
                    <p className="text-gray-700 text-sm font-medium uppercase tracking-wider">
                      Contra a injustiça, a favor da justiça do trabalhador.
                    </p>
                  </div>
                </AnimatedSection>

                <AnimatedSection delay={200} className="space-y-6 text-lg text-gray-600 leading-relaxed text-justify">
                  <p>
                    Seus direitos trabalhistas merecem <span className="font-bold text-gray-900">proteção e respeito</span>. Somos um escritório com <span className="font-bold text-gray-900">mais de 10 anos de atuação</span>, focado na defesa intransigente do trabalhador.
                  </p>
                  <p>
                    Nossa <span className="font-bold text-gray-900">experiência e atualização constante</span> nos permitem identificar oportunidades e detalhes técnicos que garantem a melhor estratégia para o seu caso.
                  </p>
                </AnimatedSection>

                <AnimatedSection delay={300}>
                  <Button 
                    size="lg"
                    className="group bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-7 px-8 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                    asChild
                  >
                    <Link href={whatsappUrl} target="_blank">
                      <MessageCircle className="mr-3 h-5 w-5" />
                      Fale com um Especialista
                    </Link>
                  </Button>
                </AnimatedSection>
              </div>

              <AnimatedSection delay={150}>
                <div className="relative h-[550px] w-full rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
                  <img
                    src="/lawyer-action.jpg"
                    alt="Equipe Bueno Gois"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#152c4b]/80 to-transparent" />
                  <div className="absolute bottom-8 left-8">
                    <div className="text-white font-bold text-2xl mb-1">Escritório Bueno Gois</div>
                    <div className="text-primary font-semibold">Excelência em Direito do Trabalho</div>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="depoimentos" className="relative py-40 bg-white overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <AnimatedSection className="text-center mb-20">
              <h2 className="font-headline text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Confiança e Resultados
              </h2>
              <div className="flex justify-center items-center gap-2 mb-8">
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                <span className="ml-4 font-bold text-gray-900 text-lg">5.0 no Google</span>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <AnimatedSection key={index} delay={index * 150}>
                  <Card className="p-8 border-2 border-gray-100 hover:border-primary/30 transition-all duration-300 h-full flex flex-col">
                    <p className="text-gray-600 italic mb-6 flex-1">
                      &quot;{testimonial.text}&quot;
                    </p>
                    <div className="font-bold text-gray-900 border-t pt-4">
                      {testimonial.name}
                    </div>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contato" className="relative py-40 bg-gray-50 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden grid lg:grid-cols-3">
              <div className="lg:col-span-2 h-[500px]">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3644.684!2d-46.5556!3d-23.6936!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce4278d2c00001%3A0xa1b2c3d4e5f6!2sRua%20Marechal%20Deodoro%2C%201594%20-%20Sala%202%2C%20S%C3%A3o%20Bernardo%20do%20Campo%20-%20SP%2C%2009715-070!5e0!3m2!1spt-BR!2sbr!4v1701890000000"
                  allowFullScreen={true}
                  loading="lazy"
                  className="grayscale hover:grayscale-0 transition-all duration-700"
                />
              </div>
              <div className="p-12 bg-[#152c4b] text-white flex flex-col justify-center space-y-8">
                <h3 className="font-headline text-3xl font-bold">Contato Direto</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-primary shrink-0" />
                    <p className="text-lg">Rua Marechal Deodoro, 1594 - Sala 2, SBC/SP</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <Phone className="w-6 h-6 text-primary shrink-0" />
                    <p className="text-lg">(11) 98059-0128</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <Clock className="w-6 h-6 text-primary shrink-0" />
                    <p className="text-lg">Seg a Sex • 09:00 às 18:00</p>
                  </div>
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6" asChild>
                  <Link href={whatsappUrl} target="_blank">Enviar WhatsApp</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 bg-[#0b1324] text-white/60 text-center text-sm">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} Bueno Gois Advogados e Associados. Todos os direitos reservados.</p>
        </div>
      </footer>

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
