// src/core/governedRuntimeCompliance/DeterministicPolicyComplianceEvaluator.ts
// Component 1191: DeterministicPolicyComplianceEvaluator (REAL)
//
// Pure deterministic rule-matching evaluator comparing live behavioral execution profiles
// against active canonical policy rules and parameter constraints with zero side-effects.
// Bộ đánh giá so khớp quy tắc tiền định thuần túy so sánh các hồ sơ thực thi hành vi thực tế
// với các quy tắc chính sách chuẩn và ràng buộc tham số mà không gây tác dụng phụ.

import {
  ComplianceEvaluationId,
  RuntimeBehavioralProfile,
  ActivePolicyBinding,
  ComplianceEvaluationRecord,
  RuntimeComplianceVerdict,
  computeSha256,
} from './GovernedRuntimeComplianceTypes.js';
import type { CanonicalStrategicPolicy } from '../governedPolicyDecisionIngestion/GovernedPolicyDecisionIngestionTypes.js';

export interface EvaluationContext {
  readonly currentSystemTime?: string;
}

export class DeterministicPolicyComplianceEvaluator {
  // Evaluates a RuntimeBehavioralProfile against the bound CanonicalStrategicPolicy deterministically.
  // Đánh giá tiền định RuntimeBehavioralProfile so với CanonicalStrategicPolicy đã được liên kết.
  public evaluateCompliance(
    profile: RuntimeBehavioralProfile,
    policy: CanonicalStrategicPolicy,
    binding: ActivePolicyBinding,
    _context?: EvaluationContext
  ): ComplianceEvaluationRecord {
    const matchedRules: string[] = [];
    const violatedRules: string[] = [];
    let divergenceScore = 0.0;
    let verdict: RuntimeComplianceVerdict = 'COMPLIANT';
    let reason = 'Behavior complies with all canonical policy rules.';

    // 1. Tenant & Domain Cross-Contamination Guard
    // Phòng thủ nhiễm chéo tenant và lĩnh vực chính sách
    if (
      profile.tenantId !== policy.tenantId ||
      profile.tenantId !== binding.tenantId ||
      profile.policyDomain !== policy.policyDomain ||
      profile.policyDomain !== binding.policyDomain
    ) {
      verdict = 'NON_COMPLIANT';
      violatedRules.push('TENANT_DOMAIN_ISOLATION_RULE');
      divergenceScore = 1.0;
      reason = `Cross-tenant or domain boundary breach: profile (${profile.tenantId}/${profile.policyDomain}) does not match policy (${policy.tenantId}/${policy.policyDomain}).`;
    }

    // 2. Lifecycle State Enforcement
    // Thực thi trạng thái vòng đời
    else if (binding.lifecycleState === 'SUSPENDED' || binding.lifecycleState === 'RETIRED' || binding.lifecycleState === 'ROLLED_BACK') {
      verdict = 'NON_COMPLIANT';
      violatedRules.push('LIFECYCLE_STATE_INVARIANT');
      divergenceScore = 1.0;
      reason = `Action executed against policy in non-executable lifecycle state '${binding.lifecycleState}'.`;
    }

    // 3. Baseline Action Classification Invariants
    // Bất biến phân loại hành động cơ sở
    else if (profile.actionClassification === 'FORBIDDEN') {
      verdict = 'NON_COMPLIANT';
      violatedRules.push('FORBIDDEN_ACTION_RULE');
      divergenceScore = 1.0;
      reason = `Action '${profile.actionName}' is classified as strictly FORBIDDEN.`;
    }

    // 4. High-Impact Human Approval Invariants
    // Bất biến phê duyệt của con người đối với hành động tác động cao
    else if (
      profile.actionClassification === 'HIGH_IMPACT' &&
      !profile.parameters['humanDecisionToken'] &&
      !profile.parameters['approvalId']
    ) {
      verdict = 'NON_COMPLIANT';
      violatedRules.push('HIGH_IMPACT_APPROVAL_REQUIRED');
      divergenceScore = 0.8;
      reason = `HIGH_IMPACT action '${profile.actionName}' executed without verified human approval token or approvalId.`;
    }

    // 5. Canonical Rule Matching from Policy
    // So khớp quy tắc chuẩn từ chính sách
    else if (policy.rules) {
      for (const [ruleId, rule] of Object.entries(policy.rules)) {
        // Check matching rule by fieldPath or action name
        if (rule.fieldPath === profile.actionName || rule.fieldPath === '*' || ruleId === profile.actionName) {
          matchedRules.push(ruleId);

          if (rule.action === 'DENY') {
            verdict = 'NON_COMPLIANT';
            violatedRules.push(ruleId);
            divergenceScore = 1.0;
            reason = `Policy rule '${ruleId}' explicitly DENIES action '${profile.actionName}'.`;
            break;
          }

          if (rule.action === 'REQUIRE_HUMAN_APPROVAL') {
            if (!profile.parameters['humanDecisionToken'] && !profile.parameters['approvalId']) {
              verdict = 'NON_COMPLIANT';
              violatedRules.push(ruleId);
              divergenceScore = 0.75;
              reason = `Policy rule '${ruleId}' requires human approval, but none was supplied.`;
              break;
            }
          }

          // Validate parameter constraints if defined in rule
          if (rule.parameters && typeof rule.parameters === 'object') {
            for (const [pKey, pConstraint] of Object.entries(rule.parameters)) {
              const actualVal = profile.parameters[pKey];
              if (pConstraint && typeof pConstraint === 'object') {
                const constraintObj = pConstraint as Record<string, unknown>;
                if (
                  typeof constraintObj['max'] === 'number' &&
                  typeof actualVal === 'number' &&
                  actualVal > constraintObj['max']
                ) {
                  verdict = 'NON_COMPLIANT';
                  violatedRules.push(`${ruleId}.${pKey}.max_exceeded`);
                  divergenceScore = 0.6;
                  reason = `Parameter '${pKey}' value ${actualVal} exceeds policy limit ${constraintObj['max']}.`;
                  break;
                }
              }
            }
          }
        }
      }
    }

    // 6. Parameter Boundary & Anomaly Sanitization Check
    // Kiểm tra ranh giới tham số và dị thường
    if (verdict === 'COMPLIANT') {
      for (const [pKey, pVal] of Object.entries(profile.parameters)) {
        if (typeof pVal === 'number' && (isNaN(pVal) || !isFinite(pVal))) {
          verdict = 'ANOMALOUS';
          violatedRules.push(`PARAM_ANOMALY_${pKey.toUpperCase()}`);
          divergenceScore = 0.5;
          reason = `Parameter '${pKey}' contains invalid numeric value (NaN or Infinity).`;
          break;
        }
        if (typeof pVal === 'string' && (pVal.includes('../') || pVal.includes('..\\'))) {
          verdict = 'NON_COMPLIANT';
          violatedRules.push(`PATH_TRAVERSAL_${pKey.toUpperCase()}`);
          divergenceScore = 1.0;
          reason = `Parameter '${pKey}' contains illegal path traversal pattern.`;
          break;
        }
      }
    }

    // Deterministic evaluation ID derivation
    const rawEvalId = `${profile.observationId}:${binding.policyVersion}:${binding.canonicalPolicyHash}:${verdict}`;
    const evaluationId = `eval_${computeSha256(rawEvalId).slice(0, 16)}` as ComplianceEvaluationId;

    const record: ComplianceEvaluationRecord = Object.freeze({
      evaluationId,
      observationId: profile.observationId,
      tenantId: profile.tenantId,
      policyDomain: profile.policyDomain,
      policyVersion: binding.policyVersion,
      canonicalPolicyHash: binding.canonicalPolicyHash,
      verdict,
      matchedRules: Object.freeze([...matchedRules]),
      violatedRules: Object.freeze([...violatedRules]),
      divergenceScore,
      evaluatedAt: new Date().toISOString(),
      reason,
    });

    return record;
  }
}
