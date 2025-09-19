import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

export async function exportAPI(req: Request, res: Response): Promise<void> {
  const method = req.method;
  const path = req.path;

  // Simple auth check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    if (method === 'GET' && path === '/export/csv') {
      await exportCSV(req, res);
    } else if (method === 'GET' && path === '/export/pilot-summary') {
      await exportPilotSummary(req, res);
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('Export API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function exportCSV(req: Request, res: Response) {
  const { start_date, end_date } = req.query;
  const db = admin.firestore();

  try {
    // Get all responses in date range
    let query: admin.firestore.Query = db.collection('responses');

    if (start_date) {
      query = query.where('received_at', '>=', admin.firestore.Timestamp.fromDate(new Date(start_date as string)));
    }
    if (end_date) {
      query = query.where('received_at', '<=', admin.firestore.Timestamp.fromDate(new Date(end_date as string)));
    }

    const responsesSnapshot = await query.orderBy('received_at', 'desc').get();

    // Build CSV data
    const csvRows = [];
    csvRows.push([
      'patient_id',
      'patient_name',
      'procedure_type',
      'day_post_op',
      'pain_score',
      'bleeding',
      'concerns',
      'risk_level',
      'flags',
      'timestamp',
      'staff_action_taken'
    ]);

    for (const responseDoc of responsesSnapshot.docs) {
      const response = responseDoc.data();

      // Get patient info
      const patientDoc = await db.collection('patients').doc(response.patient_id).get();
      const patient = patientDoc.exists ? patientDoc.data() : null;

      // Get triage info
      const triageSnapshot = await db.collection('triage')
        .where('response_id', '==', responseDoc.id)
        .limit(1)
        .get();

      const triage = !triageSnapshot.empty ? triageSnapshot.docs[0].data() : null;

      // Get staff actions
      const actionsSnapshot = await db.collection('staff_actions')
        .where('response_id', '==', responseDoc.id)
        .get();

      const actions = actionsSnapshot.docs.map(doc => doc.data().action_type).join(';');

      csvRows.push([
        response.patient_id,
        patient ? `${patient.first_name} ${patient.last_initial}.` : 'Unknown',
        patient?.procedure_type || '',
        response.checkin_day,
        response.pain_score || '',
        response.bleeding === true ? 'Yes' : response.bleeding === false ? 'No' : '',
        response.concerns_text || '',
        triage?.risk_level || '0',
        triage?.flags?.join(';') || '',
        new Date(response.received_at.seconds * 1000).toISOString(),
        actions
      ]);
    }

    // Convert to CSV string
    const csvContent = csvRows.map(row =>
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="post-op-data.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ success: false, error: 'Failed to export data' });
  }
}

async function exportPilotSummary(req: Request, res: Response) {
  const db = admin.firestore();

  try {
    // Get pilot metrics
    const patientsSnapshot = await db.collection('patients')
      .where('status', '==', 'active')
      .get();

    const totalPatients = patientsSnapshot.size;

    // Count responses by risk level
    let totalResponses = 0;
    let redAlerts = 0;
    let yellowAlerts = 0;
    let greenResponses = 0;

    const responsesSnapshot = await db.collection('responses').get();
    for (const responseDoc of responsesSnapshot.docs) {
      totalResponses++;

      const triageSnapshot = await db.collection('triage')
        .where('response_id', '==', responseDoc.id)
        .limit(1)
        .get();

      if (!triageSnapshot.empty) {
        const triage = triageSnapshot.docs[0].data();
        if (triage.risk_level >= 3) redAlerts++;
        else if (triage.risk_level >= 2) yellowAlerts++;
        else greenResponses++;
      } else {
        greenResponses++;
      }
    }

    // Count staff actions
    const actionsSnapshot = await db.collection('staff_actions').get();
    const staffActions = actionsSnapshot.size;

    const summary = {
      pilot_period: '30 days', // TODO: Calculate actual period
      total_patients: totalPatients,
      total_responses: totalResponses,
      response_rate: totalPatients > 0 ? (totalResponses / (totalPatients * 14)).toFixed(2) : '0.00', // Assuming 14-day monitoring
      red_alerts: redAlerts,
      yellow_alerts: yellowAlerts,
      green_responses: greenResponses,
      staff_actions_taken: staffActions,
      estimated_calls_avoided: Math.floor(greenResponses * 0.3), // 30% of green responses might have called
      early_escalations: redAlerts,
      satisfaction_score: 'TBD' // Would need survey data
    };

    res.json({ success: true, data: summary });

  } catch (error) {
    console.error('Error generating pilot summary:', error);
    res.status(500).json({ success: false, error: 'Failed to generate summary' });
  }
}