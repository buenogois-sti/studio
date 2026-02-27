
# LexFlow - Bueno Gois Advogados

Plataforma integrada de gestão jurídica com tecnologia de elite para o escritório Bueno Gois Advogados e Associados.

## 🚀 Principais Módulos Implementados
- **CRM Inteligente**: Gestão de leads e clientes com integração WhatsApp e fluxos de triagem automatizados.
- **Controle de Processos**: Cadastro detalhado com qualificação precisa de réus e sincronização robusta com Google Drive.
- **Agenda de Elite**: Sincronização inteligente com Google Calendar e Tasks, respeitando a agenda individual de cada advogado e suportando atos virtuais (links e senhas).
- **Retorno de Audiência**: Fluxo de desfecho pós-ato para lançamento imediato de acordos, novos prazos fatais e reagendamentos.
- **Prazos Jurídicos**: Motor de contagem automática (Dias Úteis/Corridos - CPC) com alertas de urgência e sincronização de tarefas.
- **Checklists Operacionais**: Biblioteca de modelos disponível para toda a equipe, garantindo a padronização Bueno Gois com gestão segura por administradores.
- **Financeiro & Repasses**: Controle de faturamento institucional, gestão de reembolsos e extrato de carteira profissional para os advogados.
- **IA Advisor**: Consultoria estratégica em tempo real baseada nos dados operacionais via Gemini 2.5 Flash.

## 👥 Colaboração e Sincronização
Este projeto é 100% colaborativo. As alterações realizadas no ambiente do Firebase Studio são aplicadas diretamente no repositório de código do projeto. Todos os colaboradores com acesso ao projeto visualizam as mesmas atualizações, garantindo que a banca utilize sempre a versão mais recente do sistema.

### Como acessar o projeto compartilhado?
Para que outros membros da equipe vejam este projeto em suas contas:
1. O proprietário do projeto deve convidá-los através do Console do Firebase (IAM & Admin).
2. Uma vez com acesso ao projeto, eles podem abrir o Firebase Studio e o projeto aparecerá na lista de ambientes disponíveis.
3. Consulte o arquivo `docs/COLLABORATION_GUIDE.md` para instruções passo a passo.

## 🛠️ Tecnologias
- Next.js 15, Firebase (Firestore & Auth), Google APIs (Drive, Calendar, Tasks, Docs), Genkit (AI), Tailwind CSS.

## 🛡️ Segurança e LGPD
O sistema utiliza autenticação via Google Workspace com permissões granulares baseadas em perfis (Admin, Advogado, Financeiro, Assistente) e possui camadas de proteção em conformidade com a LGPD.
