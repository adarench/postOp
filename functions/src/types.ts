// Shared types between frontend and backend
export interface Patient {
  id: string;
  practice_id: string;
  first_name: string;
  last_initial: string;
  phone_e164: string;
  procedure_type: string;
  surgery_date: string;
  timezone: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Response {
  id: string;
  patient_id: string;
  checkin_day: number;
  received_at: string;
  pain_score?: number;
  bleeding: boolean | null;
  concerns_text?: string;
  voice_url?: string;
  transcript_text?: string;
  asr_confidence?: number;
}

export interface Triage {
  id: string;
  response_id: string;
  risk_level: 0 | 1 | 2 | 3;
  flags: string[];
  reasons: string;
  computed_at: string;
}

export interface StaffAction {
  id: string;
  response_id: string;
  user_id: string;
  action_type: 'reply_template' | 'request_photo' | 'resolved' | 'escalate' | 'schedule_call';
  payload: Record<string, any>;
  created_at: string;
  note?: string;
}

export interface TwilioSMSWebhookBody {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
}