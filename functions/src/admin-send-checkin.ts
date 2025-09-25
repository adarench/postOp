import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { sendSMS } from './services/twilio';

export async function sendTestCheckin(req: Request, res: Response) {
  try {
    const db = admin.firestore();

    // Find the patient we added (you)
    const patientQuery = await db.collection('patients')
      .where('phone_e164', '==', '+18013101121')
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (patientQuery.empty) {
      res.json({ success: false, error: 'Patient not found' });
      return;
    }

    const patient = patientQuery.docs[0].data();
    const patientId = patientQuery.docs[0].id;

    // Calculate current day post-op
    const surgeryDate = new Date(patient.surgery_date);
    const today = new Date();
    const daysPostOp = Math.floor((today.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`Sending Day ${daysPostOp} check-in to ${patient.first_name}`);

    // Generate check-in message
    const message = generateDailyCheckInMessage(patient.first_name, daysPostOp);

    // Send SMS
    const smsResult = await sendSMS({
      to: patient.phone_e164,
      message: message
    });

    // Log the check-in
    await db.collection('checkin_schedule').add({
      patient_id: patientId,
      day_index: daysPostOp,
      send_at_local: new Date().toLocaleTimeString(),
      channel: 'sms',
      sent_at: admin.firestore.Timestamp.now(),
      completed_at: admin.firestore.Timestamp.now(),
      message_sid: smsResult.messageSid,
      manual_trigger: true
    });

    res.json({
      success: true,
      message: 'Check-in sent successfully',
      patient: `${patient.first_name} ${patient.last_initial}`,
      day_post_op: daysPostOp,
      sms_sid: smsResult.messageSid,
      check_in_message: message
    });

  } catch (error) {
    console.error('Error sending test check-in:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
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