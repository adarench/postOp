import * as admin from 'firebase-admin';
import { RiskScore, Message } from '../types';

interface RiskAnalysisInput {
  painScore?: number;
  bleeding: boolean | null;
  concernsText?: string;
  dayPostOp: number;
  patientHistory?: Message[];
}

export async function calculateRiskScore(input: RiskAnalysisInput): Promise<RiskScore> {
  const { painScore, bleeding, concernsText = '', dayPostOp, patientHistory = [] } = input;

  let painRisk = 0;
  let bleedingRisk = 0;
  let infectionRisk = 0;
  let complicationsRisk = 0;
  let trendRisk = 0;
  const flags: string[] = [];

  // Pain scoring (0-100 scale)
  if (painScore !== undefined && painScore !== null) {
    if (painScore >= 9) {
      painRisk = 90;
      flags.push('SEVERE_PAIN');
    } else if (painScore >= 7) {
      painRisk = 70;
      flags.push('HIGH_PAIN');
    } else if (painScore >= 5) {
      painRisk = 40;
      flags.push('MODERATE_PAIN');
    } else if (painScore >= 3) {
      painRisk = 20;
    }

    // Day-based pain expectations
    if (dayPostOp <= 2 && painScore >= 8) {
      painRisk = Math.min(painRisk + 10, 100);
    } else if (dayPostOp >= 7 && painScore >= 6) {
      painRisk = Math.min(painRisk + 20, 100);
      flags.push('PROLONGED_PAIN');
    }
  }

  // Bleeding assessment
  if (bleeding === true) {
    bleedingRisk = 60;
    flags.push('ACTIVE_BLEEDING');

    if (dayPostOp >= 3) {
      bleedingRisk = 80;
      flags.push('DELAYED_BLEEDING');
    }
  }

  // Infection risk keywords analysis
  const infectionKeywords = [
    { keyword: 'fever', risk: 80, flag: 'FEVER_REPORTED' },
    { keyword: 'hot', risk: 60, flag: 'HEAT_REPORTED' },
    { keyword: 'burning up', risk: 85, flag: 'HIGH_FEVER' },
    { keyword: 'chills', risk: 70, flag: 'CHILLS' },
    { keyword: 'pus', risk: 90, flag: 'PURULENT_DISCHARGE' },
    { keyword: 'infection', risk: 75, flag: 'INFECTION_CONCERN' },
    { keyword: 'smells bad', risk: 85, flag: 'MALODOROUS' },
    { keyword: 'green discharge', risk: 85, flag: 'PURULENT_DISCHARGE' },
    { keyword: 'yellow discharge', risk: 60, flag: 'DISCHARGE_CONCERN' }
  ];

  const concernsLower = concernsText.toLowerCase();
  infectionKeywords.forEach(({ keyword, risk, flag }) => {
    if (concernsLower.includes(keyword)) {
      infectionRisk = Math.max(infectionRisk, risk);
      flags.push(flag);
    }
  });

  // Complications risk keywords
  const complicationKeywords = [
    { keyword: 'heavy bleeding', risk: 95, flag: 'HEAVY_BLEEDING' },
    { keyword: 'soaked bandage', risk: 85, flag: 'EXCESSIVE_BLEEDING' },
    { keyword: 'won\'t stop bleeding', risk: 90, flag: 'UNCONTROLLED_BLEEDING' },
    { keyword: 'shortness of breath', risk: 95, flag: 'RESPIRATORY_DISTRESS' },
    { keyword: 'chest pain', risk: 90, flag: 'CHEST_PAIN' },
    { keyword: 'difficulty breathing', risk: 95, flag: 'BREATHING_DIFFICULTY' },
    { keyword: 'swelling worse', risk: 50, flag: 'WORSENING_SWELLING' },
    { keyword: 'much more swollen', risk: 60, flag: 'SIGNIFICANT_SWELLING' },
    { keyword: 'numb', risk: 40, flag: 'NUMBNESS' },
    { keyword: 'can\'t feel', risk: 50, flag: 'LOSS_OF_SENSATION' },
    { keyword: 'vision problems', risk: 80, flag: 'VISION_CHANGES' },
    { keyword: 'can\'t see', risk: 90, flag: 'VISION_LOSS' }
  ];

  complicationKeywords.forEach(({ keyword, risk, flag }) => {
    if (concernsLower.includes(keyword)) {
      complicationsRisk = Math.max(complicationsRisk, risk);
      flags.push(flag);
    }
  });

  // Trend analysis from patient history
  if (patientHistory.length >= 2) {
    trendRisk = await analyzeTrends(patientHistory, dayPostOp);
  }

  // Calculate overall score (weighted average)
  const weights = {
    pain: 0.25,
    bleeding: 0.20,
    infection: 0.30,
    complications: 0.20,
    trend: 0.05
  };

  const overallScore = Math.round(
    painRisk * weights.pain +
    bleedingRisk * weights.bleeding +
    infectionRisk * weights.infection +
    complicationsRisk * weights.complications +
    trendRisk * weights.trend
  );

  // Calculate confidence based on data completeness
  let confidence = 0.5; // Base confidence
  if (painScore !== undefined && painScore !== null) confidence += 0.2;
  if (bleeding !== null) confidence += 0.15;
  if (concernsText.length > 10) confidence += 0.15;
  confidence = Math.min(confidence, 1.0);

  return {
    overall_score: overallScore,
    pain_risk: painRisk,
    bleeding_risk: bleedingRisk,
    infection_risk: infectionRisk,
    complications_risk: complicationsRisk,
    trend_risk: trendRisk,
    flags,
    confidence,
    computed_at: new Date().toISOString()
  };
}

async function analyzeTrends(history: Message[], currentDay: number): Promise<number> {
  let trendRisk = 0;

  // Look for worsening pain trends
  const painScores = history
    .filter(msg => msg.metadata?.pain_score !== undefined)
    .map(msg => ({
      day: msg.metadata?.checkin_day || 0,
      score: msg.metadata?.pain_score || 0
    }))
    .sort((a, b) => a.day - b.day);

  if (painScores.length >= 2) {
    const recent = painScores.slice(-2);
    if (recent[1].score > recent[0].score + 2) {
      trendRisk = Math.max(trendRisk, 40);
    }
  }

  // Look for recurring bleeding reports
  const bleedingReports = history.filter(msg => msg.metadata?.bleeding === true);
  if (bleedingReports.length >= 2) {
    trendRisk = Math.max(trendRisk, 30);
  }

  // Look for escalating concern language
  const concernTexts = history
    .filter(msg => msg.direction === 'inbound' && msg.content.length > 20)
    .map(msg => msg.content.toLowerCase());

  if (concernTexts.length >= 2) {
    const urgentWords = ['worse', 'bad', 'terrible', 'emergency', 'help', 'scared', 'worried'];
    let urgentCount = 0;

    concernTexts.forEach(text => {
      urgentWords.forEach(word => {
        if (text.includes(word)) urgentCount++;
      });
    });

    if (urgentCount >= 3) {
      trendRisk = Math.max(trendRisk, 35);
    }
  }

  return trendRisk;
}

export function getRiskLevel(riskScore: RiskScore): 0 | 1 | 2 | 3 {
  const { overall_score } = riskScore;

  if (overall_score >= 80) return 3; // Red - High Risk
  if (overall_score >= 50) return 2; // Yellow - Moderate Risk
  if (overall_score >= 25) return 1; // Green - Low Risk
  return 0; // Green - Minimal Risk
}

export async function storeRiskScore(responseId: string, riskScore: RiskScore): Promise<string> {
  const riskRef = await admin.firestore().collection('risk_scores').add({
    response_id: responseId,
    ...riskScore,
    computed_at: admin.firestore.Timestamp.now()
  });

  return riskRef.id;
}