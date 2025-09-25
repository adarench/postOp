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

export interface Conversation {
  id: string;
  patient_id: string;
  thread_sid?: string; // Twilio conversation thread ID
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_at: string;
  status: 'active' | 'resolved' | 'escalated';
}

export interface Message {
  id: string;
  conversation_id: string;
  patient_id: string; // Denormalized for easier querying
  direction: 'inbound' | 'outbound';
  content: string;
  message_sid: string;
  timestamp: string;
  message_type: 'daily_checkin' | 'checkin_response' | 'auto_reply' | 'staff_reply' | 'followup' | 'escalation';
  metadata?: {
    pain_score?: number;
    bleeding?: boolean;
    triage_level?: number;
    staff_user_id?: string;
    response_id?: string; // Link to Response document
    checkin_day?: number;
  };
  processed: boolean; // Whether this message has been analyzed for triage
}

export interface RiskScore {
  overall_score: number; // 0-100 composite risk score
  pain_risk: number;
  bleeding_risk: number;
  infection_risk: number;
  complications_risk: number;
  trend_risk: number; // Based on progression over time
  flags: string[];
  confidence: number; // 0-1, how confident we are in the scoring
  computed_at: string;
}

export interface TwilioSMSWebhookBody {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
}