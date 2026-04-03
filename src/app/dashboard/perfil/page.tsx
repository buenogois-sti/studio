'use client';
import React, { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { Staff } from '@/lib/types';
import { StaffForm } from '@/components/staff/StaffForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, UserCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const { firestore } = useFirebase();

    const staffQuery = useMemoFirebase(
        () => (firestore && session?.user?.email ? 
            query(collection(firestore, 'staff'), where('email', '==', session.user.email), limit(1)) 
            : null),
        [firestore, session?.user?.email]
    );

    const { data: staffResults, isLoading: isStaffLoading } = useCollection<Staff>(staffQuery);
    const staffMember = staffResults?.[0] || null;

    if (status === 'loading' || isStaffLoading) {
        return (
            <div className="flex flex-col gap-6 p-8">
                <Skeleton className="h-40 w-full rounded-2xl bg-white/5" />
                <Skeleton className="h-96 w-full rounded-2xl bg-white/5" />
            </div>
        );
    }

    if (!staffMember) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <UserCircle className="h-16 w-16 text-muted-foreground/20" />
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white">Perfil não encontrado</h2>
                    <p className="text-muted-foreground">Não localizamos um registro de colaborador vinculado ao seu e-mail: {session?.user?.email}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-black tracking-tight font-headline text-white">Meus Dados Profissionais</h1>
                <p className="text-sm text-muted-foreground">Gerencie suas informações de contato, registro OAB e dados bancários.</p>
            </div>

            <Card className="bg-[#0f172a] border-border/50 shadow-none overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-border/50">
                    <CardTitle className="text-lg text-white font-bold flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-primary" />
                        Ficha do Colaborador
                    </CardTitle>
                    <CardDescription className="text-slate-400 italic text-[11px]">
                        As alterações feitas aqui refletem em seus repasses e notificações do sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <StaffForm staff={staffMember} onSave={() => {}} />
                </CardContent>
            </Card>
        </div>
    );
}
