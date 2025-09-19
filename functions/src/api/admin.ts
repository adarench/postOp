import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { sendSMS } from '../services/twilio';
import { redactForLogs } from '../utils/redact';

// Simple auth check - in production use proper JWT validation
function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  // For MVP, accept any bearer token - in production validate JWT and check roles
  return true;
}

export async function adminAPI(req: Request, res: Response): Promise<void> {
  const method = req.method;
  const path = req.path;

  // Auth check
  if (!isAuthorized(req)) {
    res.status(403).json({ ok: false, error: 'Unauthorized - staff/manager role required' });
    return;
  }

  try {
    if (method === 'POST' && path === '/admin/test-send') {
      await handleTestSend(req, res);
    } else if (method === 'POST' && path === '/admin/force-checkin') {
      await handleForceCheckin(req, res);
    } else if (method === 'POST' && path === '/admin/toggle-scheduler') {
      await handleToggleScheduler(req, res);
    } else if (method === 'GET' && path === '/admin/health') {
      await handleHealth(req, res);
    } else {
      res.status(404).json({ ok: false, error: 'Admin endpoint not found' });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleTestSend(req: Request, res: Response) {
  const { to, kind, body } = req.body;

  if (!to || !kind) {
    res.status(400).json({ ok: false, error: 'Missing required fields: to, kind' });
    return;
  }

  // Validate E.164 format
  if (!to.match(/^\+1[0-9]{10}$/)) {
    res.status(400).json({ ok: false, error: 'Invalid phone format - use E.164 (+1XXXXXXXXXX)' });
    return;
  }

  let message: string;

  try {
    switch (kind) {
      case 'welcome':
        message = `Hi! Welcome to Post-Op Radar. We'll check in daily to monitor your recovery. Reply HELP for assistance, STOP to opt out.`;
        break;
      case 'checkin':
        message = `Daily check-in. Please reply with:

1. Pain level 0-10?
2. Any new bleeding/swelling? (YES/NO)
3. Any concerns?

You can reply with all answers in one message.`;
        break;
      case 'custom':
        if (!body) {
          res.status(400).json({ ok: false, error: 'Custom messages require body field' });
          return;
        }
        message = body;
        break;
      default:
        res.status(400).json({ ok: false, error: 'Invalid kind - use welcome|checkin|custom' });
        return;
    }

    // Send SMS using existing service
    const messageSid = await sendSMS({
      to: to,
      message: message
    });

    // Log lightweight audit (no PHI)
    const db = admin.firestore();
    const redacted = redactForLogs(to, message);
    await db.collection('adminEvents').add({
      ts: admin.firestore.Timestamp.now(),
      userId: 'admin-test', // In production, get from JWT
      kind: 'test-send',
      to: redacted.phone,
      sid: messageSid,
      messageType: kind
    });

    console.log(`Admin test SMS sent: ${kind} to ${redacted.phone}, SID: ${messageSid}`);

    res.json({
      ok: true,
      sid: messageSid,
      kind,
      to: redacted.phone // Return masked number
    });

  } catch (error) {
    console.error(`Admin test send failed:`, error);
    res.status(500).json({ ok: false, error: 'Failed to send SMS' });
  }
}

async function handleForceCheckin(req: Request, res: Response) {
  const { patientId } = req.body;

  if (!patientId) {
    res.status(400).json({ ok: false, error: 'Missing required field: patientId' });
    return;
  }

  const db = admin.firestore();

  try {
    // Get patient data
    const patientDoc = await db.collection('patients').doc(patientId).get();
    if (!patientDoc.exists) {
      res.status(404).json({ ok: false, error: 'Patient not found' });
      return;
    }

    const patient = patientDoc.data()!;
    const now = new Date();
    const surgeryDate = new Date(patient.surgery_date);
    const daysSinceSurgery = Math.floor((now.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24));

    // Use same logic as daily scheduler
    await sendDailyCheckIn(patientId, patient, daysSinceSurgery);

    // Log admin action
    await db.collection('adminEvents').add({
      ts: admin.firestore.Timestamp.now(),
      userId: 'admin-test',
      kind: 'force-checkin',
      patientId: patientId,
      dayIndex: daysSinceSurgery
    });

    console.log(`Admin forced check-in for patient ${patientId} (Day ${daysSinceSurgery})`);

    res.json({
      ok: true,
      patientId,
      dayIndex: daysSinceSurgery,
      message: `Check-in sent to ${patient.first_name} ${patient.last_initial}.`
    });

  } catch (error) {
    console.error(`Admin force check-in failed:`, error);
    res.status(500).json({ ok: false, error: 'Failed to send check-in' });
  }
}

// Extracted from daily-checkin.ts to reuse exact same logic
async function sendDailyCheckIn(patientId: string, patient: any, dayIndex: number) {
  const db = admin.firestore();

  try {
    // Create check-in schedule record
    const checkinRef = await db.collection('checkin_schedule').add({
      patient_id: patientId,
      day_index: dayIndex,
      send_at_local: '09:00',
      channel: 'sms',
      sent_at: admin.firestore.Timestamp.now()
    });

    // Generate the daily check-in message (same as production)
    const message = generateDailyCheckInMessage(patient.first_name, dayIndex);

    // Send SMS
    const messageSid = await sendSMS({
      to: patient.phone_e164,
      message: message
    });

    // Update check-in record with completion
    await checkinRef.update({
      completed_at: admin.firestore.Timestamp.now(),
      message_sid: messageSid
    });

    // Log audit event
    await db.collection('audit_events').add({
      actor: 'system',
      entity: 'checkin',
      entity_id: checkinRef.id,
      event: 'daily_checkin_sent',
      timestamp: admin.firestore.Timestamp.now(),
      meta: {
        patient_id: patientId,
        day_index: dayIndex,
        message_sid: messageSid
      }
    });

    console.log(`Daily check-in sent to ${patient.first_name} (Day ${dayIndex})`);

  } catch (error) {
    console.error(`Failed to send daily check-in to patient ${patientId}:`, error);
    throw error;
  }
}

function generateDailyCheckInMessage(firstName: string, dayIndex: number): string {
  // Welcome message for Day 0
  if (dayIndex === 0) {
    return `Hi ${firstName}! I'm your recovery companion. Each day I'll ask 3 quick questions to help monitor your healing. Let's start:

1. Pain level 0-10?
2. Any new bleeding/swelling? (YES/NO)
3. Any concerns?

Reply STOP to opt out anytime.`;
  }

  // Regular daily check-ins
  const daySpecificIntro = getDaySpecificIntro(dayIndex);

  return `Hi ${firstName}! Day ${dayIndex} check-in. ${daySpecificIntro}

1. Pain level 0-10?
2. Any new bleeding/swelling? (YES/NO)
3. Any concerns?

You can reply with all answers in one message or separately.`;
}

function getDaySpecificIntro(dayIndex: number): string {
  const intros = {
    1: 'Hope you rested well.',
    2: 'Some swelling is normal today.',
    3: 'Peak swelling typically occurs around now.',
    4: 'You should start feeling a bit better.',
    5: 'Most patients see improvement by now.',
    6: 'Almost one week - great progress!',
    7: 'One week milestone reached!',
    10: 'You\'re doing great - keep it up!',
    14: 'Final check-in - congratulations on your recovery!'
  };

  return intros[dayIndex as keyof typeof intros] || 'How are you feeling today?';
}

async function handleToggleScheduler(req: Request, res: Response) {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    res.status(400).json({ ok: false, error: 'Missing required field: enabled (boolean)' });
    return;
  }

  try {
    // Note: This only logs the request - actual config changes require Firebase CLI
    const db = admin.firestore();
    await db.collection('adminEvents').add({
      ts: admin.firestore.Timestamp.now(),
      userId: 'admin-test',
      kind: 'toggle-scheduler',
      enabled: enabled
    });

    console.log(`Admin requested scheduler toggle: ${enabled}`);

    res.json({
      ok: true,
      message: `Scheduler toggle requested: ${enabled}. Use Firebase CLI to persist: firebase functions:config:set scheduler.enabled="${enabled}"`
    });

  } catch (error) {
    console.error('Admin toggle scheduler failed:', error);
    res.status(500).json({ ok: false, error: 'Failed to toggle scheduler' });
  }
}

async function handleHealth(req: Request, res: Response) {
  try {
    const twilioConfig = functions.config().twilio;
    const twilioConfigured = !!(
      twilioConfig?.account_sid &&
      twilioConfig?.auth_token &&
      twilioConfig?.phone_number
    );

    const schedulerConfig = functions.config().scheduler;
    const schedulerEnabled = schedulerConfig?.enabled !== 'false';

    const demoConfig = functions.config().demo;
    const demoEnabled = demoConfig?.enabled === 'true';

    res.json({
      ok: true,
      version: '1.0.0',
      time: new Date().toISOString(),
      twilioConfigured,
      schedulerEnabled,
      demoMode: demoEnabled,
      environment: process.env.NODE_ENV || 'unknown'
    });

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ ok: false, error: 'Health check failed' });
  }
}