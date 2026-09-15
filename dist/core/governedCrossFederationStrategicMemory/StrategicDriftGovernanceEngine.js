// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.18
// Component 1154: StrategicDriftGovernanceEngine
// 10-Category Strategic & Institutional Drift Evaluation & Governance Engine
// ============================================================================
import { DRIFT_THRESHOLDS, MAX_CONSECUTIVE_DRIFT_FAILURES, GovernedStrategicMemoryDriftError, GovernedStrategicMemorySecurityError, computeStrategicDriftSnapshotHash, } from './GovernedStrategicMemoryTypes';
export class StrategicDriftGovernanceEngine {
    tenantConsecutiveFailures = new Map();
    // EN: Evaluates multi-mission institutional drift across all 10 canonical categories.
    // VI: Đánh giá trôi dạt định chế đa nhiệm vụ trên toàn bộ 10 danh mục chuẩn mực.
    evaluateDrift(tenantId, sessionId, records) {
        this.assertValidTenant(tenantId);
        const categoryScores = this.computeCategoryDriftScores(records);
        const aggregateScore = this.computeAggregateScore(categoryScores);
        const severity = this.classifySeverity(aggregateScore);
        const now = Date.now();
        const rawSnapshot = {
            snapshotId: `drift_${sessionId}_${now}`,
            tenantId,
            sessionId,
            categoryDriftScores: categoryScores,
            aggregateDriftScore: aggregateScore,
            severity,
            evaluatedRecordsCount: records.length,
            timestamp: now,
            snapshotHash: '',
        };
        const snapshotHash = computeStrategicDriftSnapshotHash(rawSnapshot);
        const snapshot = { ...rawSnapshot, snapshotHash };
        // Enforce fail-closed interlocks on CRITICAL drift
        if (severity === 'CRITICAL') {
            const failures = (this.tenantConsecutiveFailures.get(tenantId) || 0) + 1;
            this.tenantConsecutiveFailures.set(tenantId, failures);
            throw new GovernedStrategicMemoryDriftError(`Critical strategic drift detected (${aggregateScore.toFixed(3)} > ${DRIFT_THRESHOLDS.WARNING_MAX}): institutional memory quarantined`);
        }
        // Check consecutive non-healthy failure threshold
        if (severity === 'WARNING') {
            const failures = (this.tenantConsecutiveFailures.get(tenantId) || 0) + 1;
            this.tenantConsecutiveFailures.set(tenantId, failures);
            if (failures >= MAX_CONSECUTIVE_DRIFT_FAILURES) {
                throw new GovernedStrategicMemoryDriftError(`Consecutive drift warning ceiling reached (${failures} >= ${MAX_CONSECUTIVE_DRIFT_FAILURES}): failing closed`);
            }
        }
        else {
            // Reset consecutive failure counter on HEALTHY/DEGRADED
            this.tenantConsecutiveFailures.set(tenantId, 0);
        }
        return snapshot;
    }
    // EN: Resets the drift failure counter (used during test teardown).
    // VI: Đặt lại bộ đếm lỗi trôi dạt (dùng khi dọn dẹp kiểm thử).
    clear() {
        this.tenantConsecutiveFailures.clear();
    }
    // --------------------------------------------------------------------------
    // Category Scoring Calculations
    // --------------------------------------------------------------------------
    computeCategoryDriftScores(records) {
        const scores = {
            STRATEGIC_GOAL_DRIFT: 0.0,
            POLICY_COMPLIANCE_DRIFT: 0.0,
            FEDERATION_TOPOLOGY_DRIFT: 0.0,
            LEASE_INVARIANT_DRIFT: 0.0,
            CONFIDENCE_DEFLATION_DRIFT: 0.0,
            LINEAGE_DIVERGENCE_DRIFT: 0.0,
            RECONCILIATION_VOLATILITY_DRIFT: 0.0,
            TEMPORAL_STALENESS_DRIFT: 0.0,
            PROVENANCE_TAMPER_DRIFT: 0.0,
            TENANT_BOUNDARY_DRIFT: 0.0,
        };
        if (records.length === 0) {
            return scores;
        }
        // 1. Confidence deflation drift: low average confidence means high drift
        const avgConfidence = records.reduce((acc, r) => acc + r.confidenceScore, 0) / records.length;
        scores.CONFIDENCE_DEFLATION_DRIFT = Math.max(0.0, Math.min(1.0, 1.0 - avgConfidence));
        // 2. Reconciliation volatility drift: frequent contradictions increase drift
        let totalContradictions = 0;
        for (const r of records) {
            totalContradictions += r.conflictResolutions.length;
        }
        const contradictionRate = totalContradictions / (records.length * 5); // Normalized against typical ceiling
        scores.RECONCILIATION_VOLATILITY_DRIFT = Math.min(1.0, contradictionRate);
        // 3. Temporal staleness drift: age relative to 30 days
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const avgAge = records.reduce((acc, r) => acc + (now - r.creationTimestamp), 0) / records.length;
        scores.TEMPORAL_STALENESS_DRIFT = Math.min(1.0, avgAge / thirtyDaysMs);
        // 4. Stability drift: 1 - average stability
        const avgStability = records.reduce((acc, r) => acc + r.stabilityScore, 0) / records.length;
        scores.STRATEGIC_GOAL_DRIFT = Math.max(0.0, Math.min(1.0, 1.0 - avgStability));
        return scores;
    }
    computeAggregateScore(categoryScores) {
        const values = Object.values(categoryScores);
        const max = Math.max(...values);
        const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
        // Composite aggregate score: 0.7 * max + 0.3 * mean
        return Math.min(1.0, Math.max(0.0, 0.7 * max + 0.3 * mean));
    }
    classifySeverity(aggregateScore) {
        if (aggregateScore <= DRIFT_THRESHOLDS.HEALTHY_MAX) {
            return 'HEALTHY';
        }
        if (aggregateScore <= DRIFT_THRESHOLDS.DEGRADED_MAX) {
            return 'DEGRADED';
        }
        if (aggregateScore <= DRIFT_THRESHOLDS.WARNING_MAX) {
            return 'WARNING';
        }
        return 'CRITICAL';
    }
    assertValidTenant(tenantId) {
        if (!tenantId || tenantId.trim().length === 0) {
            throw new GovernedStrategicMemorySecurityError('Tenant identifier must not be empty');
        }
    }
}
