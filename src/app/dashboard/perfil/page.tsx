'use client';
import React, { useMemo } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { Staff } from '@/lib/types';
import { StaffForm } from '@/components/staff/StaffForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserCircle, ShieldCheck, Calendar, HardDrive, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { UserProfile } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const { firestore } = useFirebase();
    const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
    const [isUserLoading, setIsUserLoading] = React.useState(true);

    const staffQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'staff') : null),
        [firestore]
    );
    const { data: staffList, isLoading: isStaffLoading } = useCollection<Staff>(staffQuery);

    React.useEffect(() => {
        async function fetchUserProfile() {
            if (!firestore || !session?.user?.id) return;
            try {
                const userDoc = await getDoc(doc(firestore, 'users', session.user.id));
                if (userDoc.exists()) {
                    setUserProfile(userDoc.data() as UserProfile);
                }
            } catch (error) {
                console.error("Erro ao buscar perfil de usuário:", error);
            } finally {
                setIsUserLoading(false);
            }
        }
        fetchUserProfile();
    }, [firestore, session?.user?.id]);

    const staffMember = useMemo(() => {
        if (!staffList || !session?.user?.email) return null;
        
        const normalize = (e: string) => e.toLowerCase()
            .replace('dra.', '')
            .replace('dr.', '')
            .replace('advogados', 'advogado');
        
        const target = normalize(session.user.email);
        return staffList.find(s => normalize(s.email) === target) || null;
    }, [staffList, session?.user?.email]);

    const googleStatus = React.useMemo(() => {
        if (!userProfile) return null;
        const scopes = userProfile.googleScopes || [];
        return {
            calendar: scopes.some(s => s.includes('calendar')),
            drive: scopes.some(s => s.includes('drive')),
            tasks: scopes.some(s => s.includes('tasks')),
            enabled: userProfile.googleSyncEnabled
        };
    }, [userProfile]);

    if (status === 'loading' || isStaffLoading || isUserLoading) {
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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight font-headline text-white">Meus Dados Profissionais</h1>
                    <p className="text-sm text-muted-foreground">Gerencie suas informações de contato, registro OAB e integração Google.</p>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Acesso Seguro Ativo</span>
                </div>
            </div>

            {/* Google Integration Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${googleStatus?.calendar ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Google Calendar</p>
                                <p className="text-xs font-bold text-white">{googleStatus?.calendar ? 'Sincronizado' : 'Não Conectado'}</p>
                            </div>
                        </div>
                        {googleStatus?.calendar ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => signIn('google', { callbackUrl: window.location.href, prompt: 'consent' })}
                                className="h-8 px-2 text-[9px] font-black uppercase bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20"
                            >
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin-slow" /> Sincronizar
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${googleStatus?.drive ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                <HardDrive className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Google Drive</p>
                                <p className="text-xs font-bold text-white">{googleStatus?.drive ? 'Acesso Ativo' : 'Sem Permissão'}</p>
                            </div>
                        </div>
                        {googleStatus?.drive ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => signIn('google', { callbackUrl: window.location.href, prompt: 'consent' })}
                                className="h-8 px-2 text-[9px] font-black uppercase bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20"
                            >
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin-slow" /> Corrigir
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${googleStatus?.tasks ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                <RefreshCw className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Google Tasks</p>
                                <p className="text-xs font-bold text-white">{googleStatus?.tasks ? 'Sincronizado' : 'Pendente'}</p>
                            </div>
                        </div>
                        {googleStatus?.tasks ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => signIn('google', { callbackUrl: window.location.href, prompt: 'consent' })}
                                className="h-8 px-2 text-[9px] font-black uppercase bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20"
                            >
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin-slow" /> Ativar
                            </Button>
                        )}
                    </CardContent>
                </Card>
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
