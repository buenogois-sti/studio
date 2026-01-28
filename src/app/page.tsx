import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Phone, MapPin, MessageCircle, Scale } from 'lucide-react';

function LandingLogo({ className }: { className?: string }) {
    return (
      <div className={className}>
        <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground h-10 w-10 flex items-center justify-center rounded-md">
                <Scale size={24} />
            </div>
             <span className="font-bold text-lg text-white">
              LexFlow
            </span>
        </Link>
      </div>
    );
  }

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground font-body">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-transparent">
        <div className="container mx-auto flex items-center justify-between p-4 text-white">
          <LandingLogo />
          <nav className="hidden md:flex items-center space-x-6 text-sm">
            <Link href="#" className="font-semibold text-primary border-b-2 border-primary pb-1">Início</Link>
            <Link href="#" className="hover:text-primary transition-colors">Serviços</Link>
            <Link href="#" className="hover:text-primary transition-colors">Sobre</Link>
            <Link href="#" className="hover:text-primary transition-colors">Depoimentos</Link>
            <Link href="#" className="hover:text-primary transition-colors">Contato</Link>
          </nav>
          <Button asChild variant="outline" className="hidden md:flex bg-transparent border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <Link href="/login">Área do Cliente</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-background z-0" />
          <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center pt-32 pb-20 relative z-10">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Início &gt; Advogado Trabalhista São Bernardo do Campo
              </p>
              <h1 className="font-headline text-4xl md:text-5xl xl:text-6xl font-bold leading-tight text-white">
                Advogado Trabalhista em São Bernardo do Campo - <br />
                <span className="text-primary">Defenda Seus Direitos com Especialista</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Advogado trabalhista com mais de 10 anos de experiência em grandes causas de todos os portes e todos os seus direitos trabalhistas, em São Bernardo do Campo.
              </p>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base py-7 px-8 rounded-full shadow-lg shadow-primary/20 transition-transform transform hover:scale-105">
                <MessageCircle className="mr-3 h-5 w-5" />
                Consultar Gratuitamente
              </Button>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Rua Marechal Deodoro, 1986 - Sala 3, SBC/SP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>(11) 98399-0000</span>
                </div>
              </div>
            </div>
            <div className="relative -mr-16 hidden lg:flex justify-center items-end h-[600px]">
               <Image
                src="https://picsum.photos/seed/lawyer-portrait/600/800"
                alt="Advogado especialista em direito trabalhista"
                width={500}
                height={700}
                className="object-contain object-bottom"
                data-ai-hint="man suit"
                priority
              />
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-24 bg-card text-center">
          <div className="container mx-auto max-w-3xl">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-white">
              Serviços de Advocacia Trabalhista em São Bernardo do Campo
            </h2>
            <div className="w-20 h-1 bg-primary mx-auto my-6"></div>
            <p className="text-lg text-muted-foreground">
              Especializado em Direito do Trabalho há mais de 10 anos, ofereço serviços exemplares para proteger e defender seus direitos trabalhistas com excelência e dedicação.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-background border-t border-border">
          <div className="container mx-auto text-center text-muted-foreground text-sm">
            <p>&copy; {new Date().getFullYear()} LexFlow. Todos os direitos reservados.</p>
          </div>
      </footer>
    </div>
  );
}
