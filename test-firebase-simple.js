#!/usr/bin/env node

// Carregar .env.local
require('dotenv').config({ path: '.env.local' });

console.log('\n========================================');
console.log('Firebase Configuration Test');
console.log('========================================\n');

// Verificar se FIREBASE_SERVICE_ACCOUNT_JSON está definido
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
  console.log('❌ FIREBASE_SERVICE_ACCOUNT_JSON não está definido!');
  console.log('   Configure em .env.local');
  process.exit(1);
}

console.log('✅ FIREBASE_SERVICE_ACCOUNT_JSON encontrado\n');

try {
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  const serverProjectId = serviceAccount.project_id;
  const clientProjectId = 'studio-7080106838-23904';
  
  console.log('Server project_id:', serverProjectId);
  console.log('Client projectId:', clientProjectId);
  console.log('');
  
  if (serverProjectId === clientProjectId) {
    console.log('✅ PROJECT IDs COINCIDEM!');
    console.log('');
    console.log('========================================');
    console.log('✅ Configuração está CORRETA!');
    console.log('========================================\n');
    process.exit(0);
  } else {
    console.log('❌ PROJECT IDs NÃO COINCIDEM!');
    console.log('   Server:', serverProjectId);
    console.log('   Client:', clientProjectId);
    console.log('');
    console.log('========================================\n');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Erro ao fazer parse de FIREBASE_SERVICE_ACCOUNT_JSON');
  console.log('   Erro:', error.message);
  console.log('   Verifique se o JSON é válido');
  process.exit(1);
}
