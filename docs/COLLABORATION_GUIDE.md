
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
1. Clique no ícone de **Source Control** (o terceiro ícone de cima para baixo na barra lateral esquerda).
2. Se aparecer o botão **"Publish Branch"**, significa que o projeto ainda não está sincronizado.
3. Clique no botão ou procure a opção de publicar no GitHub para iniciar a autorização.

### ⚠️ Como Limpar Permissões ou Sair (Sign Out)
Se você conectou a conta errada ou não tem permissão de escrita (Erro 403 / "You don't have permissions"):

1. **Localize o ícone de Perfil**: Olhe para a barra lateral esquerda, no **extremo inferior** (perto da engrenagem).
2. **Gerenciar Contas**: Clique no ícone de perfil (bonequinho).
3. **Sair**: Clique no nome da sua conta do GitHub e selecione **"Sign Out"**.
4. **Reconectar**: Volte à aba de Source Control e tente o Push novamente.

## 3. Gestão via Terminal (Solução Definitiva)

Se a interface visual continuar apresentando erro de permissão ou erro de **SSH (publickey)**, utilize o terminal para forçar a conexão usando HTTPS e um Token:

### Resolver erro de permissão (403 ou SSH publickey)
1. No GitHub, vá em *Settings > Developer Settings > Personal Access Tokens > Tokens (classic)*.
2. Gere um token com a permissão **`repo`** e copie o código.
3. No terminal do Studio (Ctrl + `), execute para forçar HTTPS:
```bash
# Substitua SEU_TOKEN pelo código copiado
git remote set-url origin https://SEU_TOKEN@github.com/buenogois-sti/studio.git
```
4. Agora tente enviar as alterações:
```bash
git push origin main
```

### Configurar Identidade do Autor
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@buenogoisadvogado.com.br"
```

### Limpar dados de usuário no terminal
```bash
git config --global --unset user.name
git config --global --unset user.email
git config --global --unset credential.helper
```

## 4. Fluxo de Trabalho
- **Sincronização**: O Studio salva os arquivos em tempo real no volume compartilhado.
- **Commits**: Escreva mensagens claras (ex: "feat: adiciona rotina de retorno").
- **Push**: Envie suas alterações para manter o repositório no GitHub atualizado.

---
**Dúvidas?** Consulte o suporte técnico da Bueno Gois.
