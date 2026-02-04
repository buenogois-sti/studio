'use server';
/**
 * @fileOverview Fluxo de IA para interpretação de publicações judiciais.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ParsePublicationInputSchema = z.object({
  text: z.string().describe('O texto bruto da publicação ou despacho judicial.'),
});

export type ParsePublicationInput = z.infer<typeof ParsePublicationInputSchema>;

const ParsePublicationOutputSchema = z.object({
  processNumber: z.string().describe('O número do processo no formato CNPJ.'),
  deadlineType: z.string().describe('O tipo de prazo (ex: Réplica, Contestação, Manifestação, Recurso).'),
  daysCount: z.number().describe('A quantidade de dias concedida para o prazo.'),
  isBusinessDays: z.boolean().describe('Se o prazo deve ser contado em dias úteis (CPC/CLT). Geralmente true.'),
  summary: z.string().describe('Um resumo curtíssimo do que deve ser feito.'),
});

export type ParsePublicationOutput = z.infer<typeof ParsePublicationOutputSchema>;

const parserPrompt = ai.definePrompt({
  name: 'parsePublicationPrompt',
  input: { schema: ParsePublicationInputSchema },
  output: { schema: ParsePublicationOutputSchema },
  prompt: `Você é um assistente jurídico sênior do escritório Bueno Gois Advogados.
Sua tarefa é ler a publicação judicial abaixo e extrair os dados necessários para agendar um prazo fatal.

PUBLICAÇÃO:
{{{text}}}

REGRAS:
1. Identifique o número do processo (0000000-00.0000.0.00.0000).
2. Determine o que o juiz ordenou (ex: manifestar sobre contestação, especificar provas, interpor recurso).
3. Extraia o prazo em dias. Se houver mais de um prazo, extraia o mais urgente ou o principal.
4. Quase todos os prazos processuais no Brasil são em DIAS ÚTEIS (CPC/CLT). Defina isBusinessDays como true, a menos que o texto diga explicitamente "dias corridos".

Responda no formato JSON estruturado.`,
});

export async function parseLegalPublication(input: ParsePublicationInput): Promise<ParsePublicationOutput> {
  const { output } = await parserPrompt(input);
  return output!;
}
