// src/core/governedRuntimeCompliance/ContinuousOperationalAssuranceScorer.ts
// Component 1192: ContinuousOperationalAssuranceScorer (REAL)
//
// Computes mathematical, bounded continuous operational assurance score A in [0.0, 1.0]
// over sliding temporal evaluation windows with deterministic decay and severity penalties.
// Tính toán điểm số đảm bảo vận hành liên tục A trong đoạn [0.0, 1.0] được giới hạn toán học
// trên các cửa sổ đánh giá trượt thời gian với sự suy giảm tiền định và các hình phạt mức độ nghiêm trọng.
import { WEIGHT_COMPLIANCE_RATIO, WEIGHT_VIOLATION_PENALTY, WEIGHT_DRIFT_MAGNITUDE, WEIGHT_OBSERVATION_FRESHNESS, FRESHNESS_DECAY_HALF_LIFE_SEC, MAX_SLIDING_WINDOW_OBSERVATIONS, MAX_SLIDING_WINDOW_DURATION_SEC, SEVERITY_WEIGHT_TABLE, MAX_SEVERITY_WEIGHT, ASSURANCE_THRESHOLD_COMPLIANT, ASSURANCE_THRESHOLD_DEGRADED, computeSha256, } from './GovernedRuntimeComplianceTypes.js';
export class ContinuousOperationalAssuranceScorer {
    // Computes the Continuous Operational Assurance Score A in [0.0, 1.0].
    // Tính toán Điểm số Đảm bảo Vận hành Liên tục A trong khoảng [0.0, 1.0].
    computeAssuranceScore(tenantId, policyDomain, evaluations, violations, currentTimestampMs = Date.now()) {
        // Filter evaluations to window duration and max count
        const windowCutoffMs = currentTimestampMs - MAX_SLIDING_WINDOW_DURATION_SEC * 1000;
        const windowEvaluations = evaluations
            .filter((e) => new Date(e.evaluatedAt).getTime() >= windowCutoffMs)
            .slice(-MAX_SLIDING_WINDOW_OBSERVATIONS);
        const N = windowEvaluations.length;
        // 1. Quiescent Branch: N = 0 -> default A = 1.0, ASSURED_COMPLIANT
        // Nhánh tĩnh lặng: N = 0 -> mặc định A = 1.0, ĐẢM BẢO TUÂN THỦ
        if (N === 0) {
            const scoreId = `assur_${computeSha256(`${tenantId}:${policyDomain}:quiescent:${currentTimestampMs}`).slice(0, 16)}`;
            return Object.freeze({
                scoreId,
                tenantId,
                policyDomain,
                scoreValue: 1.0,
                state: 'ASSURED_COMPLIANT',
                observationCount: 0,
                windowStart: new Date(windowCutoffMs).toISOString(),
                windowEnd: new Date(currentTimestampMs).toISOString(),
                complianceRatio: 1.0,
                severityPenalty: 0.0,
                driftMagnitude: 0.0,
                freshnessFactor: 1.0,
                criticalViolationPresent: false,
                computedAt: new Date(currentTimestampMs).toISOString(),
            });
        }
        // 2. Critical Interlock Branch
        // Nhánh khóa liên động sự cố nghiêm trọng
        const matchingViolations = violations.filter((v) => windowEvaluations.some((e) => e.evaluationId === v.evaluationId));
        const hasCriticalViolation = matchingViolations.some((v) => v.severity === 'CRITICAL');
        if (hasCriticalViolation) {
            const scoreId = `assur_${computeSha256(`${tenantId}:${policyDomain}:critical:${currentTimestampMs}`).slice(0, 16)}`;
            return Object.freeze({
                scoreId,
                tenantId,
                policyDomain,
                scoreValue: 0.0,
                state: 'ASSURED_BREACHED',
                observationCount: N,
                windowStart: new Date(windowCutoffMs).toISOString(),
                windowEnd: new Date(currentTimestampMs).toISOString(),
                complianceRatio: 0.0,
                severityPenalty: 1.0,
                driftMagnitude: 1.0,
                freshnessFactor: 1.0,
                criticalViolationPresent: true,
                computedAt: new Date(currentTimestampMs).toISOString(),
            });
        }
        // 3. Mathematical Formula Evaluation
        // Đánh giá công thức toán học
        // CR: Compliance Ratio in [0, 1]
        const compliantCount = windowEvaluations.filter((e) => e.verdict === 'COMPLIANT').length;
        const CR = compliantCount / N;
        // SVP: Severity-Weighted Violation Penalty in [0, 1]
        let totalSeverityWeight = 0;
        for (const v of matchingViolations) {
            totalSeverityWeight += SEVERITY_WEIGHT_TABLE[v.severity] ?? 0;
        }
        const maxPossibleSeverity = N * MAX_SEVERITY_WEIGHT;
        const SVP = Math.min(1.0, maxPossibleSeverity > 0 ? totalSeverityWeight / maxPossibleSeverity : 0);
        // DM: Drift Magnitude in [0, 1] (average divergence score)
        const totalDivergence = windowEvaluations.reduce((acc, e) => acc + (e.divergenceScore ?? 0), 0);
        const DM = Math.min(1.0, Math.max(0.0, totalDivergence / N));
        // OF: Observation Freshness in (0, 1]
        const latestEvalTime = Math.max(...windowEvaluations.map((e) => new Date(e.evaluatedAt).getTime()));
        const deltaSeconds = Math.max(0, (currentTimestampMs - latestEvalTime) / 1000);
        const OF = Math.exp(-deltaSeconds / FRESHNESS_DECAY_HALF_LIFE_SEC);
        // Composite Calculation
        const rawScore = WEIGHT_COMPLIANCE_RATIO * CR -
            WEIGHT_VIOLATION_PENALTY * SVP -
            WEIGHT_DRIFT_MAGNITUDE * DM +
            WEIGHT_OBSERVATION_FRESHNESS * OF;
        const clampedScore = Math.max(0.0, Math.min(1.0, Number.isFinite(rawScore) ? rawScore : 0.0));
        // Round to 4 decimal places for deterministic precision
        const scoreValue = Math.round(clampedScore * 10000) / 10000;
        // State Classification
        let state = 'ASSURED_COMPLIANT';
        if (scoreValue < ASSURANCE_THRESHOLD_DEGRADED) {
            state = 'ASSURED_BREACHED';
        }
        else if (scoreValue < ASSURANCE_THRESHOLD_COMPLIANT) {
            state = 'ASSURED_DEGRADED';
        }
        const scoreId = `assur_${computeSha256(`${tenantId}:${policyDomain}:${scoreValue}:${currentTimestampMs}`).slice(0, 16)}`;
        return Object.freeze({
            scoreId,
            tenantId,
            policyDomain,
            scoreValue,
            state,
            observationCount: N,
            windowStart: new Date(windowCutoffMs).toISOString(),
            windowEnd: new Date(currentTimestampMs).toISOString(),
            complianceRatio: Math.round(CR * 10000) / 10000,
            severityPenalty: Math.round(SVP * 10000) / 10000,
            driftMagnitude: Math.round(DM * 10000) / 10000,
            freshnessFactor: Math.round(OF * 10000) / 10000,
            criticalViolationPresent: false,
            computedAt: new Date(currentTimestampMs).toISOString(),
        });
    }
}
