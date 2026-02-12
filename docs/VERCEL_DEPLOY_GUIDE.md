# 🚀 Guia de Deploy - Vercel

Este guia detalha como hospedar o **LexFlow** na Vercel, a plataforma otimizada para Next.js.

## 1️⃣ Configuração Inicial

1. Suba seu código para um repositório no **GitHub**, **GitLab** ou **Bitbucket**.
2. Acesse [vercel.com](https://vercel.com) e clique em **"Add New"** > **"Project"**.
3. Importe o seu repositório.

---

## 2️⃣ Variáveis de Ambiente (CRÍTICO)

No momento da importação ou em *Settings > Environment Variables*, adicione as seguintes chaves:

| Nome | Valor |
|------|-------|
| `NEXTAUTH_SECRET` | Uma string aleatória (pode gerar no terminal com `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | A URL final do seu projeto (ex: `https://lexflow-bg.vercel.app`) |
| `GOOGLE_CLIENT_ID` | Seu ID de cliente do Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Sua chave secreta do Google Cloud |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | O JSON completo da conta de serviço (em uma única linha) |
| `GEMINI_API_KEY` | Sua chave para as funcionalidades de IA |

> **Dica para o JSON do Firebase:** Para garantir que funcione, remova as quebras de linha do arquivo JSON e cole como uma string única.

---

## 3️⃣ Autorização de Domínio (Google & Firebase)

Para que o login e as APIs funcionem, você deve autorizar o domínio da Vercel em dois lugares:

### A. Google Cloud Console
1. Vá em [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials).
2. Edite seu **OAuth 2.0 Client ID**.
3. Em **"Authorized redirect URIs"**, adicione:
   `https://seu-app.vercel.app/api/auth/callback/google`

### B. Firebase Console
1. Vá em **Authentication > Settings > Authorized Domains**.
2. Adicione o domínio `seu-app.vercel.app`.

---

## 4️⃣ Deploy

1. Clique em **Deploy**.
2. A Vercel detectará automaticamente o Next.js e fará o build.
3. Se houver erro de "Build Optimization", o projeto já está configurado para ignorar erros leves de TypeScript e Lint para garantir a publicação.

---

## 🛠️ Manutenção
Sempre que você fizer um `git push` para a branch `main`, a Vercel fará o deploy automático da nova versão.
