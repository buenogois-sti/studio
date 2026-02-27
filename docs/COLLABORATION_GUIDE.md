
# 🤝 Guia de Colaboração - LexFlow

Este documento explica como compartilhar o acesso ao desenvolvimento e à operação do sistema entre os membros da equipe Bueno Gois.

## 1. Acesso ao Código (Firebase Studio)

Se você deseja que outro desenvolvedor ou advogado gestor veja e edite o código/configurações neste ambiente:

1. **Acesse o Console do Google Cloud ou Firebase**: Vá em [console.firebase.google.com](https://console.firebase.google.com).
2. **Selecione o Projeto**: `studio-7080106838-23904`.
3. **IAM & Admin**: Vá na seção "Usuários e Permissões".
4. **Adicionar Membro**: Insira o e-mail do colaborador (deve ser uma conta Google).
5. **Atribuir Papel**: 
   - Para acesso total ao Studio: Atribua o papel de **Editor** ou **Proprietário**.
   - O colaborador receberá um e-mail. Após aceitar, o projeto aparecerá para ele ao acessar o Firebase Studio.

## 2. Sincronização de Alterações

- **Arquivos**: Todos os arquivos que editamos aqui são salvos em um sistema de arquivos persistente vinculado ao projeto.
- **Tempo Real**: Se eu fizer uma alteração agora e outro usuário abrir o projeto em 5 minutos, ele verá o código atualizado.
- **Git**: Se o projeto estiver conectado a um repositório GitHub, as alterações podem ser commitadas para garantir o histórico e backup externo.

## 3. Acesso à Plataforma (Usuários Finais)

Para que um advogado utilize o sistema (sem mexer no código):

1. **Login**: Ele deve acessar a URL de produção (ou o link de preview do Studio).
2. **Convite**: Um Administrador deve cadastrar o e-mail dele em **Configurações > Usuários** dentro do sistema.
3. **Permissões**: O sistema reconhecerá o e-mail no ato do login via Google e aplicará o perfil (Advogado, Financeiro, etc) definido.

## 4. Como "Clonar" para outra conta (Nova Instância)

Se você quer levar este projeto para uma conta Google/Firebase totalmente diferente:

1. **GitHub**: Conecte este projeto a um repositório privado no seu GitHub.
2. **Nova Conta**: Na nova conta, abra o Firebase Studio.
3. **Importar**: Escolha a opção de criar projeto a partir de um repositório GitHub existente.
4. **Configuração**: Você precisará configurar um novo projeto Firebase e atualizar as chaves de API e o `FIREBASE_SERVICE_ACCOUNT_JSON` no novo ambiente.

---
**Dúvidas?** Consulte o suporte técnico interno.
