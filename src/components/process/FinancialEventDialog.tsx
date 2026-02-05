'use client';
import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import type { Process } from '@/lib/types';
import { createFinancialEventAndTitles } from '@/lib/finance-actions';

const eventSchema = z.object({
  type: z.enum(['ACORDO', 'SENTENCA', 'EXECUCAO', 'CONTRATO', 'CUSTAS', 'PERICIA', 'DESLOCAMENTO', 'ADICIONAL'], { required_error: 'O tipo do evento é obrigatório.'}),
  eventDate: z.coerce.date({ required_error: 'A data do evento é obrigatória.' }),
  description: z.string().min(3, 'A descrição é obrigatória.'),
  totalValue: z.coerce.number().positive('O valor total deve ser positivo.'),
  installments: z.coerce.number().int().min(1, 'Deve haver pelo menos 1 parcela.'),
  firstDueDate: z.coerce.date({ required_error: 'A data do primeiro vencimento é obrigatória.' }),
});

interface FinancialEventDialogProps {
  process: Process | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated: () => void;
}

export function FinancialEventDialog({ process, open, onOpenChange, onEventCreated }: FinancialEventDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: 'ACORDO',
      installments: 1,
    }
  });

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: { onChange: (value: number | undefined) => void }) => {
    const { value } = e.target;
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') {
        field.onChange(undefined);
        return;
    }
    const numberValue = Number(digitsOnly) / 100;
    field.onChange(numberValue);
  };

  const formatCurrencyForDisplay = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) {
        return '';
    }
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
  };

  React.useEffect(() => {
    if (process && open) {
      form.reset({
        type: 'ACORDO',
        description: `Acordo Processo: ${process.name}`,
        installments: 1,
        eventDate: new Date(),
        firstDueDate: addMonths(new Date(), 1),
        totalValue: 0,
      });
    }
  }, [process, open, form]);

  async function onSubmit(values: z.infer<typeof eventSchema>) {
    if (!process) return;

    setIsSaving(true);
    try {
      await createFinancialEventAndTitles({
        ...values,
        processId: process.id,
      });

      toast({
        title: 'Evento Financeiro Criado!',
        description: 'O evento e seus títulos foram gerados com sucesso no módulo financeiro.',
      });
      onEventCreated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Criar Evento',
        description: error.message || 'Não foi possível salvar o evento financeiro.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Novo Evento Financeiro</DialogTitle>
          <DialogDescription>
            Crie um evento jurídico para o processo "{process?.name}". Isso irá gerar os títulos financeiros automaticamente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Evento *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="ACORDO">Acordo</SelectItem>
                        <SelectItem value="SENTENCA">Sentença</SelectItem>
                        <SelectItem value="EXECUCAO">Execução</SelectItem>
                        <SelectItem value="CONTRATO">Contrato de Honorários</SelectItem>
                        <SelectItem value="CUSTAS">Custas Processuais</SelectItem>
                        <SelectItem value="PERICIA">Perícia / Assistência</SelectItem>
                        <SelectItem value="DESLOCAMENTO">Deslocamento / Diligência</SelectItem>
                        <SelectItem value="ADICIONAL">Adicional / Extra</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Evento *</FormLabel>
                  <FormControl><Textarea placeholder="Ex: Acordo homologado em audiência." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data do Evento *</FormLabel>
                    <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                          onChange={(e) => field.onChange(e.target.valueAsDate)}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                  control={form.control}
                  name="totalValue"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Valor Total (R$) *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">R$</span>
                          <Input
                            type="text"
                            placeholder="0,00"
                            className="pl-9"
                            value={formatCurrencyForDisplay(field.value)}
                            onChange={(e) => handleCurrencyChange(e, field)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="installments"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nº de Parcelas *</FormLabel>
                        <FormControl><Input type="number" min="1" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="firstDueDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Vencimento da 1ª Parcela *</FormLabel>
                        <FormControl>
                             <Input
                                type="date"
                                {...field}
                                value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                                onChange={(e) => field.onChange(e.target.valueAsDate)}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? "Gerando..." : "Gerar Títulos"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
