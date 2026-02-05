# Como Obter o FIREBASE_SERVICE_ACCOUNT_JSON Correto

## 🎯 Objetivo
Obter a chave privada do Firebase que tem `project_id` = **"studio-7080106838-23904"**

## 📋 Passo a Passo

### 1. Acesse o Firebase Console
```
https://console.firebase.google.com/
```

### 2. Selecione o Projeto Correto
- Procure por um projeto chamado "studio" ou similiar
- Ou procure por ID: **studio-7080106838-23904**

### 3. Vá para Configurações da Conta de Serviço
```
Ícone de Engrenagem (⚙️) → Configurações do Projeto
   ↓
Aba "Contas de serviço"
   ↓
Linguagem: "Node.js"
   ↓
Botão: "Gerar nova chave privada"
```

### 4. Salve o Arquivo JSON
- Um arquivo `serviceAccountKey.json` será baixado automaticamente
- Abra com Bloco de Notas ou VSCode

### 5. Verifique o Conteúdo
O arquivo deve parecer assim:
```json
{
  "type": "service_account",
  "project_id": "studio-7080106838-23904",  ← IMPORTANTE!
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...",
  "client_email": "firebase-adminsdk-xxxxx@studio-7080106838-23904.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### 6. Copie TODO o Conteúdo
- Selecionar tudo (Ctrl+A)
- Copiar (Ctrl+C)

### 7. Atualize o Arquivo .env.local

**IMPORTANTE: Não commitar este arquivo!**

No arquivo `.env.local` (raiz do projeto):

```bash
# Remova a quebra de linhas - tudo em UMA LINHA
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"studio-7080106838-23904",...}'
```

Se o JSON tem quebras de linhas, você pode fazer assim:

**Opção A: Uma linha (sem quebras)**
```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"studio-7080106838-23904","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQ...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**Opção B: Com quebras de linha (envolvido em aspas simples)**
```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{
  "type": "service_account",
  "project_id": "studio-7080106838-23904",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}'
```

### 8. Reinicie o Servidor

```bash
# Ctrl+C para parar o servidor atual

# Remova cache do Node (opcional)
rm -r node_modules/.cache

# Inicie novamente
npm run dev
```

### 9. Teste a Configuração

```bash
npm run test:firebase
```

Resultado esperado:
```
✅ Project IDs COINCIDEM!
   Server: studio-7080106838-23904
   Client: studio-7080106838-23904

✅ Configuração está CORRETA!
```

### 10. Se Tudo OK, Teste o Login

1. Abra: `http://localhost:9002/login`
2. Clique em "Login com Google"
3. Faça login com sua conta Google
4. Abra F12 → Console
5. Procure por:
   ```
   ✅ [Firebase Auth] Custom token created successfully
   ✅ [Firebase Auth] User signed in
   ```

---

## ⚠️ Segurança Importante

**NUNCA commitar .env.local!**

Verifique se `.gitignore` contém:
```
.env.local
.env.*.local
serviceAccountKey.json
```

Se estiver em produção (Vercel, Docker, etc):

### Para Vercel:
1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Settings → Environment Variables
4. Adicione:
   ```
   Name: FIREBASE_SERVICE_ACCOUNT_JSON
   Value: (copie o JSON completo)
   ```
5. Redeploy

### Para Docker:
Adicione em `docker-compose.yml`:
```yaml
environment:
  FIREBASE_SERVICE_ACCOUNT_JSON: '{"type":"service_account",...}'
```

Ou crie um arquivo `.env` (não commitar) e carregue:
```dockerfile
ENV_FILE=.env
RUN --mount=type=secret,id=firebase_key \
    FIREBASE_SERVICE_ACCOUNT_JSON=$(cat /run/secrets/firebase_key)
```

---

## 🔍 Checklist Final

- [ ] Acessei Firebase Console
- [ ] Selecionei projeto "studio-7080106838-23904"
- [ ] Gerei nova chave privada
- [ ] Verifiquei que `project_id` no JSON é "studio-7080106838-23904"
- [ ] Copiei TODO o JSON
- [ ] Atualizei `.env.local` com `FIREBASE_SERVICE_ACCOUNT_JSON`
- [ ] Verifiquei que `.gitignore` protege `.env.local`
- [ ] Reiniciei `npm run dev`
- [ ] Executei `npm run test:firebase` com sucesso ✅
- [ ] Testei login com Google e verifiquei console ✅
