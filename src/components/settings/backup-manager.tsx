'use client';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CloudDownload, Loader2 } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { triggerManualBackup } from '@/lib/backup-actions';

type BackupSettings = {
    frequency?: 'daily' | 'weekly' | 'disabled';
};

export function BackupManager() {
    const { firestore, isUserLoading } = useFirebase();
    const { toast } = useToast();

    const [isSaving, setIsSaving] = React.useState(false);
    const [isBackingUp, setIsBackingUp] = React.useState(false);

    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system_settings', 'backup') : null, [firestore]);
    const { data: settings, isLoading: isLoadingSettings } = useDoc<BackupSettings>(settingsRef);
    
    const [frequency, setFrequency] = React.useState<'daily' | 'weekly' | 'disabled' | undefined>(undefined);

    React.useEffect(() => {
        if (settings) {
            setFrequency(settings.frequency || 'disabled');
        }
    }, [settings]);

    const isLoading = isUserLoading || isLoadingSettings;

    const handleSaveSettings = async () => {
        if (!settingsRef || !frequency) return;
        setIsSaving(true);
        try {
            await setDoc(settingsRef, { frequency }, { merge: true });
            toast({ title: 'Configuração de backup salva!' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleManualBackup = async () => {
        setIsBackingUp(true);
        try {
            const result = await triggerManualBackup();
            toast({
                title: 'Backup Manual Concluído!',
                description: `Arquivo de backup salvo em seu Google Drive.`,
                action: <a href={result.fileLink} target="_blank" rel="noopener noreferrer"><Button variant="outline">Abrir</Button></a>,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro no Backup Manual',
                description: error.message,
            });
        } finally {
            setIsBackingUp(false);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Backup e Restauração</CardTitle>
                <CardDescription>Configure e agende backups automáticos dos seus dados para o Google Drive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? (
                    <Skeleton className="h-24 w-full" />
                ) : (
                    <div className="space-y-2">
                        <Label>Frequência do Backup Automático</Label>
                        <RadioGroup value={frequency} onValueChange={(value) => setFrequency(value as any)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="daily" id="daily" />
                                <Label htmlFor="daily">Diário</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="weekly" id="weekly" />
                                <Label htmlFor="weekly">Semanal</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="disabled" id="disabled" />
                                <Label htmlFor="disabled">Desativado</Label>
                            </div>
                        </RadioGroup>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button onClick={handleSaveSettings} disabled={isLoading || isSaving || isBackingUp}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Configuração
                </Button>
                <Button variant="outline" onClick={handleManualBackup} disabled={isLoading || isSaving || isBackingUp}>
                    {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudDownload className="mr-2 h-4 w-4" />}
                    {isBackingUp ? 'Fazendo Backup...' : 'Fazer Backup Manual'}
                </Button>
            </CardFooter>
        </Card>
    );
}
