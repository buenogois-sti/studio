'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Briefcase,
  DollarSign,
  Palette,
  Users,
  Save,
  Power,
  PowerOff,
  Folder,
  FileText,
  FileSpreadsheet,
  Link as LinkIcon,
  ChevronRight,
  PlusCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';

function IntegrationsTab() {
  const { user, isUserLoading, firestore } = useFirebase();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Falha na Conexão com Google',
        description: `Ocorreu um erro: ${error}. Tente novamente.`,
      });
    }
  }, [searchParams, toast]);

  const isConnected = !!userProfile?.googleRefreshToken;

  const handleDisconnect = async () => {
    if (!userProfileRef) return;
    setIsDisconnecting(true);
    try {
      // In a real app, you would also call an API route to revoke the token on Google's side.
      // For simplicity here, we're just removing it from our database.
      await fetch('/api/auth/google/disconnect');

      updateDocumentNonBlocking(userProfileRef, {
        googleRefreshToken: null,
      });

      toast({
        title: 'Google Desconectado',
        description: 'A integração com o Google Workspace foi removida.',
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Desconectar',
        description: error.message || 'Não foi possível remover a integração.',
      });
    } finally {
      setIsDisconnecting(false);
    }
  }


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
          <AlertTitle>Guia de Configuração</AlertTitle>
          <AlertDescription>
            Para integrar seu Google Workspace, clique em &quot;Conectar com Google&quot; e autorize o acesso à sua conta. Isso permitirá que o LexFlow gerencie pastas e leia documentos do seu Google Drive em seu nome.
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
            {(isUserLoading || isUserProfileLoading) ? (
              <div className="flex items-center justify-center p-3">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : isConnected ? (
              <div className="flex items-center justify-between p-3 rounded-md bg-emerald-50 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Conectado</span>
                  <span className="text-xs">{user?.email}</span>
                </div>
                <Badge variant="default" className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100 pointer-events-none">Ativo</Badge>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-md bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Não Conectado</span>
                  <span className="text-xs text-muted-foreground">Autorize o acesso à sua conta.</span>
                </div>
                <Badge variant="outline" className="text-yellow-700 border-yellow-300 dark:text-yellow-300 dark:border-yellow-700">Inativo</Badge>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {isConnected ? (
              <Button variant="destructive" className="w-full" onClick={handleDisconnect} disabled={isDisconnecting}>
                {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PowerOff className="mr-2 h-4 w-4" />}
                {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link href="/api/auth/google/redirect">
                  <Power className="mr-2 h-4 w-4" />
                  Conectar com Google
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </CardContent>
    </Card>
  )
}

export default function ConfiguracoesPage() {
  const tabs = ["geral", "integracoes", "financeiro", "usuarios", "aparencia", "backup"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight font-headline">
          Configurações
        </h1>
      </div>

      <Tabs defaultValue="integracoes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-6">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
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
                <Input id="officeName" defaultValue="Dr. Alan Bueno De Gois - Advocacia Trabalhista" />
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

        <TabsContent value="financeiro">
          <Card>
            <CardHeader>
              <CardTitle>Parâmetros Financeiros</CardTitle>
              <CardDescription>Defina padrões para honorários, vencimentos, moeda e alertas financeiros.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultFee">Percentual Padrão de Honorários (%)</Label>
                  <Input id="defaultFee" type="number" defaultValue="20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDays">Dias de Vencimento Padrão</Label>
                  <Input id="dueDays" type="number" defaultValue="10" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda</Label>
                  <Input id="currency" defaultValue="BRL" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Formato de Data</Label>
                  <Input id="dateFormat" defaultValue="dd/MM/yyyy" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Salvar Parâmetros</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <CardDescription>Adicione, remova e gerencie as permissões dos usuários do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-16">
              <div className="flex flex-col items-center gap-1 text-center">
                <Users className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-bold tracking-tight">Em construção</h3>
                <p className="text-sm text-muted-foreground">O módulo de gerenciamento de usuários está sendo desenvolvido.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aparencia">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Personalize o tema e a aparência do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-16">
              <div className="flex flex-col items-center gap-1 text-center">
                <Palette className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-bold tracking-tight">Em construção</h3>
                <p className="text-sm text-muted-foreground">O módulo de customização visual está sendo desenvolvido.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Backup</CardTitle>
              <CardDescription>Configure e agende backups automáticos dos seus dados.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-16">
              <div className="flex flex-col items-center gap-1 text-center">
                <Save className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-bold tracking-tight">Em construção</h3>
                <p className="text-sm text-muted-foreground">O módulo de backup está sendo desenvolvido.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
