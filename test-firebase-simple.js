#!/usr/bin/env node

/**
 * Script de Diagnóstico Rápido Firebase
 * Execute com: node test-firebase-simple.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('🔍 Diagnóstico Bueno Gois - Firebase');
console.log('========================================\n');

// 1. Verificar .env.local
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ ARQUIVO NÃO ENCONTRADO: .env.local');
  console.log('   Crie este arquivo na raiz do projeto com a variável FIREBASE_SERVICE_ACCOUNT_JSON.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_JSON\s*=\s*['"]?({.*})['"]?/);

if (!match) {
  console.log('❌ VARIÁVEL NÃO ENCONTRADA: FIREBASE_SERVICE_ACCOUNT_JSON');
  console.log('   Certifique-se de que o JSON está no formato correto no .env.local.');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(match[1]);
  const serverId = serviceAccount.project_id;
  const clientId = 'studio-7080106838-23904';

  console.log('✅ Chave de Servidor encontrada');
  console.log(`   ID no Servidor: "${serverId}"`);
  console.log(`   ID no Cliente:  "${clientId}"`);
  console.log('');

  if (serverId === clientId) {
    console.log('✅ SUCESSO: Os IDs coincidem!');
    console.log('   A autenticação personalizada deve funcionar corretamente.');
  } else {
    console.log('❌ ERRO CRÍTICO: IDs DE PROJETO DIFERENTES!');
    console.log('   O erro 400 no login ocorre por causa disso.');
    console.log('\n   COMO CORRIGIR:');
    console.log('   1. Vá ao Firebase Console do projeto "studio-7080106838-23904"');
    console.log('   2. Gere uma nova chave de conta de serviço');
    console.log('   3. Atualize o seu .env.local com este novo JSON');
  }

} catch (e) {
  console.log('❌ ERRO DE PARSE: O JSON no .env.local é inválido.');
  console.log('   Erro:', e.message);
}

console.log('\n========================================\n');