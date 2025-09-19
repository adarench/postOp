import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { twilioWebhook } from './webhooks/twilio';
import { twilioStatusCallback as statusHandler } from './webhooks/twilio-status';
import { dailyCheckInScheduler } from './schedulers/daily-checkin';
import { patientAPI } from './api/patients';
import { triageAPI } from './api/triage';
import { exportAPI } from './api/export';
import { adminAPI } from './api/admin';

// Initialize Firebase Admin
admin.initializeApp();

// Webhook handlers
export const twilioSMSWebhook = functions.https.onRequest(twilioWebhook);
export const twilioStatusCallback = functions.https.onRequest(statusHandler);

// Scheduled functions
export const sendDailyCheckIns = functions.pubsub
  .schedule('0 9 * * *') // Run at 9 AM every day
  .timeZone('America/New_York') // Adjust based on practice timezone
  .onRun(dailyCheckInScheduler);

// API endpoints
export const api = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  const path = req.path;

  try {
    // Route to appropriate handler
    if (path.startsWith('/admin')) {
      await adminAPI(req, res);
    } else if (path.startsWith('/patients')) {
      await patientAPI(req, res);
    } else if (path.startsWith('/triage')) {
      await triageAPI(req, res);
    } else if (path.startsWith('/export')) {
      await exportAPI(req, res);
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export types for use in frontend
export * from './types';