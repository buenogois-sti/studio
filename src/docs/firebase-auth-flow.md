# Firebase Custom Token Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Google OAuth Login Flow                             │
└─────────────────────────────────────────────────────────────────────────┘

1️⃣ USUÁRIO CLICA EM "LOGIN COM GOOGLE"
   └─→ /api/auth/callback/google (NextAuth Handler)
       └─→ Usuário autenticado com sucesso

2️⃣ NEXTAUTH JWT CALLBACK
   ├─→ Recebe: user.email, user.id
   ├─→ Chama: authAdmin.createCustomToken(user.id, { role })
   │          ↓
   │   ⚠️  CRÍTICO: authAdmin usa FIREBASE_SERVICE_ACCOUNT_JSON
   │       • Lê project_id do JSON
   │       • Cria token assinado para aquele projeto
   │
   └─→ Retorna: token com .customToken = "eyJhbGc..."

3️⃣ NEXTAUTH SESSION CALLBACK
   └─→ Passa customToken para: session.customToken = token.customToken

4️⃣ CLIENTE RECEBE SESSÃO
   ├─→ Em layout.tsx: <FirebaseProvider session={session} />
   └─→ Provider.tsx recebe: session.customToken

5️⃣ FIREBASE PROVIDER (CLIENT-SIDE) ⚠️  PROBLEMA AQUI!
   └─→ Chama: signInWithCustomToken(auth, session.customToken)
       │
       └─→ Firebase Client SDK verifica:
           • Token foi assinado para qual projeto?
           • Qual é o projectId do Auth SDK?
           │
           └─→ SE project_id (token) ≠ projectId (client config)
               └─→ ❌ "auth/invalid-custom-token"


┌─────────────────────────────────────────────────────────────────────────┐
│                    OS DOIS PROJECT IDs PRECISAM SER IGUAIS               │
└─────────────────────────────────────────────────────────────────────────┘

SERVIDOR (token criado em options.ts/api):
  ↓
  FIREBASE_SERVICE_ACCOUNT_JSON
    ↓
    {
      "type": "service_account",
      "project_id": "???",  ← Este valor
      "private_key": "...",
      ...
    }

CLIENTE (token validado em provider.tsx):
  ↓
  src/firebase/config.ts
    ↓
    {
      "projectId": "studio-7080106838-23904",  ← Deve ser igual!
      "apiKey": "...",
      ...
    }


┌─────────────────────────────────────────────────────────────────────────┐
│                     COMO DIAGNOSTICAR E CORRIGIR                         │
└─────────────────────────────────────────────────────────────────────────┘

PASSO 1: Verificar os valores atuais
────────────────────────────────────
Terminal:
  npm run test:firebase

Resultado esperado:
  ✅ PROJECT IDs COINCIDEM!

Resultado do erro:
  ❌ PROJECT IDs NÃO COINCIDEM!
     Server: "seu-projeto-xyz"
     Client: "studio-7080106838-23904"


PASSO 2: Corrigir baseado no resultado
──────────────────────────────────────

Opção A: Se server ≠ client
────────────────────────────
A) Obtenha novo serviceAccountKey.json do Firebase Console:
   1. Acesse: https://console.firebase.google.com
   2. Selecione projeto: "studio-7080106838-23904"
   3. Configurações → Contas de serviço
   4. Clique "Gerar nova chave privada"
   5. Salve o arquivo

B) Copie o conteúdo JSON:
   • Abra serviceAccountKey.json
   • Copie TODO o conteúdo

C) Atualize .env.local:
   FIREBASE_SERVICE_ACCOUNT_JSON='{...copie aqui...}'

D) Teste novamente:
   npm run test:firebase


PASSO 3: Limpar cache e testar
──────────────────────────────

Terminal 1:
  npm run dev

Terminal 2:
  # Verificar logs
  # Procure por: [Firebase Auth] [NextAuth JWT]

Browser:
  • F12 → Console
  • Tente fazer login com Google
  • Procure por:
    ✅ "[Firebase Auth] Custom token created successfully"
    ou
    ❌ "[Firebase Auth] PROJECT ID MISMATCH DETECTED"


┌─────────────────────────────────────────────────────────────────────────┐
│                    SE AINDA NÃO FUNCIONAR                                │
└─────────────────────────────────────────────────────────────────────────┘

1. ❓ FIREBASE_SERVICE_ACCOUNT_JSON não está definido?
   → Confira .env.local (não deve estar vazio)
   → Religue o servidor (npm run dev)

2. ❓ JSON inválido?
   → Cole em: https://jsonlint.com/
   → Verifique se é JSON válido

3. ❓ Chave privada expirada?
   → Gere nova em Firebase Console
   → Copie tudo novamente para .env.local

4. ❓ Firestore Rules bloqueando?
   → Verifique firestore.rules
   → Regras podem estar rejeitando tokens personalizados

5. ❓ Deploy em produção não funciona?
   → Variáveis de ambiente não foram sincronizadas
   → Vercel: Settings → Environment Variables
   → Docker: Adicione em Dockerfile ou docker-compose.yml


┌─────────────────────────────────────────────────────────────────────────┐
│                       VERIFICAÇÃO FINAL                                  │
└─────────────────────────────────────────────────────────────────────────┘

Se tudo estiver correto, você verá no console do navegador:

✅ [Firebase Auth] Custom token created successfully
✅ [Firebase Auth] User signed in with custom token: user@example.com
✅ Sessão carregada: SessionContext ready

Se vir este erro, volta ao diagnóstico:

❌ [Firebase Auth] PROJECT ID MISMATCH DETECTED
   SERVER PROJECT: xyz-123
   CLIENT PROJECT: studio-7080106838-23904
