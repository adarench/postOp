import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

export async function patientAPI(req: Request, res: Response): Promise<void> {
  const method = req.method;
  const path = req.path;

  // Simple auth check - in production, use proper JWT validation
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    if (method === 'GET' && path === '/patients') {
      await getPatients(req, res);
    } else if (method === 'POST' && path === '/patients/bulk-create') {
      await bulkCreatePatients(req, res);
    } else if (method === 'GET' && path.startsWith('/patients/') && path.includes('/timeline')) {
      await getPatientTimeline(req, res);
    } else if (method === 'POST' && path.includes('/actions')) {
      await handleStaffAction(req, res);
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('Patient API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPatients(req: Request, res: Response) {
  const { risk, search } = req.query;
  const practiceId = 'practice1'; // TODO: Get from auth token
  const db = admin.firestore();

  try {
    let query = db.collection('patients')
      .where('practice_id', '==', practiceId)
      .where('status', '==', 'active');

    const patientsSnapshot = await query.get();
    const patients: any[] = [];

    for (const doc of patientsSnapshot.docs) {
      const patientData = doc.data();
      const patientId = doc.id;

      // Get latest response and triage
      const latestResponseSnapshot = await db.collection('responses')
        .where('patient_id', '==', patientId)
        .orderBy('received_at', 'desc')
        .limit(1)
        .get();

      let latestResponse = null;
      let latestTriage = null;

      if (!latestResponseSnapshot.empty) {
        latestResponse = latestResponseSnapshot.docs[0].data();

        // Get triage for this response
        const triageSnapshot = await db.collection('triage')
          .where('response_id', '==', latestResponseSnapshot.docs[0].id)
          .limit(1)
          .get();

        if (!triageSnapshot.empty) {
          latestTriage = triageSnapshot.docs[0].data();
        }
      }

      // Calculate days post-op
      const surgeryDate = new Date(patientData.surgery_date);
      const today = new Date();
      const daysPostOp = Math.floor((today.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determine risk level
      let riskLevel = 'green';
      if (latestTriage) {
        if (latestTriage.risk_level >= 3) riskLevel = 'red';
        else if (latestTriage.risk_level >= 2) riskLevel = 'yellow';
      }

      const patientSummary = {
        id: patientId,
        ...patientData,
        latest_response: latestResponse,
        latest_triage: latestTriage,
        risk_level: riskLevel,
        flags: latestTriage?.flags || [],
        days_post_op: daysPostOp
      };

      // Apply filters
      if (risk && risk !== 'all' && riskLevel !== risk) continue;

      if (search) {
        const searchTerm = search.toString().toLowerCase();
        if (!patientData.first_name.toLowerCase().includes(searchTerm) &&
            !patientData.last_initial.toLowerCase().includes(searchTerm) &&
            !patientData.phone_e164.includes(searchTerm.replace(/\D/g, ''))) {
          continue;
        }
      }

      patients.push(patientSummary);
    }

    res.json({ success: true, data: patients });

  } catch (error) {
    console.error('Error getting patients:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patients' });
  }
}

async function bulkCreatePatients(req: Request, res: Response) {
  const { patients, procedureType, checkInTime, timezone, duration } = req.body;
  const practiceId = 'practice1'; // TODO: Get from auth token
  const db = admin.firestore();

  try {
    const batch = db.batch();
    const createdPatients = [];

    for (const patientData of patients) {
      // Format phone number
      const phone = formatPhoneNumber(patientData.phone);

      const patientRef = db.collection('patients').doc();
      const patient = {
        practice_id: practiceId,
        first_name: patientData.first_name,
        last_initial: patientData.last_initial,
        phone_e164: phone,
        procedure_type: procedureType,
        surgery_date: patientData.surgery_date,
        timezone: timezone,
        status: 'active',
        created_at: admin.firestore.Timestamp.now(),
        updated_at: admin.firestore.Timestamp.now()
      };

      batch.set(patientRef, patient);
      createdPatients.push({ id: patientRef.id, ...patient });

      // Create check-in schedule for each day
      for (let dayIndex = 0; dayIndex < duration; dayIndex++) {
        const scheduleRef = db.collection('checkin_schedule').doc();
        const schedule = {
          patient_id: patientRef.id,
          day_index: dayIndex,
          send_at_local: checkInTime,
          channel: 'sms'
        };
        batch.set(scheduleRef, schedule);
      }
    }

    await batch.commit();

    // Log audit event
    await db.collection('audit_events').add({
      actor: 'system', // TODO: Get user ID from auth
      entity: 'patients',
      entity_id: 'bulk_create',
      event: 'bulk_patient_creation',
      timestamp: admin.firestore.Timestamp.now(),
      meta: {
        count: patients.length,
        procedure_type: procedureType
      }
    });

    res.json({
      success: true,
      data: {
        created_count: createdPatients.length,
        patients: createdPatients
      }
    });

  } catch (error) {
    console.error('Error creating patients:', error);
    res.status(500).json({ success: false, error: 'Failed to create patients' });
  }
}

async function getPatientTimeline(req: Request, res: Response) {
  const patientId = req.path.split('/')[2];
  const db = admin.firestore();

  try {
    // Get all responses for this patient
    const responsesSnapshot = await db.collection('responses')
      .where('patient_id', '==', patientId)
      .orderBy('received_at', 'desc')
      .get();

    const timeline = [];

    for (const responseDoc of responsesSnapshot.docs) {
      const response = responseDoc.data();

      // Get triage for this response
      const triageSnapshot = await db.collection('triage')
        .where('response_id', '==', responseDoc.id)
        .limit(1)
        .get();

      let triage = null;
      if (!triageSnapshot.empty) {
        triage = triageSnapshot.docs[0].data();
      }

      timeline.push({
        id: responseDoc.id,
        type: 'response',
        ...response,
        triage
      });
    }

    // Get staff actions for this patient
    const actionsSnapshot = await db.collection('staff_actions')
      .where('patient_id', '==', patientId)
      .orderBy('created_at', 'desc')
      .get();

    actionsSnapshot.forEach(doc => {
      timeline.push({
        id: doc.id,
        type: 'staff_action',
        ...doc.data()
      });
    });

    // Sort by timestamp
    timeline.sort((a, b) => {
      const aTime = (a as any).received_at || (a as any).created_at;
      const bTime = (b as any).received_at || (b as any).created_at;
      if (aTime && bTime) {
        return new Date(bTime.seconds * 1000).getTime() - new Date(aTime.seconds * 1000).getTime();
      }
      return 0;
    });

    res.json({ success: true, data: timeline });

  } catch (error) {
    console.error('Error getting patient timeline:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch timeline' });
  }
}

async function handleStaffAction(req: Request, res: Response) {
  const patientId = req.path.split('/')[2];
  const { action_type, payload, note } = req.body;
  const userId = 'staff1'; // TODO: Get from auth token
  const db = admin.firestore();

  try {
    // Log staff action
    const actionRef = await db.collection('staff_actions').add({
      patient_id: patientId,
      user_id: userId,
      action_type,
      payload,
      note: note || '',
      created_at: admin.firestore.Timestamp.now()
    });

    // Handle specific actions
    if (action_type === 'reply_template') {
      await handleTemplateReply(patientId, payload);
    } else if (action_type === 'request_photo') {
      await handlePhotoRequest(patientId);
    } else if (action_type === 'escalate') {
      await handleEscalation(patientId, payload);
    }

    // Log audit event
    await db.collection('audit_events').add({
      actor: userId,
      entity: 'staff_action',
      entity_id: actionRef.id,
      event: `staff_action_${action_type}`,
      timestamp: admin.firestore.Timestamp.now(),
      meta: {
        patient_id: patientId,
        action_type,
        payload
      }
    });

    res.json({ success: true, data: { action_id: actionRef.id } });

  } catch (error) {
    console.error('Error handling staff action:', error);
    res.status(500).json({ success: false, error: 'Failed to process action' });
  }
}

async function handleTemplateReply(patientId: string, payload: any) {
  const db = admin.firestore();
  // Get patient phone number
  const patientDoc = await db.collection('patients').doc(patientId).get();
  if (!patientDoc.exists) throw new Error('Patient not found');

  const patient = patientDoc.data()!;

  // Send SMS using Twilio (imported from services/twilio)
  const { sendSMS } = require('../services/twilio');
  await sendSMS({
    to: patient.phone_e164,
    message: payload.message
  });
}

async function handlePhotoRequest(patientId: string) {
  const db = admin.firestore();
  const patientDoc = await db.collection('patients').doc(patientId).get();
  if (!patientDoc.exists) throw new Error('Patient not found');

  const patient = patientDoc.data()!;

  const message = `Hi ${patient.first_name}, could you please take a photo of your surgical site and send it to us? This will help us monitor your healing. Reply with the photo when convenient.`;

  const { sendSMS } = require('../services/twilio');
  await sendSMS({
    to: patient.phone_e164,
    message
  });
}

async function handleEscalation(patientId: string, payload: any) {
  // In a real implementation, this would:
  // 1. Send notifications to surgeons
  // 2. Create urgent tasks
  // 3. Update patient status

  console.log(`Escalating patient ${patientId}:`, payload);
}

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return phone; // Return as-is if format is unclear
}