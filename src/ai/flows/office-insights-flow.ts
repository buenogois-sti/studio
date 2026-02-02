'use server';
/**
 * @fileOverview Fluxo de IA para análise estratégica do escritório.
 * 
 * - analyzeOfficeStatus: Fornece insights baseados nos dados atuais.
 */

import { ai } from '@/ai/genkit';
import { z } from 'kit';

const OfficeInsightsInputSchema = z.object({
  totalRevenue: z.number(),
  pendingReceivables: z.number(),
  totalOverdue: z.number(),
  activeProcessesCount: z.number(),
  upcomingHearingsCount: z.number(),
  recentActivities: z.array(z.string()),
});

export type OfficeInsightsInput = z.infer<typeof OfficeInsightsInputSchema>;

const OfficeInsightsOutputSchema = z.object({
  summary: z.string().describe('Um resumo executivo curto da situação atual.'),
  insights: z.array(z.string()).describe('Lista de 3 a 4 insights ou recomendações estratégicas.'),
  mood: z.enum(['positive', 'neutral', 'alert']).describe('O tom geral da saúde do escritório.'),
});

export type OfficeInsightsOutput = z.infer<typeof OfficeInsightsOutputSchema>;

const insightsPrompt = ai.definePrompt({
  name: 'officeInsightsPrompt',
  input: { schema: OfficeInsightsInputSchema },
  output: { schema: OfficeInsightsOutputSchema },
  prompt: `Você é um consultor de gestão para escritórios de advocacia de elite.
Analise os seguintes dados do escritório "Bueno Gois Advogados":

Faturamento Pago (Mês): R$ {{{totalRevenue}}}
Valores a Receber: R$ {{{pendingReceivables}}}
Total Atrasado: R$ {{{totalOverdue}}}
Processos Ativos: {{{activeProcessesCount}}}
Audiências nos próximos dias: {{{upcomingHearingsCount}}}

Atividades Recentes:
{{#each recentActivities}}
- {{{this}}}
{{/each}}

Sua tarefa:
1. Avalie a saúde financeira e operacional.
2. Identifique gargalos ou oportunidades.
3. Forneça recomendações práticas para aumentar a eficiência ou lucratividade.

Seja profissional, motivador, mas direto ao ponto. Use termos jurídicos adequados quando necessário.`,
});

export async function analyzeOfficeStatus(input: OfficeInsightsInput): Promise<OfficeInsightsOutput> {
  const { output } = await insightsPrompt(input);
  return output!;
}
