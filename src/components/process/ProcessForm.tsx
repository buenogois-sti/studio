'use client';
import * as React from 'react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2, User, Building, Gavel, DollarSign } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SheetFooter } from '@/components/ui/sheet';
import { H2 } from '@/components/ui/typography';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc, updateDoc } from 'firebase/firestore';
import type { Process, Client, Staff } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

const processSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente.'),
  name: z.string().min(3, 'Nome do processo é obrigatório.'),
  processNumber: z.string().optional(),
  court: z.string().optional(),
  courtBranch: z.string().optional(),
  caseValue: z.coerce.number().min(0).default(0),
  opposingParties: z.array(z.string()).default([]),
  description: z.string().optional(),
  status: z.enum(['Ativo', 'Arquivado', 'Pendente']).default('Ativo'),
  responsibleStaffIds: z.array(z.string()).default([]),
});

type ProcessFormValues = z.infer<typeof processSchema>;

interface ProcessFormProps {
  onSave: () => void;
  process?: Process | null;
}

export function ProcessForm({ onSave, process }: ProcessFormProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const clientsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clients } = useCollection<Client>(clientsQuery);

  const staffQuery = useMemoFirebase(() => firestore ? collection(firestore, 'staff') : null, [firestore]);
  const { data: staff } = useCollection<Staff>(staffQuery);

  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processSchema),
    defaultValues: process ? {
        ...process,
        opposingParties: process.opposingParties || [],
        responsibleStaffIds: process.responsibleStaffIds || [],
    } : {
        clientId: '',
        name: '',
        processNumber: '',
        status: 'Ativo',
        opposingParties: [],
        responsibleStaffIds: [],
        caseValue: 0,
    },
  });

  const { fields: partyFields, append: addParty, remove: removeParty } = useFieldArray({
    control: form.control,
    name: "opposingParties" as any,
  });

  async function onSubmit(values: ProcessFormValues) {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
      const data = {
        ...values,
        updatedAt: serverTimestamp(),
      };

      if (process?.id) {
        const ref = doc(firestore, 'processes', process.id);
        await updateDoc(ref, data);
        toast({ title: 'Processo atualizado!' });
      } else {
        const col = collection(firestore, 'processes');
        await addDoc(col, { ...data, createdAt: serverTimestamp() });
        toast({ title: 'Processo criado!' });
      }
      onSave();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cliente */}
            <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Cliente Principal *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger></FormControl>
                    <SelectContent>
                        {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            {/* Status */}
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Status..." /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="Ativo">🟢 Ativo</SelectItem>
                        <SelectItem value="Pendente">🟡 Pendente</SelectItem>
                        <SelectItem value="Arquivado">⚪ Arquivado</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            {/* Identificação */}
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                <FormItem className="md:col-span-2">
                    <FormLabel>Título do Processo *</FormLabel>
                    <FormControl><Input placeholder="Ex: Reclamatória Trabalhista - João Silva" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="processNumber"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Número do Processo (CNJ)</FormLabel>
                    <FormControl><Input placeholder="0000000-00.0000.0.00.0000" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="caseValue"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Valor da Causa (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            {/* Juízo */}
            <FormField
                control={form.control}
                name="court"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Tribunal / Fórum</FormLabel>
                    <FormControl><Input placeholder="Ex: TRT-2 / Fórum SBC" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="courtBranch"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Vara / Câmara</FormLabel>
                    <FormControl><Input placeholder="Ex: 2ª Vara do Trabalho" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        {/* Partes Contrárias */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <FormLabel>Partes Contrárias (Réus/Opostos)</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={() => addParty('')} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Parte
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {partyFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                        <Input 
                            placeholder="Nome da empresa ou pessoa" 
                            {...form.register(`opposingParties.${index}` as any)} 
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeParty(index)} className="shrink-0 text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>

        {/* Equipe Responsável */}
        <FormField
            control={form.control}
            name="responsibleStaffIds"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Responsáveis pela Equipe</FormLabel>
                <div className="flex flex-wrap gap-2 p-2 rounded-lg border bg-muted/20">
                    {staff?.map(s => {
                        const isSelected = field.value.includes(s.id);
                        return (
                            <Badge 
                                key={s.id} 
                                variant={isSelected ? "default" : "outline"}
                                className="cursor-pointer py-1 px-3"
                                onClick={() => {
                                    const newValue = isSelected 
                                        ? field.value.filter(id => id !== s.id)
                                        : [...field.value, s.id];
                                    field.onChange(newValue);
                                }}
                            >
                                {s.firstName} {s.lastName}
                            </Badge>
                        );
                    })}
                </div>
                <FormMessage />
            </FormItem>
            )}
        />

        <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Observações e Notas</FormLabel>
                <FormControl><Textarea placeholder="Detalhes estratégicos do caso..." className="resize-none" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
            )}
        />

        <SheetFooter>
            <Button type="button" variant="outline" onClick={onSave} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {process ? 'Salvar Alterações' : 'Criar Processo'}
            </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}
