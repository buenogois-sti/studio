'use client';
import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Trash2, Edit, Loader2, FileText, Folder } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import type { ClientKitTemplate } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';


const templateSchema = z.object({
  name: z.string().min(3, 'O nome do documento é obrigatório.'),
  templateId: z.string().min(10, 'O ID do Google Drive é obrigatório.'),
  destination: z.string().min(1, 'A pasta de destino é obrigatória.'),
});

const CLIENT_FOLDER_STRUCTURE = [
  '00_DADOS_DO_CLIENTE',
  '01_CONTRATO_E_HONORÁRIOS',
  '02_DOCUMENTOS_PESSOAIS',
  '99_ADMINISTRATIVO_INTERNO'
];

function TemplateFormDialog({ onSave, template }: { onSave: (templates: ClientKitTemplate[]) => Promise<void>, template?: ClientKitTemplate | null }) {
    const [open, setOpen] = React.useState(false);
    const { firestore } = useFirebase();
    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system_settings', 'client_kit') : null, [firestore]);
    const { data: settingsData } = useDoc<{ templates: ClientKitTemplate[] }>(settingsRef);
    const form = useForm<z.infer<typeof templateSchema>>({
        resolver: zodResolver(templateSchema),
        defaultValues: template || { name: '', templateId: '', destination: '' }
    });

    React.useEffect(() => {
        if(open) {
            form.reset(template || { name: '', templateId: '', destination: '' });
        }
    }, [open, template, form]);
    
    const onSubmit = async (values: z.infer<typeof templateSchema>) => {
        const currentTemplates = settingsData?.templates || [];
        let newTemplates: ClientKitTemplate[];

        if (template) { // Editing existing
            newTemplates = currentTemplates.map(t => t.id === template.id ? { ...template, ...values } : t);
        } else { // Adding new
            const newTemplate: ClientKitTemplate = { ...values, id: uuidv4() };
            newTemplates = [...currentTemplates, newTemplate];
        }
        
        await onSave(newTemplates);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {template ? (
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                ) : (
                    <Button size="sm" className="h-8 gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only">Novo Documento</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{template ? 'Editar Documento Modelo' : 'Adicionar Novo Documento Modelo'}</DialogTitle>
                    <DialogDescription>
                        Preencha os dados do documento que fará parte do kit inicial do cliente.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Documento</FormLabel>
                                    <FormControl><Input placeholder="Ex: Procuração Ad Judicia" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="templateId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ID do Arquivo no Google Drive</FormLabel>
                                    <FormControl><Input placeholder="Cole o ID do arquivo modelo aqui" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="destination"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pasta de Destino</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Selecione a pasta de destino..." /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {CLIENT_FOLDER_STRUCTURE.map(folder => (
                                                <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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


export function ClientKitManager() {
    const { firestore, isUserLoading } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const [templateToDelete, setTemplateToDelete] = React.useState<ClientKitTemplate | null>(null);

    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system_settings', 'client_kit') : null, [firestore]);
    const { data: settingsData, isLoading: isLoadingSettings } = useDoc<{ templates: ClientKitTemplate[] }>(settingsRef);
    const templates = settingsData?.templates || [];

    const handleSave = async (newTemplates: ClientKitTemplate[]) => {
        if (!settingsRef) return;
        setIsSaving(true);
        try {
            await setDoc(settingsRef, { templates: newTemplates }, { merge: true });
            toast({ title: 'Kit de Documentos atualizado com sucesso!' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (!templateToDelete) return;
        const newTemplates = templates.filter(t => t.id !== templateToDelete.id);
        await handleSave(newTemplates);
        setTemplateToDelete(null);
    };

    const isLoading = isUserLoading || isLoadingSettings;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>Kit de Documentos do Cliente</CardTitle>
                    <CardDescription>
                        Gerencie os documentos modelo que são criados automaticamente para cada novo cliente.
                    </CardDescription>
                </div>
                <TemplateFormDialog onSave={handleSave} />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><FileText className="inline-block mr-2 h-4 w-4" />Nome do Documento</TableHead>
                            <TableHead><Folder className="inline-block mr-2 h-4 w-4" />Pasta de Destino</TableHead>
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
                                    <TableCell><Badge variant="secondary">{template.destination}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <TemplateFormDialog onSave={handleSave} template={template} />
                                        <Button variant="ghost" size="icon" onClick={() => setTemplateToDelete(template)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">
                                    Nenhum documento modelo configurado.
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
                            Tem certeza que deseja remover o documento "{templateToDelete?.name}" do kit inicial?
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
