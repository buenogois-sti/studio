'use client';
import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Staff, LawyerCredit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { DollarSign } from 'lucide-react';

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export function StaffCreditCard({ staffMember }: { staffMember: Staff }) {
    const { firestore } = useFirebase();
    const creditsQuery = useMemoFirebase(
        () => firestore ? collection(firestore, `staff/${staffMember.id}/credits`) : null,
        [firestore, staffMember.id]
    );
    const { data: credits, isLoading } = useCollection<LawyerCredit>(creditsQuery);

    const summary = React.useMemo(() => {
        if (!credits) return { available: 0, paid: 0, retained: 0 };
        return credits.reduce((acc, credit) => {
            if (credit.status === 'DISPONIVEL') {
                acc.available += credit.value;
            } else if (credit.status === 'PAGO') {
                acc.paid += credit.value;
            } else if (credit.status === 'RETIDO') {
                acc.retained += credit.value;
            }
            return acc;
        }, { available: 0, paid: 0, retained: 0 });
    }, [credits]);

    if (isLoading) {
      return (
        <Card>
            <CardHeader className="flex-row items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-5 w-2/5" />
            </CardContent>
            <CardFooter>
                <Skeleton className="h-9 w-24" />
            </CardFooter>
        </Card>
      );
    }

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex-row items-center gap-4">
                <Avatar className="h-12 w-12 border">
                    <AvatarImage src={`https://picsum.photos/seed/staff${staffMember.id}/100/100`} alt={staffMember.firstName} data-ai-hint="person portrait" />
                    <AvatarFallback>{staffMember.firstName?.charAt(0) ?? 'S'}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-lg">{staffMember.firstName} {staffMember.lastName}</CardTitle>
                    <CardDescription>{staffMember.role === 'lawyer' ? 'Advogado(a)' : 'Estagiário(a)'}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Disponível para Saque</span>
                        <span className="font-bold text-green-500">{formatCurrency(summary.available)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Retido</span>
                         <span className="font-semibold text-yellow-500">{formatCurrency(summary.retained)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total já Pago</span>
                        <span className="font-semibold">{formatCurrency(summary.paid)}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button disabled={summary.available <= 0}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Realizar Pagamento
                </Button>
            </CardFooter>
        </Card>
    );
}
    