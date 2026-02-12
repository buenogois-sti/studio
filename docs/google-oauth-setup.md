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

### Para o seu Domínio Principal (Produção)
Adicione esta URL exatamente como está abaixo:
```
https://www.buenogoisadvogado.com.br/api/auth/callback/google
```

### Para a Vercel (Domínio de Preview)
Adicione a URL que a Vercel te forneceu:
```
https://lexflow-bg.vercel.app/api/auth/callback/google
```

### Para Desenvolvimento Local
Adicione esta URL para poder testar na sua máquina:
```
http://localhost:9002/api/auth/callback/google
```

4.  **Salve as Alterações:**
    *   Role até o final da página e clique em **"SALVAR"**.

**Importante:** Pode levar alguns minutos para que as alterações entrem em vigor no Google. Após salvar, aguarde um pouco e tente o login novamente.

---

## Variável de Ambiente `NEXTAUTH_URL`

Certifique-se de que na Vercel (Settings > Environment Variables) a variável `NEXTAUTH_URL` está configurada como:
`https://www.buenogoisadvogado.com.br`