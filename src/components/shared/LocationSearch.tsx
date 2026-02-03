'use client';

import * as React from 'react';
import { MapPin, Building2, Video, Globe, Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
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
  },
  {
    label: "Interno",
    items: [
      { name: "Escritório Bueno Gois", icon: Globe },
    ]
  }
];

interface LocationSearchProps {
  value: string;
  onSelect: (val: string) => void;
  placeholder?: string;
}

export function LocationSearch({ value, onSelect, placeholder = "Pesquisar ou digitar local..." }: LocationSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const allItems = React.useMemo(() => groupedLocations.flatMap(g => g.items.map(i => i.name)), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11 font-normal"
        >
          {value ? (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="truncate">{value}</span>
            </div>
          ) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command className="flex flex-col h-full">
          <CommandInput 
            placeholder="Ex: Fórum SBC ou Link..." 
            value={search}
            onValueChange={setSearch}
            autoFocus
          />
          <CommandList className="flex-1 overflow-y-auto">
            <CommandEmpty>
              <div className="p-4 flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">Nenhum local encontrado.</p>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="h-7 text-[10px] uppercase font-bold"
                  onClick={() => {
                    onSelect(search);
                    setOpen(false);
                  }}
                >
                  Usar: "{search}"
                </Button>
              </div>
            </CommandEmpty>
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
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{item.name}</span>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === item.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            
            {search && !allItems.some(name => name.toLowerCase() === search.toLowerCase()) && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Novo Local">
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
                      <span>Usar personalizado: "{search}"</span>
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
