
# Guia Definitivo: Resolvendo o Erro de Autenticação (Token 400)

## 🎯 O Problema
Se você vê o erro `auth/invalid-custom-token` ou `400 (Bad Request)` no console, significa que o arquivo JSON de credenciais que você colocou na Vercel **não pertence** ao projeto que está aparecendo na sua tela.

## 📋 Passo a Passo para Correção

### 1. Obtenha o ID Correto
Olhe para o seu código ou console. O ID esperado é: **`studio-7080106838-23904`**

### 2. Gere a Chave Privada (JSON) no Google Cloud
Acesse o link abaixo diretamente (já com o projeto certo selecionado):
[https://console.cloud.google.com/iam-admin/serviceaccounts?project=studio-7080106838-23904](https://console.cloud.google.com/iam-admin/serviceaccounts?project=studio-7080106838-23904)

1.  Localize a conta que começa com **`firebase-adminsdk...`**.
2.  Clique nos três pontinhos (Ações) e escolha **Gerenciar chaves** (Manage keys).
3.  Clique em **ADICIONAR CHAVE** -> **Criar nova chave**.
4.  Escolha o formato **JSON** e clique em **Criar**.
5.  Um arquivo será baixado. **Abra-o no bloco de notas**.

### 3. Atualize a Vercel
1.  Acesse o painel da Vercel -> Seu Projeto -> **Settings** -> **Environment Variables**.
2.  Procure pela variável `FIREBASE_SERVICE_ACCOUNT_JSON`.
3.  **Apague o valor antigo** e cole o conteúdo COMPLETO do arquivo que você baixou.
4.  **REIMPLANTE (Redeploy)**: Isso é obrigatório! Vá em **Deployments**, clique nos três pontinhos do último deploy e selecione **Redeploy**.

---

## 🔍 Como saber se funcionou?
Após o redeploy, abra o sistema e tente fazer login. No console do navegador (F12), você deve ver:
✅ `[Firebase Auth] ✅ Sessão Firebase vinculada: ...`

Se ainda vir `PROJECT ID MISMATCH`, verifique se você não colou o JSON de um projeto diferente por engano.
