
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

### 2.3 Processos (`/dashboard/processos`)
- **Módulo**: Gestão de Contencioso.
- **Funcionalidades**:
    - Menu de ações contextuais por processo.
    - Sincronização automática de pastas no Google Drive.

### 2.4 Audiências (`/dashboard/audiencias`)
- **Módulo**: Agenda Jurídica Integrada.
- **Funcionalidades**:
    - Sincronização bidirecional com Google Agenda.
    - Regra de Negócio: O campo "Local" é resumido e a "Descrição" contém o template completo com link direto para o WhatsApp do cliente.

---

## 🔐 5. Matriz de Permissões e Restrições

O LexFlow opera com quatro níveis de acesso rigorosamente controlados via Firebase Security Rules:

### 5.1 Administrador (`admin`)
- **Acesso**: Total e irrestrito.
- **Privilégios Únicos**:
    - Exclusão permanente de clientes e processos.
    - Gestão da equipe (Staff) e alteração de perfis de acesso.
    - Configurações do sistema e inicialização da estrutura de pastas.
    - Visualização de todos os repasses e faturamento total da banca.

### 5.2 Financeiro (`financial`)
- **Acesso**: Foco em caixa e controladoria.
- **Permissões**:
    - Gestão completa de `Faturamento` (Entradas e Saídas).
    - Aprovação e liquidação de `Reembolsos`.
    - Processamento de `Repasses` e folha de pagamento.
    - Visualização de relatórios de BI Financeiro.
- **Restrições**: Não pode alterar perfis de usuários ou excluir dados estruturais (processos).

### 5.3 Advogado (`lawyer`)
- **Acesso**: Operacional e estratégico de casos.
- **Permissões**:
    - Criação e edição de `Clientes`, `Processos` e `Leads`.
    - Agendamento de `Audiências` e `Prazos`.
    - Visualização de sua própria carteira de honorários liberados.
- **Restrições**: 
    - **Financeiro**: Não vê o faturamento global da banca, apenas seus próprios créditos.
    - **Privacidade**: Não vê a remuneração ou saldo de outros advogados.
    - **Segurança**: Não pode excluir registros (apenas arquivar).

### 5.4 Secretaria / Assistente (`assistant`)
- **Acesso**: Apoio administrativo e triagem.
- **Permissões**:
    - Gestão total do `CRM (Leads)` e triagem inicial.
    - Cadastro de dados burocráticos em processos.
    - Consulta ao `Acervo de Modelos` e `Arquivo Digital`.
- **Restrições**:
    - **Zero Financeiro**: Não possui acesso ao módulo de faturamento, repasses ou valores de honorários.
    - **Segurança**: Não altera configurações críticas do sistema.

---

**Última Atualização**: Fevereiro/2026  
**Status**: Produção / Matriz de Segurança Ativa
