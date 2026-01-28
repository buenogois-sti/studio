'use client';
import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  File,
  ListFilter,
  MoreVertical,
  PlusCircle,
  Search,
  Truck,
} from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clients } from '@/lib/data';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const addClientSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  document: z.string().min(11, { message: 'O documento deve ser um CPF ou CNPJ válido.' }),
  phone: z.string().optional(),
});

function AddClientForm() {
  const form = useForm<z.infer<typeof addClientSchema>>({
    resolver: zodResolver(addClientSchema),
    defaultValues: {
      name: '',
      email: '',
      document: '',
      phone: '',
    },
  });

  function onSubmit(values: z.infer<typeof addClientSchema>) {
    console.log(values);
    // Here you would call a server action to create the client
    // e.g., createClientAction(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo / Razão Social</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Innovatech Soluções" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Ex: contato@innovatech.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="document"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF / CNPJ</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 12.345.678/0001-99" {...field} />
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
              <FormLabel>Telefone (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ex: (11) 99999-9999" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SheetFooter className="pt-4">
            <SheetClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
            </SheetClose>
            <Button type="submit">Salvar Cliente</Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

export default function ClientsPage() {
  return (
    <div className="grid flex-1 items-start gap-4 auto-rows-max">
      <div className="flex items-center gap-4">
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
          Clientes
        </h1>
        <div className="hidden items-center gap-2 md:ml-auto md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filtro</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked>Ativos</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Arquivados</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Exportar</span>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" className="h-8 gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Adicionar Cliente</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Adicionar Novo Cliente</SheetTitle>
                <SheetDescription>
                  Preencha os dados para cadastrar um novo cliente. A pasta no Google Drive será criada automaticamente.
                </SheetDescription>
              </SheetHeader>
              <AddClientForm />
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <Card>
        <CardHeader>
            <div className='relative'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground'/>
                <Input placeholder='Pesquisar clientes...' className='pl-8 w-full'/>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">Avatar</span>
                </TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Data de Cadastro</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={client.avatar} alt={client.name} data-ai-hint="company logo" />
                      <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{client.document}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{client.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Ver Processos</DropdownMenuItem>
                        <DropdownMenuItem>Abrir no Drive</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Arquivar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>1-5</strong> de <strong>{clients.length}</strong> clientes
          </div>
          <Pagination className="ml-auto">
            <PaginationContent>
              <PaginationItem>
                <Button size="icon" variant="outline" className="h-8 w-8">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="sr-only">Página Anterior</span>
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button size="icon" variant="outline" className="h-8 w-8">
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="sr-only">Próxima Página</span>
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      </Card>
    </div>
  );
}
