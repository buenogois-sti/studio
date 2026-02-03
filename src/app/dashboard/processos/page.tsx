'use client';
import * as React from 'react';
import {
  MoreVertical,
  PlusCircle,
  Search,
  Loader2,
  X,
  DollarSign,
  ExternalLink,
  FolderOpen,
  History,
  FileText,
  Copy
} from 'lucide-react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { H2 } from '@/components/ui/typography';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, Timestamp, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Process, Client, DocumentTemplate } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { syncProcessToDrive } from '@/lib/drive';
import { FinancialEventDialog } from '@/components/process/FinancialEventDialog';
import { ProcessTimelineSheet } from '@/components/process/ProcessTimelineSheet';

export default function ProcessosPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = React.useState(false);
  const [editingProcess, setEditingProcess] = React.useState<Process | null>(null);
  const [selectedProcessForTimeline, setSelectedProcessForTimeline] = React.useState<Process | null>(null);
  const [processToDelete, setProcessToDelete] = React.useState<Process | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [eventProcess, setEventProcess] = React.useState<Process | null>(null);

  const { firestore, isUserLoading } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();

  const processesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'processes') : null), [firestore]);
  const { data: processesData, isLoading: isLoadingProcesses } = useCollection<Process>(processesQuery);

  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clientsData } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, `${c.firstName} ${c.lastName}`])), [clientsData]);

  const filteredProcesses = React.useMemo(() => {
    if (!processesData) return [];
    return processesData.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.processNumber?.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
  }, [processesData, searchTerm, statusFilter]);

  const confirmDelete = async () => {
    if (!firestore || !processToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'processes', processToDelete.id));
      toast({ title: 'Processo excluído!' });
      setProcessToDelete(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally { setIsDeleting(false); }
  };

  const isLoading = isUserLoading || isLoadingProcesses;

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold font-headline">Processos</h1>
          <div className="flex gap-2">
            <Input placeholder="Buscar..." className="w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <Button size="sm" onClick={() => { setEditingProcess(null); setIsSheetOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Novo</Button>
          </div>
        </div>

        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead>Processo</TableHead><TableHead>Cliente</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) : 
            filteredProcesses.map(p => (
                <TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>{clientsMap.get(p.clientId)}</TableCell><TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedProcessForTimeline(p); setIsTimelineOpen(true); }}><History className="mr-2 h-4 w-4" /> Timeline</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEventProcess(p)}><DollarSign className="mr-2 h-4 w-4" /> Financeiro</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setProcessToDelete(p)}>Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell></TableRow>
            ))}
          </TableBody></Table>
        </CardContent></Card>
      </div>

      <ProcessTimelineSheet process={selectedProcessForTimeline} open={isTimelineOpen} onOpenChange={setIsTimelineOpen} />
      <FinancialEventDialog process={eventProcess} open={!!eventProcess} onOpenChange={o => !o && setEventProcess(null)} onEventCreated={() => {}} />
      <AlertDialog open={!!processToDelete} onOpenChange={o => !o && setProcessToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Processo?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? <Loader2 className="animate-spin" /> : 'Excluir'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}