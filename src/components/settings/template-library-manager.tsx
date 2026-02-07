'use client';
import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Trash2, Edit, FileText, Folder, Link as LinkIcon, ExternalLink } from 'lucide-react';
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
import { extractFileId } from '@/lib/utils';

const templateSchema = z.object({
  name: z.string().min(3, 'O nome do modelo é obrigatório.'),
  description: z.string().min(3, 'A descrição é obrigatória.'),
  category: z.string().min(3, 'A categoria é obrigatória.'),
  templateFileId: z.string().min(10, 'O link ou ID do Google Docs é obrigatório.'),
});

function TemplateFormDialog({ template }: { template?: DocumentTemplate | null }) {
    const [open, setOpen] = React.useState(false);
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof templateSchema>>({
        resolver: zodResolver(templateSchema),
        defaultValues: template || { name: '', description: '', category: 'Petições', templateFileId: '' }
    });

    React.useEffect(() => {
        if(open) {
            form.reset(template || { name: '', description: '', category: 'Petições', templateFileId: '' });
        }
    }, [open, template, form]);
    
    const onSubmit = async (values: z.infer<typeof templateSchema>) => {
        if (!firestore) return;

        const docId = template ? template.id : uuidv4();
        
        // Mantemos o link completo ou ID conforme inserido, o motor draftDocument usará extractFileId
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/30 hover:text-white"><Edit className="h-4 w-4" /></Button>
                ) : (
                    <Button size="sm" className="h-9 gap-2 bg-primary text-primary-foreground font-bold">
                        <PlusCircle className="h-4 w-4" />
                        Novo Modelo de Documento
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-[#0f172a] border-white/10 text-white sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black font-headline">{template ? 'Editar Modelo' : 'Novo Modelo para Acervo'}</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Insira o link completo do Google Docs. O sistema extrairá o ID e processará as tags automaticamente.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( 
                          <FormItem> 
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nome Identificador</FormLabel> 
                            <FormControl><Input placeholder="Ex: Procuração Bueno Gois" className="bg-black/40 border-white/10" {...field} /></FormControl> 
                            <FormMessage /> 
                          </FormItem> 
                        )}/>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="category" render={({ field }) => ( 
                            <FormItem> 
                              <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Categoria</FormLabel> 
                              <FormControl><Input placeholder="Ex: Procurações" className="bg-black/40 border-white/10" {...field} /></FormControl> 
                              <FormMessage /> 
                            </FormItem> 
                          )}/>
                          <FormField control={form.control} name="templateFileId" render={({ field }) => ( 
                            <FormItem> 
                              <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5"><LinkIcon className="h-3 w-3" /> Link do Google Docs</FormLabel> 
                              <FormControl><Input placeholder="https://docs.google.com/..." className="bg-black/40 border-white/10 font-mono text-xs" {...field} /></FormControl> 
                              <FormMessage /> 
                            </FormItem> 
                          )}/>
                        </div>

                        <FormField control={form.control} name="description" render={({ field }) => ( 
                          <FormItem> 
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Finalidade do Modelo</FormLabel> 
                            <FormControl><Textarea placeholder="Descreva brevemente quando usar este documento..." className="bg-black/40 border-white/10 resize-none h-20" {...field} /></FormControl> 
                            <FormMessage /> 
                          </FormItem> 
                        )}/>

                        <DialogFooter className="pt-4 gap-2">
                            <DialogClose asChild><Button type="button" variant="ghost" className="text-slate-400">Cancelar</Button></DialogClose>
                            <Button type="submit" className="bg-primary text-primary-foreground font-bold px-8 h-11">Salvar na Biblioteca</Button>
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
        <Card className="bg-[#0f172a] border-white/5 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-white/5 p-6 border-b border-white/5">
                <div>
                    <CardTitle className="text-white font-headline text-xl">Biblioteca de Rascunhos</CardTitle>
                    <CardDescription className="text-slate-400">
                        Configure os links dos modelos no Google Docs para automação de peças.
                    </CardDescription>
                </div>
                <TemplateFormDialog /> 
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-black/20">
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase text-slate-500 px-6">Identificação</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500">Categoria</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500">Link de Origem</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-6">Gestão</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                           [...Array(3)].map((_, i) => (
                                <TableRow key={i} className="border-white/5">
                                    <TableCell colSpan={4} className="p-6"><Skeleton className="h-8 w-full bg-white/5" /></TableCell>
                                </TableRow>
                           ))
                        ) : templates.length > 0 ? (
                            templates.map(template => (
                                <TableRow key={template.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                    <TableCell className="px-6">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-white text-sm">{template.name}</span>
                                        <span className="text-[9px] text-slate-500 italic truncate max-w-[200px]">{template.description}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline" className="text-[9px] uppercase border-primary/30 text-primary">{template.category}</Badge></TableCell>
                                    <TableCell>
                                      <a 
                                        href={template.templateFileId.startsWith('http') ? template.templateFileId : `https://docs.google.com/document/d/${template.templateFileId}/edit`} 
                                        target="_blank" 
                                        className="flex items-center gap-1.5 text-[10px] text-blue-400 hover:underline font-mono"
                                      >
                                        <ExternalLink className="h-3 w-3" /> Abrir Base
                                      </a>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                      <div className="flex justify-end gap-1">
                                        <TemplateFormDialog template={template} />
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-rose-500 hover:bg-rose-500/10" onClick={() => setTemplateToDelete(template)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-20 text-slate-500 italic border-none">
                                    Nenhum modelo configurado no acervo.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            
            <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
                <AlertDialogContent className="bg-[#0f172a] border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Tem certeza que deseja remover o modelo "{templateToDelete?.name}"? Isso não afetará os documentos já gerados anteriormente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="bg-transparent border-white/10 text-slate-400">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-rose-600 text-white hover:bg-rose-700 font-bold border-none">
                            Remover Definitivamente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
