import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extrai o ID de um arquivo do Google Drive a partir de um link compartilhado.
 * Otimizado para evitar loops de regex em strings inválidas.
 */
export function extractFileId(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  
  if (trimmed.length < 20) return trimmed;
  if (!trimmed.includes('/') && !trimmed.includes('=')) return trimmed;
  
  const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || 
                trimmed.match(/id=([a-zA-Z0-9_-]{25,})/) ||
                trimmed.match(/folders\/([a-zA-Z0-9_-]{25,})/);

  return match?.[1] || trimmed;
}

/**
 * Resume um endereço para formato jurídico profissional.
 */
export function summarizeAddress(address: string): string {
  if (!address) return '';
  
  const parts = address.split(',').map(p => p.trim());
  const blacklist = ['região', 'metropolitana', 'geográfica', 'sudeste', 'brasil'];

  const filtered = parts.filter(p => !blacklist.some(term => p.toLowerCase().includes(term)));

  if (filtered.length >= 3) {
    const [name, maybeNum, maybeStreet, ...rest] = filtered;
    if (/^\d+/.test(maybeNum)) {
      return `${name} - ${maybeStreet}, ${maybeNum} - ${rest.join(' - ')}`;
    }
  }

  return filtered.slice(0, 4).join(' - ');
}

/**
 * Cálculo de dias úteis seguindo CPC (início no D+1, pula FDS).
 */
export function countBusinessDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

  let count = 0;
  const current = new Date(start.getTime());
  current.setDate(current.getDate() + 1); // Regra D+1

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export function addBusinessDays(startDate: string | Date, days: number): Date {
  const date = new Date(startDate);
  if (isNaN(date.getTime())) return new Date();
  
  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) remaining--;
  }
  return date;
}

export function addCalendarDays(startDate: string | Date, days: number): Date {
  const date = new Date(startDate);
  if (isNaN(date.getTime())) return new Date();
  date.setDate(date.getDate() + days);
  return date;
}
