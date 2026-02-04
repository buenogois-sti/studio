/**
 * Firebase Configuration Test
 * Executar via: npx ts-node src/firebase/test-config.ts
 * Ou adicionar como script: "test:firebase": "ts-node src/firebase/test-config.ts"
 */

import { firebaseConfig } from './config';

console.log('\n========================================');
console.log('Firebase Configuration Test');
console.log('========================================\n');

// 1. Verificar config.ts
console.log('✅ Client Configuration (src/firebase/config.ts):');
console.log('   projectId:', firebaseConfig.projectId);
console.log('   apiKey:', firebaseConfig.apiKey.substring(0, 20) + '...');
console.log('   authDomain:', firebaseConfig.authDomain);
console.log('');

// 2. Verificar environment variable
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
  console.log('❌ FIREBASE_SERVICE_ACCOUNT_JSON não está configurado!');
  console.log('   Configure em .env.local:');
  console.log('   FIREBASE_SERVICE_ACCOUNT_JSON=\'{"type": "service_account", "project_id": "studio-7080106838-23904", ...}\'');
  process.exit(1);
}

console.log('✅ FIREBASE_SERVICE_ACCOUNT_JSON encontrado');

try {
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  console.log('✅ Service Account Configuration:');
  console.log('   project_id:', serviceAccount.project_id);
  console.log('   type:', serviceAccount.type);
  console.log('   client_email:', serviceAccount.client_email?.substring(0, 30) + '...');
  console.log('');
  
  // 3. Validação crítica
  if (serviceAccount.project_id === firebaseConfig.projectId) {
    console.log('✅ PROJECT IDs COINCIDEM!');
    console.log('   Server:', serviceAccount.project_id);
    console.log('   Client:', firebaseConfig.projectId);
    console.log('');
    console.log('========================================');
    console.log('✅ Configuração está CORRETA!');
    console.log('========================================\n');
    process.exit(0);
  } else {
    console.log('❌ PROJECT IDs NÃO COINCIDEM!');
    console.log('   Server (FIREBASE_SERVICE_ACCOUNT_JSON):', serviceAccount.project_id);
    console.log('   Client (config.ts):', firebaseConfig.projectId);
    console.log('');
    console.log('SOLUÇÃO:');
    console.log('Opção 1: Atualizar FIREBASE_SERVICE_ACCOUNT_JSON');
    console.log('  → Obter novo arquivo do Firebase Console');
    console.log('  → Garantir que project_id = "studio-7080106838-23904"');
    console.log('');
    console.log('Opção 2: Atualizar config.ts');
    console.log(`  → Alterar projectId para: "${serviceAccount.project_id}"`);
    console.log('');
    console.log('========================================');
    process.exit(1);
  }
} catch (error: any) {
  console.log('❌ Erro ao fazer parse de FIREBASE_SERVICE_ACCOUNT_JSON');
  console.log('   Erro:', error.message);
  console.log('   Verifique se o JSON é válido');
  process.exit(1);
}
