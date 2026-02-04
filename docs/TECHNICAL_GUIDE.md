
# 📘 Guia Técnico - LexFlow Bueno Gois

Este documento detalha a arquitetura, módulos, páginas e componentes do sistema de gestão jurídica **LexFlow**, personalizado para o escritório **Bueno Gois Advogados e Associados**.

---

## 🏗️ 1. Arquitetura e Stack Tecnológica

- **Framework**: Next.js 15 (App Router) com TypeScript.
- **Estilização**: Tailwind CSS com tema personalizado **Deep Navy & Gold**.
- **Componentes UI**: ShadCN UI (Radix Primitives).
- **Backend (BaaS)**: Firebase (Firestore para dados, Auth para sessões).
- **Autenticação**: NextAuth.js integrado com Google Workspace + Firebase Custom Tokens.
- **AI**: Genkit com modelo Gemini 2.5 Flash para análise estratégica.
- **Integrações**: Google Drive API (Gestão de arquivos) e Google Calendar API (Agendamento de audiências e Prazos).

---

## 📁 2. Estrutura de Páginas (Dashboard)

### 2.1 Dashboard Home (`/dashboard`)
- **Módulo**: BI e Insights em Tempo Real.
- **Funcionalidade**: Exibe KPIs financeiros (faturamento bruto), operacionais (fila de processos) e agenda imediata.
- **Componente IA**: `AIAdvisor` - Consome dados do escritório via Genkit para fornecer recomendações estratégicas.

### 2.2 Clientes (`/dashboard/clientes`)
- **Módulo**: CRM Jurídico.
- **Funcionalidades**:
    - Listagem em Grid/Tabela com cálculo de integridade cadastral.
    - Importação de base via arquivos VCF (vCard).
- **Componentes Chave**:
    - `ClientForm`: Captura dados pessoais, bancários e de endereço (via ViaCEP).
    - `ClientDetailsSheet`: Ficha completa com ações rápidas (WhatsApp, E-mail, Cópia de dados).

### 2.3 Processos (`/dashboard/processos`)
- **Módulo**: Gestão de Contencioso.
- **Funcionalidades**:
    - Menu de ações contextuais por processo.
    - Sincronização automática de pastas no Google Drive.
- **Componentes Chave**:
    - `ProcessForm`: Formulário em 6 etapas (Autores, Réus, Dados, Juízo, Equipe, Estratégia).
    - `ProcessTimelineSheet`: Linha do tempo cronológica de eventos e decisões.
    - `LegalDeadlineDialog`: Lançamento de prazos fatais com motor de contagem (Úteis vs Corridos).

### 2.4 Audiências (`/dashboard/audiencias`)
- **Módulo**: Agenda Jurídica Integrada.
- **Funcionalidades**:
    - Sincronização bidirecional com Google Agenda.
    - Visão Mensal: Calendário interativo para gestão de carga mensal.
    - Regra de Negócio: O campo "Local" é resumido e a "Descrição" contém o template completo com link direto para o WhatsApp do cliente.

### 2.5 Prazos (`/dashboard/prazos`)
- **Módulo**: Controle de Obrigações Fatais.
- **Funcionalidades**:
    - Agenda específica de protocolos e manifestações.
    - Integração Google Agenda com alertas de 24h e 12h.
    - Exibe contagem regressiva de dias úteis (CPC).

### 2.6 Financeiro (`/dashboard/financeiro`)
- **Módulo**: Controle de Caixa e Repasses.
- **Funcionalidade**: 
    - **Contas a Pagar/Receber**: Gestão de títulos operacionais.
    - **Repasses**: Aba dedicada para conciliação de honorários devidos à equipe (Sucumbência, Produção, Quota Litis).
    - **Relatórios**: Painel consolidado de BI com fluxo de caixa e lucro líquido.

### 2.7 Reembolsos (`/dashboard/reembolsos`)
- **Módulo**: Gestão de Despesas de Equipe.
- **Lógica de Permissão**: 
    - Colaboradores veem apenas seus pedidos.
    - Financeiro/Admin tem CRUD total e fluxo de aprovação/pagamento.

---

## 🧩 3. Componentes de UI e Lógica

### 3.1 `LegalDeadlineDialog`
- **Lógica de Contagem**: Implementa as regras do CPC/CLT.
- **Modos**: 
    - `useful`: Pula finais de semana (Processual).
    - `calendar`: Conta todos os dias (Material/CDC).
- **Google Sync**: Dispara notificações críticas (24h/12h) no calendário do advogado.

### 3.2 `RepassesTab` (Módulo Financeiro)
- **Cálculo Automático**: Percorre a subcoleção de créditos dos advogados.
- **Status `DISPONIVEL`**: Apenas valores liberados (após recebimento do cliente) aparecem para o saque financeiro.

### 3.3 `WhatsAppFloating`
- **UX**: Widget persistente na landing page com simulação de digitação para aumentar conversão de leads.

---

## ⚙️ 4. Regras de Negócio Críticas

### 4.1 Remuneração de Advogados
Ao cadastrar um membro da equipe como "Advogado", o sistema aplica uma das 5 regras:
1. **Sucumbência**: Percentual fixo entre escritório e associado.
2. **Produção**: Tabela de preços por ato (Petições, Diligências).
3. **Quota Litis**: Participação no êxito final.
4. **Fixo Mensal**: Pro-labore recorrente.
5. **Audiencista**: Valor fixo por audiência confirmada como realizada.

### 4.2 Segurança de Dados (Firestore Rules)
- **Hierarquia**: Admin > Financeiro > Advogado > Assistente.
- **Filtragem por UID**: Em Reembolsos e Notificações, usuários comuns são impedidos de ler documentos que não contenham seu `userId`, garantindo total privacidade.

---

**Última Atualização**: Fevereiro/2026  
**Status**: Produção / Premium Dark Theme
