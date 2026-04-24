
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
  console.error('FIREBASE_SERVICE_ACCOUNT_JSON not found');
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountJson);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function listTasks() {
  console.log(`Checking project: ${serviceAccount.project_id}`);
  const snapshot = await db.collection('tasks').get();
  console.log(`Total tasks found: ${snapshot.size}`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}, Title: ${data.title}, Source: ${data.source}, CreatedAt: ${data.createdAt ? 'Yes' : 'No'}`);
  });
}

listTasks().catch(console.error);
