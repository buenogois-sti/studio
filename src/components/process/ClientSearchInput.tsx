'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, User, Check, ChevronsUpDown, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
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

  // Load selected client on mount or when selectedClientId changes
  useEffect(() => {
    if (selectedClientId && !selectedClient) {
      getClientById(selectedClientId)
        .then(setSelectedClient)
        .catch((error) => {
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar cliente',
            description: error.message,
          });
        });
    }
  }, [selectedClientId, selectedClient, toast]);

  // Auto-focus input when popover opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Search clients as user types
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
          title: 'Erro ao Buscar Cliente',
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search, toast]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    onSelect(client);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11 font-normal bg-background"
        >
          {selectedClient ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <User className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate font-bold">
                {selectedClient.firstName} {selectedClient.lastName}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono shrink-0 hidden sm:inline">
                ({selectedClient.document})
              </span>
            </div>
          ) : (
            'Buscar cliente por nome ou CPF...'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex flex-col bg-popover border rounded-md">
          {/* Search Input Header */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              placeholder="Digite nome ou documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-10 bg-transparent"
              autoComplete="off"
            />
          </div>

          {/* Results List */}
          <ScrollArea className="max-h-[300px] overflow-y-auto">
            {isLoading && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Buscando na base...
              </div>
            )}

            {!isLoading && search.length >= 2 && results.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum cliente encontrado.
              </div>
            )}

            {search.length < 2 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Digite pelo menos 2 caracteres...
              </div>
            )}

            <div className="p-1">
              {results.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelectClient(client)}
                  className={cn(
                    'flex items-start gap-3 w-full px-3 py-2.5 text-sm rounded-md transition-colors text-left',
                    'hover:bg-accent hover:text-accent-foreground cursor-pointer',
                    selectedClientId === client.id &&
                      'bg-accent text-accent-foreground font-bold'
                  )}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate font-bold">
                      {client.firstName} {client.lastName}
                    </span>
                    <span className="block text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
                      Doc: {client.document}
                    </span>
                  </div>
                  {selectedClientId === client.id && (
                    <Check className="ml-2 h-4 w-4 shrink-0 self-center" />
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
