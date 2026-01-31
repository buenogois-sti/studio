'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useSession } from 'next-auth/react';

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
} from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import {
  useFirebase,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';


const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Home,
    roles: ['admin', 'lawyer', 'financial'],
  },
  {
    href: '/dashboard/clientes',
    label: 'Clientes',
    icon: Users,
    roles: ['admin', 'lawyer'],
  },
  {
    href: '/dashboard/processos',
    label: 'Processos',
    icon: FolderKanban,
    roles: ['admin', 'lawyer'],
  },
  {
    href: '/dashboard/audiencias',
    label: 'Audiências',
    icon: Calendar,
    roles: ['admin', 'lawyer'],
  },
  {
    href: '/dashboard/financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    roles: ['admin', 'financial'],
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

    const currentNavItem = getBestNavItemForPath(pathname);

    return (
        <SidebarProvider>
        <Sidebar variant="sidebar" collapsible="icon">
            <SidebarHeader className="h-14 justify-center p-2 group-data-[collapsible=icon]:justify-center">
            <Link href="/dashboard" className="flex items-center gap-2">
                <Logo />
                <span className="font-bold text-lg text-primary group-data-[collapsible=icon]:hidden">
                Dr. Alan
                </span>
            </Link>
            </SidebarHeader>
            <SidebarContent>
            <SidebarMenu>
                {navItems.map(
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
                {/* User info can go here if needed in footer as well */}
            </div>
            </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <SidebarTrigger className="shrink-0 md:hidden" />
            {getBreadcrumb()}
            <div className="ml-auto flex items-center gap-4">
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
                <UserNav />
            </div>
            </header>
            <main className="flex-1 p-4 sm:p-6">{children}</main>
        </SidebarInset>
        </SidebarProvider>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <InnerLayout>{children}</InnerLayout>
    )
}
