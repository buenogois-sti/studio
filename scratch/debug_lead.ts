import { firestoreAdmin } from '../src/firebase/admin';

async function checkLeadAndStaff() {
  if (!firestoreAdmin) {
    console.error('❌ Firestore Admin não inicializado. Verifique se as variáveis de ambiente (FIREBASE_SERVICE_ACCOUNT_JSON) estão configuradas corretamente.');
    return;
  }
  const leadId = 'Ts9o5lUnpyXNABLDIWMG';
  const leadDoc = await firestoreAdmin.collection('leads').doc(leadId).get();
  
  if (!leadDoc.exists) {
    console.log('Lead not found');
    return;
  }
  
  const leadData = leadDoc.data();
  console.log('Lead Data:', JSON.stringify(leadData, null, 2));
  
  const staffSnapshot = await firestoreAdmin.collection('staff').get();
  const allStaff = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  
  console.log('All Staff Emails and IDs:');
  allStaff.forEach(s => {
    console.log(`- ${s.firstName} ${s.lastName}: ${s.email} (ID: ${s.id})`);
  });

  const nataliaStaff = allStaff.find(s => s.firstName.toLowerCase().includes('natalia') || s.lastName.toLowerCase().includes('natalia'));
  if (nataliaStaff) {
    console.log('\nFound Natalia Staff:', JSON.stringify(nataliaStaff, null, 2));
    
    // Check user profile too
    const usersSnapshot = await firestoreAdmin.collection('users').where('email', '==', nataliaStaff.email).get();
    if (!usersSnapshot.empty) {
        console.log('User Profile:', JSON.stringify(usersSnapshot.docs[0].data(), null, 2));
    } else {
        console.log('User Profile not found for email:', nataliaStaff.email);
    }
  } else {
    console.log('\nNatalia Staff not found');
  }
}

checkLeadAndStaff().catch(console.error);
