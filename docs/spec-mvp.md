
# 💎 LexFlow - Especificação Técnica do MVP (Bueno Gois)

Este documento serve como a "Blue Print" (Planta Baixa) para a replicação ou clonagem do sistema LexFlow, consolidando todas as regras de negócio e integrações de elite implementadas.

## 1. Visão Geral
O LexFlow é um ERP Jurídico de alto desempenho, focado em advocacia trabalhista, que utiliza o Google Workspace como backend de armazenamento e agenda, e o Firebase como banco de dados transacional.

## 2. Stack Tecnológica
- **Framework**: Next.js 15 (App Router) com TypeScript.
- **Backend**: Firebase (Firestore para dados, Authentication para sessões).
- **Integrações de API**: 
    - Google Drive (Gestão documental automatizada).
    - Google Calendar (Pauta de audiências).
    - Google Tasks (Gestão de prazos fatais).
    - Google Docs (Automação de rascunhos de peças).
- **AI**: Genkit com Gemini 2.5 Flash para análise estratégica e interpretação de publicações.
- **UI/UX**: Tailwind CSS + ShadCN UI.
- **Tema**: *Deep Navy & Gold* (Bueno Gois Palette).

## 3. Módulos Críticos & Regras de Negócio

### 3.1 CRM & Triagem (Leads)
- **Fluxo Kanban**: NOVO -> ATENDIMENTO -> CONTRATUAL -> BUROCRACIA -> DISTRIBUIÇÃO.
- **Checklist de Triagem**: Questionários dinâmicos vinculados à área jurídica (Trabalhista, Cível, etc).
- **Conversão**: Migração automática de dados do Lead para a coleção de Processos ao protocolar.

### 3.2 Gestão Processual
- **Estrutura no Drive**: Criação automática de pastas padronizadas (Petições, Provas, Decisões) no diretório do cliente.
- **Qualificação de Réus**: Cadastro múltiplo de reclamadas com busca de CEP integrada.
- **Timeline**: Histórico de eventos com ícones semânticos (Decisão, Petição, Audiência).

### 3.3 Agenda de Elite (Audiências e Atendimentos)
- **Sincronização Bidirecional**: Eventos criados no LexFlow aparecem na agenda pessoal do advogado via Impersonificação de Token.
- **Notificação**: Geração de link de WhatsApp com mensagem codificada em UTF-8 incluindo dados do ato e link virtual.
- **Rotina de Retorno**: Fluxo pós-ato para lançamento imediato de acordos, novos prazos e reagendamentos.

### 3.4 Gestão de Prazos Judiciais
- **Motor de Contagem**: Cálculo automático de dias úteis (CPC - D+1) ou corridos.
- **IA Parser**: Leitura de publicações brutas do DJE para extrair automaticamente o tipo de prazo e vencimento.
- **Google Tasks**: Criação de tarefas no Workspace do advogado titular.

### 3.5 Financeiro & Repasses (Engine Crítica)
- **Divisão de Honorários**: Padrão 70% (Escritório) / 30% (Advogado) ou conforme contrato.
- **Carteira Profissional**: Sistema de créditos (`StaffCredits`) que ficam "Retidos" até a quitação pelo cliente, movendo-se para "Disponível" após baixa bancária.
- **Emissão de Recibos**: Geração de vouchers profissionais (Layout de impressão limpo) para prestação de contas.

## 4. Segurança e Identidade
- **Auth Flow**: NextAuth + Custom Tokens do Firebase.
- **Resolução de IDs**: Motor que traduz `staffId` em `googleId` para entrega de notificações em tempo real.
- **Permissões**: 
    - `admin`: Controle total e gestão de usuários.
    - `lawyer`: Vê apenas seus próprios processos e carteira financeira (se habilitado).
    - `financial`: Acesso exclusivo ao caixa e liberação de repasses.
    - `assistant`: Apoio administrativo e triagem inicial.

## 5. Estrutura de Dados (Entities)
Consulte o arquivo `docs/backend.json` para o esquema detalhado de:
- `clients` (Cadastro Completo)
- `processes` (Dossiê Judicial)
- `leads` (Funil de Vendas)
- `hearings` (Agenda)
- `deadlines` (Prazos Fatais)
- `financial_titles` (Caixa)
- `staff/credits` (Conta Corrente do Advogado)

## 6. Diretrizes de UI
- **Cores**: Background `#020617`, Primary `#F5D030`, Accents `emerald`, `rose`, `blue`.
- **Estética**: Bordas arredondadas, transparências (glassmorphism), fontes serifadas para cabeçalhos (Playfair Display) e sans-serif para dados (Open Sans).
