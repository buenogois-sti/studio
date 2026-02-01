'use client';
import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Trash2, Edit, FileText, Folder } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import type { DocumentTemplate } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';

const templateSchema = z.object({
  name: z.string().min(3, 'O nome do modelo é obrigatório.'),
  description: z.string().min(3, 'A descrição é obrigatória.'),
  category: z.string().min(3, 'A categoria é obrigatória.'),
  templateFileId: z.string().min(10, 'O ID do Google Drive é obrigatório.'),
});

function TemplateFormDialog({ template }: { template?: DocumentTemplate | null }) {
    const [open, setOpen] = React.useState(false);
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof templateSchema>>({
        resolver: zodResolver(templateSchema),
        defaultValues: template || { name: '', description: '', category: '', templateFileId: '' }
    });

    React.useEffect(() => {
        if(open) {
            form.reset(template || { name: '', description: '', category: 'Procurações', templateFileId: '' });
        }
    }, [open, template, form]);
    
    const onSubmit = async (values: z.infer<typeof templateSchema>) => {
        if (!firestore) return;

        const docId = template ? template.id : uuidv4();
        const docData = {
            ...values,
            id: docId,
            ...(template ? { updatedAt: new Date() } : { createdAt: new Date(), updatedAt: new Date() })
        };

        try {
            const docRef = doc(firestore, 'document_templates', docId);
            await setDoc(docRef, docData, { merge: true });
            toast({ title: template ? "Modelo atualizado!" : "Modelo adicionado!" });
            setOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {template ? (
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                ) : (
                    <Button size="sm" className="h-8 gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only">Novo Modelo</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{template ? 'Editar Modelo' : 'Adicionar Novo Modelo'}</DialogTitle>
                    <DialogDescription>
                        Preencha os dados do documento que será disponibilizado no acervo.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nome do Modelo</FormLabel> <FormControl><Input placeholder="Ex: Procuração Ad Judicia" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Descrição</FormLabel> <FormControl><Textarea placeholder="Breve descrição sobre a finalidade deste documento." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name="category" render={({ field }) => ( <FormItem> <FormLabel>Categoria</FormLabel> <FormControl><Input placeholder="Ex: Procurações, Contratos, Recibos" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name="templateFileId" render={({ field }) => ( <FormItem> <FormLabel>ID do Arquivo no Google Drive</FormLabel> <FormControl><Input placeholder="Cole o ID do arquivo modelo do Google Drive" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                            <Button type="submit">Salvar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function TemplateLibraryManager() {
    const { firestore, isUserLoading } = useFirebase();
    const { toast } = useToast();
    const [templateToDelete, setTemplateToDelete] = React.useState<DocumentTemplate | null>(null);

    const templatesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'document_templates') : null, [firestore]);
    const { data: templatesData, isLoading: isLoadingTemplates } = useCollection<DocumentTemplate>(templatesQuery);
    
    const templates = templatesData || [];

    const handleDelete = async () => {
        if (!templateToDelete || !firestore) return;
        try {
            await deleteDoc(doc(firestore, 'document_templates', templateToDelete.id));
            toast({ title: 'Modelo excluído com sucesso!' });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
        }
        setTemplateToDelete(null);
    };

    const isLoading = isUserLoading || isLoadingTemplates;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>Acervo de Modelos</CardTitle>
                    <CardDescription>
                        Gerencie os documentos modelo disponíveis para toda a equipe.
                    </CardDescription>
                </div>
                <TemplateFormDialog /> 
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><FileText className="inline-block mr-2 h-4 w-4" />Nome do Modelo</TableHead>
                            <TableHead><Folder className="inline-block mr-2 h-4 w-4" />Categoria</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                           [...Array(3)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                </TableRow>
                           ))
                        ) : templates.length > 0 ? (
                            templates.map(template => (
                                <TableRow key={template.id}>
                                    <TableCell className="font-medium">{template.name}</TableCell>
                                    <TableCell><Badge variant="outline">{template.category}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <TemplateFormDialog template={template} />
                                        <Button variant="ghost" size="icon" onClick={() => setTemplateToDelete(template)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">
                                    Nenhum modelo de documento configurado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            
            <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover o modelo "{templateToDelete?.name}" do acervo?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}

    