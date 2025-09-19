import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { sendSMS } from '../services/twilio';

export async function dailyCheckInScheduler(context: any) {
  console.log('Running daily check-in scheduler...');

  // Check if scheduler is enabled
  const schedulerEnabled = functions.config().scheduler?.enabled;
  if (schedulerEnabled === 'false') {
    console.log('Scheduler disabled via config - exiting');
    return;
  }

  const db = admin.firestore();

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get all active patients
    const patientsSnapshot = await db.collection('patients')
      .where('status', '==', 'active')
      .get();

    console.log(`Found ${patientsSnapshot.size} active patients`);

    const sendPromises: Promise<any>[] = [];

    patientsSnapshot.forEach(patientDoc => {
      const patient = patientDoc.data();
      const patientId = patientDoc.id;

      // Calculate days since surgery
      const surgeryDate = new Date(patient.surgery_date);
      const daysSinceSurgery = Math.floor((now.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only send check-ins for Days 0-14 post-op
      if (daysSinceSurgery >= 0 && daysSinceSurgery <= 14) {
        console.log(`Scheduling check-in for ${patient.first_name} (Day ${daysSinceSurgery})`);

        // Check if we already sent a check-in today
        const checkPromise = db.collection('checkin_schedule')
          .where('patient_id', '==', patientId)
          .where('day_index', '==', daysSinceSurgery)
          .where('sent_at', '>=', admin.firestore.Timestamp.fromDate(new Date(today)))
          .limit(1)
          .get()
          .then(async (existingCheckins) => {
            if (existingCheckins.empty) {
              // Send the daily check-in
              await sendDailyCheckIn(patientId, patient, daysSinceSurgery);
            } else {
              console.log(`Already sent check-in today for ${patient.first_name}`);
            }
          });

        sendPromises.push(checkPromise);
      }
    });

    await Promise.all(sendPromises);
    console.log('Daily check-in scheduler completed successfully');

  } catch (error) {
    console.error('Error in daily check-in scheduler:', error);
    throw error;
  }
}

async function sendDailyCheckIn(patientId: string, patient: any, dayIndex: number) {
  const db = admin.firestore();

  try {
    // Create check-in schedule record
    const checkinRef = await db.collection('checkin_schedule').add({
      patient_id: patientId,
      day_index: dayIndex,
      send_at_local: '09:00', // TODO: Make this configurable per practice
      channel: 'sms',
      sent_at: admin.firestore.Timestamp.now()
    });

    // Generate the daily check-in message
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

    // Log error event
    await db.collection('audit_events').add({
      actor: 'system',
      entity: 'checkin',
      entity_id: patientId,
      event: 'daily_checkin_failed',
      timestamp: admin.firestore.Timestamp.now(),
      meta: {
        patient_id: patientId,
        day_index: dayIndex,
        error: error instanceof Error ? error.message : String(error)
      }
    });
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