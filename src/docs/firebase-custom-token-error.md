# Firebase Auth Token Error - Diagnosis Guide

## Erro: `auth/invalid-custom-token`

Este erro ocorre quando há uma incompatibilidade entre o **projeto Firebase do servidor** e do **cliente**.

## ✅ Checklist de Diagnóstico

### 1. Verificar Project ID
```bash
# No console do navegador (F12 → Console):
firebase.app().options.projectId
# Deve retornar: "studio-7080106838-23904"
```

### 2. Verificar Variável de Ambiente
```bash
# No .env.local (NÃO COMMITAR):
FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id": "studio-7080106838-23904", ...}'
```

**Verificar se o `project_id` dentro do JSON coincide com a configuração do cliente!**

### 3. Verificar em Production
Se estiver deploiando, verifique as variáveis de ambiente na plataforma:
- Vercel, Docker, AWS, etc.
- A variável `FIREBASE_SERVICE_ACCOUNT_JSON` deve estar configurada
- O `project_id` dentro deve ser **exatamente** o mesmo do cliente

## 🔧 Solução Rápida

Se você recebeu um novo arquivo `serviceAccountKey.json` do Firebase:

1. **Abra o arquivo**
2. **Copie o campo `project_id`**
3. **Verifique se coincide com** `src/firebase/config.ts` → `projectId`

Exemplo:
```typescript
// src/firebase/config.ts
export const firebaseConfig = {
  "projectId": "studio-7080106838-23904",  // ← DEVE SER IGUAL
  ...
};
```

```json
// FIREBASE_SERVICE_ACCOUNT_JSON
{
  "project_id": "studio-7080106838-23904",  // ← DEVE SER IGUAL
  ...
}
```

## 📊 Logs para Debugar

Procure no console por:
```
[Firebase Auth] PROJECT ID MISMATCH DETECTED
[Firebase Auth] Project ID: studio-7080106838-23904
[NextAuth JWT] Custom token creation failed
```

## 🚀 Se Tudo Estiver Correto

1. **Limpe o cache:**
   ```bash
   # No terminal:
   npm run dev
   # Ou delete node_modules/.cache
   ```

2. **Force reload do navegador:**
   - Ctrl + Shift + R (Windows/Linux)
   - Cmd + Shift + R (Mac)

3. **Verifique Network:**
   - F12 → Network → Filtre por `token`
   - Procure por erros 401/403

## 📞 Próximos Passos se Problema Persistir

1. Verifique se o `FIREBASE_SERVICE_ACCOUNT_JSON` está correto
2. Teste em incógnito (para limpar cookies)
3. Verifique se a chave privada do Firebase é válida
4. Confira se o usuário tem permissão para gerar custom tokens no Firebase

---

**Logs agora incluem detalhes completos para diagnóstico. Procure por `[Firebase Auth]` e `[NextAuth JWT]` no console.**
