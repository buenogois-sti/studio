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
- **Integrações**: Google Drive API (Gestão de arquivos) e Google Calendar API (Agendamento de audiências).

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
    - Separação automática entre compromissos futuros e histórico de realizadas.
- **Regra de Negócio**: O campo "Local" é resumido e a "Descrição" contém o template completo com link direto para o WhatsApp do cliente.

### 2.5 Reembolsos (`/dashboard/reembolsos`)
- **Módulo**: Gestão Financeira Operacional.
- **Perfis**:
    - **Usuário**: Solicita reembolso anexando descrição e valor.
    - **Admin**: Aprova, nega ou marca como pago os pedidos da equipe.

### 2.6 Financeiro (`/dashboard/financeiro`)
- **Módulo**: Controle de Caixa.
- **Funcionalidade**: Separação de Receitas (Acordos, Sucumbência) e Despesas (Salários, Infraestrutura). Gera títulos automaticamente a partir de eventos jurídicos.

---

## 🧩 3. Componentes de UI e Lógica

### 3.1 `LegalDeadlineDialog`
- **Lógica de Contagem**: Implementa as regras do CPC/CLT.
- **Modos**: 
    - `useful`: Pula finais de semana (Processual).
    - `calendar`: Conta todos os dias (Material/CDC).
- **Input**: Permite colar a publicação na íntegra para fins de auditoria.

### 3.2 `ClientSearchInput`
- **Tecnologia**: Busca assíncrona com Debounce (300ms).
- **Performance**: Utiliza mapas de memória para evitar congelamento durante a renderização.

### 3.3 `WhatsAppFloating`
- **UX**: Widget persistente na landing page com simulação de digitação e auto-hide para aumentar conversão de leads.

---

## ⚙️ 4. Regras de Negócio Críticas

### 4.1 Remuneração de Advogados
Ao cadastrar um membro da equipe como "Advogado", é obrigatório definir uma das 5 regras:
1. **Sucumbência**: Percentual fixo entre escritório e associado.
2. **Produção**: Tabela de preços por ato (Petições, Diligências).
3. **Quota Litis**: Participação no êxito final.
4. **Fixo Mensal**: Pro-labore recorrente.
5. **Audiencista**: Valor fixo por audiência confirmada como realizada.

### 4.2 Sincronização Google Drive
- **Hierarquia**: `LexFlow (Raiz) -> Clientes -> [Nome Cliente] -> 03 - Processos -> [Nº Processo]`.
- **Automação**: Ao criar um processo, o sistema espelha o conteúdo em uma pasta global organizada por "Área Jurídica".

---

## 🔐 5. Segurança e Dados

- **Firestore Rules**: 
    - Admins: Leitura e escrita total.
    - Advogados: Acesso a clientes e processos.
    - Pessoal: Restrição de visualização de reembolsos alheios.
- **Performance**: Uso intensivo de `useMemo` e indexação O(1) para evitar congelamento da UI em listas grandes.

---

**Última Atualização**: Fevereiro/2026  
**Status**: Produção / Premium Dark Theme