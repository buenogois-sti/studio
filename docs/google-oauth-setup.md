# Solucionando o Erro "redirect_uri_mismatch" do Google OAuth

Este guia explica como resolver o erro `Error 400: redirect_uri_mismatch` que ocorre durante o login com o Google.

## O que é este erro?

Este erro significa que a URL de redirecionamento que sua aplicação está usando não está na lista de URLs autorizadas nas configurações do seu projeto no Google Cloud Console. Por segurança, o Google só permite redirecionamentos para URLs que você tenha aprovado previamente.

## Como Corrigir

Você precisa adicionar as URLs corretas na seção "URIs de redirecionamento autorizados" da sua credencial de cliente OAuth 2.0.

1.  **Acesse o Google Cloud Console:**
    *   Vá para [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials).
    *   Selecione o projeto que você está usando para este aplicativo.

2.  **Encontre sua Credencial OAuth:**
    *   Na seção "IDs do cliente OAuth 2.0", clique no nome do cliente que você está usando (geralmente chamado de "Cliente da Web").

3.  **Adicione os URIs de Redirecionamento:**
    *   Encontre a seção **"URIs de redirecionamento autorizados"**.
    *   Clique em **"ADICIONAR URI"** e adicione as seguintes URLs, uma de cada vez:

### Para Desenvolvimento Local

Adicione esta URL para poder fazer login ao rodar o projeto na sua máquina local:

```
http://localhost:9002/api/auth/callback/google
```

*(**Nota:** O `9002` é a porta definida no seu arquivo `package.json`. Se você a alterar, precisará atualizar esta URL aqui também.)*

### Para Produção (Vercel, Firebase App Hosting, etc.)

Adicione a URL do seu site em produção. Substitua `<URL_DO_SEU_SITE>` pelo domínio real do seu aplicativo:

```
https://<URL_DO_SEU_SITE>/api/auth/callback/google
```

*Se você tiver múltiplos ambientes (como previews de branches), precisará adicionar a URL de cada um deles.*

4.  **Salve as Alterações:**
    *   Role até o final da página e clique em **"SALVAR"**.

Pode levar alguns minutos para que as alterações entrem em vigor. Após salvar, tente fazer login novamente no seu aplicativo.

---

## Variável de Ambiente `NEXTAUTH_URL` (Opcional, mas Recomendado)

Para garantir que o `next-auth` sempre use a URL correta, é uma boa prática definir a variável de ambiente `NEXTAUTH_URL` no seu ambiente de produção com a URL principal do seu site.

**Exemplo:** `NEXTAUTH_URL=https://<URL_DO_SEU_SITE>`
