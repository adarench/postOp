// Core data models for Post-Op Radar MVP

export interface Patient {
  id: string;
  practice_id: string;
  first_name: string;
  last_initial: string;
  phone_e164: string;
  procedure_type: string;
  surgery_date: string; // ISO date string
  timezone: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface CheckinSchedule {
  id: string;
  patient_id: string;
  day_index: number; // 0-14 for post-op days
  send_at_local: string; // HH:MM format
  channel: 'sms' | 'voice';
  sent_at?: string;
  completed_at?: string;
}

export interface Response {
  id: string;
  patient_id: string;
  checkin_day: number;
  received_at: string;
  pain_score?: number; // 0-10
  bleeding: boolean | null;
  concerns_text?: string;
  voice_url?: string;
  transcript_text?: string;
  asr_confidence?: number;
}

export interface Triage {
  id: string;
  response_id: string;
  risk_level: 0 | 1 | 2 | 3; // 0=routine, 1=mild, 2=review today, 3=urgent
  flags: string[]; // ["PAIN_HIGH", "BLEED_YES", "SWELL_UP", etc.]
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

export interface AuditEvent {
  id: string;
  actor: string; // 'system' or user_id
  entity: string; // 'patient', 'response', 'triage', etc.
  entity_id: string;
  event: string;
  timestamp: string;
  meta: Record<string, any>;
}

export interface Template {
  id: string;
  practice_id: string;
  type: 'auto' | 'staff';
  name: string;
  content_text: string;
  variables: Record<string, string>; // For templating like {{first_name}}
  category: 'reassure' | 'care_steps' | 'red_flags';
}

// UI-specific types
export type RiskLevel = 'red' | 'yellow' | 'green';

export interface PatientSummary extends Patient {
  latest_response?: Response;
  latest_triage?: Triage;
  risk_level: RiskLevel;
  flags: string[];
  days_post_op: number;
}

export interface DashboardMetrics {
  red_count: number;
  yellow_count: number;
  green_count: number;
  total_patients: number;
  response_rate: number;
}

export interface StaffUser {
  id: string;
  email: string;
  role: 'staff' | 'manager' | 'surgeon';
  practice_id: string;
  name: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// CSV Upload types
export interface PatientUploadRow {
  first_name: string;
  last_initial: string;
  phone: string;
  procedure_type: string;
  surgery_date: string;
}

// Webhook types for Twilio
export interface TwilioSMSWebhook {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
}

export interface TwilioVoiceWebhook {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  RecordingUrl?: string;
  RecordingSid?: string;
}

// Triage rules configuration
export interface TriageRules {
  red_thresholds: {
    pain_score: number; // >= 9
    fever_temp: number; // >= 101
    bleeding_keywords: string[];
  };
  yellow_thresholds: {
    pain_score_min: number; // 7
    pain_score_max: number; // 8
    swelling_keywords: string[];
    bleeding_keywords: string[];
  };
}