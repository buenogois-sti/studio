'use client';

import * as React from 'react';
import { MapPin, Building2, Video, Globe, Check, ChevronsUpDown, PlusCircle, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

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
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Forçar foco no input ao abrir
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

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
    <Popover open={open} onOpenChange={setOpen} modal={false}>
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
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[100]" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onKeyDown={(e) => e.stopPropagation()} // Impede bloqueio pela Sheet
      >
        <div className="flex flex-col h-full bg-popover border shadow-xl rounded-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input 
              ref={inputRef}
              placeholder="Digite o fórum ou um endereço..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation(); // Garante digitação
              }}
              className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-11 bg-transparent"
            />
          </div>
          
          <ScrollArea className="max-h-[350px] overflow-y-auto">
            {isSearching && (
              <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Buscando endereços...
              </div>
            )}

            {apiResults.length > 0 && (
              <div className="p-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Endereços Encontrados</div>
                {apiResults.map((address) => (
                  <button
                    key={address}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onSelect(address); setOpen(false); }}
                    className={cn(
                      "flex items-start gap-2 w-full px-3 py-2.5 text-sm rounded-md transition-colors text-left",
                      "hover:bg-accent hover:text-accent-foreground",
                      value === address && "bg-accent text-accent-foreground font-bold"
                    )}
                  >
                    <Globe className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <span className="flex-1 text-xs leading-tight line-clamp-2">{address}</span>
                    {value === address && <Check className="h-4 w-4 shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            )}

            {groupedLocations.map((group) => (
              <div key={group.label} className="p-1 border-t first:border-t-0">
                <div className="px-2 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{group.label}</div>
                {group.items.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onSelect(item.name); setOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md transition-colors text-left",
                      "hover:bg-accent hover:text-accent-foreground",
                      value === item.name && "bg-accent text-accent-foreground font-bold"
                    )}
                  >
                    <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="flex-1 truncate">{item.name}</span>
                    {value === item.name && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
            
            {search && (
              <div className="p-1 border-t">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onSelect(search); setOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-3 text-sm rounded-md hover:bg-accent text-primary font-bold text-left"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Usar: "{search}"</span>
                </button>
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}