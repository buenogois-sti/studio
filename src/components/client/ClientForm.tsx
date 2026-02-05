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
import { Loader2, Search, MapPin, CheckCircle2 } from 'lucide-react';

import { useFirebase } from '@/firebase';
import { collection, serverTimestamp, Timestamp, doc, addDoc, updateDoc } from 'firebase/firestore';
import type { Client, ClientStatus } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';

const clientSchema = z.object({
  status: z.enum(['lead', 'active', 'inactive']).default('active'),
  clientType: z.string().min(1, { message: 'Selecione o tipo de cliente.' }),
  firstName: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  lastName: z.string().min(2, { message: 'O sobrenome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  document: z.string().min(11, { message: 'O documento deve ser um CPF ou CNPJ válido.' }),
  motherName: z.string().optional(),
  rg: z.string().optional(),
  ctps: z.string().optional(),
  pis: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  emergencyContact: z.string().optional(),
  legalArea: z.string().optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_zipCode: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  bankBeneficiary: z.string().optional(),
  bankName: z.string().optional(),
  agency: z.string().optional(),
  account: z.string().optional(),
  pixKey: z.string().optional(),
});


const legalAreas = ['Trabalhista', 'Cível', 'Criminal', 'Família', 'Previdenciário', 'Tributário', 'Outro'];
const clientTypes = ['Pessoa Física', 'Pessoa Jurídica'];

export function ClientForm({
  onSave,
  onSaveSuccess,
  client,
}: {
  onSave: () => void;
  onSaveSuccess?: (client: Client) => void;
  client?: Client | null;
}) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSearchingCep, setIsSearchingCep] = React.useState(false);

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      status: client?.status ?? 'active',
      clientType: client?.clientType ?? '',
      firstName: client?.firstName ?? '',
      lastName: client?.lastName ?? '',
      email: client?.email ?? '',
      document: client?.document ?? '',
      motherName: client?.motherName ?? '',
      rg: client?.rg ?? '',
      ctps: client?.ctps ?? '',
      pis: client?.pis ?? '',
      phone: client?.phone ?? '',
      mobile: client?.mobile ?? '',
      emergencyContact: client?.emergencyContact ?? '',
      legalArea: client?.legalArea ?? '',
      address_street: client?.address?.street ?? '',
      address_number: client?.address?.number ?? '',
      address_complement: client?.address?.complement ?? '',
      address_zipCode: client?.address?.zipCode ?? '',
      address_neighborhood: client?.address?.neighborhood ?? '',
      address_city: client?.address?.city ?? '',
      address_state: client?.address?.state ?? '',
      bankBeneficiary: client?.bankInfo?.bankBeneficiary ?? '',
      bankName: client?.bankInfo?.bankName ?? '',
      agency: client?.bankInfo?.agency ?? '',
      account: client?.bankInfo?.account ?? '',
      pixKey: client?.bankInfo?.pixKey ?? '',
    },
  });

  const handleCepSearch = React.useCallback(async () => {
    const cep = form.getValues('address_zipCode');
    const cleanCep = cep?.replace(/\D/g, '');
    
    if (!cleanCep || cleanCep.length !== 8) {
        toast({
            variant: 'destructive',
            title: 'CEP Inválido',
            description: 'Por favor, insira um CEP com 8 dígitos.',
        });
        return;
    }

    setIsSearchingCep(true);
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        if (!response.ok) throw new Error('Falha na resposta da API');
        const data = await response.json();
        if (data.erro) {
            toast({
                variant: 'destructive',
                title: 'CEP não encontrado',
            });
        } else {
            form.setValue('address_street', data.logradouro, { shouldValidate: true });
            form.setValue('address_neighborhood', data.bairro, { shouldValidate: true });
            form.setValue('address_city', data.localidade, { shouldValidate: true });
            form.setValue('address_state', data.uf, { shouldValidate: true });
            toast({ 
              title: 'Endereço encontrado!',
              description: `${data.logradouro}, ${data.localidade}`
            });
            // Focus on number field after success
            setTimeout(() => {
              const numInput = document.getElementsByName('address_number')[0];
              if (numInput) numInput.focus();
            }, 100);
        }
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao buscar CEP',
            description: 'Não foi possível conectar à API de CEP.',
        });
    } finally {
      setIsSearchingCep(false);
    }
  }, [form, toast]);


  React.useEffect(() => {
    if (client) {
      const flatClientData: any = {
        ...client,
        address_street: client.address?.street,
        address_number: client.address?.number,
        address_complement: client.address?.complement,
        address_zipCode: client.address?.zipCode,
        address_neighborhood: client.address?.neighborhood,
        address_city: client.address?.city,
        address_state: client.address?.state,
        bankBeneficiary: client.bankInfo?.bankBeneficiary,
        bankName: client.bankInfo?.bankName,
        agency: client.bankInfo?.agency,
        account: client.bankInfo?.account,
        pixKey: client.bankInfo?.pixKey,
      };
      delete flatClientData.address;
      delete flatClientData.bankInfo;
      form.reset(flatClientData);
    } else {
      form.reset({
        status: 'active',
        clientType: '',
        firstName: '',
        lastName: '',
        email: '',
        document: '',
        motherName: '',
        rg: '',
        ctps: '',
        pis: '',
        phone: '',
        mobile: '',
        emergencyContact: '',
        legalArea: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_zipCode: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        bankBeneficiary: '',
        bankName: '',
        agency: '',
        account: '',
        pixKey: '',
      });
    }
  }, [client, form]);

  async function onSubmit(values: z.infer<typeof clientSchema>) {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
      const { 
        address_street, address_number, address_complement, address_zipCode, 
        address_neighborhood, address_city, address_state,
        bankBeneficiary, bankName, agency, account, pixKey,
        ...restOfValues
      } = values;

      const clientData = {
        ...restOfValues,
        address: {
          street: address_street,
          number: address_number,
          complement: address_complement,
          zipCode: address_zipCode,
          neighborhood: address_neighborhood,
          city: address_city,
          state: address_state,
        },
        bankInfo: {
          bankBeneficiary,
          bankName,
          agency,
          account,
          pixKey,
        }
      };

      const displayName = `${clientData.firstName} ${clientData.lastName}`;

      if (client?.id) {
        const clientRef = doc(firestore, 'clients', client.id);
        await updateDoc(clientRef, { ...clientData, updatedAt: serverTimestamp() });
        toast({ title: 'Cliente atualizado!', description: `Os dados de ${displayName} foram salvos.` });
      } else {
        const clientsCollection = collection(firestore, 'clients');
        const newClientPayload = {
          ...clientData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          avatar: '', 
        }
        const docRef = await addDoc(clientsCollection, newClientPayload);
        const newClient: Client = {
            id: docRef.id,
            ...clientData,
            createdAt: Timestamp.now(),
            avatar: ''
        };

        toast({ title: 'Cliente cadastrado!', description: `${displayName} foi adicionado com sucesso.` });
        onSaveSuccess?.(newClient);
      }
      onSave();
    } catch (error: any) {
        console.error("Failed to save client:", error);
        toast({ 
          variant: 'destructive', 
          title: 'Erro ao Salvar', 
          description: error.message || 'Não foi possível salvar os dados do cliente.'
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
            <H2>Dados Pessoais</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status do Cliente *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger ref={field.ref}>
                          <SelectValue placeholder="Selecionar status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">🟢 Ativo</SelectItem>
                        <SelectItem value="lead">🟡 Consulta / Lead</SelectItem>
                        <SelectItem value="inactive">⚪ Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cliente *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger ref={field.ref}>
                          <SelectValue placeholder="Selecionar tipo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF / CNPJ *</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                name="motherName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome da Mãe</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo da mãe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RG</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000-0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ctps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTPS</FormLabel>
                    <FormControl>
                      <Input placeholder="Nº da Carteira de Trabalho" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="pis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIS/PASEP</FormLabel>
                    <FormControl>
                      <Input placeholder="Nº do PIS/PASEP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalArea"
                render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área Jurídica</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger ref={field.ref}>
                                <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              {legalAreas.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                )}
                />
            </div>
          </section>

          <section>
            <H2>Contato & Endereço</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                            <Input placeholder="contato@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celular / WhatsApp *</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
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
                    <FormLabel>Telefone Fixo</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 0000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Contato de Emergência (Recado)</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome e telefone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="md:col-span-2">
                <FormField
                    control={form.control}
                    name="address_zipCode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <div className="relative">
                              <FormControl>
                                  <Input placeholder="00000-000" className="pr-10" {...field} />
                              </FormControl>
                              <button 
                                type="button" 
                                onClick={handleCepSearch} 
                                disabled={isSearchingCep || isSaving}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                              >
                                {isSearchingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                              </button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              </div>

              <FormField
                  control={form.control}
                  name="address_street"
                  render={({ field }) => (
                      <FormItem className="md:col-span-2">
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Rua, avenida, etc" className="pl-10" {...field} />
                        </div>
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
                      <Input placeholder="123" {...field} />
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
              <FormField
                control={form.control}
                name="address_neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Centro" {...field} />
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
                      <Input placeholder="São Paulo" {...field} />
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
                      <Input placeholder="SP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section>
              <H2>Dados Bancários</H2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                      control={form.control}
                      name="bankBeneficiary"
                      render={({ field }) => (
                          <FormItem className="md:col-span-2">
                              <FormLabel>Nome do Favorecido</FormLabel>
                              <FormControl><Input placeholder="Deixe em branco se for o próprio cliente" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
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

        </fieldset>

        <SheetFooter className="pt-4">
           <Button type="button" variant="outline" onClick={onSave} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Salvando...' : (client ? 'Salvar Alterações' : 'Salvar Cliente')}
            </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}
