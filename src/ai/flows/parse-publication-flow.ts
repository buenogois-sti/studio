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
  publicationDate: z.string().optional().describe('A data exata da publicação ou da assinatura do juiz se presente no final (ex: "Publique-se. Brasília, 30 de março de 2026"). Retorne sempre no padrão ISO YYYY-MM-DD.'),
  recommendedSteps: z.array(z.string()).describe('Lista com 3 passos curtos instruindo o advogado como proceder (ex: "1. Ler o acórdão na íntegra", "2. Calcular vencimento do prazo x", "3. Clicar em Lançar Prazo para agendar").'),
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
4. Prazos processuais no Brasil (CPC/CLT) costumam ser em DIAS ÚTEIS. Defina isBusinessDays como true, a não ser que diga expressamente "dias corridos".
5. Identifique rigidamente frases como "Publique-se. [Cidade], [Data]." no final do texto para extrair a publicationDate.
6. Crie 3 recommendedSteps claros e curtos para o advogado sobre os próximos passos práticos imediatos no sistema.

Responda rigorosamente no formato JSON estruturado.`,
});

export async function parseLegalPublication(input: ParsePublicationInput): Promise<ParsePublicationOutput> {
  const { output } = await parserPrompt(input);
  return output!;
}
