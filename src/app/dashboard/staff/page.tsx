'use client';
import * as React from 'react';
import {
  MoreVertical,
  PlusCircle,
  Search,
  Loader2,
  Briefcase,
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
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StaffForm } from '@/components/staff/StaffForm';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { Staff } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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
  const { toast } = useToast();
  
  const { firestore } = useFirebase();
  const { data: session, status } = useSession();

  const staffQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'staff') : null),
    [firestore]
  );
  const { data: staffData, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);
  const staff = staffData || [];
  
  const isLoading = status === 'loading' || isLoadingStaff;

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
    const staffRef = doc(firestore, 'staff', staffToDelete.id);
    try {
        await deleteDoc(staffRef);
        toast({ title: 'Membro da equipe excluído!', description: `O membro ${staffToDelete.firstName} foi removido.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    } finally {
        setStaffToDelete(null);
        setIsDeleting(false);
    }
  };

  const onFormSave = () => {
    setIsSheetOpen(false);
    setEditingStaff(null);
  }

  return (
    <>
      <div className="grid flex-1 items-start gap-4 auto-rows-max">
        <div className="flex items-center gap-4">
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
            Gerenciamento de Equipe
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Button size="sm" className="h-8 gap-1" onClick={handleAddNew}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Adicionar Membro</span>
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
             <CardTitle>Membros da Equipe</CardTitle>
            <CardDescription>
              Visualize e gerencie os funcionários, advogados e estagiários do escritório.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="hidden md:table-cell">OAB</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                  ))
                ) : staff.length > 0 ? (
                  staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{`${member.firstName} ${member.lastName}`}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.role === 'lawyer' ? 'secondary'
                            : member.role === 'intern' ? 'default'
                            : 'outline'
                          }
                          className={cn({
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300':
                              member.role === 'lawyer',
                            'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300':
                              member.role === 'intern',
                          })}
                        >
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {member.oabNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2">
                                <Briefcase className="h-8 w-8 text-muted-foreground" />
                                <p>Nenhum membro na equipe ainda.</p>
                                <Button size="sm" variant="outline" onClick={handleAddNew}>Adicionar Membro</Button>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl w-full">
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
              &quot;{staffToDelete?.firstName} {staffToDelete?.lastName}&quot; e removerá seus dados de nossos servidores.
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

    