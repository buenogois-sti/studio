'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

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
} from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { user } from '@/lib/data';
import { cn } from '@/lib/utils';

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
    href: '/dashboard/workspace',
    label: 'Workspace',
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
    '/dashboard/workspace': 'Workspace',
    '/dashboard/configuracoes': 'Configurações',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const userRole: UserRole = user.role;
  
  const getBreadcrumb = () => {
    const pathParts = pathname.split('/').filter(part => part);
    return (
        <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href="/dashboard">LexFlow</Link>
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
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
  }

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="h-14 justify-center p-2 group-data-[collapsible=icon]:justify-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-lg text-primary group-data-[collapsible=icon]:hidden">
              LexFlow
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map(
              (item) =>
                item.roles.includes(userRole) && (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
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
