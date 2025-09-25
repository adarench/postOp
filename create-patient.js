// Create a patient record via direct Firestore REST API
const https = require('https');

const patientData = {
  "fields": {
    "practice_id": {"stringValue": "practice1"},
    "first_name": {"stringValue": "Adam"},
    "last_initial": {"stringValue": "R"},
    "phone_e164": {"stringValue": "+18013101121"},
    "procedure_type": {"stringValue": "Rhinoplasty"},
    "surgery_date": {"stringValue": "2025-09-22"},
    "timezone": {"stringValue": "America/Denver"},
    "status": {"stringValue": "active"},
    "created_at": {"timestampValue": new Date().toISOString()},
    "updated_at": {"timestampValue": new Date().toISOString()}
  }
};

console.log('Patient data to be created:');
console.log(JSON.stringify(patientData, null, 2));
console.log('\nTo add this patient to Firestore:');
console.log('1. Go to Firebase Console: https://console.firebase.google.com/project/postop-b059e/firestore');
console.log('2. Go to the "patients" collection');
console.log('3. Click "Add document"');
console.log('4. Use auto-generated ID');
console.log('5. Add these fields:');
console.log('   - practice_id: "practice1"');
console.log('   - first_name: "Adam"');
console.log('   - last_initial: "R"');
console.log('   - phone_e164: "+18013101121"');
console.log('   - procedure_type: "Rhinoplasty"');
console.log('   - surgery_date: "2025-09-22"');
console.log('   - timezone: "America/Denver"');
console.log('   - status: "active"');
console.log('   - created_at: (timestamp) now');
console.log('   - updated_at: (timestamp) now');