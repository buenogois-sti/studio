'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const { auth, user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  const [isCheckingProfile, setIsCheckingProfile] = React.useState(false);

  const handleGoogleSignIn = () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      hd: 'buenogoisadvogado.com.br',
    });
    signInWithRedirect(auth, provider);
  };

  React.useEffect(() => {
    // Wait until Firebase auth state is loaded and Firestore is available
    if (isUserLoading || !firestore) return;

    if (user) {
      // If user is authenticated, check their domain and profile status
      if (user.email?.endsWith('@buenogoisadvogado.com.br')) {
        setIsCheckingProfile(true);
        const userRef = doc(firestore, 'users', user.uid);
        getDoc(userRef)
          .then((docSnap) => {
            if (docSnap.exists()) {
              // Profile exists, redirect to the main application
              router.replace('/dashboard');
            } else {
              // No profile exists, redirect to the registration page
              router.replace('/auth/register');
            }
          })
          .catch((err) => {
            console.error("Error checking user profile:", err);
            // On error, sign out to be safe and stop the process
            auth?.signOut();
          })
          .finally(() => {
            setIsCheckingProfile(false);
          });
      } else if (auth) {
        // If user is from the wrong domain, sign them out.
        auth.signOut();
      }
    } else {
        // No user is signed in, do nothing. The user will see the login page.
        setIsCheckingProfile(false);
    }
  }, [user, isUserLoading, router, auth, firestore]);

  // Show a loading spinner while checking auth state or profile
  if (isUserLoading || isCheckingProfile || (user && user.email?.endsWith('@buenogoisadvogado.com.br'))) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Logo className="mr-2" />
          LexFlow Workspace
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Inteligência Jurídica, integrada ao seu fluxo de trabalho.
              Esta plataforma transformou a gestão de nossos casos.&rdquo;
            </p>
            <footer className="text-sm">Sofia Mendes</footer>
          </blockquote>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 h-full bg-background">
        <Card className="mx-auto max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Acessar Plataforma</CardTitle>
            <CardDescription>
              Use sua conta Google do domínio da empresa para acessar o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Button variant="outline" onClick={handleGoogleSignIn}>
                <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                  <path
                    fill="currentColor"
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.62-4.88 1.62-4.27 0-7.75-3.5-7.75-7.75s3.48-7.75 7.75-7.75c2.44 0 4.03.92 4.9 1.84l2.43-2.42C19.64 3.45 16.71 2 12.48 2 7.1 2 3.1 6.02 3.1 11.25s4.01 9.25 9.38 9.25c2.86 0 5.1-1.02 6.7-2.62 1.67-1.67 2.2-4.01 2.2-6.17 0-.52-.04-1.03-.12-1.52H12.48z"
                  />
                </svg>
                Acessar com Google
              </Button>
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Acesso restrito ao domínio: buenogoisadvogado.com.br
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
