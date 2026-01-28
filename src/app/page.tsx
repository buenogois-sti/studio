
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Phone, MapPin, MessageCircle, Scale, Star, Briefcase, Clock, Shield, HeartHandshake, Landmark, FileText, Users, Handshake, Building, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function LandingLogo({ className }: { className?: string }) {
    return (
      <div className={className}>
        <Link href="/" className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground h-10 w-10 flex items-center justify-center rounded-md">
                <Scale size={24} />
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
      icon: <Briefcase />,
      title: 'Rescisão de Contrato',
      description: 'Defendo casos de demissão sem justa causa, demissão por justa causa, pedido de demissão e rescisão indireta. Garanto o pagamento correto de todas as verbas.',
    },
    {
      icon: <Clock />,
      title: 'Horas Extras',
      description: 'Reivindico horas extras não pagas, adicional noturno, trabalho em feriados e domingos. Calculo corretamente todos os valores devidos.',
    },
    {
      icon: <Shield />,
      title: 'Assédio Moral',
      description: 'Defendo casos de assédio moral, assédio sexual, discriminação e danos morais no trabalho. Protejo sua dignidade e garanto indenizações justas.',
    },
    {
      icon: <HeartHandshake />,
      title: 'Acidentes de Trabalho',
      description: 'Atuo em casos de acidentes de trabalho, doenças ocupacionais e responsabilidade do empregador. Garanto todos os benefícios previdenciários.',
    },
    {
      icon: <Landmark />,
      title: 'FGTS e Benefícios',
      description: 'Reivindico depósitos FGTS não realizados, correção de valores e benefícios previdenciários. Garanto que você receba todos os direitos devidos.',
    },
    {
      icon: <FileText />,
      title: 'Verbas Rescisórias',
      description: 'Garanto o pagamento correto de férias, 13º salário, aviso prévio, multa do FGTS e outras verbas. Calculo todos os valores devidos.',
    },
    {
      icon: <Users />,
      title: 'Reconhecimento de Vínculo',
      description: 'Defendo reconhecimento de vínculo empregatício em casos de trabalho informal, terceirização irregular e falsa cooperativa.',
    },
    {
      icon: <Handshake />,
      title: 'Adicionais e Benefícios',
      description: 'Reivindico adicionais de insalubridade, periculosidade, transferência, gratificações e outros benefícios trabalhistas.',
    },
    {
      icon: <Building />,
      title: 'Direito Coletivo',
      description: 'Atuo em ações coletivas, dissídios coletivos, negociações sindicais e acordos coletivos. Defendo os interesses dos trabalhadores.',
    },
]

const testimonials = [
    {
        name: 'Ana Paula Santos',
        text: 'O Dr. Alan é incrível! Conseguiu recuperar todas as minhas verbas rescisórias que a empresa não queria pagar. Muito profissional e atencioso. Recomendo para todos que precisam de um advogado trabalhista de confiança!',
        avatar: 'https://picsum.photos/seed/test1/100/100',
        avatarHint: 'person happy'
    },
    {
        name: 'Roberto Oliveira',
        text: 'Super recomendo! O Dr. Alan resolveu meu caso de assédio moral rapidamente. Tava sofrendo muito no trabalho e ele conseguiu uma indenização justa. Definitivamente o melhor advogado trabalhista que já conheci!',
        avatar: 'https://picsum.photos/seed/test2/100/100',
        avatarHint: 'person happy'
    },
    {
        name: 'Maria Fernanda Costa',
        text: 'Nossa, o Dr. Alan salvou minha vida! Tava sendo demitida sem justa causa e ele conseguiu reverter tudo. Profissionalismo total e dedicação de verdade. Agradeço demais pelo trabalho que ele fez. Recomendo pra todo mundo!',
        avatar: 'https://picsum.photos/seed/test3/100/100',
        avatarHint: 'person happy'
    },
]

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground font-body">
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between p-4 text-white">
          <LandingLogo />
          <nav className="hidden md:flex items-center space-x-6 text-sm">
            <Link href="#inicio" className="hover:text-primary transition-colors">Início</Link>
            <Link href="#servicos" className="hover:text-primary transition-colors">Serviços</Link>
            <Link href="#sobre" className="hover:text-primary transition-colors">Sobre</Link>
            <Link href="#depoimentos" className="hover:text-primary transition-colors">Depoimentos</Link>
            <Link href="#contato" className="hover:text-primary transition-colors">Contato</Link>
          </nav>
          <Button asChild variant="outline" className="hidden md:flex bg-transparent border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <Link href="/login">Área ADV</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main>
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
               <Image
                src="/image/lawyer-portrait.png"
                alt="Dr. Alan Bueno De Gois - Advogado especialista em direito trabalhista"
                fill
                sizes="50vw"
                className="object-contain object-bottom filter drop-shadow-[0_25px_25px_rgba(0,0,0,0.6)]"
                priority
                unoptimized={true}
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
                {services.map((service, index) => (
                    <Card key={index} className="bg-background/40 text-left p-6 flex flex-col">
                        <div className="text-primary mb-4">{React.cloneElement(service.icon as React.ReactElement, { size: 32 })}</div>
                        <h3 className="font-headline text-xl font-bold text-white mb-2">{service.title}</h3>
                        <p className="text-muted-foreground flex-grow">{service.description}</p>
                        <Button variant="link" className="p-0 mt-4 text-primary justify-start h-auto">
                            Consultar Gratuitamente
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </Card>
                ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="sobre" className="py-24 bg-background">
            <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
                <div className="relative h-[500px] w-full">
                     <Image
                        src="/image/lawyer-action.jpg"
                        alt="Dr. Alan Bueno De Gois em seu escritório"
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover rounded-lg shadow-2xl"
                        unoptimized={true}
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
                                    <AvatarImage src={testimonial.avatar} data-ai-hint={testimonial.avatarHint} />
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
