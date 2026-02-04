'use client';

import * as React from 'react';
import { MapPin, Globe, Check, PlusCircle, Loader2, Search, X, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, summarizeAddress } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

const RECENT_LOCATIONS_KEY = 'recent_locations';
const RECENT_LOCATIONS_LIMIT = 6;
const RECENT_FALLBACK = 'Fórum de São Bernardo do Campo';

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
  const [recentLocations, setRecentLocations] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_LOCATIONS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setRecentLocations(parsed.filter((item) => typeof item === 'string'));
      }
    } catch (error) {
      console.error('Erro ao carregar locais recentes:', error);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  React.useEffect(() => {
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

  const addRecentLocation = React.useCallback((location: string) => {
    const normalized = location.trim();
    if (!normalized) return;
    const updated = [normalized, ...recentLocations.filter((item) => item !== normalized)].slice(0, RECENT_LOCATIONS_LIMIT);
    setRecentLocations(updated);
    try {
      localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Erro ao salvar locais recentes:', error);
    }
  }, [recentLocations]);

  const handleLocationSelect = (rawAddress: string) => {
    const summarized = summarizeAddress(rawAddress);
    onSelect(summarized);
    addRecentLocation(summarized);
    setOpen(false);
    setSearch('');
  };

  const displayName = React.useMemo(() => {
    if (!value) return '';
    return value.split('-')[0]?.trim() || value.split(',')[0]?.trim() || value;
  }, [value]);

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        variant="outline"
        type="button"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-start text-left font-normal h-11 bg-background border-2"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
      >
        {value ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate font-medium">{displayName}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </Button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-[200] animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input 
                ref={inputRef}
                placeholder="      Digite o fórum ou um endereço..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 h-9 rounded border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoComplete="off"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-2.5"
                  type="button"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
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
                <div className="px-2 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Endereços Encontrados</div>
                {apiResults.map((address) => (
                  <button
                    key={address}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleLocationSelect(address)}
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

            <div className="p-1 border-t first:border-t-0">
              <div className="px-2 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Últimos Fóruns Pesquisados</div>
              {(recentLocations.length ? recentLocations : [RECENT_FALLBACK]).map((location) => (
                <button
                  key={location}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleLocationSelect(location)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md transition-colors text-left",
                    "hover:bg-accent hover:text-accent-foreground",
                    value === location && "bg-accent text-accent-foreground font-bold"
                  )}
                >
                  <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <History className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="flex-1 truncate">{location}</span>
                  {value === location && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))}
            </div>
            
            {search && (
              <div className="p-1 border-t">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleLocationSelect(search)}
                  className="flex items-center gap-2 w-full px-3 py-3 text-sm rounded-md hover:bg-accent text-primary font-bold text-left"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Usar personalizado: "{search}"</span>
                </button>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
