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
import { cn } from '@/lib/utils';
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

  const form = useForm<ClientCreationFormData>({
    resolver: zodResolver(clientCreationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      document: '',
      email: '',
      phone: '',
      legalArea: '',
    },
  });

  const onSubmit = async (data: ClientCreationFormData) => {
    setIsLoading(true);
    try {
      // Simular criação de cliente
      const newClient: Client = {
        id: `client_${Date.now()}`,
        firstName: data.firstName,
        lastName: data.lastName,
        document: data.document,
        email: data.email || '',
        phone: data.phone || '',
        legalArea: data.legalArea || '',
        avatar: `https://ui-avatars.com/api/?name=${data.firstName}+${data.lastName}&background=0D8ABC&color=fff`,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      setSuccess(true);
      onClientCreated?.(newClient);
      
      setTimeout(() => {
        form.reset();
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCPFCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.length <= 11) {
      // CPF
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{2})/, '$1-$2');
    } else {
      // CNPJ
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
        className="sm:max-w-[500px] z-[200]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Novo Cliente
          </DialogTitle>
          <DialogDescription>
            Cadastre um novo cliente para o processo
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-foreground">Cliente criado com sucesso!</p>
              <p className="text-sm text-muted-foreground">
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
                      <FormLabel className="text-xs font-bold uppercase">Nome *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="João" 
                          {...field}
                          disabled={isLoading}
                          className="h-9 text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase">Sobrenome *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Silva" 
                          {...field}
                          disabled={isLoading}
                          className="h-9 text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">CPF/CNPJ *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000.000.000-00" 
                        {...field}
                        onChange={(e) => {
                          const formatted = formatCPFCNPJ(e.target.value);
                          field.onChange(formatted);
                        }}
                        disabled={isLoading}
                        className="h-9 text-sm font-mono"
                        maxLength={18}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase">Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="email@exemplo.com" 
                          {...field}
                          disabled={isLoading}
                          className="h-9 text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase">Telefone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(11) 9 9999-9999" 
                          {...field}
                          disabled={isLoading}
                          className="h-9 text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="legalArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Área Jurídica</FormLabel>
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione a área" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEGAL_AREAS.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="flex-1 h-9"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-9 gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Criar Cliente
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
