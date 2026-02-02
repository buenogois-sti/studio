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
import { User } from 'lucide-react';

const roles: { role: UserRole; label: string }[] = [
  { role: 'admin', label: 'Administrador' },
  { role: 'lawyer', label: 'Advogado' },
  { role: 'financial', label: 'Financeiro' },
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

  const handleRoleChange = (role: string) => {
    if (role !== currentRole && userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { role });
    }
  };
  
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || isUserProfileLoading) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }
  
  if (!session || !session.user || !userProfile) {
    return null;
  }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full flex items-center justify-center bg-muted">
          <User className="h-5 w-5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
            {currentRoleLabel && <p className="text-xs leading-none text-muted-foreground pt-1">({currentRoleLabel})</p>}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup value={currentRole} onValueChange={handleRoleChange}>
            <DropdownMenuLabel>Perfil de Acesso</DropdownMenuLabel>
            {roles.map(({ role, label }) => (
                <DropdownMenuRadioItem key={role} value={role}>
                    {label}
                </DropdownMenuRadioItem>
            ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>Perfil</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push('/dashboard/financeiro')} className="cursor-pointer">
            Faturamento
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push('/dashboard/configuracoes')} className="cursor-pointer">
            Configurações
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
