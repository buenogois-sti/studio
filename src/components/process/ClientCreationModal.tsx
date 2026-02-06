'use client';

import React, { useState } from 'react';
import { Plus, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/client-actions';
import type { Client } from '@/lib/types';

const clientCreationSchema = z.object({
  firstName: z.string().min(2, 'Nome é obrigatório'),
  lastName: z.string().min(2, 'Sobrenome é obrigatório'),
  document: z.string().min(11, 'CPF/CNPJ inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  legalArea: z.string().optional(),
});

type ClientCreationFormData = z.infer<typeof clientCreationSchema>;

const LEGAL_AREAS = [
  'Cível',
  'Penal',
  'Trabalhista',
  'Administrativo',
  'Tributário',
  'Comercial',
  'Imobiliário',
  'Família',
  'Ambiental',
  'Outro',
];

interface ClientCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: (client: Client) => void;
}

export function ClientCreationModal({ open, onOpenChange, onClientCreated }: ClientCreationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<ClientCreationFormData>({
    resolver: zodResolver(clientCreationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      document: '',
      email: '',
      phone: '',
      legalArea: 'Trabalhista',
    },
  });

  const onSubmit = async (data: ClientCreationFormData) => {
    setIsLoading(true);
    try {
      const result = await createClient({
        ...data,
        status: 'active',
        clientType: data.document.length > 14 ? 'Pessoa Jurídica' : 'Pessoa Física',
      });

      if (result.success && result.id) {
        const newClient: Client = {
          id: result.id,
          firstName: data.firstName,
          lastName: data.lastName,
          document: data.document,
          email: data.email || '',
          phone: data.phone || '',
          legalArea: data.legalArea || '',
          avatar: '',
          createdAt: new Date().toISOString(),
        };

        setSuccess(true);
        toast({ title: "Cliente cadastrado!", description: `${data.firstName} foi adicionado à base.` });
        
        setTimeout(() => {
          onClientCreated?.(newClient);
          form.reset();
          setSuccess(false);
          onOpenChange(false);
        }, 1000);
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Erro no cadastro', 
        description: error.message || 'Não foi possível cadastrar o cliente.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCPFCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{2})/, '$1-$2');
    } else {
      return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] z-[200] bg-[#020617] border-white/10 text-white"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Plus className="h-5 w-5 text-primary" />
            Cadastro Rápido de Cliente
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Adicione os dados básicos para iniciar o atendimento.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-bold text-white text-lg">Cliente Criado!</p>
              <p className="text-sm text-slate-400">
                {form.getValues('firstName')} {form.getValues('lastName')}
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">Nome / Razão *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="João" 
                          {...field}
                          disabled={isLoading}
                          className="h-10 bg-black/40 border-white/10 text-white"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">Sobrenome / Fantasia *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Silva" 
                          {...field}
                          disabled={isLoading}
                          className="h-10 bg-black/40 border-white/10 text-white"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">CPF / CNPJ *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000.000.000-00" 
                        {...field}
                        onChange={(e) => {
                          const formatted = formatCPFCNPJ(e.target.value);
                          field.onChange(formatted);
                        }}
                        disabled={isLoading}
                        className="h-10 bg-black/40 border-white/10 text-white font-mono"
                        maxLength={18}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">E-mail</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="email@exemplo.com" 
                          {...field}
                          disabled={isLoading}
                          className="h-10 bg-black/40 border-white/10 text-white"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">WhatsApp</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(11) 99999-9999" 
                          {...field}
                          disabled={isLoading}
                          className="h-10 bg-black/40 border-white/10 text-white"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="legalArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500">Área de Atendimento</FormLabel>
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 bg-black/40 border-white/10 text-white">
                          <SelectValue placeholder="Selecione a área" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                        {LEGAL_AREAS.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="flex-1 h-11 text-slate-400"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-11 gap-2 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px]"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Salvar Cliente
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
