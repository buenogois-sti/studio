'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { Input } from '@/components/ui/input';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import {
  Home,
  Users,
  FolderKanban,
  Calendar,
  DollarSign,
  Settings,
  Search,
  PanelLeft,
  Briefcase,
  AlertCircle,
  Loader2,
  Library,
  BarChart,
  Archive,
} from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import {
  useFirebase,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';


const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Home,
    roles: ['admin', 'lawyer', 'financial', 'assistant'],
  },
  {
    href: '/dashboard/clientes',
    label: 'Clientes',
    icon: Users,
    roles: ['admin', 'lawyer', 'assistant'],
  },
  {
    href: '/dashboard/processos',
    label: 'Processos',
    icon: FolderKanban,
    roles: ['admin', 'lawyer', 'assistant'],
  },
  {
    href: '/dashboard/audiencias',
    label: 'Audiências',
    icon: Calendar,
    roles: ['admin', 'lawyer', 'assistant'],
  },
  {
    href: '/dashboard/financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    roles: ['admin', 'financial'],
  },
  {
    href: '/dashboard/relatorios',
    label: 'Relatórios',
    icon: BarChart,
    roles: ['admin', 'financial'],
  },
  {
    href: '/dashboard/acervo',
    label: 'Acervo',
    icon: Library,
    roles: ['admin', 'lawyer', 'assistant'],
  },
  {
    href: '/dashboard/arquivo',
    label: 'Arquivo',
    icon: Archive,
    roles: ['admin', 'lawyer'],
  },
  {
    href: '/dashboard/staff',
    label: 'Equipe',
    icon: Briefcase,
    roles: ['admin'],
  },
  {
    href: '/dashboard/configuracoes',
    label: 'Configurações',
    icon: Settings,
    roles: ['admin'],
  },
];

const BreadcrumbMap: { [key: string]: string } = {
  '/dashboard': 'Dashboard',
  '/dashboard/clientes': 'Clientes',
  '/dashboard/processos': 'Processos',
  '/dashboard/audiencias': 'Audiências',
  '/dashboard/financeiro': 'Financeiro',
  '/dashboard/relatorios': 'Relatórios Gerenciais',
  '/dashboard/acervo': 'Acervo de Modelos',
  '/dashboard/arquivo': 'Arquivo Digital',
  '/dashboard/staff': 'Equipe',
  '/dashboard/configuracoes': 'Configurações',
};

function AccessDenied() {
  return (
    <div className="flex flex-1 h-full items-center justify-center rounded-lg border border-dashed shadow-sm">
      <div className="flex flex-col items-center gap-2 text-center">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold tracking-tight font-headline mt-4">Acesso Negado</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Você não tem permissão para visualizar esta página. Por favor, selecione um perfil com acesso ou
          contate um administrador.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Voltar para o Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

function InnerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    React.useEffect(() => {
        if (session?.error && !session.error.startsWith('ServerConfigError:')) {
            let title = 'Erro de Sessão';
            let description = 'Ocorreu um erro inesperado na sua sessão.';
            let shouldSignOut = false;

            if (session.error === 'RefreshAccessTokenError') {
                title = 'Sessão Expirada';
                description = 'Sua sessão expirou e não foi possível renová-la. Por favor, faça login novamente.';
                shouldSignOut = true;
            } else if (session.error === 'DatabaseError') {
                title = 'Erro de Banco de Dados';
                description = 'Não foi possível acessar seus dados de perfil. Verifique a configuração do servidor e tente novamente.';
            }
            
            toast({
                variant: 'destructive',
                title: title,
                description: description,
                duration: 20000,
            });

            if (shouldSignOut) {
                signOut({ callbackUrl: '/login' });
            }
        }
    }, [session, toast]);

    const userProfileRef = useMemoFirebase(
        () => (firestore && session?.user?.id ? doc(firestore, 'users', session.user.id) : null),
        [firestore, session?.user?.id]
    );
    const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);

    React.useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/login');
        }
    }, [status, router]);

    const getBreadcrumb = () => {
        const pathParts = pathname.split('/').filter((part) => part);
        return (
        <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
            <BreadcrumbItem>
                <BreadcrumbLink asChild>
                <Link href="/dashboard">Início</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
            {pathParts.map((part, index) => {
                const href = `/${pathParts.slice(0, index + 1).join('/')}`;
                const isLast = index === pathParts.length - 1;
                return (
                <React.Fragment key={href}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                    {isLast ? (
                        <BreadcrumbPage>{BreadcrumbMap[href] || part}</BreadcrumbPage>
                    ) : (
                        <BreadcrumbLink asChild>
                        <Link href={href}>{BreadcrumbMap[href] || part}</Link>
                        </BreadcrumbLink>
                    )}
                    </BreadcrumbItem>
                </React.Fragment>
                );
            })}
            </BreadcrumbList>
        </Breadcrumb>
        );
    };

    const getBestNavItemForPath = (path: string) => {
        let bestMatch: (typeof navItems)[0] | undefined = undefined;
        for (const item of navItems) {
        if (path.startsWith(item.href)) {
            if (!bestMatch || item.href.length > bestMatch.href.length) {
            bestMatch = item;
            }
        }
        }
        return bestMatch;
    };

    if (status === 'loading' || !session || isUserProfileLoading) {
        return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        );
    }

    const accessibleNavItems = userProfile
      ? navItems.filter(item => item.roles.includes(userProfile.role))
      : [];

    const currentNavItem = getBestNavItemForPath(pathname);
    const hasPermission = userProfile && currentNavItem && currentNavItem.roles.includes(userProfile.role);

    if (session?.error && session.error.startsWith('ServerConfigError:')) {
        return (
             <div className="flex flex-1 h-screen w-screen items-center justify-center rounded-lg bg-background">
                <div className="flex flex-col items-center gap-2 text-center p-4">
                    <AlertCircle className="h-16 w-16 text-destructive" />
                    <h1 className="text-2xl font-bold tracking-tight font-headline mt-4">Erro Crítico de Configuração</h1>
                    <p className="text-base text-muted-foreground max-w-xl">
                       Não foi possível conectar ao Firebase. A autenticação falhou devido a um erro de configuração no servidor.
                    </p>
                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mt-2 max-w-2xl">
                        <strong>Detalhes do Erro:</strong> {session.error.replace('ServerConfigError: ', '')}
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xl mt-2">
                      Por favor, verifique a variável de ambiente `FIREBASE_SERVICE_ACCOUNT_JSON` em sua plataforma de hospedagem (Vercel, etc.) e faça o deploy novamente. Consulte a documentação para mais detalhes.
                    </p>
                    <Button onClick={() => signOut({ callbackUrl: '/login' })} className="mt-4">Tentar Login Novamente</Button>
                </div>
            </div>
        )
    }

    return (
        <SidebarProvider>
        <Sidebar variant="sidebar" collapsible="icon">
            <SidebarHeader className="h-14 justify-center p-2 group-data-[collapsible=icon]:justify-center">
            <Link href="/dashboard" className="flex items-center gap-2">
                <Logo />
                <span className="font-bold text-lg text-primary group-data-[collapsible=icon]:hidden">
                Bueno Gois
                </span>
            </Link>
            </SidebarHeader>
            <SidebarContent>
            <SidebarMenu>
                {accessibleNavItems.map(
                (item) => (
                    <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton
                        asChild
                        isActive={currentNavItem?.href === item.href}
                        tooltip={{ children: item.label }}
                        >
                        <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    )
                )}
            </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="justify-center h-14 border-t group-data-[collapsible=icon]:justify-center">
            <div className="group-data-[collapsible=icon]:hidden w-full">
            </div>
            </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <SidebarTrigger className="shrink-0 md:hidden" />
            {getBreadcrumb()}
            <div className="ml-auto flex items-center gap-2">
                <form>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                    type="search"
                    placeholder="Pesquisar..."
                    className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] bg-background"
                    />
                </div>
                </form>
                <NotificationBell />
                <UserNav />
            </div>
            </header>
            <main className="flex-1 p-4 sm:p-6">
              {hasPermission ? children : <AccessDenied />}
            </main>
        </SidebarInset>
        </SidebarProvider>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <InnerLayout>{children}</InnerLayout>
    )
}
