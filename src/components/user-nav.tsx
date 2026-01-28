'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

const roles: { role: UserRole; label: string }[] = [
  { role: 'admin', label: 'Administrador' },
  { role: 'lawyer', label: 'Advogado' },
  { role: 'financial', label: 'Financeiro' },
];

export function UserNav() {
  const { user, auth, isUserLoading, firestore } = useFirebase();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const currentRole = userProfile?.role;

  const handleRoleChange = (role: string) => {
    if (role !== currentRole && userProfileRef) {
      // The UI will reactively update due to the onSnapshot listener in useDoc
      updateDocumentNonBlocking(userProfileRef, { role });
    }
  };
  
  const handleLogout = () => {
    if (auth) {
      auth.signOut().then(() => {
        router.push('/');
      });
    }
  };

  if (isUserLoading || isUserProfileLoading) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }
  
  if (!user || !userProfile) {
    return null;
  }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} data-ai-hint="person portrait" />
            <AvatarFallback>{userProfile.firstName ? userProfile.firstName.charAt(0) : 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
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
          <DropdownMenuItem>Faturamento</DropdownMenuItem>
          <DropdownMenuItem>Configurações</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
