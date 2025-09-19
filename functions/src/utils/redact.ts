/**
 * Redaction utilities for demo safety and privacy
 */

export function redactPhone(phone: string): string {
  if (!phone || phone.length < 10) return phone;

  // For E.164 format like +18013101121
  if (phone.startsWith('+1') && phone.length === 12) {
    return phone.substring(0, 7) + '***';
  }

  // For other formats, show first few digits
  const visible = Math.min(7, phone.length - 3);
  return phone.substring(0, visible) + '***';
}

export function redactBody(body: string): string {
  if (!body) return body;

  if (body.length <= 60) {
    return body;
  }

  return body.substring(0, 60) + '…';
}

export function redactForLogs(phone: string, body: string): { phone: string; body: string } {
  return {
    phone: redactPhone(phone),
    body: redactBody(body)
  };
}