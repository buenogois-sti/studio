
# 🤝 Guia de Colaboração e Versão - LexFlow

Este documento explica como gerenciar o acesso, o controle de versão e a troca de contas no sistema.

## 1. Acesso ao Código (Firebase Studio)

Se você deseja que outro colaborador veja e edite o código neste ambiente:

1. **Acesse o Console do Firebase**: Vá em [console.firebase.google.com](https://console.firebase.google.com).
2. **IAM & Admin**: Vá na seção "Usuários e Permissões".
3. **Adicionar Membro**: Insira o e-mail do colaborador (conta Google).
4. **Atribuir Papel**: Atribua o papel de **Editor**.
5. **Acesso**: O colaborador receberá um e-mail. Ao aceitar, o projeto aparecerá para ele no Firebase Studio.

## 2. Controle de Versão (GitHub - Interface)

### Conectando ao GitHub
1. Clique no ícone de **Source Control** (o terceiro ícone de cima para baixo na barra lateral esquerda, que parece um nó de árvore).
2. Se aparecer o botão **"Publish Branch"**, significa que o projeto ainda não está sincronizado com um repositório remoto.
3. Clique no botão ou procure a opção de publicar no GitHub para iniciar a autorização.

### ⚠️ Como Limpar Permissões ou Sair (Sign Out)
Se você conectou a conta errada ou não tem permissão de escrita (Erro 403 / "You don't have permissions"):

1. **Localize o ícone de Perfil**: Olhe para a barra lateral esquerda, no **extremo inferior** (perto do ícone de engrenagem de configurações). É um ícone de um bonequinho.
2. **Gerenciar Contas**: Clique no ícone de perfil.
3. **Sair**: Clique no nome da sua conta do GitHub e selecione **"Sign Out"**.
4. **Reconectar**: Volte à aba de Source Control e tente o Push novamente. Ele solicitará uma nova conexão.

## 3. Gestão via Terminal (Alternativa Rápida)

Se a interface não estiver respondendo ou o erro de permissão persistir, use o terminal (Ctrl + `):

### Resolver erro de permissão (403) usando Token (PAT)
Esta é a forma mais garantida de forçar o acesso com a conta correta:
1. No GitHub, vá em *Settings > Developer Settings > Personal Access Tokens > Tokens (classic)*.
2. Gere um token com permissão `repo` e copie o código.
3. No terminal do Studio, execute:
```bash
git remote set-url origin https://SEU_TOKEN_AQUI@github.com/buenogois-sti/studio.git
```

### Limpar credenciais globais
```bash
git config --global --unset user.name
git config --global --unset user.email
git config --global --unset credential.helper
```

## 4. Fluxo de Trabalho
- **Sincronização**: O Studio salva os arquivos em tempo real no volume compartilhado.
- **Commits**: Escreva mensagens claras (ex: "feat: adiciona rotina de retorno").
- **Push/Publish**: Envie suas alterações para manter o repositório no GitHub atualizado.

---
**Dúvidas?** Consulte o suporte técnico da Bueno Gois.
