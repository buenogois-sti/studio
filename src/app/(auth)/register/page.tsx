'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';

const registerSchema = z.object({
  firstName: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  lastName: z.string().min(2, { message: 'O sobrenome deve ter pelo menos 2 caracteres.' }),
});

export default function RegisterPage() {
  const { user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
    if (user && user.displayName) {
        const [firstName, ...lastNameParts] = user.displayName.split(' ');
        form.setValue('firstName', firstName || '');
        form.setValue('lastName', lastNameParts.join(' ') || '');
    }
  }, [user, isUserLoading, router, form]);


  async function onSubmit(values: z.infer<typeof registerSchema>) {
    if (!firestore || !user) return;
    
    const userRef = doc(firestore, 'users', user.uid);

    const newUserProfile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'role'> = {
        id: user.uid,
        googleId: user.providerData.find((p) => p.providerId === 'google.com')?.uid || '',
        email: user.email || '',
        firstName: values.firstName,
        lastName: values.lastName,
    };

    const dataToSet = {
        ...newUserProfile,
        role: 'admin', // First user is always an admin
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    
    setDocumentNonBlocking(userRef, dataToSet, {});

    toast({
      title: "Conta Criada!",
      description: "Seu perfil foi criado com sucesso.",
    });
    
    router.replace('/dashboard');
  }

  if (isUserLoading || !user) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Complete seu Cadastro</CardTitle>
        <CardDescription>
          Falta pouco! Preencha seus dados para finalizar a criação da sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                            <Input placeholder="Seu nome" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sobrenome</FormLabel>
                        <FormControl>
                            <Input placeholder="Seu sobrenome" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input
                            readOnly
                            disabled
                            value={user?.email || ''}
                        />
                    </FormControl>
                </FormItem>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Finalizar Cadastro'}
                </Button>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}
