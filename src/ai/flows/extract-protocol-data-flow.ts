
'use server';
/**
 * @fileOverview Fluxo de IA para extração de dados de protocolo a partir de um Lead.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractProtocolInputSchema = z.object({
  leadTitle: z.string(),
  leadDescription: z.string(),
  timelineNotes: z.array(z.string()),
});

export type ExtractProtocolInput = z.infer<typeof ExtractProtocolInputSchema>;

const ExtractProtocolOutputSchema = z.object({
  suggestedProcessNumber: z.string().describe('Número de processo citado (CNJ), se houver.'),
  suggestedCourt: z.string().describe('Fórum ou tribunal sugerido baseado no contexto.'),
  suggestedCourtBranch: z.string().describe('Vara sugerida.'),
  suggestedCaseValue: z.number().describe('Valor da causa estimado.'),
  reasoning: z.string().describe('Explicação rápida do porquê desses dados.'),
});

export type ExtractProtocolOutput = z.infer<typeof ExtractProtocolOutputSchema>;

const extractorPrompt = ai.definePrompt({
  name: 'extractProtocolDataPrompt',
  input: { schema: ExtractProtocolInputSchema },
  output: { schema: ExtractProtocolOutputSchema },
  prompt: `Você é um assistente sênior de triagem jurídica da Bueno Gois Advogados.
Sua missão é analisar os dados de um lead que está prestes a ser protocolado e sugerir o preenchimento automático do formulário.

DADOS DO LEAD:
Título: {{{leadTitle}}}
Descrição Inicial: {{{leadDescription}}}

NOTAS DE ATENDIMENTO:
{{#each timelineNotes}}
- {{{this}}}
{{/each}}

REGRAS:
1. Se houver um número de processo (0000000-00...) nas notas, use-o.
2. Identifique valores monetários citados (pedidos, salários, verbas) para sugerir o valor da causa.
3. Se a área for trabalhista e citar São Bernardo do Campo, sugira o Fórum Trabalhista de SBC.
4. Responda apenas com o JSON estruturado.`,
});

export async function extractProtocolData(input: ExtractProtocolInput): Promise<ExtractProtocolOutput> {
  const { output } = await extractorPrompt(input);
  return output!;
}
