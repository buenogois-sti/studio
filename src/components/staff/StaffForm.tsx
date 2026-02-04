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
import { Loader2, Search } from 'lucide-react';

import { useFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc, updateDoc } from 'firebase/firestore';
import type { Staff } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';

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
});

type StaffFormValues = z.infer<typeof staffSchema>;

const roleOptions = [
    { value: 'employee', label: 'Funcionário(a)' },
    { value: 'lawyer', label: 'Advogado(a)' },
    { value: 'intern', label: 'Estagiário(a)' },
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
    } : {
        role: 'employee',
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
        oabStatus: undefined,
        bankName: '',
        agency: '',
        account: '',
        pixKey: '',
    },
  });
  
  const watchedRole = form.watch('role');

  // Função para buscar endereço via CEP
  const searchAddressByCep = React.useCallback(async (cep: string) => {
    // Remove caracteres não numéricos
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      toast({ 
        variant: 'destructive', 
        title: 'CEP inválido', 
        description: 'O CEP deve conter exatamente 8 dígitos.'
      });
      return;
    }

    setLoadingZip(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({ 
          variant: 'destructive', 
          title: 'CEP não encontrado', 
          description: 'Nenhum endereço foi encontrado para este CEP.'
        });
        setLoadingZip(false);
        return;
      }

      // Preencher os campos com dados da API
      form.setValue('address_street', data.logradouro || '');
      form.setValue('address_neighborhood', data.bairro || '');
      form.setValue('address_city', data.localidade || '');
      form.setValue('address_state', data.uf || '');
      form.setValue('address_zipCode', cleanCep);

      toast({ 
        title: 'Endereço encontrado!',
        description: `${data.logradouro}, ${data.bairro} - ${data.localidade}, ${data.uf}`
      });
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao buscar CEP', 
        description: 'Não foi possível conectar ao serviço de CEP.'
      });
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
        ...restOfValues
      } = values;

      const staffData: { [key: string]: any } = { ...restOfValues };

      // Sanitize the object to remove undefined or empty string values.
      Object.keys(staffData).forEach(key => {
        if (staffData[key] === undefined || staffData[key] === '') {
          delete staffData[key];
        }
      });
      
      const address: { [key: string]: any } = {};
      if (address_street) address.street = address_street;
      if (address_number) address.number = address_number;
      if (address_complement) address.complement = address_complement;
      if (address_zipCode) address.zipCode = address_zipCode;
      if (address_neighborhood) address.neighborhood = address_neighborhood;
      if (address_city) address.city = address_city;
      if (address_state) address.state = address_state;
      if (Object.keys(address).length > 0) {
        staffData.address = address;
      }

      if (values.role === 'lawyer' || values.role === 'intern') {
        const bankInfo: { [key: string]: any } = {};
        if (bankName) bankInfo.bankName = bankName;
        if (agency) bankInfo.agency = agency;
        if (account) bankInfo.account = account;
        if (pixKey) bankInfo.pixKey = pixKey;
        if (Object.keys(bankInfo).length > 0) {
          staffData.bankInfo = bankInfo;
        }
      } else {
        // For non-lawyers/interns, ensure these fields are not present in the final object
        delete staffData.oabNumber;
        delete staffData.oabStatus;
        delete staffData.bankInfo;
      }

      const displayName = `${staffData.firstName} ${staffData.lastName}`;

      if (staff?.id) {
        const staffRef = doc(firestore, 'staff', staff.id);
        await updateDoc(staffRef, { ...staffData, updatedAt: serverTimestamp() });
        toast({ title: 'Membro atualizado!', description: `Os dados de ${displayName} foram salvos.` });
      } else {
        const staffCollection = collection(firestore, 'staff');
        await addDoc(staffCollection, { ...staffData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast({ title: 'Membro cadastrado!', description: `${displayName} foi adicionado(a) à equipe.` });
      }
      onSave();
    } catch (error: any) {
        console.error("Failed to save staff member:", error);
        toast({ 
          variant: 'destructive', 
          title: 'Erro ao Salvar', 
          description: error.message || 'Não foi possível salvar os dados.'
        });
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 px-1 py-4">
        <fieldset disabled={isSaving} className="space-y-6">
          
          <section>
            <H2>Dados de Acesso e Perfil</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger ref={field.ref}>
                          <SelectValue placeholder="Selecionar perfil..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roleOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
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
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                            <Input placeholder="contato@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
              />
            </div>
          </section>
          
          <section>
            <H2>Dados Pessoais</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Primeiro nome" {...field} />
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
                    <FormLabel>Sobrenome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Sobrenome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 0000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                  control={form.control}
                  name="address_zipCode"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                            <Input 
                              placeholder="00000-000" 
                              {...field} 
                              maxLength={9}
                            />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => searchAddressByCep(field.value)}
                          disabled={loadingZip || !field.value}
                          className="px-3"
                        >
                          {loadingZip ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                      </FormItem>
                  )}
              />
            </div>
          </section>

          <section>
            <H2>Endereço</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                  control={form.control}
                  name="address_street"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                          <Input placeholder="Rua, avenida, etc" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="address_number"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                          <Input placeholder="000" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="address_neighborhood"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                          <Input placeholder="Bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="address_city"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                          <Input placeholder="Cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="address_state"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                          <Input placeholder="SP" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="address_complement"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                          <Input placeholder="Apto, sala, etc" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
            </div>
          </section>
          
          {(watchedRole === 'lawyer' || watchedRole === 'intern') && (
            <>
              <section>
                <H2>Dados da OAB</H2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="oabNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número da OAB *</FormLabel>
                        <FormControl>
                          <Input placeholder="000000/SP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="oabStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Situação da OAB *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger ref={field.ref}>
                              <SelectValue placeholder="Selecionar situação..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {oabStatusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <section>
                <H2>Dados Financeiros</H2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormField
                        control={form.control}
                        name="bankName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Banco</FormLabel>
                                <FormControl><Input placeholder="Nome do banco" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="agency"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Agência</FormLabel>
                                <FormControl><Input placeholder="0000" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="account"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Conta Corrente</FormLabel>
                                <FormControl><Input placeholder="00000-0" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="pixKey"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Chave PIX</FormLabel>
                                <FormControl><Input placeholder="CPF, e-mail, telefone, etc." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              </section>
            </>
          )}

        </fieldset>

        <SheetFooter className="pt-4">
           <Button type="button" variant="outline" onClick={onSave} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Salvando...' : (staff ? 'Salvar Alterações' : 'Salvar Membro')}
            </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}
