
# 🤝 Guia de Colaboração e Versão - LexFlow

Este documento explica como gerenciar o acesso e o controle de versão do sistema.

## 1. Acesso ao Código (Firebase Studio)

Se você deseja que outro colaborador veja e edite o código neste ambiente:

1. **Acesse o Console do Firebase**: Vá em [console.firebase.google.com](https://console.firebase.google.com).
2. **IAM & Admin**: Vá na seção "Usuários e Permissões".
3. **Adicionar Membro**: Insira o e-mail do colaborador (conta Google).
4. **Atribuir Papel**: Atribua o papel de **Editor**.
5. **Acesso**: O colaborador receberá um e-mail. Ao aceitar, o projeto aparecerá para ele no Firebase Studio.

## 2. Controle de Versão (GitHub)

### Conectando ao GitHub
1. Clique no ícone do GitHub no menu lateral esquerdo.
2. Clique em **"Connect GitHub account"**.
3. Escolha o repositório correto.

### ⚠️ Erro de Permissão ou Troca de Conta
Se você estiver logado na conta errada ou ver o erro *"You don't have permissions to push"*:

1. **Sair da Conta Atual**:
   - Clique no ícone do GitHub no menu lateral.
   - Clique no ícone de perfil (ou engrenagem) na parte inferior do painel lateral de Source Control.
   - Selecione **"Sign Out"**.
2. **Entrar com a Conta Correta**:
   - Clique novamente em **"Connect GitHub account"**.
   - Garanta que você está autorizando a conta que tem permissão de "Write" (Escrita) no repositório da Bueno Gois.
3. **Revogação Manual (Se necessário)**:
   - Se o Studio continuar logando na conta errada, acesse [GitHub.com](https://github.com) > Settings > Applications > Authorized GitHub Apps e remova o "Firebase Studio". Depois tente logar novamente.

## 3. Fluxo de Trabalho
- **Sincronização**: O Studio salva os arquivos em tempo real no volume compartilhado.
- **Commits**: Sempre escreva mensagens claras (ex: "feat: adiciona rotina de retorno").
- **Push**: Envie suas alterações ao GitHub para manter o backup externo atualizado.

---
**Dúvidas?** Consulte o suporte técnico.
