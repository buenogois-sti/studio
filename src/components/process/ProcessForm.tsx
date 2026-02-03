
'use client';
import * as React from 'react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2, User, Building, Gavel, Check, ChevronsUpDown } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { LocationSearch } from '@/components/shared/LocationSearch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { searchClients, getClientById } from '@/lib/client-actions';
import { cn } from '@/lib/utils';

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
  leadLawyerId: z.string().optional(),
  defaultLocation: z.string().optional(),
});

type ProcessFormValues = z.infer<typeof processSchema>;

interface ProcessFormProps {
  onSave: () => void;
  process?: Process | null;
}

function ClientSearch({ onSelect, selectedClientId }: { onSelect: (client: Client) => void; selectedClientId: string }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [results, setResults] = React.useState<Client[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (selectedClientId && !selectedClient) {
        getClientById(selectedClientId).then(setSelectedClient).catch(console.error);
    }
  }, [selectedClientId, selectedClient]);

  React.useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const clients = await searchClients(search);
        setResults(clients);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao Buscar Cliente', description: error.message });
      } finally {
        setIsLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, toast]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-11 font-normal bg-background">
          {selectedClient ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <User className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate font-bold">{selectedClient.firstName} {selectedClient.lastName}</span>
              <span className="text-[10px] text-muted-foreground font-mono shrink-0 hidden sm:inline">({selectedClient.document})</span>
            </div>
          ) : "Buscar cliente por nome ou CPF..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Digite nome ou documento..." 
            value={search} 
            onValueChange={setSearch} 
          />
          <CommandList>
            {isLoading && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Buscando na base...
                </div>
            )}
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {results.map((client) => (
                <CommandItem 
                    key={client.id} 
                    value={client.id} 
                    onSelect={() => { 
                        setSelectedClient(client);
                        onSelect(client); 
                        setOpen(false); 
                    }}
                    className="flex flex-col items-start py-3 cursor-pointer"
                >
                  <div className="flex items-center w-full">
                    <span className="font-bold flex-1">{client.firstName} {client.lastName}</span>
                    <Check className={cn("ml-2 h-4 w-4", selectedClientId === client.id ? "opacity-100" : "opacity-0")} />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">Doc: {client.document}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ProcessForm({ onSave, process }: ProcessFormProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const staffQuery = useMemoFirebase(() => firestore ? collection(firestore, 'staff') : null, [firestore]);
  const { data: staff } = useCollection<Staff>(staffQuery);

  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processSchema),
    defaultValues: process ? {
        ...process,
        opposingParties: process.opposingParties || [],
        responsibleStaffIds: process.responsibleStaffIds || [],
        leadLawyerId: process.leadLawyerId || '',
        defaultLocation: process.defaultLocation || '',
    } : {
        clientId: '',
        name: '',
        processNumber: '',
        status: 'Ativo',
        opposingParties: [],
        responsibleStaffIds: [],
        leadLawyerId: '',
        defaultLocation: '',
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 py-4">
        <fieldset disabled={isSaving} className="space-y-10">
            
            <section className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                    <Gavel className="h-5 w-5 text-primary" />
                    <H2 className="border-none pb-0">Identificação e Status</H2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                        <FormItem className="md:col-span-2">
                            <FormLabel>Cliente Principal *</FormLabel>
                            <FormControl>
                                <ClientSearch 
                                    selectedClientId={field.value} 
                                    onSelect={(client) => field.onChange(client.id)} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status Operacional *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Status..." /></SelectTrigger></FormControl>
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

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Título do Processo *</FormLabel>
                            <FormControl><Input placeholder="Ex: Reclamatória Trabalhista - João Silva" className="h-11" {...field} /></FormControl>
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
                            <FormControl><Input placeholder="0000000-00.0000.0.00.0000" className="h-11" {...field} /></FormControl>
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
                            <FormControl><Input type="number" step="0.01" className="h-11" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                    <Building className="h-5 w-5 text-primary" />
                    <H2 className="border-none pb-0">Juízo e Localização</H2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="court"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tribunal / Fórum</FormLabel>
                            <FormControl><Input placeholder="Ex: TRT-2 / Fórum SBC" className="h-11" {...field} /></FormControl>
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
                            <FormControl><Input placeholder="Ex: 2ª Vara do Trabalho" className="h-11" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="defaultLocation"
                        render={({ field }) => (
                        <FormItem className="md:col-span-2">
                            <FormLabel>Local Padrão de Audiências (Sugerido)</FormLabel>
                            <FormControl>
                                <LocationSearch 
                                    value={field.value || ''} 
                                    onSelect={field.onChange} 
                                    placeholder="Defina o local onde este processo costuma ter audiências..."
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                    <User className="h-5 w-5 text-primary" />
                    <H2 className="border-none pb-0">Equipe e Responsáveis</H2>
                </div>
                
                <div className="space-y-6">
                    <FormField
                        control={form.control}
                        name="leadLawyerId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Advogado Responsável (Líder) *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Selecione o advogado líder..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {staff?.filter(s => s.role === 'lawyer').map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="responsibleStaffIds"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Outros Membros da Equipe (Apoio/Estagiários)</FormLabel>
                            <div className="flex flex-wrap gap-2 p-3 rounded-xl border bg-muted/20">
                                {staff?.map(s => {
                                    const isSelected = field.value.includes(s.id);
                                    return (
                                        <Badge 
                                            key={s.id} 
                                            variant={isSelected ? "default" : "outline"}
                                            className={cn(
                                                "cursor-pointer py-1.5 px-4 transition-all",
                                                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                                            )}
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
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                    <Building className="h-5 w-5 text-primary" />
                    <H2 className="border-none pb-0">Partes Contrárias e Notas</H2>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <FormLabel>Réus / Opostos</FormLabel>
                        <Button type="button" variant="outline" size="sm" onClick={() => addParty('')} className="h-8 text-xs font-bold uppercase">
                            <Plus className="h-3 w-3 mr-1" /> Adicionar Parte
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {partyFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <Input 
                                    placeholder="Nome da empresa ou pessoa" 
                                    className="h-11"
                                    {...form.register(`opposingParties.${index}` as any)} 
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeParty(index)} className="shrink-0 text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Estratégia e Observações</FormLabel>
                        <FormControl><Textarea placeholder="Descreva detalhes estratégicos..." className="min-h-[120px] resize-none text-sm" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </section>

        </fieldset>

        <SheetFooter className="border-t pt-6">
            <Button type="button" variant="outline" onClick={onSave} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving} className="min-w-[150px]">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {process ? 'Salvar Alterações' : 'Cadastrar Processo'}
            </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}
