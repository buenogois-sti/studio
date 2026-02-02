'use client';
import * as React from 'react';
import {
  MoreVertical,
  PlusCircle,
  Loader2,
  Briefcase,
  Mail,
  Phone,
  MessageSquare,
  Copy,
  FolderKanban,
  Search,
  X
} from 'lucide-react';
import { useSession } from 'next-auth/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { StaffForm } from '@/components/staff/StaffForm';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { Staff, Process } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const roleLabels: { [key: string]: string } = {
  employee: 'Funcionário',
  lawyer: 'Advogado',
  intern: 'Estagiário',
};

export default function StaffPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<Staff | null>(null);
  const [staffToDelete, setStaffToDelete] = React.useState<Staff | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { toast } = useToast();
  
  const { firestore } = useFirebase();
  const { data: session, status } = useSession();

  const staffQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'staff') : null),
    [firestore]
  );
  const { data: staffData, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);
  const staff = staffData || [];
  
  const processesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'processes') : null),
    [firestore]
  );
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);
  const processes = processesData || [];

  const isLoading = status === 'loading' || isLoadingStaff || isLoadingProcesses;

  const filteredStaff = React.useMemo(() => {
    if (!searchTerm.trim()) return staff;
    const query = searchTerm.toLowerCase();
    return staff.filter(member => {
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
      const email = member.email.toLowerCase();
      const role = (roleLabels[member.role] || member.role).toLowerCase();
      return fullName.includes(query) || email.includes(query) || role.includes(query);
    });
  }, [staff, searchTerm]);

  const handleAddNew = () => {
    setEditingStaff(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (member: Staff) => {
    setEditingStaff(member);
    setIsSheetOpen(true);
  };

  const handleDeleteTrigger = (member: Staff) => {
    setStaffToDelete(member);
  };

  const confirmDelete = async () => {
    if (!firestore || !staffToDelete) return;
    setIsDeleting(true);
    try {
        const staffRef = doc(firestore, 'staff', staffToDelete.id);
        await deleteDoc(staffRef);
        toast({ title: 'Membro da equipe excluído!', description: `O membro ${staffToDelete.firstName} foi removido.` });
        setStaffToDelete(null);
    } catch (error: any) {
        console.error("Erro ao excluir membro da equipe:", error);
        toast({ 
          variant: 'destructive', 
          title: 'Erro ao excluir', 
          description: error.message || 'Não foi possível remover o membro. Verifique suas permissões.' 
        });
    } finally {
        setIsDeleting(false);
    }
  };

  const onFormSave = () => {
    setIsSheetOpen(false);
    setEditingStaff(null);
  }

  const handleCopy = (text: string | undefined) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        toast({
            title: 'Chave PIX copiada!',
            description: 'A chave foi copiada para a área de transferência.',
        });
    }).catch(err => {
        toast({
            variant: 'destructive',
            title: 'Falha ao copiar',
            description: 'Não foi possível copiar a chave PIX.',
        });
    });
  };

  return (
    <>
      <div className="grid flex-1 items-start gap-6 auto-rows-max">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className='flex items-center gap-2'>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
              Equipe
            </h1>
            {!isLoading && <Badge variant="secondary">{filteredStaff.length}</Badge>}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar equipe..." 
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
            <Button size="sm" className="h-9 gap-1" onClick={handleAddNew}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Novo Membro</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="w-full space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                   <Skeleton className="h-10 w-full" />
                   <Separator />
                   <Skeleton className="h-8 w-full" />
                   <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredStaff.length > 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStaff.map((member) => {
              const memberProcesses = processes.filter(p => p.responsibleStaffIds?.includes(member.id));
              return (
                <Card key={member.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h3 className="font-semibold text-xl truncate">{`${member.firstName} ${member.lastName}`}</h3>
                            <Badge
                              variant={
                                member.role === 'lawyer' ? 'secondary'
                                : member.role === 'intern' ? 'default'
                                : 'outline'
                              }
                              className={cn('mt-1', {
                                'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-700':
                                  member.role === 'lawyer',
                                'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-700':
                                  member.role === 'intern',
                              })}
                            >
                              {roleLabels[member.role] || member.role}
                            </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(member)}>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTrigger(member)}>
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    <div className="flex items-center justify-around rounded-lg bg-muted/50 p-1">
                        <Button variant="ghost" size="icon" asChild disabled={!member.email}>
                            <a href={`mailto:${member.email}`} title={member.email}><Mail /></a>
                        </Button>
                        <Button variant="ghost" size="icon" asChild disabled={!member.whatsapp}>
                            <a href={`https://wa.me/${member.whatsapp}`} target="_blank" title="Abrir no WhatsApp"><MessageSquare /></a>
                        </Button>
                        <Button variant="ghost" size="icon" asChild disabled={!member.phone}>
                            <a href={`tel:${member.phone}`} title="Ligar"><Phone /></a>
                        </Button>
                    </div>

                    {(member.role === 'lawyer' || member.role === 'intern') && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Dados da OAB</h4>
                          <div className="text-sm space-y-1 text-muted-foreground">
                            <p><strong>Nº OAB:</strong> {member.oabNumber || 'N/A'}</p>
                            <p><strong>Situação:</strong> {member.oabStatus || 'N/A'}</p>
                          </div>
                        </div>

                        <Separator />
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Dados Financeiros</h4>
                          <div className="text-sm space-y-1 text-muted-foreground">
                            <p><strong>Banco:</strong> {member.bankInfo?.bankName || 'N/A'}</p>
                            <p><strong>Agência:</strong> {member.bankInfo?.agency || 'N/A'} / <strong>Conta:</strong> {member.bankInfo?.account || 'N/A'}</p>
                            <div className="flex items-center gap-2">
                              <span><strong>Chave PIX:</strong> {member.bankInfo?.pixKey || 'N/A'}</span>
                              {member.bankInfo?.pixKey && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopy(member.bankInfo?.pixKey)}><Copy className="h-4 w-4"/></Button>}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Processos Atuantes ({memberProcesses.length})</h4>
                      <div className="space-y-2">
                          {memberProcesses.length > 0 ? (
                              memberProcesses.slice(0, 3).map(proc => (
                                  <div key={proc.id} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-muted/50">
                                      <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span className="flex-1 truncate font-medium">{proc.name}</span>
                                      <Badge variant={
                                          proc.status === 'Ativo' ? 'secondary' : proc.status === 'Arquivado' ? 'outline' : 'default'
                                      } className={cn('shrink-0', {
                                          'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700': proc.status === 'Ativo',
                                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700': proc.status === 'Pendente',
                                      })}>
                                          {proc.status}
                                      </Badge>
                                  </div>
                              ))
                          ) : (
                              <div className="text-sm text-muted-foreground text-center py-4 px-2 border border-dashed rounded-lg">Nenhum processo atribuído.</div>
                          )}
                          {memberProcesses.length > 3 && (
                              <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs mt-2">
                                <Link href={`/dashboard/processos?staffId=${member.id}`}>Ver todos os {memberProcesses.length} processos</Link>
                              </Button>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
           <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm min-h-[400px]">
                <div className="flex flex-col items-center gap-2 text-center p-8">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Briefcase className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight">Equipe não encontrada</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        {searchTerm ? `Nenhum membro encontrado para "${searchTerm}".` : "Comece adicionando um novo funcionário, advogado ou estagiário."}
                    </p>
                    <div className="mt-6">
                        {searchTerm ? (
                          <Button variant="outline" onClick={() => setSearchTerm('')}>Limpar Pesquisa</Button>
                        ) : (
                          <Button onClick={handleAddNew}>Adicionar Primeiro Membro</Button>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={(open) => {
          if (!open) {
            setEditingStaff(null);
          }
          setIsSheetOpen(open);
        }}>
        <SheetContent className="sm:max-w-4xl w-full">
          <SheetHeader>
            <SheetTitle>{editingStaff ? 'Editar Membro da Equipe' : 'Adicionar Novo Membro'}</SheetTitle>
            <SheetDescription>
              {editingStaff ? 'Altere os dados do membro abaixo.' : 'Preencha os dados para cadastrar um novo membro na equipe.'}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <StaffForm onSave={onFormSave} staff={editingStaff} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!staffToDelete} onOpenChange={(open) => !isDeleting && !open && setStaffToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o membro da equipe
              &quot;{staffToDelete?.firstName} {staffToDelete?.lastName}&quot; e removerá seus dados do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStaffToDelete(null)} disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
