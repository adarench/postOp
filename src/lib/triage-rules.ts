import { Response, Triage, TriageRules } from '@/types';

// Deterministic triage rules (v1) - will evolve to include NLU
export const TRIAGE_RULES: TriageRules = {
  red_thresholds: {
    pain_score: 9, // >= 9 = urgent
    fever_temp: 101, // >= 101°F = urgent
    bleeding_keywords: [
      'heavy bleeding', 'soaked bandage', 'blood pooling', 'bleeding won\'t stop',
      'bright red blood', 'large blood clots', 'bleeding through dressing'
    ]
  },
  yellow_thresholds: {
    pain_score_min: 7, // 7-8 = review today
    pain_score_max: 8,
    swelling_keywords: [
      'swelling worse', 'swelling increasing', 'more swollen', 'swelling getting bigger',
      'face more swollen', 'swelling not going down', 'new swelling'
    ],
    bleeding_keywords: [
      'light bleeding', 'spotting', 'pink drainage', 'some blood',
      'bleeding', 'small amount of blood', 'blood on bandage'
    ]
  }
};

// Additional concerning keywords that should flag for review
const CONCERNING_KEYWORDS = [
  'fever', 'hot', 'burning up', 'chills', 'infection',
  'pus', 'discharge', 'smell', 'odor', 'oozing',
  'difficulty breathing', 'chest pain', 'shortness of breath',
  'nausea', 'vomiting', 'can\'t keep down', 'throwing up',
  'dizzy', 'lightheaded', 'faint', 'passed out',
  'rash', 'allergic reaction', 'itching all over', 'hives'
];

/**
 * Analyzes patient response and determines risk level + flags
 */
export function triageResponse(response: Response): Omit<Triage, 'id' | 'response_id'> {
  const flags: string[] = [];
  let riskLevel: 0 | 1 | 2 | 3 = 0; // Default to routine
  const reasons: string[] = [];

  // Check pain score
  if (response.pain_score !== null && response.pain_score !== undefined) {
    if (response.pain_score >= TRIAGE_RULES.red_thresholds.pain_score) {
      riskLevel = Math.max(riskLevel, 3) as 0 | 1 | 2 | 3;
      flags.push('PAIN_HIGH');
      reasons.push(`Severe pain reported (${response.pain_score}/10)`);
    } else if (response.pain_score >= TRIAGE_RULES.yellow_thresholds.pain_score_min &&
               response.pain_score <= TRIAGE_RULES.yellow_thresholds.pain_score_max) {
      riskLevel = Math.max(riskLevel, 2) as 0 | 1 | 2 | 3;
      flags.push('PAIN_MODERATE');
      reasons.push(`Moderate pain reported (${response.pain_score}/10)`);
    }
  }

  // Check bleeding response
  if (response.bleeding === true) {
    flags.push('BLEEDING_YES');
    riskLevel = Math.max(riskLevel, 1) as 0 | 1 | 2 | 3;
    reasons.push('Patient reports bleeding');
  }

  // Analyze free text for keywords
  const concernsText = (response.concerns_text || '').toLowerCase();
  const transcriptText = (response.transcript_text || '').toLowerCase();
  const allText = `${concernsText} ${transcriptText}`.trim();

  if (allText) {
    // Check for red flag keywords
    TRIAGE_RULES.red_thresholds.bleeding_keywords.forEach(keyword => {
      if (allText.includes(keyword.toLowerCase())) {
        riskLevel = Math.max(riskLevel, 3) as 0 | 1 | 2 | 3;
        flags.push('BLEEDING_HEAVY');
        reasons.push(`Concerning bleeding keywords: "${keyword}"`);
      }
    });

    // Check for fever mentions
    if (allText.includes('fever') || allText.includes('temperature')) {
      // Try to extract temperature number
      const tempMatch = allText.match(/(\d+\.?\d*)\s*(?:degrees?|°|f|fahrenheit)/i);
      if (tempMatch) {
        const temp = parseFloat(tempMatch[1]);
        if (temp >= TRIAGE_RULES.red_thresholds.fever_temp) {
          riskLevel = Math.max(riskLevel, 3) as 0 | 1 | 2 | 3;
          flags.push('FEVER_HIGH');
          reasons.push(`High fever reported (${temp}°F)`);
        } else if (temp > 99) {
          riskLevel = Math.max(riskLevel, 2) as 0 | 1 | 2 | 3;
          flags.push('FEVER_MILD');
          reasons.push(`Mild fever reported (${temp}°F)`);
        }
      } else {
        // Fever mentioned but no temp - default to yellow
        riskLevel = Math.max(riskLevel, 2) as 0 | 1 | 2 | 3;
        flags.push('FEVER_MENTIONED');
        reasons.push('Fever mentioned without temperature');
      }
    }

    // Check for yellow flag keywords
    TRIAGE_RULES.yellow_thresholds.swelling_keywords.forEach(keyword => {
      if (allText.includes(keyword.toLowerCase())) {
        riskLevel = Math.max(riskLevel, 2) as 0 | 1 | 2 | 3;
        flags.push('SWELLING_INCREASED');
        reasons.push(`Increased swelling: "${keyword}"`);
      }
    });

    TRIAGE_RULES.yellow_thresholds.bleeding_keywords.forEach(keyword => {
      if (allText.includes(keyword.toLowerCase())) {
        riskLevel = Math.max(riskLevel, 2) as 0 | 1 | 2 | 3;
        flags.push('BLEEDING_LIGHT');
        reasons.push(`Light bleeding: "${keyword}"`);
      }
    });

    // Check for other concerning keywords
    CONCERNING_KEYWORDS.forEach(keyword => {
      if (allText.includes(keyword.toLowerCase())) {
        riskLevel = Math.max(riskLevel, 2) as 0 | 1 | 2 | 3;
        flags.push('CONCERNING_SYMPTOMS');
        reasons.push(`Concerning symptom mentioned: "${keyword}"`);
      }
    });
  }

  return {
    risk_level: riskLevel,
    flags,
    reasons: reasons.join('; '),
    computed_at: new Date().toISOString()
  };
}

/**
 * Generates auto-reply message based on triage results
 */
export function generateAutoReply(
  response: Response,
  triage: Triage,
  dayIndex: number,
  patientFirstName: string
): string {
  const { risk_level, flags } = triage;

  // Red alerts - urgent attention needed
  if (risk_level === 3) {
    let message = `Hi ${patientFirstName}, thank you for the update. `;

    if (flags.includes('PAIN_HIGH')) {
      message += 'Severe pain (9-10/10) may need prompt attention. ';
    }

    if (flags.includes('BLEEDING_HEAVY') || flags.includes('FEVER_HIGH')) {
      message += 'Your symptoms may need immediate evaluation. ';
    }

    message += 'Our team has been alerted and will review shortly. If symptoms worsen or you feel unsafe, go to the ER immediately.';

    return message;
  }

  // Yellow alerts - review needed today
  if (risk_level === 2) {
    let message = `Hi ${patientFirstName}, thank you for the update. `;

    if (flags.includes('PAIN_MODERATE')) {
      message += `Moderate pain on Day ${dayIndex + 1} can be normal. Follow your medication schedule and ice 20 min on/20 min off. `;
    }

    if (flags.includes('SWELLING_INCREASED')) {
      message += 'Some swelling variation is expected. Keep your head elevated and continue icing. ';
    }

    message += 'Our nurse will review your update today and may follow up.';

    return message;
  }

  // Green - routine follow-up
  const daySpecificTips = getDaySpecificTip(dayIndex);
  return `Hi ${patientFirstName}, thanks for the update! This sounds typical for Day ${dayIndex + 1}. ${daySpecificTips}`;
}

/**
 * Returns day-specific recovery tips
 */
function getDaySpecificTip(dayIndex: number): string {
  const tips = {
    0: 'Focus on rest today. Keep head elevated and ice 20 min on/20 min off.',
    1: 'Some swelling and discomfort is normal. Stay hydrated and follow your medication schedule.',
    2: 'Peak swelling often occurs around Day 2-3. Continue icing and keep head elevated when resting.',
    3: 'Swelling should start to improve. Gentle walks are good but avoid strenuous activity.',
    4: 'You may feel more energy returning. Continue following activity restrictions.',
    5: 'Most patients see significant improvement by now. Follow up as scheduled.',
    6: 'One week milestone! Most daily activities can usually resume.',
    7: 'Continue following your surgeon\'s specific instructions for your procedure.',
  };

  return tips[dayIndex as keyof typeof tips] || 'Continue following your post-op instructions and take it easy.';
}

/**
 * Maps numeric risk level to UI color
 */
export function getRiskColor(riskLevel: 0 | 1 | 2 | 3): 'green' | 'yellow' | 'red' {
  if (riskLevel >= 3) return 'red';
  if (riskLevel >= 2) return 'yellow';
  return 'green';
}