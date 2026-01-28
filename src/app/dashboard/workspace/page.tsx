'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Briefcase,
  Power,
  PowerOff,
  Folder,
  FileText,
  FileSpreadsheet,
  Link as LinkIcon,
  ChevronRight,
  PlusCircle,
  AlertCircle
} from 'lucide-react';

// Mock data
const synchronizedFolders = [
    { id: '1', name: 'Clientes/Innovatech Soluções/Processo 2024-051', fileCount: 12 },
    { id: '2', name: 'Clientes/Construtora Alfa/Contratos', fileCount: 5 },
    { id: '3', name: 'Administrativo/Modelos de Petição', fileCount: 38 },
];

const recentFiles = [
    { id: '1', name: 'Contrato Social - Innovatech.pdf', type: 'document', folder: 'Clientes/Innovatech Soluções/Processo 2024-051', url: '#' },
    { id: '2', name: 'Planilha de Custos - Construtora Alfa.xlsx', type: 'spreadsheet', folder: 'Clientes/Construtora Alfa/Contratos', url: '#' },
    { id: '3', name: 'Petição Inicial - Modelo 03.docx', type: 'document', folder: 'Administrativo/Modelos de Petição', url: '#' },
    { id: '4', name: 'Procuração Ad-Judicia.pdf', type: 'document', folder: 'Clientes/Innovatech Soluções/Processo 2024-051', url: '#' }
];

const fileIcons = {
    document: <FileText className="h-5 w-5 text-muted-foreground" />,
    spreadsheet: <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />,
};

export default function WorkspacePage() {
    const [isConnected, setIsConnected] = useState(false);
    const userEmail = 'sofia.mendes@lexflow.com';

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                    Integração com Google Workspace
                </h1>
            </div>

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Guia de Configuração</AlertTitle>
                <AlertDescription>
                    Para integrar seu Google Workspace, clique em &quot;Conectar com Google&quot; e autorize o acesso à sua conta. Isso permitirá que o LexFlow gerencie pastas e leia documentos do seu Google Drive.
                </AlertDescription>
            </Alert>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            Status da Conexão
                        </CardTitle>
                        <CardDescription>
                            Gerencie a conexão com sua conta Google Workspace.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isConnected ? (
                            <div className="flex items-center justify-between p-3 rounded-md bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-green-800 dark:text-green-200">Conectado</span>
                                    <span className="text-xs text-muted-foreground">{userEmail}</span>
                                </div>
                                <Badge variant="outline" className="text-green-700 border-green-300 dark:text-green-300 dark:border-green-700">Ativo</Badge>
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
                            <Button variant="destructive" className="w-full" onClick={() => setIsConnected(false)}>
                                <PowerOff className="mr-2 h-4 w-4" />
                                Desconectar
                            </Button>
                        ) : (
                            <Button className="w-full" onClick={() => setIsConnected(true)}>
                                <Power className="mr-2 h-4 w-4" />
                                Conectar com Google
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Folder className="h-5 w-5" />
                            Pastas Sincronizadas
                        </CardTitle>
                        <CardDescription>
                            Pastas do Google Drive que o LexFlow está monitorando.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isConnected ? (
                            <div className="space-y-3">
                                {synchronizedFolders.map(folder => (
                                    <div key={folder.id} className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <Folder className="h-5 w-5 text-primary"/>
                                            <div>
                                                <p className="text-sm font-medium">{folder.name}</p>
                                                <p className="text-xs text-muted-foreground">{folder.fileCount} arquivos</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon">
                                            <ChevronRight className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-sm text-center text-muted-foreground py-10">
                                Conecte sua conta para ver as pastas sincronizadas.
                            </div>
                        )}

                    </CardContent>
                    {isConnected && (
                         <CardFooter>
                            <Button variant="outline" className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4"/>
                                Adicionar Pasta do Drive
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Arquivos Acessados Recentemente</CardTitle>
                    <CardDescription>
                       Documentos e planilhas lidos pelo sistema. Outros tipos de arquivo podem ser acessados diretamente no Drive.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isConnected ? (
                        <div className="space-y-2">
                            {recentFiles.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        {fileIcons[file.type as keyof typeof fileIcons] || <FileText className="h-5 w-5 text-muted-foreground" />}
                                        <div>
                                            <p className="text-sm font-medium">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{file.folder}</p>
                                        </div>
                                    </div>
                                     <Button variant="outline" size="sm" asChild>
                                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                                            <LinkIcon className="mr-2 h-3.5 w-3.5" />
                                            Abrir no Drive
                                        </a>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-center text-muted-foreground py-10">
                            Conecte sua conta para ver os arquivos recentes.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
