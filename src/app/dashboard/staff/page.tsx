'use client';
import * as React from 'react';
import {
  MoreVertical,
  PlusCircle,
  Loader2,
  Mail,
  Phone,
  MessageSquare,
  FolderKanban,
  Search,
  X,
  TrendingUp,
  Users as UsersIcon,
  UserCheck,
  GraduationCap,
  DollarSign,
  AlertCircle,
  UserCircle
} from 'lucide-react';
import { useSession } from 'next-auth/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
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
import { StaffDetailsSheet } from '@/components/staff/StaffDetailsSheet';
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

function StaffBalance({ staffId }: { staffId: string }) {
    const { firestore } = useFirebase();
    const creditsQuery = useMemoFirebase(
        () => firestore ? collection(firestore, `staff/${staffId}/credits`) : null,
        [firestore, staffId]
    );
    const { data: credits } = useCollection<any>(creditsQuery);

    const available = React.useMemo(() => {
        if (!credits) return 0;
        return credits
            .filter(c => c.status === 'DISPONIVEL')
            .reduce((sum, c) => sum + c.value, 0);
    }, [credits]);

    if (available <= 0) return null;

    return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
            <DollarSign className="h-3 w-3" />
            <span className="text-[10px] font-black uppercase">Crédito: {available.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
    );
}

export default function StaffPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [selectedStaffForDetails, setSelectedStaffForDetails] = React.useState<Staff | null>(null);
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
  const staffList = staffData || [];
  
  const processesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'processes') : null),
    [firestore]
  );
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);
  const processes = processesData || [];

  const isLoading = status === 'loading' || isLoadingStaff || isLoadingProcesses;

  const stats = React.useMemo(() => {
      const total = staffList.length;
      const lawyers = staffList.filter(s => s.role === 'lawyer').length;
      const interns = staffList.filter(s => s.role === 'intern').length;
      const activeProcesses = processes.filter(p => p.status === 'Ativo').length;
      const avgWorkload = lawyers > 0 ? (activeProcesses / lawyers).toFixed(1) : '0';

      return { total, lawyers, interns, avgWorkload };
  }, [staffList, processes]);

  const filteredStaff = React.useMemo(() => {
    if (!searchTerm.trim()) return staffList;
    const queryStr = searchTerm.toLowerCase();
    return staffList.filter(member => {
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
      const email = member.email.toLowerCase();
      const role = (roleLabels[member.role] || member.role).toLowerCase();
      return fullName.includes(queryStr) || email.includes(queryStr) || role.includes(queryStr);
    });
  }, [staffList, searchTerm]);

  const handleAddNew = () => {
    setEditingStaff(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (member: Staff) => {
    setEditingStaff(member);
    setIsSheetOpen(true);
  };

  const handleViewDetails = (member: Staff) => {
    setSelectedStaffForDetails(member);
    setIsDetailsOpen(true);
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
        toast({ 
          variant: 'destructive', 
          title: 'Erro ao excluir', 
          description: error.message || 'Não foi possível remover o membro.' 
        });
    } finally {
        setIsDeleting(false);
    }
  };

  const onFormSave = () => {
    setIsSheetOpen(false);
    setEditingStaff(null);
  }

  return (
    <>
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-black tracking-tight font-headline">Equipe & Performance</h1>
                <p className="text-sm text-muted-foreground">Gestão de talentos e carga de trabalho do escritório.</p>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Pesquisar..." 
                    className="pl-8 pr-8 h-9" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5">
                    <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                )}
                </div>
                <Button size="sm" className="h-9 shadow-md" onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> Novo Membro
                </Button>
            </div>
            </div>

            {/* Top Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-muted/30 border-none shadow-none">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <UsersIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Equipe</p>
                            <p className="text-xl font-black leading-none">{stats.total}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-none shadow-none">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Advogados</p>
                            <p className="text-xl font-black leading-none">{stats.lawyers}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-none shadow-none">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estagiários</p>
                            <p className="text-xl font-black leading-none">{stats.interns}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-none shadow-none">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Carga Média</p>
                            <p className="text-xl font-black leading-none">{stats.avgWorkload} <span className='text-[10px] font-normal text-muted-foreground'>casos/adv</span></p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {isLoading ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}
            </div>
            ) : filteredStaff.length > 0 ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStaff.map((member) => {
                const memberProcesses = processes.filter(p => p.responsibleStaffIds?.includes(member.id));
                const activeCount = memberProcesses.filter(p => p.status === 'Ativo').length;
                const pendingCount = memberProcesses.filter(p => p.status === 'Pendente').length;

                return (
                    <Card key={member.id} className="relative flex flex-col group hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-primary/20">
                    <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-1.5">
                                <Badge variant="outline" className={cn(
                                    "w-fit text-[9px] font-black uppercase py-0 px-1.5 h-4",
                                    member.role === 'lawyer' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                    member.role === 'intern' ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                                    "bg-slate-500/10 text-slate-600 border-slate-500/20"
                                )}>
                                    {roleLabels[member.role] || member.role}
                                </Badge>
                                <h3 className="font-bold text-xl leading-tight group-hover:text-primary transition-colors">{`${member.firstName} ${member.lastName}`}</h3>
                                <div className='flex items-center gap-2'>
                                    {(member.role === 'lawyer' || member.role === 'intern') && (
                                        <Badge variant="secondary" className="text-[10px] font-mono h-4">OAB {member.oabNumber || 'N/A'}</Badge>
                                    )}
                                    <StaffBalance staffId={member.id} />
                                </div>
                            </div>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Ações de Equipe</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewDetails(member)} className="cursor-pointer">
                                    <UserCircle className="mr-2 h-4 w-4 text-primary" /> Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(member)} className="cursor-pointer">
                                    Editar Cadastro
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                    Relatório de Atividades
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => handleDeleteTrigger(member)}>Excluir Membro</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-grow space-y-6 pt-0">
                        <div className="flex items-center justify-center gap-2 p-1 bg-muted/30 rounded-xl">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm transition-all" asChild disabled={!member.email}>
                                <a href={`mailto:${member.email}`} title={member.email}><Mail className="h-4 w-4 text-blue-500" /></a>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm transition-all" asChild disabled={!member.whatsapp}>
                                <a href={`https://wa.me/${member.whatsapp?.replace(/\D/g, '')}`} target="_blank"><MessageSquare className="h-4 w-4 text-emerald-500" /></a>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm transition-all" asChild disabled={!member.phone}>
                                <a href={`tel:${member.phone}`}><Phone className="h-4 w-4 text-slate-500" /></a>
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Carga de Trabalho</h4>
                                <span className="text-[10px] font-bold text-primary">{memberProcesses.length} Total</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase">Ativos</span>
                                    <span className="text-lg font-black text-emerald-700">{activeCount}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex flex-col">
                                    <span className="text-[10px] font-black text-amber-600 uppercase">Pendentes</span>
                                    <span className="text-lg font-black text-amber-700">{pendingCount}</span>
                                </div>
                            </div>

                            {memberProcesses.length > 0 ? (
                                <div className="space-y-1.5">
                                    {memberProcesses.slice(0, 2).map(proc => (
                                        <div key={proc.id} className="flex items-center gap-2 text-[11px] p-2 rounded-lg bg-muted/20 border border-transparent hover:border-primary/20 transition-all">
                                            <FolderKanban className="h-3 w-3 text-muted-foreground" />
                                            <span className="flex-1 truncate font-medium">{proc.name}</span>
                                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 uppercase">{proc.status}</Badge>
                                        </div>
                                    ))}
                                    {memberProcesses.length > 2 && (
                                        <Button variant="link" size="sm" asChild className="p-0 h-auto text-[10px] font-bold uppercase text-primary">
                                            <Link href={`/dashboard/processos?staffId=${member.id}`}>Ver todos os processos</Link>
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-[10px] text-muted-foreground italic text-center py-4 border border-dashed rounded-xl bg-muted/5">
                                    Sem processos atribuídos.
                                </div>
                            )}
                        </div>
                    </CardContent>

                    {(member.role === 'lawyer' || member.role === 'intern') && member.oabStatus !== 'Ativa' && member.oabStatus && (
                        <div className="px-4 pb-4">
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/5 border border-rose-500/20 text-rose-600 text-[10px] font-bold">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Atenção: Situação OAB {member.oabStatus}
                            </div>
                        </div>
                    )}
                    </Card>
                )
                })}
            </div>
            ) : (
            <div className="flex flex-1 items-center justify-center rounded-3xl border-2 border-dashed bg-muted/5 min-h-[400px]">
                    <div className="flex flex-col items-center gap-4 text-center p-8">
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                        <UsersIcon className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold">Equipe vazia</h3>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                {searchTerm ? `Nenhum membro encontrado para "${searchTerm}".` : "Comece adicionando o primeiro membro para gerenciar o escritório."}
                            </p>
                        </div>
                        <div className="mt-2">
                            {searchTerm ? (
                            <Button variant="outline" onClick={() => setSearchTerm('')}>Limpar Pesquisa</Button>
                            ) : (
                            <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Membro</Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) setEditingStaff(null); setIsSheetOpen(open); }}>
            <SheetContent className="sm:max-w-4xl w-full">
            <SheetHeader>
                <SheetTitle>{editingStaff ? 'Editar Membro' : 'Novo Membro da Equipe'}</SheetTitle>
                <SheetDescription>Configure o perfil e os dados profissionais do colaborador.</SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-8rem)]">
                <StaffForm onSave={onFormSave} staff={editingStaff} />
            </ScrollArea>
            </SheetContent>
        </Sheet>

        <StaffDetailsSheet 
            staff={selectedStaffForDetails} 
            processes={processes}
            open={isDetailsOpen} 
            onOpenChange={setIsDetailsOpen} 
        />

        <AlertDialog open={!!staffToDelete} onOpenChange={(open) => !isDeleting && !open && setStaffToDelete(null)}>
            <AlertDialogContent className="sm:max-w-xl">
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir membro da equipe?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta ação removerá permanentemente os dados de <strong>{staffToDelete?.firstName} {staffToDelete?.lastName}</strong>. Os processos vinculados não serão excluídos, mas ficarão sem este responsável.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Exclusão'}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
