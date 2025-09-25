import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

export async function addTestPatient(req: Request, res: Response) {
  try {
    const db = admin.firestore();

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

    // Verify the patient was added
    const testQuery = await db.collection('patients')
      .where('phone_e164', '==', '+18013101121')
      .where('status', '==', 'active')
      .get();

    if (!testQuery.empty) {
      res.json({
        success: true,
        message: 'Patient added successfully!',
        patient_id: patientRef.id,
        verification: {
          found: true,
          patient_data: testQuery.docs[0].data()
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Patient added but verification failed',
        patient_id: patientRef.id
      });
    }

  } catch (error) {
    console.error('Error adding test patient:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}