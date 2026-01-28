import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Logo className="mr-2" />
          LexFlow Workspace
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Inteligência Jurídica, integrada ao seu fluxo de trabalho.
              Esta plataforma transformou a gestão de nossos casos.&rdquo;
            </p>
            <footer className="text-sm">Sofia Mendes</footer>
          </blockquote>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 h-full bg-background">
        <Card className="mx-auto max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Acesse sua conta</CardTitle>
            <CardDescription>
              Use sua conta Google Workspace para entrar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                    <path
                      fill="currentColor"
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.62-4.88 1.62-4.27 0-7.75-3.5-7.75-7.75s3.48-7.75 7.75-7.75c2.44 0 4.03.92 4.9 1.84l2.43-2.42C19.64 3.45 16.71 2 12.48 2 7.1 2 3.1 6.02 3.1 11.25s4.01 9.25 9.38 9.25c2.86 0 5.1-1.02 6.7-2.62 1.67-1.67 2.2-4.01 2.2-6.17 0-.52-.04-1.03-.12-1.52H12.48z"
                    />
                  </svg>
                  Entrar com Google
                </Link>
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Acesso restrito ao domínio corporativo.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
