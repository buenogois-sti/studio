
# 🤝 Guia de Colaboração - LexFlow

Este documento explica como compartilhar o acesso ao desenvolvimento e à operação do sistema entre os membros da equipe.

## 1. Acesso ao Código (Firebase Studio)

Se você deseja que outro desenvolvedor ou gestor veja e edite o código/configurações neste ambiente:

1. **Acesse o Console do Google Cloud ou Firebase**: Vá em [console.firebase.google.com](https://console.firebase.google.com).
2. **Selecione o Projeto**: Utilize o ID do projeto atual.
3. **IAM & Admin**: Vá na seção "Usuários e Permissões".
4. **Adicionar Membro**: Insira o e-mail do colaborador (deve ser uma conta Google).
5. **Atribuir Papel**: 
   - Para acesso total ao Studio: Atribua o papel de **Editor** ou **Proprietário**.
   - O colaborador receberá um e-mail. Após aceitar, o projeto aparecerá para ele ao acessar o Firebase Studio.

## 2. Conectando ao GitHub

Para versionar o código e permitir que múltiplos desenvolvedores trabalhem de forma assíncrona:

1. **Aba de Controle de Origem**: No Firebase Studio, clique no ícone do GitHub no menu lateral esquerdo.
2. **Autenticação**: Clique em "Connect GitHub account" e siga as instruções na tela para autorizar o acesso.
3. **Vínculo de Repositório**: Escolha "Connect existing repository" ou "Create new repository".
4. **Commits e Push**: Ao realizar alterações, elas aparecerão na aba de Controle de Origem. Escreva uma mensagem de commit e clique em "Commit & Push" para enviar para a nuvem.

## 3. Sincronização de Alterações

- **Arquivos**: Todos os arquivos editados no Studio são salvos em um sistema de arquivos persistente vinculado ao projeto.
- **Tempo Real**: Se um colaborador fizer uma alteração e outro abrir o projeto logo em seguida, ele verá o código atualizado.
- **Conflitos**: Caso usem GitHub, lembre-se de sempre dar um "Pull" antes de começar a trabalhar para evitar conflitos de versão.

## 4. Acesso à Plataforma (Usuários Finais)

Para que um membro da equipe utilize o sistema (sem mexer no código):

1. **Login**: Ele deve acessar a URL de produção.
2. **Convite**: Um Administrador deve cadastrar o e-mail dele em **Configurações > Usuários** dentro do sistema.
3. **Permissões**: O sistema reconhecerá o e-mail no ato do login via Google e aplicará o perfil (Advogado, Financeiro, etc) definido.

---
**Dúvidas?** Consulte o suporte técnico interno.
