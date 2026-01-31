# Configurando a Autenticação do Servidor com o Firebase

Este guia explica como configurar as credenciais do servidor para que sua aplicação possa se comunicar com os serviços do Firebase (como Firestore e Auth) de forma segura.

O erro de login que você está enfrentando ocorre porque o servidor não tem permissão para acessar o Firebase. O arquivo JSON da conta de serviço que você baixou contém a "chave" para conceder essa permissão.

## Passos para Configuração

Siga estes passos para configurar a variável de ambiente no seu provedor de hospedagem (Vercel, Firebase App Hosting, etc.).

### 1. Encontre o Arquivo da Conta de Serviço

Você já fez o passo mais importante: o download do arquivo JSON da sua conta de serviço do Firebase. Ele geralmente tem um nome como `[NOME-DO-PROJETO]-firebase-adminsdk-[...].json`.

### 2. Copie o Conteúdo do Arquivo JSON

Abra o arquivo JSON que você baixou em um editor de texto. Selecione e copie **todo o conteúdo** do arquivo. O conteúdo se parecerá com isto:

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

### 3. Configure a Variável de Ambiente

Agora, você precisa adicionar esse conteúdo como uma variável de ambiente no seu serviço de hospedagem.

*   **Acesse as Configurações do seu Projeto:** Vá para o painel de controle do seu provedor de hospedagem (Vercel, etc.) e encontre a seção de Variáveis de Ambiente (`Environment Variables`).
*   **Crie uma Nova Variável:**
    *   **Nome:** `FIREBASE_SERVICE_ACCOUNT_JSON`
    *   **Valor:** Cole **todo o conteúdo JSON** que você copiou no passo anterior. É importante que seja o JSON completo, em uma única linha, sem quebras de linha.

### 4. Reimplante (Redeploy) sua Aplicação

Depois de salvar a variável de ambiente, você precisa acionar um novo "deploy" (reimplantação) do seu projeto. A nova versão do seu aplicativo irá então carregar essa variável, e o SDK Admin do Firebase conseguirá se autenticar com sucesso.

Após isso, o problema de login e criação de usuário estará resolvido.

---

**⚠️ Importante sobre Segurança:**

O conteúdo deste arquivo JSON é **altamente sensível**. Ele concede acesso administrativo ao seu projeto Firebase.
*   **NUNCA** adicione o arquivo `.json` ao seu repositório Git.
*   **NUNCA** compartilhe o conteúdo deste arquivo publicamente.
*   O uso de variáveis de ambiente é a maneira segura de armazenar essas credenciais.
