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
import type { UserRole } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { Skeleton } from './ui/skeleton';

const roles: { role: UserRole; label: string }[] = [
  { role: 'admin', label: 'Administrador' },
  { role: 'lawyer', label: 'Advogado' },
  { role: 'financial', label: 'Financeiro' },
];

export function UserNav() {
  const { user, auth, isUserLoading } = useFirebase();
  const router = useRouter();
  const [currentRole, setCurrentRole] = React.useState<UserRole>('lawyer'); // Default role

  React.useEffect(() => {
    const storedRole = localStorage.getItem('user-role') as UserRole | null;
    if (storedRole && roles.some(r => r.role === storedRole)) {
      setCurrentRole(storedRole);
    } else {
        // Set a default role if nothing is stored or invalid
        const defaultRole = 'lawyer';
        localStorage.setItem('user-role', defaultRole);
        setCurrentRole(defaultRole);
    }
  }, []);

  const handleRoleChange = (role: string) => {
    if (role !== currentRole) {
      localStorage.setItem('user-role', role as UserRole);
      window.location.reload(); // Reload to apply role changes throughout the app
    }
  };
  
  const handleLogout = () => {
    if (auth) {
      auth.signOut().then(() => {
        router.push('/');
      });
    }
  };

  if (isUserLoading) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }
  
  if (!user) {
    return null; // Or a login button
  }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} data-ai-hint="person portrait" />
            <AvatarFallback>{user.displayName ? user.displayName.charAt(0) : user.email?.charAt(0).toUpperCase()}</AvatarFallback>
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
