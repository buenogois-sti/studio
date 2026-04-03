'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  collection, 
  addDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ClientSearchInput } from '@/components/process/ClientSearchInput';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Gavel } from 'lucide-react';

const formSchema = z.object({
  processNumber: z.string().min(1, 'Número do processo é obrigatório'),
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  clientName: z.string().optional(),
  name: z.string().min(1, 'Um título para o processo é obrigatório'),
  legalArea: z.string().min(1, 'Área jurídica é obrigatória'),
});

interface QuickProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProcessNumber?: string;
  onSuccess?: (processId: string) => void;
}

export function QuickProcessDialog({ 
  open, 
  onOpenChange, 
  initialProcessNumber,
  onSuccess 
}: QuickProcessDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      processNumber: initialProcessNumber || '',
      clientId: '',
      clientName: '',
      name: 'Ação Judicial (Cadastro Rápido)',
      legalArea: 'Cível',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const processRef = await addDoc(collection(db, 'processes'), {
        ...values,
        status: 'Ativo',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        timeline: [{
          id: crypto.randomUUID(),
          type: 'system',
          description: 'Processo cadastrado rapidamente via Gerenciador de Intimações AASP',
          date: Timestamp.now(),
          authorName: 'Sistema (IA)'
        }]
      });

      toast({
        title: "Processo cadastrado!",
        description: "O processo foi criado e agora pode receber a intimação.",
      });

      onSuccess?.(processRef.id);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao cadastrar",
        description: "Não foi possível criar o processo no momento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Gavel className="w-5 h-5 text-primary" />
            <DialogTitle>Cadastro Rápido de Processo</DialogTitle>
          </div>
          <DialogDescription>
            Número identificado na intimação: <span className="font-bold text-foreground">{initialProcessNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <ClientSearchInput 
                      selectedClientId={field.value}
                      onSelect={(client) => {
                        field.onChange(client.id);
                        form.setValue('clientName', `${client.firstName} ${client.lastName}`);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Processo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ação de cobrança contra banco" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="processNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº do Processo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="legalArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área Jurídica</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar e Vincular
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
