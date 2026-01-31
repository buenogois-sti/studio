'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  FilePenLine,
  MoreVertical,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Client } from '@/lib/types';
import { listFiles, uploadFile, deleteFile, renameFile } from '@/lib/drive-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { drive_v3 } from 'googleapis';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type DriveFile = drive_v3.Schema$File;

function RenameFileDialog({ file, onRenameSuccess, open, onOpenChange }: { file: DriveFile | null; onRenameSuccess: () => void; open: boolean; onOpenChange: (open: boolean) => void; }) {
    const [newName, setNewName] = React.useState('');
    const [isRenaming, setIsRenaming] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        if (file) {
            setNewName(file.name || '');
        }
    }, [file]);

    const handleRename = async () => {
        if (!newName || !file?.id) return;

        setIsRenaming(true);
        try {
            await renameFile(file.id, newName);
            toast({
                title: 'Arquivo Renomeado',
                description: `O arquivo foi renomeado para "${newName}".`,
            });
            onRenameSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Rename failed:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Renomear',
                description: error.message || 'Não foi possível renomear o arquivo.',
            });
        } finally {
            setIsRenaming(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isRenaming) onOpenChange(isOpen);
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Renomear Arquivo</DialogTitle>
                    <DialogDescription>
                        Digite o novo nome para o arquivo &quot;{file?.name}&quot;.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        disabled={isRenaming}
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRenaming}>Cancelar</Button>
                    <Button onClick={handleRename} disabled={!newName || isRenaming}>
                        {isRenaming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePenLine className="mr-2 h-4 w-4" />}
                        {isRenaming ? 'Salvando...' : 'Salvar Novo Nome'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function UploadFileDialog({ folderId, onUploadSuccess }: { folderId: string; onUploadSuccess: () => void }) {
    const [file, setFile] = React.useState<File | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const { toast } = useToast();
    const [open, setOpen] = React.useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64Content = result.split(',')[1];
            if (base64Content) {
                 resolve(base64Content);
            } else {
                 reject(new Error("Falha ao converter arquivo para Base64."));
            }
        };
        reader.onerror = error => reject(error);
    });

    const handleUpload = async () => {
        if (!file || !folderId) return;

        setIsUploading(true);
        try {
            const fileContentBase64 = await toBase64(file);
            await uploadFile(folderId, file.name, file.type, fileContentBase64);
            
            toast({
                title: 'Upload Concluído',
                description: `O arquivo "${file.name}" foi enviado com sucesso.`,
            });
            onUploadSuccess();
            setFile(null);
            setOpen(false);
        } catch (error: any) {
            console.error('Upload failed:', error);
            toast({
                variant: 'destructive',
                title: 'Erro no Upload',
                description: error.message || 'Não foi possível enviar o arquivo.',
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isUploading) setOpen(isOpen);
        }}>
            <DialogTrigger asChild>
                <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar Arquivo
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enviar Novo Arquivo</DialogTitle>
                    <DialogDescription>
                        Selecione um arquivo do seu computador para enviar para a pasta deste cliente no Google Drive.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input type="file" onChange={handleFileChange} disabled={isUploading} />
                    {file && <p className="text-sm text-muted-foreground">Arquivo selecionado: {file.name}</p>}
                </div>
                <div className="flex justify-end gap-2">
                     <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>Cancelar</Button>
                     <Button onClick={handleUpload} disabled={!file || isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isUploading ? 'Enviando...' : 'Enviar'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function ClientDocumentsPage({ params }: { params: { clientId: string } }) {
    const { clientId } = params;
    const { firestore } = useFirebase();
    const { data: session } = useSession();
    const { toast } = useToast();
    
    const [files, setFiles] = React.useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [fileToDelete, setFileToDelete] = React.useState<DriveFile | null>(null);
    const [fileToRename, setFileToRename] = React.useState<DriveFile | null>(null);

    const clientRef = useMemoFirebase(
        () => (firestore && clientId ? doc(firestore, 'clients', clientId) : null),
        [firestore, clientId]
    );
    const { data: clientData, isLoading: isClientLoading } = useDoc<Client>(clientRef);
    const clientName = clientData ? `${clientData.firstName} ${clientData.lastName}` : '';

    const fetchFiles = React.useCallback(async () => {
        if (!clientData?.driveFolderId || !session) return;
        setIsLoading(true);
        setError(null);
        try {
            const fileList = await listFiles(clientData.driveFolderId);
            setFiles(fileList);
        } catch (e: any) {
            setError(e.message);
            toast({
                variant: 'destructive',
                title: 'Erro ao Carregar Arquivos',
                description: e.message || 'Não foi possível buscar os documentos do Google Drive.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [clientData?.driveFolderId, session, toast]);

    React.useEffect(() => {
        if (clientData && session) {
            fetchFiles();
        }
    }, [clientData, session, fetchFiles]);

    const handleDelete = async () => {
        if (!fileToDelete?.id) return;
        try {
            await deleteFile(fileToDelete.id);
            toast({
                title: 'Arquivo Excluído',
                description: `O arquivo "${fileToDelete.name}" foi removido com sucesso.`,
            });
            fetchFiles();
        } catch (e: any) {
             toast({
                variant: 'destructive',
                title: 'Erro ao Excluir',
                description: e.message || 'Não foi possível remover o arquivo.',
            });
        } finally {
            setFileToDelete(null);
        }
    };
    
    if (isClientLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (!clientData) {
        return <div className="text-center">Cliente não encontrado.</div>
    }

    return (
        <>
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/dashboard/clientes">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Voltar para Clientes</span>
                        </Link>
                    </Button>
                    <h1 className="text-xl font-semibold font-headline">
                        Documentos de: {clientName}
                    </h1>
                    <div className="ml-auto">
                        {session && clientData.driveFolderId && (
                           <UploadFileDialog folderId={clientData.driveFolderId} onUploadSuccess={fetchFiles} />
                        )}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Gerenciador de Arquivos</CardTitle>
                        <CardDescription>
                            Visualize, envie e gerencie os arquivos deste cliente diretamente no Google Drive.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md flex items-center gap-4 my-4">
                                <AlertCircle />
                                <div>
                                    <p className="font-bold">Ocorreu um erro</p>
                                    <p>{error}</p>
                                </div>
                            </div>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Tipo</TableHead>
                                    <TableHead>Nome do Arquivo</TableHead>
                                    <TableHead className="hidden md:table-cell">Data de Criação</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-6 w-6 rounded-sm" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                                            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : files.length > 0 ? (
                                    files.map(file => (
                                        <TableRow key={file.id}>
                                            <TableCell>
                                                {file.iconLink && <img src={file.iconLink} alt={file.mimeType || 'file icon'} className="h-6 w-6" />}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <a href={file.webViewLink || '#'} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary">
                                                    {file.name}
                                                </a>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {file.createdTime && format(new Date(file.createdTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                            <span className="sr-only">Abrir menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => setFileToRename(file)}>
                                                            <FilePenLine className="mr-2 h-4 w-4" />
                                                            <span>Renomear</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onSelect={() => setFileToDelete(file)} className="text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            <span>Excluir</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            Nenhum arquivo encontrado nesta pasta.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
            <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o arquivo "{fileToDelete?.name}"? Esta ação não pode ser desfeita e removerá o arquivo permanentemente do seu Google Drive.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <RenameFileDialog 
                file={fileToRename} 
                onRenameSuccess={fetchFiles} 
                open={!!fileToRename} 
                onOpenChange={(open) => !open && setFileToRename(null)}
            />
        </>
    );
}
