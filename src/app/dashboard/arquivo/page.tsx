'use client';

import * as React from 'react';
import {
  Archive,
  Search,
  Users,
  FolderKanban,
  FileText,
  RotateCcw,
  ExternalLink,
  Trash2,
  Loader2,
  X,
  Info
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { Client, Process } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ArquivoPage() {
  const { firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

  // Queries
  const processesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'processes') : null), [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const isLoading = isUserLoading || isLoadingProcesses || isLoadingClients;

  // Filtered Data
  const archivedProcesses = React.useMemo(() => {
    if (!processesData) return [];
    return processesData.filter(p => p.status === 'Arquivado' && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.processNumber?.includes(searchTerm)
    ));
  }, [processesData, searchTerm]);

  const inactiveClients = React.useMemo(() => {
    if (!clientsData) return [];
    return clientsData.filter(c => c.status === 'inactive' && (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.document?.includes(searchTerm)
    ));
  }, [clientsData, searchTerm]);

  const handleReactivateProcess = async (process: Process) => {
    if (!firestore) return;
    setIsProcessing(process.id);
    try {
      await updateDoc(doc(firestore, 'processes', process.id), { status: 'Ativo', updatedAt: new Date() });
      toast({ title: 'Processo Reativado!', description: `"${process.name}" voltou para a fila ativa.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReactivateClient = async (client: Client) => {
    if (!firestore) return;
    setIsProcessing(client.id);
    try {
      await updateDoc(doc(firestore, 'clients', client.id), { status: 'active', updatedAt: new Date() });
      toast({ title: 'Cliente Reativado!', description: `${client.firstName} ${client.lastName} agora está ativo.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline flex items-center gap-3">
            <Archive className="h-8 w-8 text-muted-foreground" />
            Arquivo Digital
          </h1>
          <p className="text-sm text-muted-foreground">Gestão de processos encerrados, clientes inativos e histórico documental.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar no arquivo..." 
            className="pl-8 pr-8" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <Tabs defaultValue="processes" className="w-full">
        <TabsList className="bg-muted/50 p-1 mb-6">
          <TabsTrigger value="processes" className="gap-2">
            <FolderKanban className="h-4 w-4" /> 
            Processos Arquivados 
            {archivedProcesses.length > 0 && <Badge variant="secondary" className="ml-1 px-1.5 h-4 text-[10px]">{archivedProcesses.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" /> 
            Clientes Inativos
            {inactiveClients.length > 0 && <Badge variant="secondary" className="ml-1 px-1.5 h-4 text-[10px]">{inactiveClients.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <FileText className="h-4 w-4" />
            Lixeira e Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="processes">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Processos</CardTitle>
              <CardDescription>Visualize ou reative processos que foram arquivados.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Processo</TableHead>
                    <TableHead>Nº do Processo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                    ))
                  ) : archivedProcesses.length > 0 ? (
                    archivedProcesses.map(p => (
                      <TableRow key={p.id} className="group">
                        <TableCell className="font-bold">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.processNumber || 'N/A'}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handleReactivateProcess(p)}
                            disabled={isProcessing === p.id}
                          >
                            {isProcessing === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                            Reativar
                          </Button>
                          {p.driveFolderId && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={`https://drive.google.com/drive/folders/${p.driveFolderId}`} target="_blank">
                                <ExternalLink className="h-4 w-4 text-blue-500" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                        Nenhum processo arquivado encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Base Inativa</CardTitle>
              <CardDescription>Clientes marcados como inativos por ausência de novas demandas.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Nome do Cliente</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                    ))
                  ) : inactiveClients.length > 0 ? (
                    inactiveClients.map(c => (
                      <TableRow key={c.id} className="group">
                        <TableCell className="font-bold">{c.firstName} {c.lastName}</TableCell>
                        <TableCell className="font-mono text-xs">{c.document}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handleReactivateClient(c)}
                            disabled={isProcessing === c.id}
                          >
                            {isProcessing === c.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                            Ativar Cadastro
                          </Button>
                          {c.driveFolderId && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={`https://drive.google.com/drive/folders/${c.driveFolderId}`} target="_blank">
                                <ExternalLink className="h-4 w-4 text-blue-500" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                        Nenhum cliente inativo na base.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <div className="grid gap-6">
            <Card className="border-dashed border-2 bg-muted/5">
              <CardHeader className="text-center">
                <CardTitle className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="h-8 w-8" />
                  </div>
                </CardTitle>
                <CardTitle>Arquivos Excluídos do Sistema</CardTitle>
                <CardDescription>
                  O LexFlow não apaga arquivos do Google Drive. Quando você exclui um registro no sistema, os documentos permanecem na pasta do cliente/processo no Drive.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-8">
                <Button variant="outline" className="gap-2" asChild>
                  <a href="https://drive.google.com/drive/trash" target="_blank">
                    <Trash2 className="h-4 w-4" /> Ver Lixeira do Google Drive
                  </a>
                </Button>
              </CardContent>
            </Card>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-blue-700 uppercase tracking-tight">Organização Automática</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  Para uma melhor organização, recomendamos criar uma pasta chamada "00 - ARQUIVO MORTO" na raiz do seu Google Drive e mover as pastas de clientes inativos para lá. O sistema continuará conseguindo abrir os arquivos pelo link direto se a pasta não for excluída.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
