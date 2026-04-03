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
import { createClient } from '@/lib/client-actions';
import { ClientSearchInput } from '@/components/process/ClientSearchInput';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Scale, Sparkles } from 'lucide-react';

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
  initialLegalArea?: string;
  initialTitle?: string;
  onSuccess?: (processId: string) => void;
}

export function QuickProcessDialog({ 
  open, 
  onOpenChange, 
  initialProcessNumber,
  initialLegalArea,
  initialTitle,
  onSuccess 
}: QuickProcessDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      processNumber: initialProcessNumber || '',
      clientId: '',
      clientName: '',
      name: initialTitle || 'Ação Judicial (Cadastro Rápido)',
      legalArea: initialLegalArea || 'Cível',
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
      <DialogContent className="sm:max-w-[450px] bg-[#0a0f1c] border-slate-800 shadow-2xl">
        <DialogHeader className="space-y-4 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 border border-primary/20 p-2.5 rounded-xl shadow-inner">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">Abertura de Processo</DialogTitle>
              <DialogDescription className="text-xs mt-0.5 text-slate-500">
                Cadastro simplificado via intimação
              </DialogDescription>
            </div>
          </div>
          
          {initialProcessNumber && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3 text-sm text-slate-400 flex flex-col mt-2">
              <span className="text-[10px] uppercase font-black tracking-widest opacity-60 mb-1">
                Número Identificado na AASP
              </span>
              <span className="font-mono text-primary font-bold text-lg leading-none break-all select-all">
                {initialProcessNumber}
              </span>
            </div>
          )}
        </DialogHeader>

        {isCreatingClient ? (
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const fullName = formData.get('fullName') as string;
              const doc = formData.get('document') as string;
              if (!fullName) return toast({ title: "Nome obrigatório", variant: "destructive" });
              
              setLoading(true);
              const [firstName, ...lastNames] = fullName.split(' ');
              const res = await createClient({
                firstName,
                lastName: lastNames.join(' '),
                document: doc || '',
                clientType: doc.length > 14 ? 'Pessoa Jurídica' : 'Pessoa Física',
                status: 'active'
              });
              setLoading(false);

              if (res.success && res.id) {
                form.setValue('clientId', res.id);
                form.setValue('clientName', fullName);
                toast({ title: "Cliente criado com sucesso!" });
                setIsCreatingClient(false);
              } else {
                toast({ title: "Erro ao criar cliente", description: res.error, variant: "destructive" });
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400">Nome Completo / Razão Social</label>
              <Input name="fullName" placeholder="Ex: João da Silva" className="bg-slate-900 border-slate-800 text-slate-200" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400">CPF / CNPJ (Opcional)</label>
              <Input name="document" placeholder="Apenas números..." className="bg-slate-900 border-slate-800 text-slate-200" />
            </div>
            
            <div className="flex gap-3 pt-4">
               <Button type="button" variant="outline" className="w-1/3 bg-transparent border-slate-700 text-slate-300" onClick={() => setIsCreatingClient(false)}>
                 Voltar
               </Button>
               <Button type="submit" disabled={loading} className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                 {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                 Salvar Cliente
               </Button>
            </div>
          </form>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-400 font-semibold">Cliente</FormLabel>
                    <FormControl>
                      <ClientSearchInput 
                        selectedClientId={field.value}
                        onSelect={(client) => {
                          field.onChange(client.id);
                          form.setValue('clientName', `${client.firstName} ${client.lastName}`);
                        }}
                        onCreateNew={() => setIsCreatingClient(true)}
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

            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="processNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-400 font-semibold">Nº do Processo</FormLabel>
                    <FormControl>
                      <Input className="font-mono bg-slate-900 border-slate-800 text-slate-200" placeholder="0000000-00.0000.0.00.0000" {...field} />
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
                    <FormLabel className="text-slate-400 font-semibold">Área Jurídica</FormLabel>
                    <FormControl>
                      <Input className="bg-slate-900 border-slate-800 text-slate-200" placeholder="Ex: Cível, Trabalhista..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-6">
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-12 text-sm font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all rounded-xl"
              >
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2 fill-white/20" />}
                Salvar e Vincular
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
