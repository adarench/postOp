const admin = require('firebase-admin');

// Initialize with project ID - this should work since we're in the functions environment
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'postop-b059e'
  });
}

const db = admin.firestore();

async function addPatientDirect() {
  try {
    console.log('🚀 Adding patient to Firestore...');

    const patientData = {
      practice_id: 'practice1',
      first_name: 'Adam',
      last_initial: 'R',
      phone_e164: '+18013101121',
      procedure_type: 'Rhinoplasty',
      surgery_date: '2025-09-22', // 3 days ago for Day 3 post-op
      timezone: 'America/Denver',
      status: 'active',
      created_at: admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now()
    };

    // Add patient to Firestore
    const patientRef = await db.collection('patients').add(patientData);
    console.log('✅ Patient added with ID:', patientRef.id);

    // Verify the patient was added
    const addedPatient = await patientRef.get();
    console.log('✅ Verification - Patient data:', addedPatient.data());

    // Test query to make sure we can find the patient by phone
    const testQuery = await db.collection('patients')
      .where('phone_e164', '==', '+18013101121')
      .where('status', '==', 'active')
      .get();

    if (!testQuery.empty) {
      console.log('✅ SUCCESS! Patient can be found by phone number');
      console.log('✅ Patient ID:', testQuery.docs[0].id);
      console.log('✅ Patient data:', testQuery.docs[0].data());
    } else {
      console.log('❌ ERROR: Patient not found by phone query');
    }

    console.log('\n🎉 READY FOR TESTING!');
    console.log('Now send an SMS to test the full workflow:');
    console.log('Send: "Pain level 8, some bleeding, worried about swelling"');
    console.log('You should get an intelligent medical response!');

  } catch (error) {
    console.error('❌ Error adding patient:', error);

    // Try alternative method with explicit auth
    console.log('Trying alternative authentication...');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '../postop-b059e-firebase-adminsdk-sej7k-bc8eeea4e9.json';

    try {
      const altAdmin = require('firebase-admin');
      if (altAdmin.apps.length === 0) {
        altAdmin.initializeApp();
      }

      const altDb = altAdmin.firestore();
      const altRef = await altDb.collection('patients').add(patientData);
      console.log('✅ Alternative method succeeded! Patient ID:', altRef.id);
    } catch (altError) {
      console.error('❌ Alternative method also failed:', altError);
    }
  }
}

addPatientDirect().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});