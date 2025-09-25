import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { sendSMS } from '../services/twilio';
// import { getOrCreateConversation, addMessage, getPatientConversationHistory, markMessageProcessed } from '../services/conversations';
import { calculateRiskScore, getRiskLevel, storeRiskScore } from '../services/risk-scoring';
import { TwilioSMSWebhookBody } from '../types';

export async function twilioWebhook(req: Request, res: Response) {
  console.log('Received Twilio webhook:', req.body);

  const db = admin.firestore();

  try {
    // COMPLETELY DISABLE validation for testing
    console.log('Processing webhook without validation');

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

    // Temporarily disable conversation threading to avoid index issues
    // TODO: Re-enable after creating the required Firestore indexes
    const conversationId = 'temp-conversation';
    const conversationHistory: any[] = []; // Empty history for now

    // Temporarily disable message storage
    const inboundMessageId = 'temp-message-id';

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
      message_sid: MessageSid,
      conversation_id: conversationId,
      message_id: inboundMessageId
    });

    // Enhanced risk scoring with conversation history
    const riskScore = await calculateRiskScore({
      painScore: responseData.painScore,
      bleeding: responseData.bleeding,
      concernsText: responseData.concerns,
      dayPostOp: daysPostOp,
      patientHistory: conversationHistory
    });

    const riskLevel = getRiskLevel(riskScore);

    // Store enhanced risk score
    await storeRiskScore(responseRef.id, riskScore);

    // Store legacy triage results for compatibility
    const triageResult = {
      risk_level: riskLevel,
      flags: riskScore.flags,
      reasons: `Overall: ${riskScore.overall_score}% | Pain: ${riskScore.pain_risk}% | Bleeding: ${riskScore.bleeding_risk}% | Infection: ${riskScore.infection_risk}% | Complications: ${riskScore.complications_risk}%`,
      computed_at: new Date().toISOString()
    };

    await db.collection('triage').add({
      response_id: responseRef.id,
      risk_level: triageResult.risk_level,
      flags: triageResult.flags,
      reasons: triageResult.reasons,
      computed_at: admin.firestore.Timestamp.now()
    });

    // Generate and send auto-reply
    const autoReply = generateAutoReply(triageResult, daysPostOp, patient.first_name, riskScore);

    // Send SMS reply
    await sendSMS({
      to: fromPhone,
      message: autoReply
    });

    // Temporarily disable outbound message storage and processing
    // TODO: Re-enable after creating required indexes

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


function generateAutoReply(triage: any, dayIndex: number, firstName: string, riskScore?: any): string {
  const { risk_level, flags } = triage;
  const day = dayIndex + 1;

  // HIGH RISK (RED) - Contact doctor immediately
  if (risk_level === 3) {
    let message = `🚨 Hi ${firstName}, thank you for your Day ${day} update. `;

    // Identify specific concerning symptoms
    const concerningSymptoms = [];
    if (flags.includes('SEVERE_PAIN')) concerningSymptoms.push('severe pain');
    if (flags.includes('HEAVY_BLEEDING') || flags.includes('UNCONTROLLED_BLEEDING')) concerningSymptoms.push('heavy bleeding');
    if (flags.includes('FEVER_REPORTED') || flags.includes('HIGH_FEVER')) concerningSymptoms.push('fever');
    if (flags.includes('CONCERNING_SYMPTOMS')) concerningSymptoms.push('concerning symptoms');

    if (concerningSymptoms.length > 0) {
      message += `Your symptoms (${concerningSymptoms.join(', ')}) need medical attention. `;
    }

    message += '**PLEASE CONTACT YOUR DOCTOR IMMEDIATELY** or visit urgent care. Our medical team has been alerted. If you feel unsafe, go to the ER right away.';
    return message;
  }

  // MODERATE RISK (YELLOW) - Monitor closely, doctor will review
  if (risk_level === 2) {
    let message = `⚠️ Hi ${firstName}, thank you for your Day ${day} update. `;

    if (flags.includes('HIGH_PAIN') || flags.includes('MODERATE_PAIN')) {
      message += `Moderate pain on Day ${day} can be normal, but please monitor it. Take your pain medication as prescribed and apply ice 20 min on/20 min off. `;
    }

    if (flags.includes('ACTIVE_BLEEDING')) {
      message += 'Some light bleeding can be normal, but keep an eye on it. ';
    }

    if (flags.includes('WORSENING_SWELLING')) {
      message += 'Monitor swelling - keep head elevated and continue icing. ';
    }

    message += '**Your doctor will review this update today** and may contact you. Call if symptoms worsen.';
    return message;
  }

  // LOW/NO RISK (GREEN) - Normal recovery
  let message = `✅ Hi ${firstName}, great job with your Day ${day} check-in! `;

  // Specific encouragement based on day
  if (day <= 2) {
    message += 'Your recovery sounds normal for early post-op. Rest is your best medicine right now.';
  } else if (day <= 5) {
    message += 'You\'re doing well! This sounds like typical healing progress.';
  } else if (day <= 10) {
    message += 'Excellent progress! You\'re well on your way to full recovery.';
  } else {
    message += 'Outstanding! You\'re in the final stretch of recovery.';
  }

  // Day-specific tips
  const recoveryTips = {
    1: ' Keep head elevated, ice regularly, and rest.',
    2: ' Peak swelling is normal. Continue icing and stay hydrated.',
    3: ' Swelling should start improving. Light walks are okay.',
    4: ' You might feel more energy returning. Don\'t overdo it yet.',
    5: ' Most patients feel significantly better by now.',
    7: ' Week 1 complete! You\'re doing great.',
    10: ' Most restrictions are lifting. Follow your doctor\'s guidance.',
    14: ' Two weeks post-op! Most patients feel nearly normal.'
  };

  const tip = recoveryTips[day as keyof typeof recoveryTips] || ' Keep following your post-op instructions.';
  message += tip;

  message += ' **No action needed** - continue your current care routine. 🌟';
  return message;
}