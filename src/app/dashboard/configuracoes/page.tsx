
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSession, signOut } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Palette,
  Users,
  Save,
  PowerOff,
  Briefcase,
  AlertCircle,
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  FolderTree,
  ShieldCheck,
  Headset,
  ExternalLink,
  Zap,
  UserPlus,
  Mail,
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  Scale,
  DollarSign,
  Percent,
  Info,
  Instagram
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useDoc, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, setDoc } from 'firebase/firestore';
import type { UserProfile, UserRole, UserRoleInfo } from '@/lib/types';
import { ClientKitManager } from '@/components/settings/client-kit-manager';
import { AppearanceTab } from '@/components/settings/appearance-tab';
import { TemplateLibraryManager } from '@/components/settings/template-library-manager';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BackupManager } from '@/components/settings/backup-manager';
import { getUserRoles, upsertUserRole, deleteUserRole } from '@/lib/user-actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { initializeAdminDriveStructure } from '@/lib/admin-drive-actions';
import { cn } from '@/lib/utils';

const roleSchema = z.object({
  email: z.string().email('Formato de email inválido.'),
  role: z.enum(['admin', 'lawyer', 'financial', 'assistant'], { required_error: 'Selecione um perfil.' }),
});

const Separator = ({ className }: { className?: string }) => <div className={cn("h-px w-full bg-border", className)} />;

function InviteUserDialog({ onInvite, userToEdit }: { onInvite: () => void, userToEdit: (UserRoleInfo | UserProfile) | null }) {
    const [open, setOpen] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof roleSchema>>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
          email: '',
          role: 'lawyer',
        }
    });

    React.useEffect(() => {
        if (userToEdit) {
            form.reset({
                email: userToEdit.email,
                role: userToEdit.role,
            });
            setOpen(true);
        }
    }, [userToEdit, form]);

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
             form.reset({ email: '', role: 'lawyer'});
             onInvite();
        }
        setOpen(isOpen);
    }
    
    async function onSubmit(values: z.infer<typeof roleSchema>) {
        setIsSaving(true);
        const result = await upsertUserRole(values.email, values.role);
        if (result.success) {
            toast({ title: 'Sucesso!', description: 'O perfil do usuário foi salvo.' });
            onInvite();
            handleOpenChange(false);
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: result.error });
        }
        setIsSaving(false);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 font-bold h-10 gap-2 px-6">
                  <UserPlus className="h-4 w-4" /> 
                  <span>Convidar Usuário</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f172a] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-headline font-bold">
                      {userToEdit ? 'Editar Permissões' : 'Convidar p/ a Banca'}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        O acesso é liberado via Google Workspace após o convite.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">E-mail do Colaborador *</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <Input placeholder="usuario@buenogoisadvogado.com.br" className="pl-10 bg-black/40 border-white/10 h-11" {...field} disabled={!!userToEdit} />
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Perfil de Acesso (Permissions) *</FormLabel>
                                     <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-black/40 border-white/10 h-11"><SelectValue placeholder="Selecione um perfil..." /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                                            <SelectItem value="admin">⭐ Administrador (Total)</SelectItem>
                                            <SelectItem value="lawyer">⚖️ Advogado (Operacional)</SelectItem>
                                            <SelectItem value="financial">💰 Financeiro (Contas)</SelectItem>
                                            <SelectItem value="assistant">📋 Secretaria / Apoio</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="gap-2">
                            <DialogClose asChild><Button type="button" variant="ghost" className="text-slate-400">Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] h-11 px-8">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                {isSaving ? 'Salvando...' : 'Salvar Perfil'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

function UsersTab() {
    const { firestore } = useFirebase();
    const [combinedUsers, setCombinedUsers] = React.useState<(UserProfile | UserRoleInfo)[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [userToEdit, setUserToEdit] = React.useState<(UserProfile | UserRoleInfo) | null>(null);
    const [userToDelete, setUserToDelete] = React.useState<(UserProfile | UserRoleInfo) | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const { toast } = useToast();

    const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: activeUsers, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

    const loadData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const invitedUsers = await getUserRoles();
            const existingUsers = activeUsers || [];
            
            const existingUserEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
            const pendingInvites = invitedUsers.filter(r => !existingUserEmails.has(r.email.toLowerCase()));

            const combined = [...existingUsers, ...pendingInvites];
            setCombinedUsers(combined);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao carregar usuários', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [activeUsers, toast]);

    React.useEffect(() => {
        if (!isLoadingUsers) {
            loadData();
        }
    }, [isLoadingUsers, loadData]);

    const handleDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            await deleteUserRole(userToDelete.email);
            toast({ title: 'Usuário excluído com sucesso!' });
            loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
        }
        setIsDeleting(false);
        setUserToDelete(null);
    };

    const roleConfig: Record<string, { label: string; color: string; icon: any }> = {
        admin: { label: 'Administrador', color: 'text-primary border-primary/30 bg-primary/5', icon: Zap },
        lawyer: { label: 'Advogado', color: 'text-blue-400 border-blue-500/30 bg-blue-500/5', icon: Scale },
        financial: { label: 'Financeiro', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5', icon: DollarSign },
        assistant: { label: 'Secretaria', color: 'text-slate-400 border-slate-500/30 bg-slate-500/5', icon: Briefcase },
    };

    const isUserProfile = (user: any): user is UserProfile => 'id' in user;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-[#0f172a] border-white/5">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Users className="h-5 w-5" /></div>
                  <div><p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Total Banca</p><p className="text-xl font-black text-white">{combinedUsers.length}</p></div>
                </CardContent>
              </Card>
              <Card className="bg-[#0f172a] border-white/5">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400"><CheckCircle2 className="h-5 w-5" /></div>
                  <div><p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Ativos</p><p className="text-xl font-black text-white">{combinedUsers.filter(isUserProfile).length}</p></div>
                </CardContent>
              </Card>
              <Card className="bg-[#0f172a] border-white/5">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400"><Clock className="h-5 w-5" /></div>
                  <div><p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Pendentes</p><p className="text-xl font-black text-white">{combinedUsers.filter(u => !isUserProfile(u)).length}</p></div>
                </CardContent>
              </Card>
              <Card className="bg-[#0f172a] border-white/5">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400"><ShieldAlert className="h-5 w-5" /></div>
                  <div><p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Gestores</p><p className="text-xl font-black text-white">{combinedUsers.filter(u => u.role === 'admin').length}</p></div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-white/5 p-6 border-b border-white/5">
                    <div>
                        <CardTitle className="text-xl font-headline font-bold text-white">Gerenciamento de Usuários</CardTitle>
                        <CardDescription className="text-slate-400">Adicione, remova e gerencie as permissões dos usuários do sistema.</CardDescription>
                    </div>
                    <InviteUserDialog onInvite={() => { loadData(); setUserToEdit(null); }} userToEdit={userToEdit} />
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-black/20">
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-[10px] font-black uppercase text-slate-500 px-6">Nome / Identificação</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-slate-500">Email Workspace</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-slate-500">Perfil de Acesso</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-slate-500">Status</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i} className="border-white/5">
                                        <TableCell colSpan={5} className="p-6"><Skeleton className="h-8 w-full bg-white/5" /></TableCell>
                                    </TableRow>
                                ))
                            ) : combinedUsers.map(user => {
                                const config = roleConfig[user.role];
                                const RoleIcon = config.icon;
                                return (
                                  <TableRow key={user.email} className="border-white/5 hover:bg-white/5 transition-colors group">
                                      <TableCell className="px-6">
                                        <div className="flex items-center gap-3">
                                          <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-primary">
                                            {isUserProfile(user) ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : <UserPlus className="h-4 w-4" />}
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="font-bold text-white text-sm">{isUserProfile(user) ? `${user.firstName} ${user.lastName}` : <span className="text-slate-500 italic">Usuário Convidado</span>}</span>
                                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{user.role}</span>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-slate-300 font-medium text-xs">{user.email}</TableCell>
                                      <TableCell>
                                          <Badge variant="outline" className={cn("gap-1.5 h-7 px-3 text-[9px] font-black uppercase tracking-widest border-none shadow-sm", config.color)}>
                                            <RoleIcon className="h-3 w-3" />
                                            {config.label}
                                          </Badge>
                                      </TableCell>
                                      <TableCell>
                                          {isUserProfile(user) ? (
                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] font-black px-2 h-6">ATIVO</Badge>
                                          ) : (
                                            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5 text-[9px] font-black px-2 h-6 animate-pulse">PENDENTE</Badge>
                                          )}
                                      </TableCell>
                                      <TableCell className="text-right px-6">
                                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/30 hover:text-primary hover:bg-primary/10" onClick={() => setUserToEdit(user)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/30 hover:text-rose-500 hover:bg-rose-500/10" onClick={() => setUserToDelete(user)}><Trash2 className="h-4 w-4" /></Button>
                                          </div>
                                      </TableCell>
                                  </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                 <AlertDialogContent className="bg-[#0f172a] border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão de Acesso</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                           Tem certeza que deseja remover o acesso de "{userToDelete?.email}"? Esta ação é irreversível e o usuário perderá o acesso imediato à plataforma.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel disabled={isDeleting} className="bg-transparent border-white/10 text-slate-400 hover:text-white">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-rose-600 text-white hover:bg-rose-700 font-bold border-none">
                             {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Revogar Acesso
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function IntegrationsTab() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [isInitializingDrive, setIsInitializingDrive] = React.useState(false);
  
  const { firestore } = useFirebase();
  const userProfileRef = useMemoFirebase(
    () => (firestore && session?.user?.id ? doc(firestore, 'users', session.user.id) : null),
    [firestore, session]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
        await signOut({ callbackUrl: '/login' });
        toast({
            title: 'Desconectado',
            description: 'Você foi desconectado com sucesso.'
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Erro ao Desconectar',
            description: error.message,
        });
        setIsDisconnecting(false);
    }
  };

  const handleInitAdminDrive = async () => {
    setIsInitializingDrive(true);
    try {
        const result = await initializeAdminDriveStructure();
        if (result.success) {
            toast({
                title: 'Sucesso!',
                description: result.message,
            });
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Erro na Inicialização',
            description: error.message || 'Não foi possível criar a estrutura no Drive.',
        });
    } finally {
        setIsInitializingDrive(false);
    }
  };

  const isConnected = status === 'authenticated';

  return (
    <div className="space-y-6">
        <Card className="bg-[#0f172a] border-white/5">
        <CardHeader>
            <CardTitle className="text-white">Integração com Google Workspace</CardTitle>
            <CardDescription className="text-slate-400">
            Gerencie a conexão com seu Google Drive para sincronização de pastas, documentos e planilhas.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-400">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Como Funciona a Integração</AlertTitle>
            <AlertDescription className="text-xs">
                Sua conta do Google é conectada quando você faz login. Isso permite que o LexFlow gerencie pastas e arquivos no seu Google Drive em seu nome, de forma segura.
            </AlertDescription>
            </Alert>
            <Card className="bg-black/20 border-white/5">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-white uppercase font-black tracking-widest">
                <Briefcase className="h-4 w-4 text-primary" />
                Status da Conexão
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                {status === 'loading' ? (
                <div className="flex items-center justify-center p-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
                ) : isConnected ? (
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400">
                    <div className="flex flex-col">
                    <span className="text-sm font-bold">Autenticado via Google Cloud</span>
                    <span className="text-xs opacity-70">{session?.user?.email}</span>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-black text-[9px]">ONLINE</Badge>
                </div>
                ) : (
                <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-400">
                    <div className="flex flex-col">
                    <span className="text-sm font-bold text-amber-400">Conexão Interrompida</span>
                    <span className="text-xs opacity-70">Faça login para reconectar as APIs.</span>
                    </div>
                    <Badge variant="outline" className="text-amber-400 border-amber-500/30 font-black text-[9px]">OFFLINE</Badge>
                </div>
                )}
            </CardContent>
            <CardFooter className="p-4 pt-0">
                {isConnected && (
                <Button variant="destructive" className="w-full h-11 font-bold text-xs uppercase tracking-widest" onClick={handleDisconnect} disabled={isDisconnecting}>
                    {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PowerOff className="mr-2 h-4 w-4" />}
                    {isDisconnecting ? 'Desconectando...' : 'Sair e Desvincular Conta'}
                </Button>
                )}
            </CardFooter>
            </Card>
        </CardContent>
        </Card>

        {isConnected && (
            <Card className="bg-[#0f172a] border-white/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <FolderTree className="h-5 w-5 text-primary" />
                        Manutenção da Estrutura Drive
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Ferramentas para organizar e inicializar a estrutura de pastas do escritório.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border border-white/5 bg-black/20 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-white">Estrutura Administrativa / Financeira</p>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-md">Cria a árvore de pastas padrão para gestão do escritório (Recebimentos, Pagamentos, Honorários, etc) na raiz do Drive compartilhado.</p>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-10 border-primary/30 text-primary hover:bg-primary/10 font-black uppercase text-[10px]"
                            onClick={handleInitAdminDrive}
                            disabled={isInitializingDrive}
                        >
                            {isInitializingDrive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Inicializar Estrutura
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}
    </div>
  )
}

function FinancialTab() {
  const { firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system_settings', 'finance') : null, [firestore]);
  const { data: settings, isLoading: isLoadingSettings } = useDoc<{ lawyerFeeVisibility?: boolean }>(settingsRef);
  
  const isLoading = isUserLoading || isLoadingSettings;
  const isVisible = settings?.lawyerFeeVisibility ?? false;

  const handleVisibilityChange = async (checked: boolean) => {
      if (!settingsRef) return;
      try {
          await setDoc(settingsRef, { lawyerFeeVisibility: checked }, { merge: true });
          toast({ title: 'Configuração salva!', description: 'A visibilidade dos honorários foi atualizada.' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
      }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#0f172a] border-white/5">
        <CardHeader>
          <CardTitle className="text-white">Parâmetros Financeiros</CardTitle>
          <CardDescription className="text-slate-400">Defina padrões para honorários, vencimentos, moeda e alertas financeiros.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Honorários Padrão (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      <Input type="number" defaultValue="20" className="pl-10 bg-black/40 border-white/10" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vencimento Padrão (Dias)</Label>
                    <Input type="number" defaultValue="30" className="bg-black/40 border-white/10" />
                </div>
            </div>
            
            <Separator className="bg-white/5" />

            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-white">Alertas de Inadimplência</Label>
                  <p className="text-xs text-slate-500">Notificar gestores sobre títulos vencidos automaticamente.</p>
                </div>
                <Switch defaultChecked className="data-[state=checked]:bg-primary" />
            </div>
        </CardContent>
        <CardFooter className="bg-white/5 p-6 border-t border-white/5">
            <Button className="bg-primary text-primary-foreground font-black h-11 px-8 uppercase text-[11px] tracking-widest">
              <Save className="h-4 w-4 mr-2" /> Salvar Parâmetros
            </Button>
        </CardFooter>
      </Card>

      <Card className="bg-[#0f172a] border-white/5">
        <CardHeader>
          <CardTitle className="text-white">Controle de Honorários da Equipe</CardTitle>
          <CardDescription className="text-slate-400">Gerencie as configurações de visualização de honorários para os advogados.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-16 w-full bg-white/5 rounded-xl" />
          ) : (
            <div className="flex items-center justify-between p-5 rounded-2xl border-2 border-white/5 bg-black/20 hover:border-primary/20 transition-all group">
              <div className="space-y-1">
                <Label htmlFor="fee-visibility" className="text-sm font-bold text-white cursor-pointer block">Exibição de Saldos Individuais</Label>
                <p className="text-xs text-slate-500">Permitir que advogados visualizem seus próprios saldos de honorários e carteira pendente.</p>
              </div>
              <Switch
                id="fee-visibility"
                checked={isVisible}
                onCheckedChange={handleVisibilityChange}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LicenseTab() {
    return (
        <div className="space-y-6">
            <Card className="bg-[#0f172a] border-primary/20 border-2 shadow-[0_0_30px_rgba(245,208,48,0.05)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                  <ShieldCheck className="h-32 w-32 text-primary" />
                </div>
                <CardHeader>
                    <div className="flex items-center gap-3 text-primary mb-2">
                        <ShieldCheck className="h-6 w-6" />
                        <CardTitle className="text-white text-xl font-headline font-bold">Licenciamento LexFlow Elite</CardTitle>
                    </div>
                    <CardDescription className="text-slate-400 max-w-xl">Informações sobre o contrato de uso, suporte e manutenção da plataforma para o escritório Bueno Gois.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Plano Ativo</p>
                            <p className="text-lg font-black text-white">Premium Jurídico</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Status da Assinatura</p>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-black px-3 h-6 text-[10px]">ATIVO & PROTEGIDO</Badge>
                        </div>
                        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Próxima Renovação</p>
                            <p className="text-lg font-black text-white">Mensal (Dia 05)</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Zap className="h-3 w-3" /> Recursos Habilitados na Instância
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {[
                                'Integração Google Drive Full',
                                'Google Agenda & Tasks Sync',
                                'Análise Estratégica via IA (Gemini)',
                                'Módulo de BI e Relatórios Ilimitados',
                                'Backup Estrutural Automático',
                                'Suporte Técnico 24/7 Prioritário'
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-transparent hover:border-primary/20 transition-all text-xs text-slate-300 font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    {feature}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
                <CardHeader>
                    <div className="flex items-center gap-2 text-white">
                        <Headset className="h-5 w-5 text-blue-400" />
                        <CardTitle>Canal de Suporte e Desenvolvimento</CardTitle>
                    </div>
                    <CardDescription className="text-slate-400">Atendimento técnico especializado para a estrutura digital do escritório.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-6 rounded-2xl border border-white/5 bg-black/20 hover:border-primary/30 transition-all group">
                        <div className="space-y-1">
                            <p className="text-base font-bold text-white group-hover:text-primary transition-colors">Suporte Direto via WhatsApp</p>
                            <p className="text-xs text-slate-500">Fale com o time de engenharia para correções, melhorias ou novas funcionalidades.</p>
                        </div>
                        <Button variant="outline" className="h-12 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-black uppercase text-[10px] px-8 gap-2" asChild>
                            <a href="https://wa.me/5511980590128" target="_blank">
                                <ExternalLink className="h-4 w-4" /> Abrir Chamado
                            </a>
                        </Button>
                    </div>
                    <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-blue-400/80 text-[11px] italic leading-relaxed">
                        <Info className="h-4 w-4 inline-block mr-2" />
                        O plano de manutenção Bueno Gois inclui atualizações críticas de segurança, monitoramento de performance, garantia de integridade das APIs do Google e suporte a novos colaboradores.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ConfiguracoesPage() {
  const { firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  const generalSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system_settings', 'general') : null, [firestore]);
  const { data: generalSettings, isLoading: isLoadingGeneral } = useDoc<any>(generalSettingsRef);

  const [generalForm, setGeneralForm] = useState({
    officeName: 'Bueno Gois Advogados e Associados',
    adminEmail: 'contato@buenogoisadvogado.com.br',
    address: 'Rua Marechal Deodoro, 1594 - Sala 2, São Bernardo do Campo / SP',
    phone: '(11) 98059-0128',
    instagram: ''
  });

  useEffect(() => {
    if (generalSettings) {
      setGeneralForm({
        officeName: generalSettings.officeName || 'Bueno Gois Advogados e Associados',
        adminEmail: generalSettings.adminEmail || 'contato@buenogoisadvogado.com.br',
        address: generalSettings.address || 'Rua Marechal Deodoro, 1594 - Sala 2, São Bernardo do Campo / SP',
        phone: generalSettings.phone || '(11) 98059-0128',
        instagram: generalSettings.instagram || ''
      });
    }
  }, [generalSettings]);

  const handleSaveGeneral = async () => {
    if (!generalSettingsRef) return;
    setIsSavingGeneral(true);
    try {
      await setDoc(generalSettingsRef, generalForm, { merge: true });
      toast({ title: 'Configurações salvas!', description: 'As informações da instituição foram atualizadas.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } finally {
      setIsSavingGeneral(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline text-white">Configurações do Sistema</h1>
          <p className="text-sm text-muted-foreground">Gestão de infraestrutura, pessoas e parâmetros estratégicos.</p>
        </div>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="bg-[#0f172a] p-1 border border-white/5 mb-8 h-12 flex overflow-x-auto no-scrollbar justify-start">
          <TabsTrigger value="geral" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-6 h-10 shrink-0">Geral</TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-6 h-10 shrink-0">Integrações</TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-6 h-10 shrink-0">Usuários</TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-6 h-10 shrink-0">Financeiro</TabsTrigger>
          <TabsTrigger value="kit-cliente" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-6 h-10 shrink-0">Kit Cliente</TabsTrigger>
          <TabsTrigger value="modelos-acervo" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-6 h-10 shrink-0">Modelos</TabsTrigger>
          <TabsTrigger value="aparencia" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-6 h-10 shrink-0">Aparência</TabsTrigger>
          <TabsTrigger value="backup" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-6 h-10 shrink-0">Backup</TabsTrigger>
          <TabsTrigger value="licenca" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-6 h-10 shrink-0">Licença</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="animate-in fade-in duration-300">
          <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5 p-6">
              <CardTitle className="text-white">Dados da Instituição</CardTitle>
              <CardDescription className="text-slate-400">Informações principais que serão usadas em documentos e notificações oficiais.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nome do Escritório</Label>
                  <Input 
                    value={generalForm.officeName} 
                    onChange={e => setGeneralForm({...generalForm, officeName: e.target.value})}
                    className="bg-black/40 border-white/10 h-11 text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">E-mail Administrativo</Label>
                  <Input 
                    type="email" 
                    value={generalForm.adminEmail} 
                    onChange={e => setGeneralForm({...generalForm, adminEmail: e.target.value})}
                    className="bg-black/40 border-white/10 h-11 text-white" 
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Endereço da Sede</Label>
                  <Input 
                    value={generalForm.address} 
                    onChange={e => setGeneralForm({...generalForm, address: e.target.value})}
                    className="bg-black/40 border-white/10 h-11 text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Telefone / PABX</Label>
                  <Input 
                    value={generalForm.phone} 
                    onChange={e => setGeneralForm({...generalForm, phone: e.target.value})}
                    className="bg-black/40 border-white/10 h-11 text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Instagram (URL)</Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input 
                      value={generalForm.instagram} 
                      onChange={e => setGeneralForm({...generalForm, instagram: e.target.value})}
                      placeholder="https://instagram.com/buenogois" 
                      className="pl-10 bg-black/40 border-white/10 h-11 text-white" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-white/5 p-6 border-t border-white/5">
              <Button 
                onClick={handleSaveGeneral}
                disabled={isSavingGeneral}
                className="bg-primary text-primary-foreground font-black px-8 h-11 uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20"
              >
                {isSavingGeneral ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Atualizar Cadastro
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes" className="animate-in fade-in duration-300">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="usuarios" className="animate-in fade-in duration-300">
          <UsersTab />
        </TabsContent>

        <TabsContent value="financeiro" className="animate-in fade-in duration-300">
          <FinancialTab />
        </TabsContent>

        <TabsContent value="kit-cliente" className="animate-in fade-in duration-300">
            <ClientKitManager />
        </TabsContent>

        <TabsContent value="modelos-acervo" className="animate-in fade-in duration-300">
            <TemplateLibraryManager />
        </TabsContent>

        <TabsContent value="aparencia" className="animate-in fade-in duration-300">
          <AppearanceTab />
        </TabsContent>

        <TabsContent value="backup" className="animate-in fade-in duration-300">
          <BackupManager />
        </TabsContent>

        <TabsContent value="licenca" className="animate-in fade-in duration-300">
          <LicenseTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
