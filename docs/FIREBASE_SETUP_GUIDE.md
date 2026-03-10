# Como Obter o FIREBASE_SERVICE_ACCOUNT_JSON Correto

## 🎯 Objetivo
Obter a chave privada do Firebase que tem `project_id` = **"studio-7080106838-23904"**

## 📋 Passo a Passo baseado no seu Console Google Cloud

### 1. Acesse o Console do Google Cloud ou Firebase
```
https://console.cloud.google.com/apis/credentials?project=studio-7080106838-23904
```

### 2. Localize a Conta de Serviço Correta
Na seção **"Contas de serviço"** (no final da página de Credenciais):
- Procure por: `firebase-adminsdk-fbsvc@studio-7080106838-23904.iam.gserviceaccount.com`
- Clique no ícone de lápis (Editar) ou diretamente no nome do e-mail.

### 3. Gere a Chave JSON
1. Clique na aba **CHAVES (KEYS)** no topo.
2. Clique no botão **ADICIONAR CHAVE (ADD KEY)**.
3. Selecione **Criar nova chave (Create new key)**.
4. Escolha o formato **JSON** e clique em **Criar**.
5. Um arquivo será baixado no seu computador.

### 4. Configure na Vercel (Produção)
1. Abra o arquivo baixado no bloco de notas.
2. Copie **todo** o conteúdo (Ctrl+A, Ctrl+C).
3. Vá no painel da Vercel > Settings > Environment Variables.
4. Adicione/Edite a variável `FIREBASE_SERVICE_ACCOUNT_JSON`.
5. Cole o conteúdo (deve estar em uma única linha ou colado exatamente como no arquivo).

### 5. Verifique as outras variáveis
Com base no seu console:
- **GOOGLE_CLIENT_ID**: Use o ID do `Cliente Web 3` (`1052927104977-t77...`).
- **GEMINI_API_KEY**: Use o valor da `GenAI Key`.

---

## 🔍 Checklist de Validação
- [ ] O `project_id` dentro do JSON é "studio-7080106838-23904".
- [ ] O JSON foi colado por completo na Vercel.
- [ ] Você realizou um novo **Redeploy** na Vercel após salvar as variáveis.

Se o erro `auth/invalid-custom-token` persistir, verifique se não há espaços em branco antes ou depois do JSON colado na Vercel.