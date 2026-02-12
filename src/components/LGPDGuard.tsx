
'use client';

import * as React from 'react';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2, Scale, FileText, Lock } from 'lucide-react';
import { acceptLGPDTerms } from '@/lib/user-actions';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from './ui/scroll-area';

export function LGPDGuard({ children }: { children: React.ReactNode }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isAccepting, setIsAccepting] = React.useState(false);

  const userProfileRef = useMemoFirebase(
    () => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);

  const handleAccept = async () => {
    if (!user?.uid) return;
    setIsAccepting(true);
    try {
      await acceptLGPDTerms(user.uid);
      toast({ title: "Termos Aceitos", description: "Seu acesso foi liberado em conformidade com a LGPD." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erro", description: error.message });
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#020617]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const needsAcceptance = userProfile && !userProfile.lgpdAccepted;

  return (
    <>
      <Dialog open={!!needsAcceptance}>
        <DialogContent className="sm:max-w-2xl bg-[#020617] border-white/10 text-white p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b border-white/5 bg-primary/5 shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-black font-headline">Conformidade LGPD & Segurança</DialogTitle>
                <DialogDescription className="text-slate-400">Termos de uso e processamento de dados sensíveis Bueno Gois.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] p-6">
            <div className="space-y-6 text-sm leading-relaxed text-slate-300">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p>O <strong>LexFlow</strong> processa informações de alto sigilo profissional. Ao acessar esta plataforma, você concorda com as diretrizes da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-white uppercase tracking-widest text-[10px] flex items-center gap-2">
                  <FileText className="h-3 w-3 text-primary" /> 1. Finalidade do Tratamento
                </h4>
                <p>Os dados de clientes, processos e equipe são tratados exclusivamente para a prestação de serviços jurídicos e gestão administrativa da banca Bueno Gois Advogados e Associados.</p>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-white uppercase tracking-widest text-[10px] flex items-center gap-2">
                  <Scale className="h-3 w-3 text-primary" /> 2. Responsabilidades do Operador
                </h4>
                <p>Como usuário do sistema, você se compromete a manter o sigilo absoluto das informações acessadas, utilizando-as apenas dentro do escopo de suas atribuições profissionais. O compartilhamento de credenciais ou dados com terceiros não autorizados constitui infração grave.</p>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-white uppercase tracking-widest text-[10px] flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3 text-primary" /> 3. Registro de Log
                </h4>
                <p>Para fins de auditoria e segurança, todas as operações realizadas no sistema (visualização, edição, exclusão) são registradas com identificador de usuário e timestamp.</p>
              </div>

              <p className="pt-4 border-t border-white/5 italic text-slate-500 text-xs text-center">
                Ao clicar em "Aceitar e Prosseguir", você confirma que leu e compreende as obrigações de proteção de dados desta banca.
              </p>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t border-white/5 bg-white/5 gap-3 shrink-0">
            <Button 
              className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs h-14 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
              Aceitar e Prosseguir para o Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!needsAcceptance && children}
    </>
  );
}
