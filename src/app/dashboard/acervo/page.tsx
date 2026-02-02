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
  X
} from 'lucide-react';
import Link from 'next/link';
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
            <DialogContent>
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
                <Button size="sm" className="h-8 gap-1">
                    <Upload className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only">Enviar Arquivo</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enviar Novo Arquivo</DialogTitle>
                    <DialogDescription>
                        Selecione um arquivo para enviar para a pasta do Acervo.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input type="file" onChange={handleFileChange} disabled={isUploading} />
                    {file && <p className="text-sm text-muted-foreground">Arquivo selecionado: {file.name}</p>}
                </div>
                <DialogFooter>
                     <DialogClose asChild><Button variant="outline" disabled={isUploading}>Cancelar</Button></DialogClose>
                     <Button onClick={handleUpload} disabled={!file || isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isUploading ? 'Enviando...' : 'Enviar'}
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
                 <Button variant="outline" size="sm" className="h-8 gap-1">
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only">Nova Pasta</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
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
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <H1>Acervo Digital</H1>
          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar no acervo..." 
                className="pl-8 pr-8 h-9" 
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

        <Card>
          <CardHeader>
            <CardTitle>Biblioteca Central de Documentos</CardTitle>
            <CardDescription>
              Gerencie a biblioteca de documentos padrão do escritório.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="my-4 flex items-center gap-4 rounded-md bg-destructive/90 p-4 text-destructive-foreground">
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
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Data de Criação
                  </TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-6 w-6 rounded-sm" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-3/4" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredFiles.length > 0 ? (
                  filteredFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        {file.mimeType ===
                        'application/vnd.google-apps.folder' ? (
                          <Folder className="h-6 w-6 text-yellow-500" />
                        ) : file.iconLink ? (
                          <img
                            src={file.iconLink}
                            alt={file.mimeType || 'file icon'}
                            className="h-6 w-6"
                          />
                        ) : (
                          <FileText className="h-6 w-6 text-gray-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <a
                          href={file.webViewLink || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary hover:underline"
                        >
                          {file.name}
                        </a>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {file.createdTime &&
                          format(new Date(file.createdTime), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
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
                                  <DropdownMenuItem onSelect={() => window.open(file.webViewLink || '#', '_blank')}>
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      <span>Abrir no Drive</span>
                                  </DropdownMenuItem>
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
                    <TableCell colSpan={4} className="h-24 text-center">
                      {searchTerm ? 'Nenhum arquivo encontrado para esta busca.' : 'Nenhum arquivo ou pasta encontrado no Acervo Digital.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !isDeleting && !open && setFileToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                      Tem certeza que deseja excluir "{fileToDelete?.name}"? Esta ação não pode ser desfeita e removerá o item permanentemente do seu Google Drive.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                      {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isDeleting ? 'Excluindo...' : 'Excluir'}
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
    </>
  );
}
