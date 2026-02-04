# Configurando a Autenticação do Servidor com o Firebase

Este guia explica como configurar as credenciais do servidor para que sua aplicação possa se comunicar com os serviços do Firebase (como Firestore e Auth) de forma segura.

O erro de login que você está enfrentando (`auth/invalid-custom-token`) ocorre porque o servidor que gera o token de autenticação está configurado para um projeto Firebase diferente do que o seu aplicativo no navegador está esperando.

## Passos para Configuração

Siga estes passos para configurar a variável de ambiente no seu provedor de hospedagem (Vercel, Firebase App Hosting, etc.).

### 1. Verifique o ID do seu Projeto no Código

Primeiro, confirme qual é o projeto Firebase que sua aplicação está configurada para usar.

*   Abra o arquivo: `src/firebase/config.ts`
*   Anote o valor de `projectId`. Ele deve ser algo como `"seu-projeto-id"`.

### 2. Encontre o Arquivo da Conta de Serviço Correto

Agora, vá para o Console do Firebase e certifique-se de que está no projeto com o ID que você anotou.

*   Vá para **Configurações do Projeto** (clicando na engrenagem).
*   Selecione a aba **Contas de Serviço**.
*   Clique em **"Gerar nova chave privada"**. Um arquivo JSON será baixado. Este arquivo corresponde ao projeto correto.

### 3. Copie o Conteúdo do Arquivo JSON

Abra o arquivo JSON que você acabou de baixar em um editor de texto. Selecione e copie **todo o conteúdo** do arquivo.

```json
{
  "type": "service_account",
  "project_id": "seu-projeto-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n[...]\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

### 4. Configure a Variável de Ambiente

Agora, você precisa adicionar esse conteúdo como uma variável de ambiente no seu serviço de hospedagem.

*   **Acesse as Configurações do seu Projeto:** Vá para o painel de controle do seu provedor de hospedagem (Vercel, etc.) e encontre a seção de Variáveis de Ambiente (`Environment Variables`).
*   **Crie ou Atualize a Variável:**
    *   **Nome:** `FIREBASE_SERVICE_ACCOUNT_JSON`
    *   **Valor:** Cole **todo o conteúdo JSON** que você copiou no passo anterior. É importante que seja o JSON completo, em uma única linha, sem quebras de linha.

### 5. Reimplante (Redeploy) sua Aplicação

Depois de salvar a variável de ambiente, você precisa acionar um novo "deploy" (reimplantação) do seu projeto. A nova versão do seu aplicativo irá então carregar essa variável, e o SDK Admin do Firebase conseguirá se autenticar com o projeto correto, gerando tokens válidos.

Após isso, o problema de login estará resolvido.

---

**⚠️ Importante sobre Segurança:**

O conteúdo deste arquivo JSON é **altamente sensível**. Ele concede acesso administrativo ao seu projeto Firebase.
*   **NUNCA** adicione o arquivo `.json` ao seu repositório Git.
*   **NUNCA** compartilhe o conteúdo deste arquivo publicamente.
*   O uso de variáveis de ambiente é a maneira segura de armazenar essas credenciais.
