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
import { Loader2, Search, MapPin, Calendar, Building, User, Smartphone, CreditCard, ShieldCheck } from 'lucide-react';

import { useFirebase } from '@/firebase';
import { collection, serverTimestamp, Timestamp, doc, addDoc, updateDoc } from 'firebase/firestore';
import type { Client } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';

const clientSchema = z.object({
  status: z.enum(['lead', 'active', 'inactive']).default('active'),
  clientType: z.string().min(1, { message: 'Selecione o tipo de cliente.' }),
  firstName: z.string().min(2, { message: 'O nome / razão social deve ter pelo menos 2 caracteres.' }),
  lastName: z.string().optional().or(z.literal('')),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  document: z.string().min(11, { message: 'O documento deve ser um CPF ou CNPJ válido.' }),
  motherName: z.string().optional().or(z.literal('')),
  rg: z.string().optional().or(z.literal('')),
  rgIssuer: z.string().optional().or(z.literal('')),
  rgIssuanceDate: z.string().optional().or(z.literal('')),
  ctps: z.string().optional().or(z.literal('')),
  pis: z.string().optional().or(z.literal('')),
  nationality: z.string().optional().or(z.literal('')),
  civilStatus: z.string().optional().or(z.literal('')),
  profession: z.string().optional().or(z.literal('')),
  stateRegistration: z.string().optional().or(z.literal('')),
  municipalRegistration: z.string().optional().or(z.literal('')),
  representativeName: z.string().optional().or(z.literal('')),
  representativeCpf: z.string().optional().or(z.literal('')),
  representativeRg: z.string().optional().or(z.literal('')),
  representativeRole: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  mobile: z.string().optional().or(z.literal('')),
  emergencyContact: z.string().optional().or(z.literal('')),
  legalArea: z.string().optional().or(z.literal('')),
  address_street: z.string().optional().or(z.literal('')),
  address_number: z.string().optional().or(z.literal('')),
  address_complement: z.string().optional().or(z.literal('')),
  address_zipCode: z.string().optional().or(z.literal('')),
  address_neighborhood: z.string().optional().or(z.literal('')),
  address_city: z.string().optional().or(z.literal('')),
  address_state: z.string().optional().or(z.literal('')),
  bankBeneficiary: z.string().optional().or(z.literal('')),
  bankName: z.string().optional().or(z.literal('')),
  agency: z.string().optional().or(z.literal('')),
  account: z.string().optional().or(z.literal('')),
  pixKey: z.string().optional().or(z.literal('')),
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
      clientType: client?.clientType ?? 'Pessoa Física',
      firstName: client?.firstName ?? '',
      lastName: client?.lastName ?? '',
      email: client?.email ?? '',
      document: client?.document ?? '',
      motherName: client?.motherName ?? '',
      rg: client?.rg ?? '',
      rgIssuer: client?.rgIssuer ?? '',
      rgIssuanceDate: client?.rgIssuanceDate ?? '',
      ctps: client?.ctps ?? '',
      pis: client?.pis ?? '',
      nationality: client?.nationality ?? 'brasileiro(a)',
      civilStatus: client?.civilStatus ?? 'solteiro(a)',
      profession: client?.profession ?? '',
      stateRegistration: client?.stateRegistration ?? '',
      municipalRegistration: client?.municipalRegistration ?? '',
      representativeName: client?.representativeName ?? '',
      representativeCpf: client?.representativeCpf ?? '',
      representativeRg: client?.representativeRg ?? '',
      representativeRole: client?.representativeRole ?? '',
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

  const watchedType = form.watch('clientType');
  const isPJ = watchedType === 'Pessoa Jurídica';

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

      const displayName = `${clientData.firstName} ${clientData.lastName || ''}`.trim();

      if (client?.id) {
        const clientRef = doc(firestore, 'clients', client.id);
        await updateDoc(clientRef, { ...clientData, updatedAt: serverTimestamp() });
        toast({ title: 'Cadastro atualizado!', description: `Os dados de ${displayName} foram salvos.` });
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
          lastName: clientData.lastName || '',
            createdAt: Timestamp.now(),
            avatar: ''
        };

        toast({ title: 'Cadastro concluído!', description: `${displayName} foi adicionado à base.` });
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
        <fieldset disabled={isSaving} className="space-y-10">
          
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-5 w-5 text-primary" />
              <H2 className="text-white border-primary/20">{isPJ ? 'Dados da Empresa' : 'Dados Pessoais'}</H2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl border border-white/10">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status do Cadastro *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 bg-background">
                          <SelectValue placeholder="Selecionar status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">🟢 Ativo</SelectItem>
                        <SelectItem value="lead">🟠 Lead</SelectItem>
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
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tipo de Pessoa *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 bg-background">
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
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{isPJ ? 'CNPJ *' : 'CPF *'}</FormLabel>
                    <FormControl>
                      <Input placeholder={isPJ ? "00.000.000/0000-00" : "000.000.000-00"} className="h-11 bg-background font-mono" {...field} />
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
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{isPJ ? 'Razão Social *' : 'Nome *'}</FormLabel>
                    <FormControl>
                      <Input placeholder={isPJ ? "Nome oficial da empresa" : "Primeiro nome"} className="h-11 bg-background font-bold" {...field} />
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
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{isPJ ? 'Nome Fantasia' : 'Sobrenome *'}</FormLabel>
                    <FormControl>
                      <Input placeholder={isPJ ? "Como a empresa é conhecida" : "Sobrenome completo"} className="h-11 bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isPJ && (
                <>
                  <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nacionalidade</FormLabel>
                        <FormControl><Input placeholder="brasileiro(a)" className="h-11 bg-background" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="civilStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estado Civil</FormLabel>
                        <FormControl><Input placeholder="solteiro(a)" className="h-11 bg-background" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="profession"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Profissão</FormLabel>
                        <FormControl><Input placeholder="Ex: ajudante geral" className="h-11 bg-background" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">RG</FormLabel>
                        <FormControl><Input placeholder="00.000.000-0" className="h-11 bg-background font-mono" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rgIssuer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Emissor</FormLabel>
                          <FormControl><Input placeholder="Ex: SSP/SP" className="h-11 bg-background" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rgIssuanceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Expedição</FormLabel>
                          <FormControl><Input type="date" className="h-11 bg-background" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="motherName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nome da Mãe</FormLabel>
                        <FormControl><Input placeholder="Nome completo da mãe" className="h-11 bg-background" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="legalArea"
                render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Área Jurídica de Atendimento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 bg-background">
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

          {isPJ && (
            <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <H2 className="text-white border-primary/20">Representante Legal</H2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl border border-white/10">
                <FormField
                  control={form.control}
                  name="representativeName"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nome do Representante</FormLabel>
                      <FormControl><Input placeholder="Ex: João da Silva" className="h-11 bg-background font-bold" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="representativeCpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">CPF Representante</FormLabel>
                      <FormControl><Input placeholder="000.000.000-00" className="h-11 bg-background font-mono" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="representativeRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Cargo / Vínculo</FormLabel>
                      <FormControl><Input placeholder="Ex: Sócio Administrador" className="h-11 bg-background" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-5 w-5 text-blue-400" />
              <H2 className="text-white border-primary/20">Contato & Endereço</H2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl border border-white/10">
              <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Email Principal *</FormLabel>
                        <FormControl><Input placeholder="contato@empresa.com.br" className="h-11 bg-background" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">WhatsApp / Celular *</FormLabel>
                    <FormControl><Input placeholder="(00) 00000-0000" className="h-11 bg-background font-bold text-emerald-400" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Telefone Fixo</FormLabel>
                    <FormControl><Input placeholder="(00) 0000-0000" className="h-11 bg-background" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                  control={form.control}
                  name="address_zipCode"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">CEP</FormLabel>
                          <div className="flex gap-2">
                            <FormControl><Input placeholder="00000-000" className="h-11 bg-background font-mono" {...field} maxLength={9} /></FormControl>
                            <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={handleCepSearch} disabled={isSearchingCep || !field.value}>
                              {isSearchingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                          </div>
                          <FormMessage />
                      </FormItem>
                  )}
              />

              <FormField
                  control={form.control}
                  name="address_street"
                  render={({ field }) => (
                      <FormItem className="md:col-span-2">
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><MapPin className="h-3 w-3" /> Logradouro</FormLabel>
                      <FormControl><Input placeholder="Rua, avenida, etc" className="h-11 bg-background" {...field} /></FormControl>
                      </FormItem>
                  )}
              />
               <FormField
                control={form.control}
                name="address_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Número</FormLabel>
                    <FormControl><Input placeholder="123" className="h-11 bg-background" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Bairro</FormLabel>
                    <FormControl><Input placeholder="Bairro" className="h-11 bg-background" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                <FormField
                  control={form.control}
                  name="address_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Cidade</FormLabel>
                      <FormControl><Input placeholder="Cidade" className="h-11 bg-background" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estado (UF)</FormLabel>
                      <FormControl><Input placeholder="SP" className="h-11 bg-background uppercase" {...field} maxLength={2} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-emerald-400" />
                <H2 className="text-white border-primary/20">Dados Bancários para Recebimento</H2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl border border-white/10">
                  <FormField
                      control={form.control}
                      name="bankBeneficiary"
                      render={({ field }) => (
                          <FormItem className="md:col-span-2">
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nome do Favorecido</FormLabel>
                              <FormControl><Input placeholder="Titular da conta" className="h-11 bg-background" {...field} /></FormControl>
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Banco</FormLabel>
                              <FormControl><Input placeholder="Ex: Itaú, Santander..." className="h-11 bg-background" {...field} /></FormControl>
                          </FormItem>
                      )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="agency"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Agência</FormLabel>
                                <FormControl><Input placeholder="0000" className="h-11 bg-background" {...field} /></FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="account"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Conta Corrente</FormLabel>
                                <FormControl><Input placeholder="00000-0" className="h-11 bg-background" {...field} /></FormControl>
                            </FormItem>
                        )}
                    />
                  </div>
                  <FormField
                      control={form.control}
                      name="pixKey"
                      render={({ field }) => (
                          <FormItem className="md:col-span-2">
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Chave PIX Oficial</FormLabel>
                              <FormControl><Input placeholder="CPF, E-mail ou Telefone" className="h-11 bg-background" {...field} /></FormControl>
                          </FormItem>
                      )}
                  />
              </div>
          </section>

        </fieldset>

        <SheetFooter className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t border-white/5 pt-6 pb-6 px-1 z-50 mt-10">
           <div className="flex w-full justify-between items-center gap-4">
                <Button type="button" variant="ghost" onClick={onSave} disabled={isSaving} className="text-slate-400 hover:text-white font-bold h-12 uppercase text-[10px] tracking-widest">Cancelar</Button>
                <Button type="submit" disabled={isSaving} className="min-w-[200px] h-12 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isSaving ? 'Salvando...' : (client ? 'Salvar Alterações' : 'Finalizar Cadastro')}
                </Button>
           </div>
        </SheetFooter>
      </form>
    </Form>
  );
}
