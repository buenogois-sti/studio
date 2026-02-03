'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, User, Check, ChevronsUpDown, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { searchClients, getClientById } from '@/lib/client-actions';
import type { Client } from '@/lib/types';

interface ClientSearchInputProps {
  onSelect: (client: Client) => void;
  selectedClientId: string;
}

export function ClientSearchInput({ onSelect, selectedClientId }: ClientSearchInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedClientId && (!selectedClient || selectedClient.id !== selectedClientId)) {
      getClientById(selectedClientId)
        .then(setSelectedClient)
        .catch((error) => {
          console.error("Error fetching client:", error);
        });
    }
  }, [selectedClientId, selectedClient]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const clients = await searchClients(search);
        setResults(clients);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Erro na busca',
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search, toast]);

  const handleSelect = (client: Client) => {
    setSelectedClient(client);
    onSelect(client);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between h-11 font-normal bg-background border-2 hover:border-primary/50 transition-all"
        >
          {selectedClient ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span className="truncate font-bold">
                {selectedClient.firstName} {selectedClient.lastName}
              </span>
              <Badge variant="secondary" className="text-[9px] font-mono shrink-0 hidden sm:inline px-1.5 h-4">
                {selectedClient.document}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground italic">Pesquisar cliente por Nome ou CPF/CNPJ...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[100]" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col bg-popover border shadow-2xl rounded-xl overflow-hidden">
          <div className="flex items-center border-b px-3 bg-muted/10">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              placeholder="Digite o nome ou documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-11 bg-transparent"
              autoComplete="off"
            />
          </div>

          <ScrollArea className="max-h-[350px] overflow-y-auto">
            {isLoading && (
              <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Buscando na base de dados...</span>
              </div>
            )}

            {!isLoading && search.length >= 2 && results.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground italic">
                Nenhum cliente encontrado com estes dados.
              </div>
            )}

            {search.length < 2 && !isLoading && (
              <div className="p-6 text-center text-[10px] uppercase font-black tracking-widest text-muted-foreground/50">
                Aguardando digitação...
              </div>
            )}

            <div className="p-1.5">
              {results.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => handleSelect(client)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-all text-left group',
                    'hover:bg-primary/5 cursor-pointer',
                    selectedClientId === client.id && 'bg-primary/10 border border-primary/20'
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <User className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate font-bold group-hover:text-primary transition-colors">
                      {client.firstName} {client.lastName}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
                          Doc: {client.document}
                        </span>
                        {client.legalArea && (
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 uppercase">{client.legalArea}</Badge>
                        )}
                    </div>
                  </div>
                  {selectedClientId === client.id && (
                    <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
