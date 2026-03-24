
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeLeadInputSchema = z.object({
  leadTitle: z.string(),
  leadDescription: z.string(),
  legalArea: z.string().optional(),
  interviewAnswers: z.record(z.string()).optional(),
});

export type AnalyzeLeadInput = z.infer<typeof AnalyzeLeadInputSchema>;

const AnalyzeLeadOutputSchema = z.object({
  summary: z.string().describe('Resumo executivo do caso de forma clara e profissional.'),
  legalAdvice: z.string().describe('Conselhos jurídicos iniciais e análise de viabilidade.'),
  score: z.number().describe('Nota de 0 a 100 baseada na força jurídica do caso.'),
  suggestedSteps: z.array(z.string()).describe('Próximos passos recomendados para o advogado.'),
});

export type AnalyzeLeadOutput = z.infer<typeof AnalyzeLeadOutputSchema>;

const analyzerPrompt = ai.definePrompt({
  name: 'analyzeLeadPrompt',
  input: { schema: AnalyzeLeadInputSchema },
  output: { schema: AnalyzeLeadOutputSchema },
  prompt: `Você é um Analista Jurídico de Elite especializado na triagem de leads da Bueno Gois Advogados.
Sua missão é realizar uma análise técnica e estratégica dos dados coletados durante a entrevista inicial.

DADOS DO LEAD:
Título: {{{leadTitle}}}
Área Jurídica: {{#if legalArea}}{{{legalArea}}}{{else}}Não especificada{{/if}}
Descrição Inicial: {{{leadDescription}}}

RESPOSTAS DA ENTREVISTA:
{{#if interviewAnswers}}
{{#each interviewAnswers}}
- {{{@key}}}: {{{this}}}
{{/each}}
{{else}}
Nenhuma resposta de entrevista disponível.
{{/if}}

INSTRUÇÕES:
1. **Resumo**: Sintetize os fatos principais, identificando as partes, o evento gerador e o pedido.
2. **Análise de Viabilidade (Conselho)**: Avalie se o caso tem fundamentos jurídicos sólidos ou se há riscos evidentes (ex: prescrição, falta de provas). Seja direto e profissional.
3. **Score (0-100)**: 
   - 0-30: Caso fraco ou fora da área de atuação.
   - 31-70: Caso com potencial, mas requer diligências.
   - 71-100: Caso excelente, com alta probabilidade de êxito.
4. **Próximos Passos**: Liste documentos necessários ou ações imediatas (ex: "Solicitar CTPS", "Verificar prazo prescricional").

Responda em Português do Brasil com um tom especializado.`,
});

export async function analyzeLead(input: AnalyzeLeadInput): Promise<AnalyzeLeadOutput> {
  const { output } = await analyzerPrompt(input);
  if (!output) throw new Error('Falha ao gerar análise de IA.');
  return output;
}
