import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resume um endereço longo (geralmente do OSM) para um formato mais legível e profissional.
 * Ex: Fórum - Rua, Número - Cidade - Estado - CEP, País
 */
export function summarizeAddress(address: string): string {
  if (!address) return '';
  
  // Divide o endereço por vírgulas
  const parts = address.split(',').map(p => p.trim());
  
  // Lista de termos irrelevantes para um endereço jurídico resumido
  const blacklist = [
    'região', 'metropolitana', 'geográfica', 'intermediária', 
    'imediata', 'microregião', 'mesorregião', 'sudeste', 'brasil'
  ];

  // Filtra as partes que contêm termos da blacklist
  const filtered = parts.filter(p => {
    const low = p.toLowerCase();
    return !blacklist.some(term => low.includes(term));
  });

  // Tenta identificar Nome, Número e Rua para reordenar (Padrão: Fórum, Número, Rua...)
  if (filtered.length >= 3) {
    const name = filtered[0];
    const maybeNumber = filtered[1];
    const maybeStreet = filtered[2];
    
    // Se a segunda parte for um número (comum no OSM)
    if (/^\d+/.test(maybeNumber)) {
      const rest = filtered.slice(3);
      // Retorna no formato: Nome - Rua, Número - Restante
      return `${name} - ${maybeStreet}, ${maybeNumber} - ${rest.join(' - ')}`;
    }
  }

  // Fallback: Apenas junta com o separador " - "
  return filtered.join(' - ');
}
