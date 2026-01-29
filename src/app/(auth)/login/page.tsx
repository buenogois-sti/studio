'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFirebase } from '@/firebase';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.618-3.317-11.28-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.712,34.464,44,28.708,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);


export default function LoginPage() {
    const { auth, firestore, isUserLoading, user } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        if (!isUserLoading && user) {
            router.replace('/dashboard');
        }
    }, [user, isUserLoading, router]);

    const handleGoogleSignIn = async () => {
        if (!auth || !firestore) return;

        setIsLoading(true);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        try {
            const result = await signInWithPopup(auth, provider);
            const loggedInUser = result.user;

            const userDocRef = doc(firestore, 'users', loggedInUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                toast({
                    title: 'Login bem-sucedido!',
                    description: `Bem-vindo de volta, ${loggedInUser.displayName}.`,
                });
                router.push('/dashboard');
            } else {
                router.push('/register');
            }
        } catch (error: any) {
            if (error.code === 'auth/popup-closed-by-user') {
                console.log("Google Sign-In popup closed by user.");
            } else {
                console.error("Google Sign-In Error:", error);
                toast({
                    variant: 'destructive',
                    title: 'Erro no Login',
                    description: error.message || 'Não foi possível fazer login com o Google.',
                });
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isUserLoading || user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Card className="mx-auto max-w-sm">
            <CardHeader>
                <CardTitle className="text-2xl font-headline">Acessar Plataforma</CardTitle>
                <CardDescription>
                    Use sua conta do Google para entrar. Se for seu primeiro acesso, você será direcionado para completar seu cadastro.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                     <Button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full">
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                           <GoogleIcon className="h-5 w-5" />
                        )}
                        {isLoading ? 'Aguarde...' : 'Entrar com Google' }
                    </Button>
                    <p className="px-8 text-center text-sm text-muted-foreground">
                        Ao clicar em continuar, você concorda com nossos{' '}
                        <a href="#" className="underline underline-offset-4 hover:text-primary">
                            Termos de Serviço
                        </a>{' '}
                        e{' '}
                        <a href="#" className="underline underline-offset-4 hover:text-primary">
                            Política de Privacidade
                        </a>
                        .
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
