'use client';

import * as React from 'react';
import { MapPin, Building2, Video, Globe, Check, ChevronsUpDown, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { cn } from '@/lib/utils';

export const groupedLocations = [
  {
    label: "Fóruns Trabalhistas (ABC)",
    items: [
      { name: "Fórum Trabalhista de São Bernardo do Campo", icon: MapPin },
      { name: "Fórum Trabalhista de Santo André", icon: MapPin },
      { name: "Fórum Trabalhista de Diadema", icon: MapPin },
      { name: "Fórum Trabalhista de Mauá", icon: MapPin },
      { name: "Fórum Trabalhista de São Caetano do Sul", icon: MapPin },
    ]
  },
  {
    label: "Tribunais e Sedes (SP)",
    items: [
      { name: "TRT-2 - Sede Barra Funda (São Paulo)", icon: Building2 },
      { name: "TRT-2 - Fórum Trabalhista da Zona Sul", icon: Building2 },
      { name: "TRT-2 - Fórum Trabalhista da Zona Leste", icon: Building2 },
    ]
  },
  {
    label: "Audiências Virtuais",
    items: [
      { name: "Audiência Virtual (Google Meet)", icon: Video },
      { name: "Audiência Virtual (Zoom)", icon: Video },
      { name: "Audiência Virtual (Microsoft Teams)", icon: Video },
    ]
  }
];

interface LocationSearchProps {
  value: string;
  onSelect: (val: string) => void;
  placeholder?: string;
}

export function LocationSearch({ value, onSelect, placeholder = "Pesquisar local ou endereço..." }: LocationSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [apiResults, setApiResults] = React.useState<string[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Busca de endereços reais via API (Nominatim OpenStreetMap)
  React.useEffect(() => {
    if (search.length < 4) {
      setApiResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&countrycodes=br&limit=5`
        );
        const data = await response.json();
        const results = data.map((item: any) => item.display_name);
        setApiResults(results);
      } catch (error) {
        console.error("Erro ao buscar endereço na API:", error);
      } finally {
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11 font-normal bg-background"
        >
          {value ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate font-medium">{value}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Command className="flex flex-col h-full" shouldFilter={false}>
          <CommandInput 
            placeholder="Digite o fórum ou um endereço real..." 
            value={search}
            onValueChange={setSearch}
            autoFocus
          />
          <CommandList className="flex-1 overflow-y-auto">
            {isSearching && (
              <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Buscando endereços...
              </div>
            )}
            
            <CommandEmpty>
              <div className="p-4 flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">Nenhum local sugerido encontrado.</p>
                {search && (
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="h-7 text-[10px] uppercase font-bold"
                    onClick={() => {
                      onSelect(search);
                      setOpen(false);
                    }}
                  >
                    Usar texto livre: "{search}"
                  </Button>
                )}
              </div>
            </CommandEmpty>

            {/* Resultados da API de Endereços */}
            {apiResults.length > 0 && (
              <CommandGroup heading="Endereços Encontrados (Maps)">
                {apiResults.map((address) => (
                  <CommandItem
                    key={address}
                    value={address}
                    onSelect={() => {
                      onSelect(address);
                      setOpen(false);
                    }}
                    className="flex items-start gap-2 py-3"
                  >
                    <Globe className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <span className="flex-1 text-xs leading-tight line-clamp-2">{address}</span>
                    <Check className={cn("h-4 w-4 shrink-0", value === address ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />

            {/* Sugestões Jurídicas Locais */}
            {groupedLocations.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.name}
                    value={item.name}
                    onSelect={(currentValue) => {
                      onSelect(currentValue);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 py-2.5"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{item.name}</span>
                    <Check className={cn("h-4 w-4 shrink-0", value === item.name ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            
            {search && !apiResults.includes(search) && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Personalizado">
                  <CommandItem
                    value={search}
                    onSelect={(val) => {
                      onSelect(val);
                      setOpen(false);
                    }}
                    className="py-3"
                  >
                    <div className="flex items-center gap-2 text-primary font-bold">
                      <PlusCircle className="h-4 w-4" />
                      <span>Usar: "{search}"</span>
                    </div>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
