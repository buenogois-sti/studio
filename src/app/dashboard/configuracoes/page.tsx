'use client';

import React from 'react';
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
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useDoc, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { ClientKitManager } from '@/components/settings/client-kit-manager';
import { TemplateLibraryManager } from '@/components/settings/template-library-manager';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BackupManager } from '@/components/settings/backup-manager';

function IntegrationsTab() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  
  const { firestore } = useFirebase();
  const userProfileRef = useMemoFirebase(
    () => (firestore && session?.user?.id ? doc(firestore, 'users', session.user.id) : null),
    [firestore, session]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    // This will just sign the user out of the application.
    // A true "disconnect" would involve revoking the Google token, which is more complex.
    try {
        if (userProfile?.googleRefreshToken) {
             // Ideally, you'd call an API route here to revoke the token on Google's side
             // For now, we'll just sign out.
            console.log("Revoke token logic would go here.");
        }
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

  const isConnected = status === 'authenticated';

  return (
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
  )
}

function UsersTab() {
    const { firestore } = useFirebase();
    const usersQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'users') : null),
        [firestore]
    );
    const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

    const roleLabels: { [key: string]: string } = {
        admin: 'Administrador',
        lawyer: 'Advogado',
        financial: 'Financeiro',
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Gerenciamento de Usuários</CardTitle>
                    <CardDescription>Adicione, remova e gerencie as permissões dos usuários do sistema.</CardDescription>
                </div>
                <Button disabled><PlusCircle className="mr-2 h-4 w-4" /> Convidar Usuário</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Perfil</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : users?.map(user => (
                            <TableRow key={user.id}>
                                <TableCell>{user.firstName} {user.lastName}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell><Badge variant="secondary">{roleLabels[user.role] || user.role}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" disabled><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" disabled><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
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
          <Card>
            <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>Ajuste o tema de aparência do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 rounded-lg border p-4">
                    <Switch id="dark-mode" defaultChecked />
                    <Label htmlFor="dark-mode" className="cursor-pointer">
                        Modo Escuro
                    </Label>
                </div>
                 <p className="text-sm text-muted-foreground">
                    Ative o modo escuro para uma experiência visual mais confortável. A troca de tema em tempo real será implementada em breve.
                </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <BackupManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
