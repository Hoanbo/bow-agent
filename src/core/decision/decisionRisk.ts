// src/core/decision/decisionRisk.ts
// BOWCON V4.0 — MILESTONE 1.3.10: RISK PRESERVATION & GOVERNANCE RULES
//
// EN:
// Enforces INV-7 (Risk Preservation) and INV-8 (Governance Boundary).
// Prevents risk downgrading (CRITICAL -> HIGH -> MEDIUM -> LOW).
// Preserves governance and approval requirements for HIGH and CRITICAL actions.
//
// VI:
// Thực thi INV-7 (Bảo tồn rủi ro) và INV-8 (Ranh giới quản trị).
// Ngăn chặn việc hạ cấp rủi ro (CRITICAL -> HIGH -> MEDIUM -> LOW).
// Bảo tồn các yêu cầu quản trị và phê duyệt cho các hành động HIGH và CRITICAL.

import type { PlanRiskLevel } from '../planning/planningTypes.js';

const RISK_ORDER: Record<PlanRiskLevel, number> = Object.freeze({
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
});

/**
 * EN: Preserves planning risk and allows escalation, but strictly rejects risk downgrading (INV-7).
 * VI: Bảo tồn rủi ro từ planning và cho phép nâng cấp rủi ro, nhưng nghiêm cấm hạ cấp rủi ro (INV-7).
 */
export function preserveRisk(planningRisk: PlanRiskLevel, candidateRisk?: PlanRiskLevel): PlanRiskLevel {
  if (!candidateRisk) return planningRisk;
  const planRank = RISK_ORDER[planningRisk] ?? 0;
  const candidateRank = RISK_ORDER[candidateRisk] ?? 0;
  // Never downgrade: return highest rank between planning and candidate
  return candidateRank > planRank ? candidateRisk : planningRisk;
}

/**
 * EN: Checks if a given risk level requires governance evaluation (MEDIUM, HIGH, CRITICAL).
 * VI: Kiểm tra xem mức độ rủi ro có yêu cầu đánh giá quản trị hay không (MEDIUM, HIGH, CRITICAL).
 */
export function isGovernedRisk(risk: PlanRiskLevel): boolean {
  return (RISK_ORDER[risk] ?? 0) >= RISK_ORDER.MEDIUM;
}

/**
 * EN: Checks if a given risk level requires human approval (HIGH, CRITICAL).
 * VI: Kiểm tra xem mức độ rủi ro có yêu cầu phê duyệt từ con người hay không (HIGH, CRITICAL).
 */
export function isApprovalRequiredForRisk(risk: PlanRiskLevel, planRequiresApproval: boolean): boolean {
  if (planRequiresApproval) return true;
  return (RISK_ORDER[risk] ?? 0) >= RISK_ORDER.HIGH;
}
