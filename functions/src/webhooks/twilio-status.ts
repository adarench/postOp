import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { redactForLogs } from '../utils/redact';

export async function twilioStatusCallback(req: Request, res: Response): Promise<void> {
  const { MessageSid, MessageStatus, ErrorCode, To, From } = req.body;

  try {
    const db = admin.firestore();

    // Store delivery event with redacted PII
    const redactedTo = redactForLogs(To || '', '').phone;
    const redactedFrom = redactForLogs(From || '', '').phone;

    await db.collection('deliveryEvents').add({
      messageSid: MessageSid,
      status: MessageStatus,
      errorCode: ErrorCode || null,
      to: redactedTo,
      from: redactedFrom,
      timestamp: admin.firestore.Timestamp.now()
    });

    console.log(`Delivery status: ${MessageSid} -> ${MessageStatus}${ErrorCode ? ` (Error: ${ErrorCode})` : ''}`);

    res.status(200).send('OK');

  } catch (error) {
    console.error('Status callback error:', error);
    res.status(500).send('Error');
  }
}