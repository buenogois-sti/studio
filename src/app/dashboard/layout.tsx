
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import {
  FolderKanban,
  Calendar,
  DollarSign,
  Settings,
  Briefcase,
  Loader2,
  BarChart,
  Library,
  History,
  CalendarDays,
  ShieldCheck,
  Archive,
  Receipt,
  Timer,
  Wallet,
  Zap,
  CheckSquare,
  LayoutDashboard,
  Users,
  MapPin,
  Gavel,
  Search,
  HeartHandshake
} from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import {
  useFirebase,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { NotificationBell } from '@/components/NotificationBell';
import { LGPDGuard } from '@/components/LGPDGuard';

const sidebarSections = [
  {
    label: 'Hub de Comando',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'lawyer', 'financial', 'assistant'] },
      { href: '/dashboard/relatorios', label: 'Relatórios BI', icon: BarChart, roles: ['admin', 'financial', 'lawyer'] },
      { href: '/dashboard/checklists', label: 'Lab. de Matrizes', icon: CheckSquare, roles: ['admin', 'lawyer', 'assistant', 'financial'] },
    ]
  },
  {
    label: 'Pessoal',
    items: [
      { href: '/dashboard/repasses?view=personal', label: 'Minha Wallet Digital', icon: Wallet, roles: ['lawyer', 'assistant'] },
    ]
  },
  {
    label: 'Relacionamento (CRM)',
    items: [
      { href: '/dashboard/leads', label: 'Leads (Triagem)', icon: Zap, roles: ['admin', 'lawyer', 'assistant'] },
      { href: '/dashboard/clientes', label: 'Clientes', icon: Users, roles: ['admin', 'lawyer', 'assistant', 'financial'] },
    ]
  },
  {
    label: 'Jurídico (Operação)',
    items: [
      { href: '/dashboard/processos', label: 'Processos', icon: FolderKanban, roles: ['admin', 'lawyer', 'assistant', 'financial'] },
      { href: '/dashboard/prazos', label: 'Prazos Judiciais', icon: Timer, roles: ['admin', 'lawyer', 'assistant'] },
      { href: '/dashboard/audiencias', label: 'Pauta de Audiências', icon: Gavel, roles: ['admin', 'lawyer', 'assistant'] },
      { href: '/dashboard/pericias', label: 'Perícias Judiciais', icon: Search, roles: ['admin', 'lawyer', 'assistant'], isNew: true },
      { href: '/dashboard/diligencias', label: 'Atos & Diligências', icon: MapPin, roles: ['admin', 'lawyer', 'assistant'] },
    ]
  },
  {
    label: 'Financeiro (Carteira)',
    items: [
      { href: '/dashboard/repasses', label: 'Wallets & Liquidações', icon: Wallet, roles: ['admin', 'financial'], isNew: true },
      { href: '/dashboard/financeiro', label: 'Faturamento', icon: DollarSign, roles: ['admin', 'financial'] },
      { href: '/dashboard/financeiro/calendario', label: 'Calendário Fluxo', icon: CalendarDays, roles: ['admin', 'financial'] },
      { href: '/dashboard/reembolsos', label: 'Reembolsos', icon: Receipt, roles: ['admin', 'lawyer', 'financial', 'assistant'] },
    ]
  },
  {
    label: 'Administrativo',
    items: [
      { href: '/dashboard/rh', label: 'RH & Folha de Elite', icon: ShieldCheck, roles: ['admin'], isNew: true },
      { href: '/dashboard/correspondentes', label: 'Correspondentes', icon: HeartHandshake, roles: ['admin', 'lawyer', 'assistant'] },
      { href: '/dashboard/acervo', label: 'Acervo de Modelos', icon: Library, roles: ['admin', 'lawyer', 'assistant'] },
      { href: '/dashboard/arquivo', label: 'Arquivo Digital', icon: Archive, roles: ['admin', 'lawyer', 'assistant'] },
      { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin'] },
    ]
  }
];

const BreadcrumbMap: { [key: string]: string } = {
  '/dashboard': 'Dashboard',
  '/dashboard/leads': 'Leads (Triagem)',
  '/dashboard/clientes': 'Clientes',
  '/dashboard/processos': 'Processos',
  '/dashboard/prazos': 'Prazos Judiciais',
  '/dashboard/audiencias': 'Audiências',
  '/dashboard/pericias': 'Perícias Judiciais',
  '/dashboard/diligencias': 'Atos Operacionais',
  '/dashboard/correspondentes': 'Correspondentes',
  '/dashboard/reembolsos': 'Reembolsos',
  '/dashboard/financeiro': 'Financeiro',
  '/dashboard/financeiro/calendario': 'Calendário Financeiro',
  '/dashboard/repasses': 'Carteira & Repasses',
  '/dashboard/relatorios': 'Relatórios Gerenciais',
  '/dashboard/acervo': 'Acervo de Modelos',
  '/dashboard/arquivo': 'Arquivo Digital',
  '/dashboard/staff': 'Equipe',
  '/dashboard/rh': 'Recursos Humanos',
  '/dashboard/rh/payroll': 'Folha de Pagamento',
  '/dashboard/rh/correspondents': 'Correspondentes',
  '/dashboard/configuracoes': 'Configurações',
  '/dashboard/checklists': 'Laboratório de Matrizes',
};

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
                <Link href="/dashboard" className="text-muted-foreground hover:text-white">Início</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
            {pathParts.map((part, index) => {
                const href = `/${pathParts.slice(0, index + 1).join('/')}`;
                const isLast = index === pathParts.length - 1;
                return (
                <React.Fragment key={href}>
                    <BreadcrumbSeparator className="text-muted-foreground/50" />
                    <BreadcrumbItem>
                    {isLast ? (
                        <BreadcrumbPage className="text-white font-bold">{BreadcrumbMap[href] || part}</BreadcrumbPage>
                    ) : (
                        <BreadcrumbLink asChild>
                        <Link href={href} className="text-muted-foreground hover:text-white">{BreadcrumbMap[href] || part}</Link>
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

    if (status === 'loading' || !session || isUserProfileLoading) {
        return (
        <div className="flex h-screen w-full items-center justify-center bg-[#020617]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        );
    }

    const isAuthorized = (roles: string[]) => userProfile && roles.includes(userProfile.role);

    return (
        <LGPDGuard>
          <SidebarProvider>
          <Sidebar variant="sidebar" collapsible="icon" className="border-r border-white/5">
              <SidebarHeader className="h-16 justify-center px-4 group-data-[collapsible=icon]:justify-center border-b border-white/5 bg-[#020617]">
              <Link href="/dashboard" className="flex items-center gap-3">
                  <Logo />
                  <span className="font-bold text-xl text-white tracking-tight group-data-[collapsible=icon]:hidden">
                  Bueno Gois
                  </span>
              </Link>
              </SidebarHeader>
              <SidebarContent className="bg-[#020617]">
                {sidebarSections.map((section) => {
                  const accessibleItems = section.items.filter(item => isAuthorized(item.roles));
                  if (accessibleItems.length === 0) return null;

                  return (
                    <SidebarGroup key={section.label}>
                      <SidebarGroupLabel className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-4 py-4">
                        {section.label}
                      </SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu className="px-2">
                          {accessibleItems.map((item) => (
                            <SidebarMenuItem key={item.label}>
                              <SidebarMenuButton
                                asChild
                                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                                tooltip={item.label}
                                className={cn(
                                    "data-[active=true]:bg-primary/10 data-[active=true]:text-primary text-slate-400 hover:text-white transition-all h-10",
                                    (item as any).isNew && "border-l-2 border-amber-500/50 bg-amber-500/5"
                                )}
                              >
                                <Link href={item.href}>
                                  <item.icon className={cn((item as any).isNew && "text-amber-400")} />
                                  <span className={cn("font-bold flex-1", (item as any).isNew && "text-amber-400")}>{item.label}</span>
                                  {(item as any).isNew && (
                                    <span className="ml-auto text-[8px] font-bold bg-amber-400 text-black px-1.5 py-0.5 rounded-sm shadow-[0_0_10px_rgba(251,191,36,0.4)] animate-pulse">NEW</span>
                                  )}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  );
                })}
              </SidebarContent>
              <SidebarFooter className="bg-[#020617] justify-center h-14 border-t border-white/5 group-data-[collapsible=icon]:justify-center">
              </SidebarFooter>
          </Sidebar>
          <SidebarInset className="bg-[#020617] min-h-screen">
              <header className="flex h-14 items-center gap-4 border-b border-white/5 bg-[#020617]/95 backdrop-blur-md px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
              <SidebarTrigger className="shrink-0 text-white" />
              {getBreadcrumb()}
              <div className="ml-auto flex items-center gap-2">
                  <NotificationBell />
                  <UserNav />
              </div>
              </header>
              <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-transparent">
                {children}
              </main>
          </SidebarInset>
          </SidebarProvider>
        </LGPDGuard>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <InnerLayout>{children}</InnerLayout>
    )
}
