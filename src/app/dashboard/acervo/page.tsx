'use client';
import * as React from 'react';
import { listFiles } from '@/lib/drive-actions';
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
import { ExternalLink, AlertCircle, Folder, FileText } from 'lucide-react';
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

// Folder ID for the "Acervo" in Google Drive
const ACERVO_FOLDER_ID = '1IgGKlDG2oQkJG9iReBq_t4QE8uUU-b3Y';

export default function AcervoPage() {
  const [files, setFiles] = React.useState<drive_v3.Schema$File[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchFiles = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fileList = await listFiles(ACERVO_FOLDER_ID);
      // Sort files: folders first, then by name alphabetically
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

  return (
    <div className="flex flex-col gap-6">
      <H1>Acervo Digital</H1>

      <Card>
        <CardHeader>
          <CardTitle>Biblioteca Central de Documentos</CardTitle>
          <CardDescription>
            Acesse a biblioteca de documentos padrão do escritório, como
            convenções coletivas, jurisprudências e modelos, diretamente do
            Google Drive.
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
                      <Skeleton className="ml-auto h-8 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : files.length > 0 ? (
                files.map((file) => (
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
                      <Button asChild variant="secondary" size="sm">
                        <Link href={file.webViewLink || ''} target="_blank">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Nenhum arquivo ou pasta encontrado no Acervo Digital.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
