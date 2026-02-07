'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import type { UserProfile, UserRole } from '@/lib/types';
import { useFirebase, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { doc } from 'firebase/firestore';
import { User, ShieldCheck } from 'lucide-react';

const roles: { role: UserRole; label: string }[] = [
  { role: 'admin', label: 'Administrador' },
  { role: 'lawyer', label: 'Advogado' },
  { role: 'financial', label: 'Financeiro' },
  { role: 'assistant', label: 'Secretaria / Colaborador' },
];

export function UserNav() {
  const { data: session, status } = useSession();
  const { firestore } = useFirebase();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (firestore && session?.user?.id ? doc(firestore, 'users', session.user.id) : null),
    [firestore, session?.user?.id]
  );
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const currentRole = userProfile?.role;
  const currentRoleLabel = roles.find((r) => r.role === currentRole)?.label;
  const isAdmin = currentRole === 'admin';

  const handleRoleChange = (role: string) => {
    if (isAdmin && role !== currentRole && userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { role });
    }
  };
  
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || isUserProfileLoading) {
    return <Skeleton className="h-11 w-11 rounded-full" />;
  }
  
  if (!session || !session.user || !userProfile) {
    return null;
  }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-11 w-11 rounded-full flex items-center justify-center bg-muted overflow-hidden hover:bg-muted/80 transition-all">
          <User className="h-6 w-6 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
            <div className="flex items-center gap-1.5 mt-2">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">{currentRoleLabel}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {isAdmin ? (
            <DropdownMenuRadioGroup value={currentRole} onValueChange={handleRoleChange}>
                <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Alternar Visão (Admin)</DropdownMenuLabel>
                {roles.map(({ role, label }) => (
                    <DropdownMenuRadioItem key={role} value={role} className="text-xs">
                        {label}
                    </DropdownMenuRadioItem>
                ))}
            </DropdownMenuRadioGroup>
        ) : (
            <div className="px-2 py-1.5">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Seu Perfil</p>
                <p className="text-xs font-medium py-1">{currentRoleLabel}</p>
            </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer">Perfil</DropdownMenuItem>
          {(currentRole === 'admin' || currentRole === 'financial') && (
            <DropdownMenuItem onSelect={() => router.push('/dashboard/financeiro')} className="cursor-pointer">
                Faturamento
            </DropdownMenuItem>
          )}
          {currentRole === 'admin' && (
            <DropdownMenuItem onSelect={() => router.push('/dashboard/configuracoes')} className="cursor-pointer">
                Configurações
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          Sair do Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}