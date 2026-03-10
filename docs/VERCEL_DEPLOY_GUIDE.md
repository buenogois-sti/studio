
# 🚀 Guia de Deploy - Vercel (Produção Bueno Gois)

Este guia detalha como hospedar o **LexFlow** na Vercel com o domínio personalizado.

## 1️⃣ Configuração Inicial

1. Suba seu código para um repositório no **GitHub**.
2. Acesse [vercel.com](https://vercel.com) e importe o repositório.

---

## 2️⃣ Variáveis de Ambiente (CRÍTICO)

No painel da Vercel (*Settings > Environment Variables*), adicione estas chaves EXATAMENTE como configurado no Google/Firebase:

| Nome | Valor Recomendado | Observação |
|------|-------|------------|
| `NEXTAUTH_SECRET` | (Sua chave secreta) | Use `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://www.buenogoisadvogado.com.br` | **NÃO** coloque barra no final |
| `NEXT_PUBLIC_BASE_URL` | `https://www.buenogoisadvogado.com.br` | **NÃO** coloque barra no final |
| `GOOGLE_CLIENT_ID` | `1052927104977-t77...` | ID do Google Cloud |
| `GOOGLE_CLIENT_SECRET` | (Sua chave secreta) | Secret do Google Cloud |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | (O JSON completo) | Deve pertencer ao projeto `studio-7080106838-23904` |
| `GEMINI_API_KEY` | (Sua chave da API) | API Key do Google AI Studio |

> **Atenção:** O `NEXTAUTH_URL` e o `NEXT_PUBLIC_BASE_URL` devem ser idênticos e **sem a barra final**. Se colocar a barra, links automáticos de agenda podem falhar.

---

## 3️⃣ Autorização de Domínio no Google Cloud

Para resolver o erro de `redirect_uri_mismatch`:

1. Vá em [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials).
2. Edite seu ID de cliente.
3. Em **URIs de redirecionamento autorizados**, adicione:
   `https://www.buenogoisadvogado.com.br/api/auth/callback/google`
4. Em **Origens JavaScript autorizadas**, adicione:
   `https://www.buenogoisadvogado.com.br`

---

## 4️⃣ Autorização de Domínio no Firebase

1. Vá no Console do Firebase > Authentication > Settings > Authorized Domains.
2. Adicione `buenogoisadvogado.com.br` e `www.buenogoisadvogado.com.br`.

---

## 5️⃣ Deploy

Após salvar as variáveis, faça um novo **Redeploy** na Vercel para carregar as novas configurações.
