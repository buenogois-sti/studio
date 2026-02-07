import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extrai o ID de um arquivo do Google Drive a partir de um link compartilhado.
 * Se já for um ID, retorna o próprio valor.
 */
export function extractFileId(input: string): string {
  if (!input) return '';
  
  // Caso o input seja uma URL de edição ou visualização
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  
  // Caso seja uma URL de download/export
  const idOnlyMatch = input.match(/id=([a-zA-Z0-9_-]+)/);
  if (idOnlyMatch && idOnlyMatch[1]) {
    return idOnlyMatch[1];
  }
  
  // Retorna o input limpo caso já seja o ID
  return input.trim();
}

/**
 * Resume um endereço longo (geralmente do OSM) para um formato mais legível e profissional.
 * Ex: Fórum - Rua, Número - Cidade - Estado - CEP, País
 */
export function summarizeAddress(address: string): string {
  if (!address) return '';
  
  const parts = address.split(',').map(p => p.trim());
  
  const blacklist = [
    'região', 'metropolitana', 'geográfica', 'intermediária', 
    'imediata', 'microregião', 'mesorregião', 'sudeste', 'brasil'
  ];

  const filtered = parts.filter(p => {
    const low = p.toLowerCase();
    return !blacklist.some(term => low.includes(term));
  });

  if (filtered.length >= 3) {
    const name = filtered[0];
    const maybeNumber = filtered[1];
    const maybeStreet = filtered[2];
    
    if (/^\d+/.test(maybeNumber)) {
      const rest = filtered.slice(3);
      return `${name} - ${maybeStreet}, ${maybeNumber} - ${rest.join(' - ')}`;
    }
  }

  return filtered.join(' - ');
}

/**
 * Conta dias úteis entre duas datas (exclui início, inclui fim, pula fds)
 * Segue regra do CPC/TRT: Inicia no dia útil seguinte à publicação.
 */
export function countBusinessDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || iNaN(end.getTime())) return 0;
  if (end < start) return 0;

  let count = 0;
  const current = new Date(start.getTime());
  
  // Regra Jurídica: Exclui o dia do começo (publicação)
  current.setDate(current.getDate() + 1);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Adiciona dias úteis a uma data, seguindo a regra do CPC/CLT (exclui o dia da publicação).
 */
export function addBusinessDays(startDate: string | Date, days: number): Date {
  const date = new Date(startDate);
  if (isNaN(date.getTime())) return new Date();
  
  let remaining = days;
  // A contagem começa no dia seguinte
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remaining--;
    }
  }
  return date;
}

/**
 * Adiciona dias corridos a uma data.
 */
export function addCalendarDays(startDate: string | Date, days: number): Date {
  const date = new Date(startDate);
  if (isNaN(date.getTime())) return new Date();
  date.setDate(date.getDate() + days);
  return date;
}
