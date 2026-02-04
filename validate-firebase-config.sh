#!/bin/bash
# Script para validar configuração Firebase

echo "=========================================="
echo "Firebase Configuration Validator"
echo "=========================================="
echo ""

# Verificar se FIREBASE_SERVICE_ACCOUNT_JSON está definido
if [ -z "$FIREBASE_SERVICE_ACCOUNT_JSON" ]; then
    echo "❌ FIREBASE_SERVICE_ACCOUNT_JSON não está definido!"
    echo "   Configure em .env.local ou nas variáveis de ambiente do seu servidor"
    exit 1
fi

echo "✅ FIREBASE_SERVICE_ACCOUNT_JSON encontrado"
echo ""

# Extrair project_id
PROJECT_ID=$(echo "$FIREBASE_SERVICE_ACCOUNT_JSON" | grep -o '"project_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Não foi possível extrair project_id do JSON"
    exit 1
fi

echo "Server project_id: $PROJECT_ID"
echo ""

# Verificar em config.ts
CLIENT_PROJECT_ID=$(grep -o '"studio-[^"]*"' src/firebase/config.ts | head -1 | tr -d '"')

if [ -z "$CLIENT_PROJECT_ID" ]; then
    echo "❌ Não foi possível encontrar projectId em src/firebase/config.ts"
    exit 1
fi

echo "Client projectId: $CLIENT_PROJECT_ID"
echo ""

# Comparar
if [ "$PROJECT_ID" = "$CLIENT_PROJECT_ID" ]; then
    echo "✅ Project IDs COINCIDEM! Configuração está correta."
    echo ""
    echo "=========================================="
else
    echo "❌ Project IDs NÃO COINCIDEM!"
    echo "   Você precisa atualizar a configuração para que correspondam."
    echo ""
    echo "Opções:"
    echo "1. Atualizar FIREBASE_SERVICE_ACCOUNT_JSON com project_id: $CLIENT_PROJECT_ID"
    echo "2. Ou atualizar src/firebase/config.ts com projectId: $PROJECT_ID"
    echo ""
    echo "=========================================="
    exit 1
fi
