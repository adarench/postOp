const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'postop-b059e'
});
const db = admin.firestore();

async function createTestPatient() {
  try {
    // Create test patient
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

    const patientRef = await db.collection('patients').add(patientData);
    console.log('✅ Created test patient with ID:', patientRef.id);

    // Create check-in schedule for this patient
    const checkInData = {
      patient_id: patientRef.id,
      day_index: 3, // Day 3 post-op
      send_at_local: '09:00',
      channel: 'sms',
      created_at: admin.firestore.Timestamp.now()
    };

    await db.collection('checkin_schedule').add(checkInData);
    console.log('✅ Created check-in schedule');

    console.log('🎉 Test patient setup complete!');
    console.log('Patient Details:', {
      name: 'Adam R.',
      phone: '+18013101121',
      procedure: 'Rhinoplasty',
      day_post_op: 3,
      status: 'active'
    });

  } catch (error) {
    console.error('❌ Error creating test patient:', error);
  }
}

createTestPatient().then(() => process.exit(0));