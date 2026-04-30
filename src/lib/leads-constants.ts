import { LeadStatus, LeadPriority } from './types';
import { 
  Zap, 
  Target, 
  CalendarDays, 
  FileText, 
  Scale, 
  AlertCircle 
} from 'lucide-react';

export const STAGES: LeadStatus[] = ['NOVO', 'ATENDIMENTO', 'CONTRATUAL', 'BUROCRACIA', 'DISTRIBUICAO'];

export const stageConfig: Record<LeadStatus, { 
  label: string; 
  color: string; 
  icon: any; 
  description: string; 
  tasks: string[] 
}> = {
  NOVO: { 
    label: 'Triagem', 
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', 
    icon: Zap, 
    description: 'Captação inicial, qualificação de dados básicos e identificação da área jurídica.',
    tasks: ['Qualificação do Lead', 'Identificação da área jurídica', 'Direcionamento ao Adv. Responsável'] 
  },
  ATENDIMENTO: { 
    label: 'Atendimento', 
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', 
    icon: CalendarDays, 
    description: 'Entrevista técnica detalhada, coleta de briefing e análise de viabilidade.',
    tasks: ['Entrevista técnica realizada', 'Preenchimento de checklists', 'Coleta de provas iniciais'] 
  },
  CONTRATUAL: { 
    label: 'Contratual', 
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', 
    icon: Scale, 
    description: 'Geração de contrato, procuração e colheita de assinaturas.',
    tasks: ['Minuta de contrato enviada', 'Assinatura colhida', 'Taxa de abertura paga'] 
  },
  BUROCRACIA: { 
    label: 'Documentação', 
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', 
    icon: FileText, 
    description: 'Organização de documentos pessoais, provas e digitalização.',
    tasks: ['Docs Pessoais OK', 'Provas Organizadas', 'Cálculos realizados'] 
  },
  DISTRIBUICAO: { 
    label: 'Distribuição', 
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', 
    icon: Target, 
    description: 'Protocolo judicial e início da fase processual ativa.',
    tasks: ['Petição inicial revisada', 'Protocolo realizado'] 
  },
  CONVERTIDO: { 
    label: 'Convertido', 
    color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30', 
    icon: Target, 
    description: 'Lead convertido com sucesso em processo ativo.',
    tasks: [] 
  },
  ABANDONADO: { 
    label: 'Abandonado', 
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', 
    icon: AlertCircle, 
    description: 'Atendimento encerrado por desistência ou falta de contato do cliente.',
    tasks: [] 
  },
};
