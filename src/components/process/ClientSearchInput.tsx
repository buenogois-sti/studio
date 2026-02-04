'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Loader2, User, Check, Search, X, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { searchClients, getClientById } from '@/lib/client-actions';
import type { Client } from '@/lib/types';

interface ClientSearchInputProps {
  onSelect: (client: Client) => void;
  selectedClientId: string;
  onCreateNew?: () => void;
}

export function ClientSearchInput({ onSelect, selectedClientId, onCreateNew }: ClientSearchInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // OTIMIZAÇÃO: Busca cliente selecionado apenas quando o ID muda
  useEffect(() => {
    if (selectedClientId) {
      getClientById(selectedClientId).then((client) => {
        if (client) setSelectedClient(client);
      }).catch(err => console.error('[ClientSearchInput] Erro ao carregar cliente:', err));
    } else {
      setSelectedClient(null);
    }
  }, [selectedClientId]);

  // OTIMIZAÇÃO: Busca com debounce aprimorado para evitar requisições em série
  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchClients(search);
        setResults(data || []);
      } catch (error) {
        console.error('[ClientSearchInput] Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400); // Aumentado para 400ms para aliviar a main thread

    return () => clearTimeout(timer);
  }, [search]);

  // Fecha dropdown quando clica fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleSelect = useCallback((client: Client) => {
    setSelectedClient(client);
    onSelect(client);
    setOpen(false);
    setSearch('');
  }, [onSelect]);

  const handleCreateClick = useCallback(() => {
    setOpen(false);
    onCreateNew?.();
  }, [onCreateNew]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (!open) setOpen(true);
  };

  const renderedResults = useMemo(() => {
    if (isLoading) {
      return (
        <div className="p-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground mt-2">Buscando...</p>
        </div>
      );
    }

    if (search.length < 2) {
      return (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Digite pelo menos 2 caracteres para buscar
        </div>
      );
    }

    if (results.length === 0) {
      return (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Nenhum cliente encontrado para "{search}"
        </div>
      );
    }

    return (
      <div className="p-1">
        {results.map((client) => (
          <button
            key={client.id}
            onClick={() => handleSelect(client)}
            type="button"
            className={cn(
              'w-full text-left px-3 py-2.5 text-sm rounded hover:bg-accent transition-colors',
              selectedClientId === client.id && 'bg-primary/10 border-l-2 border-primary'
            )}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{client.firstName} {client.lastName}</p>
                <p className="text-xs text-muted-foreground">{client.document}</p>
              </div>
              {selectedClientId === client.id && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }, [isLoading, search, results, selectedClientId, handleSelect]);

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        variant="outline"
        type="button"
        className="w-full justify-start text-left font-normal h-11 border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
      >
        {selectedClient ? (
          <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
            <User className="h-4 w-4 text-primary" />
            <span className="font-semibold">{selectedClient.firstName} {selectedClient.lastName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Pesquisar cliente...</span>
          </div>
        )}
      </Button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-[200] animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Nome ou CPF/CNPJ..."
                value={search}
                onChange={handleInputChange}
                onKeyDown={(e) => { e.stopPropagation(); }}
                className="w-full pl-9 pr-9 h-9 rounded border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoComplete="off"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); inputRef.current?.focus(); }}
                  className="absolute right-3 top-2.5"
                  type="button"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {renderedResults}
          </div>

          {onCreateNew && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCreateClick}
                className="w-full h-8 justify-start text-[11px] font-bold uppercase text-primary hover:bg-primary/5"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Criar Novo Cliente
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
