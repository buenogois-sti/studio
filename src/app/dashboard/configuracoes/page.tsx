'use client';

import React from 'react';
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
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useDoc, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, setDoc } from 'firebase/firestore';
import type { UserProfile, UserRole, UserRoleInfo } from '@/lib/types';
import { ClientKitManager } from '@/components/settings/client-kit-manager';
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
        <Card>
        <CardHeader>
            <CardTitle>Integração com Google Workspace</CardTitle>
            <CardDescription>
            Gerencie a conexão com seu Google Drive para sincronização de pastas, documentos e planilhas.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Como Funciona a Integração</AlertTitle>
            <AlertDescription>
                Sua conta do Google é conectada quando você faz login. Isso permite que o LexFlow gerencie pastas e arquivos no seu Google Drive em seu nome, de forma segura.
            </AlertDescription>
            </Alert>
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5" />
                Status da Conexão
                </CardTitle>
            </CardHeader>
            <CardContent>
                {status === 'loading' ? (
                <div className="flex items-center justify-center p-3">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                ) : isConnected ? (
                <div className="flex items-center justify-between p-3 rounded-md bg-emerald-50 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200">
                    <div className="flex flex-col">
                    <span className="text-sm font-semibold">Conectado</span>
                    <span className="text-xs">{session?.user?.email}</span>
                    </div>
                    <Badge variant="default" className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100 pointer-events-none">Ativo</Badge>
                </div>
                ) : (
                <div className="flex items-center justify-between p-3 rounded-md bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                    <div className="flex flex-col">
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Não Conectado</span>
                    <span className="text-xs text-muted-foreground">Faça login para conectar sua conta.</span>
                    </div>
                    <Badge variant="outline" className="text-yellow-700 border-yellow-300 dark:text-yellow-300 dark:border-yellow-700">Inativo</Badge>
                </div>
                )}
            </CardContent>
            <CardFooter>
                {isConnected && (
                <Button variant="destructive" className="w-full" onClick={handleDisconnect} disabled={isDisconnecting}>
                    {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PowerOff className="mr-2 h-4 w-4" />}
                    {isDisconnecting ? 'Desconectando...' : 'Sair e Desconectar do Google'}
                </Button>
                )}
            </CardFooter>
            </Card>
        </CardContent>
        </Card>

        {isConnected && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderTree className="h-5 w-5" />
                        Manutenção do Google Drive
                    </CardTitle>
                    <CardDescription>
                        Ferramentas para organizar e inicializar a estrutura de pastas do escritório.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Estrutura Administrativa / Financeira</p>
                            <p className="text-xs text-muted-foreground">Cria a árvore de pastas padrão para gestão do escritório (Recebimentos, Pagamentos, Honorários, etc).</p>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
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

const roleSchema = z.object({
  email: z.string().email('Formato de email inválido.'),
  role: z.enum(['admin', 'lawyer', 'financial', 'assistant'], { required_error: 'Selecione um perfil.' }),
});

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
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Convidar Usuário</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{userToEdit ? 'Editar Usuário' : 'Convidar Novo Usuário'}</DialogTitle>
                    <DialogDescription>
                        Insira o e-mail e defina o perfil de acesso. O usuário receberá acesso na próxima vez que fizer login com esta conta Google.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input placeholder="usuario@buenogoisadvogado.com.br" {...field} disabled={!!userToEdit} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Perfil de Acesso</FormLabel>
                                     <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Selecione um perfil..." /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                            <SelectItem value="lawyer">Advogado</SelectItem>
                                            <SelectItem value="financial">Financeiro</SelectItem>
                                            <SelectItem value="assistant">Secretaria / Colaborador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSaving ? 'Salvando...' : 'Salvar'}
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

    const roleLabels: { [key: string]: string } = {
        admin: 'Administrador',
        lawyer: 'Advogado',
        financial: 'Financeiro',
        assistant: 'Secretaria / Colaborador',
    };

    const isUserProfile = (user: any): user is UserProfile => 'id' in user;

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gerenciamento de Usuários</CardTitle>
                        <CardDescription>Adicione, remova e gerencie as permissões dos usuários do sistema.</CardDescription>
                    </div>
                    <InviteUserDialog onInvite={() => { loadData(); setUserToEdit(null); }} userToEdit={userToEdit} />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Perfil</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : combinedUsers.map(user => (
                                <TableRow key={user.email}>
                                    <TableCell>{isUserProfile(user) ? `${user.firstName} ${user.lastName}` : <span className="text-muted-foreground">Convidado</span>}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell><Badge variant="secondary">{roleLabels[user.role] || user.role}</Badge></TableCell>
                                    <TableCell>
                                        {isUserProfile(user) ? <Badge className="bg-green-100 text-green-800">Ativo</Badge> : <Badge variant="outline">Pendente</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => setUserToEdit(user)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                           Tem certeza que deseja remover o acesso de "{userToDelete?.email}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                             {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Parâmetros Financeiros</CardTitle>
          <CardDescription>Defina padrões para honorários, vencimentos, moeda e alertas financeiros.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="defaultFee">Honorários Padrão (%)</Label>
                    <Input id="defaultFee" type="number" defaultValue="20" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Prazo de Pagamento Padrão (dias)</Label>
                    <Input id="paymentTerms" type="number" defaultValue="30" />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="currency">Moeda</Label>
                <Input id="currency" defaultValue="BRL (R$)" disabled />
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="late-fee-alerts" defaultChecked/>
                <Label htmlFor="late-fee-alerts">Ativar alertas de títulos vencidos</Label>
            </div>
        </CardContent>
        <CardFooter>
            <Button>Salvar Parâmetros</Button>
        </CardFooter>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Controle de Honorários da Equipe</CardTitle>
          <CardDescription>Gerencie as configurações de visualização de honorários para os advogados.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-6 w-10 rounded-lg" />
              <Skeleton className="h-5 w-64" />
            </div>
          ) : (
            <div className="flex items-center space-x-4 rounded-lg border p-4">
              <Switch
                id="fee-visibility"
                checked={isVisible}
                onCheckedChange={handleVisibilityChange}
              />
              <Label htmlFor="fee-visibility" className="cursor-pointer">
                Permitir que advogados visualizem seus próprios saldos de honorários
              </Label>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function AppearanceTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <CardDescription>Ajuste o tema de aparência do sistema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3 rounded-lg border p-4">
          <Switch id="dark-mode" defaultChecked disabled />
          <Label htmlFor="dark-mode" className="cursor-pointer">
            Modo Escuro (Padrão)
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          O modo escuro é o tema padrão. A funcionalidade para alternar entre temas claro/escuro em tempo real será implementada em breve.
        </p>
      </CardContent>
    </Card>
  );
}


export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight font-headline">
          Configurações
        </h1>
      </div>

      <Tabs defaultValue="integracoes" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 mb-6">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          <TabsTrigger value="kit-cliente">Kit Cliente</TabsTrigger>
          <TabsTrigger value="modelos-acervo">Modelos Acervo</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Escritório</CardTitle>
              <CardDescription>Informações principais que serão usadas em documentos e notificações.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="officeName">Nome do Escritório</Label>
                <Input id="officeName" defaultValue="Bueno Gois Advogados e Associados" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="officeAddress">Endereço Principal</Label>
                <Input id="officeAddress" defaultValue="Rua Marechal Deodoro, 1594 - Sala 2, São Bernardo do Campo / SP" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="officeEmail">E-mail Principal</Label>
                <Input id="officeEmail" type="email" defaultValue="contato@buenogoisadvogado.com.br" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="officePhone">Telefone</Label>
                <Input id="officePhone" defaultValue="(11) 98059-0128" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Salvar Alterações</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="kit-cliente">
            <ClientKitManager />
        </TabsContent>

        <TabsContent value="modelos-acervo">
            <TemplateLibraryManager />
        </TabsContent>

        <TabsContent value="financeiro">
          <FinancialTab />
        </TabsContent>

        <TabsContent value="usuarios">
          <UsersTab />
        </TabsContent>

        <TabsContent value="aparencia">
          <AppearanceTab />
        </TabsContent>

        <TabsContent value="backup">
          <BackupManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
