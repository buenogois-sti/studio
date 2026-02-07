'use client';
import * as React from 'react';
import { listFiles, uploadFile, deleteFile, renameFile, createFolder } from '@/lib/drive-actions';
import type { drive_v3 } from 'googleapis';
import { H1 } from '@/components/ui/typography';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ExternalLink,
  AlertCircle,
  Folder,
  FileText,
  Upload,
  FolderPlus,
  Trash2,
  FilePenLine,
  MoreVertical,
  Loader2,
  X,
  Search
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

// Folder ID for the "Acervo" in Google Drive
const ACERVO_FOLDER_ID = '1IgGKlDG2oQkJG9iReBq_t4QE8uUU-b3Y';

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
                description: `O item foi renomeado para "${newName}".`,
            });
            onRenameSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Rename failed:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Renomear',
                description: error.message || 'Não foi possível renomear o item.',
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
                    <DialogTitle>Renomear Item</DialogTitle>
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
                <Button size="sm" className="h-9 gap-1 bg-primary text-primary-foreground font-bold">
                    <Upload className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">Enviar Arquivo</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Enviar Novo Arquivo</DialogTitle>
                    <DialogDescription>
                        Selecione um documento para o Acervo Digital.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input type="file" onChange={handleFileChange} disabled={isUploading} className="bg-background" />
                    {file && <p className="text-xs text-muted-foreground font-bold">Selecionado: {file.name}</p>}
                </div>
                <DialogFooter>
                     <DialogClose asChild><Button variant="outline" disabled={isUploading}>Cancelar</Button></DialogClose>
                     <Button onClick={handleUpload} disabled={!file || isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isUploading ? 'Enviando...' : 'Fazer Upload'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function NewFolderDialog({ parentFolderId, onFolderCreated }: { parentFolderId: string; onFolderCreated: () => void }) {
    const [folderName, setFolderName] = React.useState('');
    const [isCreating, setIsCreating] = React.useState(false);
    const { toast } = useToast();
    const [open, setOpen] = React.useState(false);

    const handleCreate = async () => {
        if (!folderName) return;

        setIsCreating(true);
        try {
            await createFolder(parentFolderId, folderName);
            toast({
                title: 'Pasta Criada',
                description: `A pasta "${folderName}" foi criada com sucesso.`,
            });
            onFolderCreated();
            setFolderName('');
            setOpen(false);
        } catch (error: any) {
            console.error('Folder creation failed:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Criar Pasta',
                description: error.message || 'Não foi possível criar a pasta.',
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isCreating) setOpen(isOpen);
        }}>
            <DialogTrigger asChild>
                 <Button variant="outline" size="sm" className="h-9 gap-1 border-white/10 text-white hover:bg-white/5">
                    <FolderPlus className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">Nova Pasta</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Criar Nova Pasta</DialogTitle>
                    <DialogDescription>
                        Digite o nome da nova pasta a ser criada no Acervo.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input
                        placeholder="Nome da pasta"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        disabled={isCreating}
                        className="bg-background"
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isCreating}>Cancelar</Button></DialogClose>
                    <Button onClick={handleCreate} disabled={!folderName || isCreating}>
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
                        {isCreating ? 'Criando...' : 'Criar Pasta'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function AcervoPage() {
  const [files, setFiles] = React.useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = React.useState<DriveFile | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [fileToRename, setFileToRename] = React.useState<DriveFile | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { toast } = useToast();

  const fetchFiles = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fileList = await listFiles(ACERVO_FOLDER_ID);
      fileList.sort((a, b) => {
        const isAFolder = a.mimeType === 'application/vnd.google-apps.folder';
        const isBFolder = b.mimeType === 'application/vnd.google-apps.folder';
        if (isAFolder && !isBFolder) return -1;
        if (!isAFolder && isBFolder) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      setFiles(fileList);
    } catch (e: any) {
      setError(
        e.message || 'Não foi possível buscar os documentos do Google Drive.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filteredFiles = React.useMemo(() => {
    if (!searchTerm.trim()) return files;
    const query = searchTerm.toLowerCase();
    return files.filter(file => (file.name || '').toLowerCase().includes(query));
  }, [files, searchTerm]);

  const handleDelete = async () => {
      if (!fileToDelete?.id) return;
      setIsDeleting(true);
      try {
          await deleteFile(fileToDelete.id);
          toast({
              title: 'Item Excluído',
              description: `"${fileToDelete.name}" foi removido com sucesso.`,
          });
          setFileToDelete(null);
          fetchFiles();
      } catch (e: any) {
            console.error("Erro ao excluir arquivo do acervo:", e);
            toast({
              variant: 'destructive',
              title: 'Erro ao Excluir',
              description: e.message || 'Não foi possível remover o item do Drive.',
          });
      } finally {
          setIsDeleting(false);
      }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <H1 className="text-white text-3xl font-black">Acervo Digital</H1>
          <p className="text-sm text-muted-foreground">Biblioteca central de modelos e documentos institucionais.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar no acervo..." 
              className="pl-8 pr-8 h-9 bg-card border-border/50 text-white" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <NewFolderDialog parentFolderId={ACERVO_FOLDER_ID} onFolderCreated={fetchFiles} />
          <UploadFileDialog folderId={ACERVO_FOLDER_ID} onUploadSuccess={fetchFiles} />
        </div>
      </div>

      <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
        <CardHeader className="bg-white/5 border-b border-white/5">
          <CardTitle className="text-white font-headline">Biblioteca de Documentos</CardTitle>
          <CardDescription className="text-slate-400">
            Gerencie o repositório oficial de modelos do Bueno Gois Advogados.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="m-6 flex items-center gap-4 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-destructive-foreground">
              <AlertCircle className="text-rose-500" />
              <div>
                <p className="font-bold text-rose-500">Erro de Conexão com Drive</p>
                <p className="text-xs opacity-80">{error}</p>
              </div>
            </div>
          )}
          <Table>
            <TableHeader className="bg-black/20">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="w-[60px] text-[10px] font-black uppercase text-slate-500 px-6">Tipo</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500">Identificação do Item</TableHead>
                <TableHead className="hidden md:table-cell text-[10px] font-black uppercase text-slate-500">Criação</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-6">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-white/5">
                    <TableCell className="px-6">
                      <Skeleton className="h-10 w-10 rounded-xl bg-white/5" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-3/4 bg-white/5" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24 bg-white/5" />
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <Skeleton className="ml-auto h-8 w-8 bg-white/5" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredFiles.length > 0 ? (
                filteredFiles.map((file) => (
                  <TableRow key={file.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                    <TableCell className="px-6">
                      <div className="h-10 w-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center">
                        {file.mimeType === 'application/vnd.google-apps.folder' ? (
                          <Folder className="h-5 w-5 text-amber-500" />
                        ) : file.iconLink ? (
                          <img
                            src={file.iconLink}
                            alt="icon"
                            className="h-5 w-5"
                          />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <a
                          href={file.webViewLink || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-primary transition-colors font-bold"
                        >
                          {file.name}
                        </a>
                        <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">{file.mimeType?.split('.').pop()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-slate-400 font-mono">
                      {file.createdTime &&
                        format(new Date(file.createdTime), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                    </TableCell>
                    <TableCell className="text-right px-6">
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-white/30 hover:text-white">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 text-white shadow-2xl p-1">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 px-2 py-1.5 tracking-widest">Opções do Arquivo</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => window.open(file.webViewLink || '#', '_blank')} className="gap-2 focus:bg-white/5">
                                    <ExternalLink className="h-4 w-4 text-primary" />
                                    <span className="font-bold">Abrir no Drive</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFileToRename(file)} className="gap-2 focus:bg-white/5">
                                    <FilePenLine className="h-4 w-4 text-slate-400" />
                                    <span className="font-bold">Renomear</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5" />
                                <DropdownMenuItem onClick={() => setFileToDelete(file)} className="text-rose-500 gap-2 focus:bg-rose-500/10">
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
                  <TableCell colSpan={4} className="h-40 text-center py-20 opacity-30 italic text-slate-500">
                    {searchTerm ? 'Nenhum resultado para a busca.' : 'O acervo digital está vazio.'}
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
                      Tem certeza que deseja excluir "{fileToDelete?.name}"? Esta ação removerá o item permanentemente do seu Google Drive Workspace.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel disabled={isDeleting} className="bg-transparent border-white/10 text-slate-400">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-rose-600 text-white hover:bg-rose-700 border-none font-bold">
                      {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Confirmar Remoção
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
