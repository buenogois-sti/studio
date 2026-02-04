'use client';
import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SheetFooter } from '@/components/ui/sheet';
import { H2 } from '@/components/ui/typography';
import { Loader2, Search, DollarSign, Percent, Briefcase } from 'lucide-react';

import { useFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc, updateDoc } from 'firebase/firestore';
import type { Staff, RemunerationType } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const staffSchema = z.object({
  role: z.enum(['employee', 'lawyer', 'intern'], { required_error: 'O perfil é obrigatório.'}),
  firstName: z.string().min(2, { message: 'O nome é obrigatório.' }),
  lastName: z.string().min(2, { message: 'O sobrenome é obrigatório.' }),
  email: z.string().email({ message: 'E-mail inválido.' }),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_zipCode: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),

  oabNumber: z.string().optional(),
  oabStatus: z.enum(['Ativa', 'Suspensa', 'Inativa', 'Pendente']).optional(),

  bankName: z.string().optional(),
  agency: z.string().optional(),
  account: z.string().optional(),
  pixKey: z.string().optional(),

  remuneration_type: z.enum(['SUCUMBENCIA', 'PRODUCAO', 'QUOTA_LITIS', 'FIXO_MENSAL', 'AUDIENCISTA']).optional(),
  remuneration_officePercentage: z.coerce.number().min(0).max(100).optional(),
  remuneration_lawyerPercentage: z.coerce.number().min(0).max(100).optional(),
  remuneration_fixedMonthlyValue: z.coerce.number().min(0).optional(),
  remuneration_valuePerHearing: z.coerce.number().min(0).optional(),
  remuneration_priceDrafting: z.coerce.number().min(0).optional(),
  remuneration_priceDiligence: z.coerce.number().min(0).optional(),
}).refine((data) => {
    if (data.role === 'lawyer' || data.role === 'intern') {
        return data.oabNumber && data.oabNumber.length > 0;
    }
    return true;
}, {
    message: "O número da OAB é obrigatório para Advogado/Estagiário.",
    path: ["oabNumber"],
}).refine((data) => {
    if (data.role === 'lawyer' || data.role === 'intern') {
        return !!data.oabStatus;
    }
    return true;
}, {
    message: "A situação da OAB é obrigatória para Advogado/Estagiário.",
    path: ["oabStatus"],
}).refine((data) => {
    if (data.role === 'lawyer') {
        return !!data.remuneration_type;
    }
    return true;
}, {
    message: "A regra de remuneração é obrigatória para advogados.",
    path: ["remuneration_type"],
});

type StaffFormValues = z.infer<typeof staffSchema>;

const roleOptions = [
    { value: 'employee', label: 'Funcionário(a)' },
    { value: 'lawyer', label: 'Advogado(a)' },
    { value: 'intern', label: 'Estagiário(a)' },
];

const remunerationOptions = [
    { value: 'SUCUMBENCIA', label: 'Honorários de Sucumbência' },
    { value: 'PRODUCAO', label: 'Honorários por Produção (Pró-Labore)' },
    { value: 'QUOTA_LITIS', label: 'Participação sobre o Êxito (Quota Litis)' },
    { value: 'FIXO_MENSAL', label: 'Valor Fixo Mensal' },
    { value: 'AUDIENCISTA', label: 'Advogado Audiencista (Por Audiência)' },
];

const oabStatusOptions = ['Ativa', 'Suspensa', 'Inativa', 'Pendente'];

export function StaffForm({
  onSave,
  staff,
}: {
  onSave: () => void;
  staff?: Staff | null;
}) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadingZip, setLoadingZip] = React.useState(false);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: staff ? {
        ...staff,
        address_street: staff.address?.street ?? '',
        address_number: staff.address?.number ?? '',
        address_complement: staff.address?.complement ?? '',
        address_zipCode: staff.address?.zipCode ?? '',
        address_neighborhood: staff.address?.neighborhood ?? '',
        address_city: staff.address?.city ?? '',
        address_state: staff.address?.state ?? '',
        bankName: staff.bankInfo?.bankName ?? '',
        agency: staff.bankInfo?.agency ?? '',
        account: staff.bankInfo?.account ?? '',
        pixKey: staff.bankInfo?.pixKey ?? '',
        remuneration_type: staff.remuneration?.type,
        remuneration_officePercentage: staff.remuneration?.officePercentage,
        remuneration_lawyerPercentage: staff.remuneration?.lawyerPercentage,
        remuneration_fixedMonthlyValue: staff.remuneration?.fixedMonthlyValue,
        remuneration_valuePerHearing: staff.remuneration?.valuePerHearing,
        remuneration_priceDrafting: staff.remuneration?.activityPrices?.drafting,
        remuneration_priceDiligence: staff.remuneration?.activityPrices?.diligence,
    } : {
        role: 'lawyer',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        whatsapp: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_zipCode: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        oabNumber: '',
        oabStatus: 'Ativa' as any,
        bankName: '',
        agency: '',
        account: '',
        pixKey: '',
        remuneration_type: 'SUCUMBENCIA' as any,
    },
  });
  
  const watchedRole = form.watch('role');
  const watchedRemuneration = form.watch('remuneration_type');

  const searchAddressByCep = React.useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      toast({ variant: 'destructive', title: 'CEP inválido' });
      return;
    }
    setLoadingZip(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        toast({ variant: 'destructive', title: 'CEP não encontrado' });
        return;
      }
      form.setValue('address_street', data.logradouro || '');
      form.setValue('address_neighborhood', data.bairro || '');
      form.setValue('address_city', data.localidade || '');
      form.setValue('address_state', data.uf || '');
      toast({ title: 'Endereço encontrado!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao buscar CEP' });
    } finally {
      setLoadingZip(false);
    }
  }, [form, toast]);

  async function onSubmit(values: StaffFormValues) {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
      const { 
        address_street, address_number, address_complement, address_zipCode, 
        address_neighborhood, address_city, address_state,
        bankName, agency, account, pixKey,
        remuneration_type, remuneration_officePercentage, remuneration_lawyerPercentage,
        remuneration_fixedMonthlyValue, remuneration_valuePerHearing,
        remuneration_priceDrafting, remuneration_priceDiligence,
        ...restOfValues
      } = values;

      const staffData: any = { ...restOfValues };

      // Endereço
      staffData.address = {
        street: address_street,
        number: address_number,
        complement: address_complement,
        zipCode: address_zipCode,
        neighborhood: address_neighborhood,
        city: address_city,
        state: address_state,
      };

      // Banco
      staffData.bankInfo = {
        bankName,
        agency,
        account,
        pixKey,
      };

      // Remuneração (Apenas para Advogados)
      if (values.role === 'lawyer' && remuneration_type) {
        staffData.remuneration = {
          type: remuneration_type,
          officePercentage: remuneration_officePercentage,
          lawyerPercentage: remuneration_lawyerPercentage,
          fixedMonthlyValue: remuneration_fixedMonthlyValue,
          valuePerHearing: remuneration_valuePerHearing,
          activityPrices: {
            drafting: remuneration_priceDrafting,
            diligence: remuneration_priceDiligence,
          }
        };
      }

      const displayName = `${staffData.firstName} ${staffData.lastName}`;

      if (staff?.id) {
        await updateDoc(doc(firestore, 'staff', staff.id), { ...staffData, updatedAt: serverTimestamp() });
        toast({ title: 'Membro atualizado!' });
      } else {
        await addDoc(collection(firestore, 'staff'), { ...staffData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast({ title: 'Membro cadastrado!' });
      }
      onSave();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao Salvar', description: error.message });
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 pb-10">
        <fieldset disabled={isSaving} className="space-y-8">
          
          <section className="space-y-4">
            <H2 className="text-white border-primary/20">Identificação & Acesso</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl border border-white/10">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-muted-foreground tracking-widest">Perfil Profissional *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-11 bg-background"><SelectValue placeholder="Selecionar..." /></SelectTrigger></FormControl>
                      <SelectContent>{roleOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase text-muted-foreground tracking-widest">Email Corporativo *</FormLabel>
                        <FormControl><Input className="h-11 bg-background" placeholder="adv@buenogois.com.br" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-muted-foreground tracking-widest">Nome *</FormLabel>
                    <FormControl><Input className="h-11 bg-background" placeholder="Primeiro nome" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-muted-foreground tracking-widest">Sobrenome *</FormLabel>
                    <FormControl><Input className="h-11 bg-background" placeholder="Sobrenome completo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          {/* REGRA DE REMUNERAÇÃO (APENAS ADVOGADOS) */}
          {watchedRole === 'lawyer' && (
            <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <H2 className="text-white border-primary/20">Regras de Remuneração</H2>
                </div>
                <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/20 space-y-6">
                    <FormField
                        control={form.control}
                        name="remuneration_type"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-black uppercase text-primary tracking-widest">Modalidade de Pagamento *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-12 bg-background border-primary/30"><SelectValue placeholder="Selecione a regra base..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                {remunerationOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    {/* CAMPOS DINÂMICOS POR MODALIDADE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-primary/10">
                        {watchedRemuneration === 'SUCUMBENCIA' && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="remuneration_officePercentage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Cota Escritório (%)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input type="number" className="h-11 pl-10 bg-background" placeholder="Ex: 70" {...field} />
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="remuneration_lawyerPercentage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Cota Advogado (%)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input type="number" className="h-11 pl-10 bg-background" placeholder="Ex: 30" {...field} />
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        {watchedRemuneration === 'QUOTA_LITIS' && (
                            <FormField
                                control={form.control}
                                name="remuneration_lawyerPercentage"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel className="text-xs font-bold uppercase">Participação sobre o Êxito (%)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input type="number" className="h-11 pl-10 bg-background" placeholder="Ex: 10" {...field} />
                                            </div>
                                        </FormControl>
                                        <p className="text-[10px] text-primary/60 italic">Pagamento condicionado ao recebimento efetivo pelo cliente.</p>
                                    </FormItem>
                                )}
                            />
                        )}

                        {watchedRemuneration === 'FIXO_MENSAL' && (
                            <FormField
                                control={form.control}
                                name="remuneration_fixedMonthlyValue"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel className="text-xs font-bold uppercase">Valor Fixo Pro-Labore (R$)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input type="number" className="h-11 pl-10 bg-background" placeholder="0,00" {...field} />
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        )}

                        {watchedRemuneration === 'AUDIENCISTA' && (
                            <FormField
                                control={form.control}
                                name="remuneration_valuePerHearing"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel className="text-xs font-bold uppercase">Valor por Audiência Realizada (R$)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input type="number" className="h-11 pl-10 bg-background" placeholder="0,00" {...field} />
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        )}

                        {watchedRemuneration === 'PRODUCAO' && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="remuneration_priceDrafting"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Valor por Peça Processual (R$)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input type="number" className="h-11 pl-10 bg-background" placeholder="0,00" {...field} />
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="remuneration_priceDiligence"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase">Valor por Diligência (R$)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input type="number" className="h-11 pl-10 bg-background" placeholder="0,00" {...field} />
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}
                    </div>
                </div>
            </section>
          )}
          
          <section className="space-y-4">
            <H2 className="text-white border-primary/20">Contatos & Localização</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl border border-white/10">
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase text-muted-foreground tracking-widest">WhatsApp</FormLabel>
                    <FormControl><Input className="h-11 bg-background" placeholder="(11) 99999-9999" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                  control={form.control}
                  name="address_zipCode"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel className="text-xs font-black uppercase text-muted-foreground tracking-widest">CEP</FormLabel>
                      <div className="flex gap-2">
                        <FormControl><Input className="h-11 bg-background" placeholder="00000-000" {...field} maxLength={9}/></FormControl>
                        <Button type="button" variant="outline" size="icon" onClick={() => searchAddressByCep(field.value)} disabled={loadingZip || !field.value} className="h-11 w-11"><Search className={cn("h-4 w-4", loadingZip && "animate-spin")} /></Button>
                      </div>
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="address_street"
                  render={({ field }) => (
                      <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs font-black uppercase text-muted-foreground tracking-widest">Logradouro</FormLabel>
                      <FormControl><Input className="h-11 bg-background" placeholder="Rua, avenida, etc" {...field} /></FormControl>
                      </FormItem>
                  )}
              />
            </div>
          </section>
          
          {(watchedRole === 'lawyer' || watchedRole === 'intern') && (
            <section className="space-y-4">
                <H2 className="text-white border-primary/20">Habilitação Profissional</H2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl border border-white/10">
                  <FormField
                    control={form.control}
                    name="oabNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase text-muted-foreground tracking-widest">Número OAB *</FormLabel>
                        <FormControl><Input className="h-11 bg-background font-mono" placeholder="000000/SP" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="oabStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase text-muted-foreground tracking-widest">Situação OAB *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11 bg-background"><SelectValue placeholder="Selecionar..." /></SelectTrigger></FormControl>
                          <SelectContent>{oabStatusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
            </section>
          )}

        </fieldset>

        <SheetFooter className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t pt-6 pb-6 px-1 z-50">
           <div className="flex w-full justify-between items-center gap-4">
                <Button type="button" variant="ghost" onClick={onSave} disabled={isSaving} className="text-muted-foreground hover:text-white">Cancelar</Button>
                <Button type="submit" disabled={isSaving} className="min-w-[180px] bg-primary text-primary-foreground font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {staff ? 'Salvar Alterações' : 'Finalizar Cadastro'}
                </Button>
           </div>
        </SheetFooter>
      </form>
    </Form>
  );
}
