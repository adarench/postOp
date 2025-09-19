import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { sendSMS, validateTwilioWebhook } from '../services/twilio';
import { TwilioSMSWebhookBody } from '../types';

export async function twilioWebhook(req: Request, res: Response) {
  console.log('Received Twilio webhook:', req.body);

  const db = admin.firestore();

  try {
    // Validate Twilio webhook signature
    const signature = req.get('X-Twilio-Signature') || '';
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    if (!validateTwilioWebhook(signature, url, req.body)) {
      console.warn('Invalid Twilio webhook signature');
      res.status(401).send('Unauthorized');
      return;
    }

    const webhookData: TwilioSMSWebhookBody = req.body;
    const { From: fromPhone, Body: messageBody, MessageSid } = webhookData;

    // Find patient by phone number
    const patientsQuery = await db.collection('patients')
      .where('phone_e164', '==', fromPhone)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (patientsQuery.empty) {
      console.log(`No active patient found for phone ${fromPhone}`);
      // Send a polite response
      await sendSMS({
        to: fromPhone,
        message: 'Thank you for your message. We don\'t have an active monitoring program for this number. Please contact your clinic directly if you need assistance.'
      });
      res.status(200).send('OK');
      return;
    }

    const patientDoc = patientsQuery.docs[0];
    const patient = patientDoc.data();
    const patientId = patientDoc.id;

    // Calculate days post-op
    const surgeryDate = new Date(patient.surgery_date);
    const today = new Date();
    const daysPostOp = Math.floor((today.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`Processing response for patient ${patient.first_name} (Day ${daysPostOp})`);

    // Parse the message body to extract structured data
    const responseData = parsePatientResponse(messageBody, daysPostOp);

    // Store the response
    const responseRef = await db.collection('responses').add({
      patient_id: patientId,
      checkin_day: daysPostOp,
      received_at: admin.firestore.Timestamp.now(),
      pain_score: responseData.painScore,
      bleeding: responseData.bleeding,
      concerns_text: responseData.concerns,
      message_sid: MessageSid
    });

    // Run triage analysis
    const triageResult = await runTriageAnalysis({
      id: responseRef.id,
      patient_id: patientId,
      checkin_day: daysPostOp,
      received_at: new Date().toISOString(),
      pain_score: responseData.painScore,
      bleeding: responseData.bleeding,
      concerns_text: responseData.concerns
    });

    // Store triage results
    await db.collection('triage').add({
      response_id: responseRef.id,
      risk_level: triageResult.risk_level,
      flags: triageResult.flags,
      reasons: triageResult.reasons,
      computed_at: admin.firestore.Timestamp.now()
    });

    // Generate and send auto-reply
    const autoReply = generateAutoReply(triageResult, daysPostOp, patient.first_name);
    await sendSMS({
      to: fromPhone,
      message: autoReply
    });

    // Log audit event
    await db.collection('audit_events').add({
      actor: 'system',
      entity: 'response',
      entity_id: responseRef.id,
      event: 'patient_response_processed',
      timestamp: admin.firestore.Timestamp.now(),
      meta: {
        patient_id: patientId,
        risk_level: triageResult.risk_level,
        flags: triageResult.flags
      }
    });

    res.status(200).send('OK');

  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
    res.status(500).send('Internal Server Error');
  }
}

interface ParsedResponse {
  painScore?: number;
  bleeding: boolean | null;
  concerns?: string;
}

function parsePatientResponse(messageBody: string, dayIndex: number): ParsedResponse {
  const text = messageBody.toLowerCase().trim();
  const result: ParsedResponse = {
    bleeding: null,
    concerns: text
  };

  // Try to extract pain score (0-10)
  const painMatch = text.match(/(?:pain|hurt|sore).{0,20}(\d+)/i) || text.match(/^(\d+)/);
  if (painMatch) {
    const score = parseInt(painMatch[1]);
    if (score >= 0 && score <= 10) {
      result.painScore = score;
    }
  }

  // Check for bleeding indicators
  if (/\b(yes|bleeding|blood|bleed)\b/i.test(text)) {
    result.bleeding = true;
  } else if (/\b(no|none|not bleeding)\b/i.test(text)) {
    result.bleeding = false;
  }

  return result;
}

// Import triage logic from shared library
function runTriageAnalysis(response: any) {
  const flags: string[] = [];
  let riskLevel: 0 | 1 | 2 | 3 = 0;
  const reasons: string[] = [];

  // Check pain score
  if (response.pain_score !== null && response.pain_score !== undefined) {
    if (response.pain_score >= 9) {
      riskLevel = Math.max(riskLevel, 3) as 0 | 1 | 2 | 3;
      flags.push('PAIN_HIGH');
      reasons.push(`Severe pain reported (${response.pain_score}/10)`);
    } else if (response.pain_score >= 7 && response.pain_score <= 8) {
      riskLevel = Math.max(riskLevel, 2) as 0 | 1 | 2 | 3;
      flags.push('PAIN_MODERATE');
      reasons.push(`Moderate pain reported (${response.pain_score}/10)`);
    }
  }

  // Check bleeding
  if (response.bleeding === true) {
    flags.push('BLEEDING_YES');
    riskLevel = Math.max(riskLevel, 1) as 0 | 1 | 2 | 3;
    reasons.push('Patient reports bleeding');
  }

  // Analyze concerns text for keywords
  const concernsText = (response.concerns_text || '').toLowerCase();

  // Red flag keywords
  const redFlags = ['heavy bleeding', 'soaked bandage', 'fever', 'hot', 'burning up', 'infection', 'pus'];
  redFlags.forEach(keyword => {
    if (concernsText.includes(keyword)) {
      riskLevel = Math.max(riskLevel, 3) as 0 | 1 | 2 | 3;
      flags.push('CONCERNING_SYMPTOMS');
      reasons.push(`Red flag keyword: "${keyword}"`);
    }
  });

  // Yellow flag keywords
  const yellowFlags = ['swelling worse', 'more swollen', 'light bleeding', 'spotting'];
  yellowFlags.forEach(keyword => {
    if (concernsText.includes(keyword)) {
      riskLevel = Math.max(riskLevel, 2) as 0 | 1 | 2 | 3;
      flags.push('NEEDS_REVIEW');
      reasons.push(`Yellow flag keyword: "${keyword}"`);
    }
  });

  return {
    risk_level: riskLevel,
    flags,
    reasons: reasons.join('; '),
    computed_at: new Date().toISOString()
  };
}

function generateAutoReply(triage: any, dayIndex: number, firstName: string): string {
  const { risk_level, flags } = triage;

  if (risk_level === 3) {
    let message = `Hi ${firstName}, thank you for the update. `;

    if (flags.includes('PAIN_HIGH')) {
      message += 'Severe pain may need prompt attention. ';
    }

    message += 'Our team has been alerted and will review shortly. If symptoms worsen or you feel unsafe, go to the ER immediately.';
    return message;
  }

  if (risk_level === 2) {
    let message = `Hi ${firstName}, thank you for the update. `;

    if (flags.includes('PAIN_MODERATE')) {
      message += `Moderate pain on Day ${dayIndex + 1} can be normal. Follow your medication schedule and ice 20 min on/20 min off. `;
    }

    message += 'Our nurse will review your update today and may follow up.';
    return message;
  }

  // Green - routine
  const tips = {
    0: 'Focus on rest today. Keep head elevated and ice 20 min on/20 min off.',
    1: 'Some swelling and discomfort is normal. Stay hydrated and follow your medication schedule.',
    2: 'Peak swelling often occurs around Day 2-3. Continue icing and keep head elevated.',
    3: 'Swelling should start to improve. Gentle walks are good but avoid strenuous activity.',
  };

  const tip = tips[dayIndex as keyof typeof tips] || 'Continue following your post-op instructions.';
  return `Hi ${firstName}, thanks for the update! This sounds typical for Day ${dayIndex + 1}. ${tip}`;
}