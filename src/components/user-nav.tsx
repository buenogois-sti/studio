'use client';

import Link from 'next/link';
import React from 'react';
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
import { user } from '@/lib/data';
import type { UserRole } from '@/lib/types';

const roles: { role: UserRole; label: string }[] = [
  { role: 'admin', label: 'Administrador' },
  { role: 'lawyer', label: 'Advogado' },
  { role: 'financial', label: 'Financeiro' },
];

export function UserNav() {
  const [currentRole, setCurrentRole] = React.useState<UserRole>(user.role);

  React.useEffect(() => {
    const storedRole = localStorage.getItem('user-role') as UserRole | null;
    if (storedRole && roles.some(r => r.role === storedRole)) {
      setCurrentRole(storedRole);
    } else {
        localStorage.setItem('user-role', user.role);
        setCurrentRole(user.role);
    }
  }, []);

  const handleRoleChange = (role: string) => {
    if (role !== currentRole) {
      localStorage.setItem('user-role', role as UserRole);
      window.location.reload();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person portrait" />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
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
        <DropdownMenuItem asChild>
          <Link href="/">Sair</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
