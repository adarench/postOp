import { Twilio } from 'twilio';
import * as functions from 'firebase-functions';
import { redactForLogs } from '../utils/redact';
const twilio = require('twilio');

let twilioClient: Twilio | null = null;

function getTwilioClient(): Twilio {
  if (!twilioClient) {
    const accountSid = functions.config().twilio?.account_sid;
    const authToken = functions.config().twilio?.auth_token;
    const apiKeySid = functions.config().twilio?.api_key_sid;

    if (!accountSid || !authToken) {
      console.warn('Twilio credentials not properly configured');
      throw new Error('Twilio not configured');
    }

    // Use API Key authentication if available, otherwise use auth token
    if (apiKeySid) {
      twilioClient = new Twilio(apiKeySid, authToken, { accountSid });
    } else {
      if (!accountSid.startsWith('AC')) {
        console.warn('Invalid account SID format');
        throw new Error('Invalid Twilio account SID');
      }
      twilioClient = new Twilio(accountSid, authToken);
    }
  }

  return twilioClient;
}

export interface SendSMSParams {
  to: string;
  message: string;
}

export async function sendSMS({ to, message }: SendSMSParams): Promise<{ messageSid: string }> {
  try {
    const client = getTwilioClient();
    const phoneNumber = functions.config().twilio?.phone_number;

    if (!phoneNumber) {
      throw new Error('Twilio phone number not configured');
    }

    // Apply demo mode routing if enabled
    const { finalTo, finalMessage } = applyDemoRouting(to, message);

    const result = await client.messages.create({
      from: phoneNumber,
      to: finalTo,
      body: finalMessage
    });

    // Log with redaction
    const redacted = redactForLogs(to, message);
    console.log(`SMS sent to ${redacted.phone}: ${redacted.body} (SID: ${result.sid})`);

    return { messageSid: result.sid };
  } catch (error) {
    const redacted = redactForLogs(to, message);
    console.error(`Failed to send SMS to ${redacted.phone}:`, error);
    throw error;
  }
}

function applyDemoRouting(to: string, message: string): { finalTo: string; finalMessage: string } {
  const demoConfig = functions.config().demo;

  // If demo mode not enabled, return original
  if (!demoConfig?.enabled || demoConfig.enabled !== 'true') {
    return { finalTo: to, finalMessage: message };
  }

  // Check if number is in allowlist
  const allowlist = demoConfig.test_allowlist?.split(',').map((n: string) => n.trim()) || [];
  if (allowlist.includes(to)) {
    return { finalTo: to, finalMessage: message };
  }

  // Route to demo number with prefix
  const routeTo = demoConfig.route_all_to;
  if (!routeTo) {
    console.warn('Demo mode enabled but no route_all_to configured');
    return { finalTo: to, finalMessage: message };
  }

  const redactedOriginal = redactForLogs(to, '').phone;
  const finalMessage = `[DEMO to:${redactedOriginal}] ${message}`;

  console.log(`Demo routing: ${redactedOriginal} → ${redactForLogs(routeTo, '').phone}`);

  return {
    finalTo: routeTo,
    finalMessage
  };
}

export function validateTwilioWebhook(signature: string, url: string, params: any): boolean {
  try {
    const webhookSecret = functions.config().twilio?.webhook_secret;
    if (!webhookSecret) {
      console.warn('Twilio webhook secret not configured');
      return false;
    }

    // Use Twilio's webhook validation
    return twilio.validateRequest(webhookSecret, signature, url, params);
  } catch (error) {
    console.error('Twilio webhook validation failed:', error);
    return false;
  }
}