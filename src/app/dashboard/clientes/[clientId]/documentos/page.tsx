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
  ExternalLink,
  Search,
  X,
  FileText
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
            <DialogContent className="bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Renomear Arquivo</DialogTitle>
                    <DialogDescription>
                        Digite o novo nome para &quot;{file?.name}&quot;.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        disabled={isRenaming}
                        className="bg-background"
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isRenaming}>Cancelar</Button></DialogClose>
                    <Button onClick={handleRename} disabled={!newName || isRenaming}>
                        {isRenaming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePenLine className="mr-2 h-4 w-4" />}
                        {isRenaming ? 'Salvando...' : 'Salvar Novo Nome'}
                    </Button>
                </DialogFooter>
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
            await uploadFile(folderId, file.name, file.type || 'application/octet-stream', fileContentBase64);
            
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
                <Button className="bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-10 px-6">
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar Arquivo
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-white font-headline">Upload de Documento</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Selecione um arquivo para salvar na pasta deste cliente no Drive.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input type="file" onChange={handleFileChange} disabled={isUploading} className="bg-background border-white/10" />
                    {file && <p className="text-xs text-muted-foreground font-bold">Selecionado: {file.name}</p>}
                </div>
                <DialogFooter className="gap-2">
                     <DialogClose asChild><Button variant="outline" disabled={isUploading}>Cancelar</Button></DialogClose>
                     <Button onClick={handleUpload} disabled={!file || isUploading} className="bg-primary text-primary-foreground">
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isUploading ? 'Enviando...' : 'Fazer Upload'}
                    </Button>
                </DialogFooter>
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
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [fileToRename, setFileToRename] = React.useState<DriveFile | null>(null);
    const [searchTerm, setSearchTerm] = React.useState('');

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

    const filteredFiles = React.useMemo(() => {
        if (!searchTerm.trim()) return files;
        const q = searchTerm.toLowerCase();
        return files.filter(f => (f.name || '').toLowerCase().includes(q));
    }, [files, searchTerm]);

    const handleDelete = async () => {
        if (!fileToDelete?.id) return;
        setIsDeleting(true);
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
            setIsDeleting(false);
        }
    };
    
    if (isClientLoading) {
        return <div className="flex h-screen items-center justify-center bg-[#020617]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
    }

    if (!clientData) {
        return <div className="text-center py-20 text-slate-500 italic">Cliente não encontrado ou acesso revogado.</div>
    }

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild className="h-10 w-10 border-white/10 hover:bg-white/5 text-white">
                        <Link href="/dashboard/clientes">
                            <ArrowLeft className="h-5 w-5" />
                            <span className="sr-only">Voltar</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-white font-headline leading-tight truncate max-w-md">
                            Arquivos: {clientName}
                        </h1>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">UID: {clientData.id.substring(0, 8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar nesta pasta..." 
                            className="pl-8 h-10 bg-card border-border/50 text-white" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-muted-foreground"><X className="h-4 w-4" /></button>}
                    </div>
                    {session && clientData.driveFolderId && (
                        <UploadFileDialog folderId={clientData.driveFolderId} onUploadSuccess={fetchFiles} />
                    )}
                </div>
            </div>

            <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5">
                    <CardTitle className="text-white">Repositório Google Drive</CardTitle>
                    <CardDescription className="text-slate-400">
                        Gerenciamento direto de documentos do cliente integrados ao Workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {error && (
                        <div className="m-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-4">
                            <AlertCircle className="text-rose-500 shrink-0" />
                            <div className="space-y-1">
                                <p className="font-bold text-rose-500 text-sm">Erro de Comunicação</p>
                                <p className="text-xs text-rose-400/80">{error}</p>
                            </div>
                        </div>
                    )}
                    <Table>
                        <TableHeader className="bg-black/20">
                            <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead className="w-[60px] text-[10px] font-black uppercase text-slate-500 px-6">Tipo</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-slate-500">Nome do Arquivo</TableHead>
                                <TableHead className="hidden md:table-cell text-[10px] font-black uppercase text-slate-500">Sincronizado em</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i} className="border-white/5">
                                        <TableCell className="px-6"><Skeleton className="h-10 w-10 rounded-xl bg-white/5" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-3/4 bg-white/5" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24 bg-white/5" /></TableCell>
                                        <TableCell className="text-right px-6"><Skeleton className="h-8 w-8 ml-auto bg-white/5" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredFiles.length > 0 ? (
                                filteredFiles.map(file => (
                                    <TableRow key={file.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                        <TableCell className="px-6">
                                            <div className="h-10 w-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center">
                                                {file.iconLink ? (
                                                    <img src={file.iconLink} alt="icon" className="h-5 w-5" />
                                                ) : (
                                                    <FileText className="h-5 w-5 text-blue-400" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <a href={file.webViewLink || '#'} target="_blank" rel="noopener noreferrer" className="font-bold text-white hover:text-primary transition-colors">
                                                    {file.name}
                                                </a>
                                                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">{file.mimeType?.split('.').pop()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell font-mono text-[10px] text-slate-400">
                                            {file.createdTime && format(new Date(file.createdTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-white/30 hover:text-white">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 text-white shadow-2xl p-1">
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 px-2 py-1.5 tracking-widest">Operações</DropdownMenuLabel>
                                                    <DropdownMenuItem onSelect={() => window.open(file.webViewLink || '#', '_blank')} className="gap-2 focus:bg-white/5">
                                                        <ExternalLink className="h-4 w-4 text-primary" />
                                                        <span className="font-bold text-white">Abrir no Drive</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => setFileToRename(file)} className="gap-2 focus:bg-white/5">
                                                        <FilePenLine className="h-4 w-4 text-slate-400" />
                                                        <span className="font-bold text-white">Renomear</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-white/5" />
                                                    <DropdownMenuItem onSelect={() => setFileToDelete(file)} className="text-rose-500 focus:bg-rose-500/10">
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="font-bold">Excluir</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-40 py-20 opacity-30 italic text-slate-500">
                                        Nenhum arquivo encontrado nesta pasta do cliente.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !isDeleting && !open && setFileToDelete(null)}>
                <AlertDialogContent className="bg-[#0f172a] border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Deseja realmente remover "{fileToDelete?.name}"? O arquivo será movido para a lixeira do Workspace.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel disabled={isDeleting} className="bg-transparent border-white/10 text-slate-400">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-rose-600 text-white hover:bg-rose-700 font-bold border-none">
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Excluir Item
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <RenameFileDialog 
                file={fileToRename} 
                onRenameSuccess={fetchFiles} 
                open={!!fileToRename} 
                onOpenChange={(open) => !open && setFileToRename(null)}
            />
        </div>
    );
}
