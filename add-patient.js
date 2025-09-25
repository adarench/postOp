// Simple script to add patient via Firebase REST API
const https = require('https');

async function addPatient() {
  const patientData = {
    "practice_id": "practice1",
    "first_name": "Adam",
    "last_initial": "R",
    "phone_e164": "+18013101121",
    "procedure_type": "Rhinoplasty",
    "surgery_date": "2025-09-22", // 3 days ago for Day 3 post-op
    "timezone": "America/Denver",
    "status": "active",
    "created_at": new Date().toISOString(),
    "updated_at": new Date().toISOString()
  };

  console.log('📝 Patient data to add:');
  console.log('Name: Adam R.');
  console.log('Phone: +18013101121');
  console.log('Procedure: Rhinoplasty');
  console.log('Surgery Date: 2025-09-22 (Day 3 post-op)');
  console.log('Status: Active');
  console.log('\n🔧 MANUAL SETUP REQUIRED:');
  console.log('Please manually add this patient to Firebase Console:');
  console.log('1. Go to: https://console.firebase.google.com/project/postop-b059e/firestore');
  console.log('2. Navigate to "patients" collection');
  console.log('3. Click "Add document" (auto-generate ID)');
  console.log('4. Add these exact fields:');
  console.log(`   practice_id: "practice1"`);
  console.log(`   first_name: "Adam"`);
  console.log(`   last_initial: "R"`);
  console.log(`   phone_e164: "+18013101121"`);
  console.log(`   procedure_type: "Rhinoplasty"`);
  console.log(`   surgery_date: "2025-09-22"`);
  console.log(`   timezone: "America/Denver"`);
  console.log(`   status: "active"`);
  console.log(`   created_at: (timestamp) ${new Date().toISOString()}`);
  console.log(`   updated_at: (timestamp) ${new Date().toISOString()}`);
  console.log('\n🚨 IMPORTANT: Make sure phone_e164 is EXACTLY "+18013101121"');
  console.log('After adding, send another test SMS to see the full workflow!');
}

addPatient();