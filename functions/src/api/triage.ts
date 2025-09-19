import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

export async function triageAPI(req: Request, res: Response): Promise<void> {
  const method = req.method;
  const path = req.path;

  // Simple auth check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    if (method === 'GET' && path === '/triage/metrics') {
      await getDashboardMetrics(req, res);
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('Triage API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getDashboardMetrics(req: Request, res: Response) {
  const practiceId = 'practice1'; // TODO: Get from auth token
  const db = admin.firestore();

  try {
    // Get all active patients
    const patientsSnapshot = await db.collection('patients')
      .where('practice_id', '==', practiceId)
      .where('status', '==', 'active')
      .get();

    const totalPatients = patientsSnapshot.size;
    let redCount = 0;
    let yellowCount = 0;
    let greenCount = 0;
    let responsesReceived = 0;

    for (const patientDoc of patientsSnapshot.docs) {
      const patientId = patientDoc.id;

      // Get latest triage for each patient
      const latestResponseSnapshot = await db.collection('responses')
        .where('patient_id', '==', patientId)
        .orderBy('received_at', 'desc')
        .limit(1)
        .get();

      if (!latestResponseSnapshot.empty) {
        responsesReceived++;

        const responseId = latestResponseSnapshot.docs[0].id;
        const triageSnapshot = await db.collection('triage')
          .where('response_id', '==', responseId)
          .limit(1)
          .get();

        if (!triageSnapshot.empty) {
          const triage = triageSnapshot.docs[0].data();
          if (triage.risk_level >= 3) {
            redCount++;
          } else if (triage.risk_level >= 2) {
            yellowCount++;
          } else {
            greenCount++;
          }
        } else {
          greenCount++; // No triage means routine
        }
      } else {
        // No response yet - count as green but affects response rate
        greenCount++;
      }
    }

    const metrics = {
      red_count: redCount,
      yellow_count: yellowCount,
      green_count: greenCount,
      total_patients: totalPatients,
      response_rate: totalPatients > 0 ? responsesReceived / totalPatients : 0
    };

    res.json({ success: true, data: metrics });

  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
}