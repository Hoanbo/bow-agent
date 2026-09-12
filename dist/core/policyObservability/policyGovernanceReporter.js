// src/core/policyObservability/policyGovernanceReporter.ts
// BOWCON V4.0 — MS-1.3.62: GOVERNED POLICY OPERATIONAL OBSERVABILITY,
// GOVERNANCE EVIDENCE & RUNTIME INTEGRITY AUDIT LAYER
//
// Governed Policy Governance Reporter (Component 721).
// Assembles read-only PolicyRuntimeHealthSnapshot and PolicyGovernanceReport
// from existing canary pipeline components: telemetry aggregator, health monitor,
// circuit breaker, provenance engine, and the evidence collector.
//
// Bộ báo cáo quản trị chính sách có quản trị (Thành phần 721).
// Lắp ráp PolicyRuntimeHealthSnapshot và PolicyGovernanceReport chỉ đọc
// từ các thành phần đường ống canary hiện có: bộ tổng hợp đo lường, giám sát sức khỏe,
// bộ ngắt mạch, động cơ nguồn gốc và bộ thu thập bằng chứng.
//
// Authority Invariants:
// - Level 0 Read-Only Advisory Reporting
// - OBSERVABILITY != AUTHORITY
// - HEALTH_EVIDENCE != APPROVAL
// - TELEMETRY != PROMOTION
// - NO_AUTONOMOUS_PROMOTION: This reporter has no promote(), approve(), or issueToken() methods.
// - NO_SENSITIVE_EXPOSURE: Credentials, raw tokens, private keys are never present in reports.
// - USER_STOP > ALL_REPORTING_OPERATIONS_THAT_TOUCH_ACTIVE_RUNTIME_STATE
// - STRICT_TENANT_ISOLATION
import crypto from 'node:crypto';
import { createPolicyObservabilitySnapshotId, createPolicyGovernanceReportId, } from './policyObservabilityTypes.js';
import { globalPolicyEvidenceCollector } from './policyEvidenceCollector.js';
import { globalPolicyCanaryTelemetryAggregator } from '../policyCanary/policyCanaryTelemetryAggregator.js';
import { globalPolicyCanaryHealthMonitor } from '../policyCanary/policyCanaryHealthMonitor.js';
import { globalPolicyCanaryCircuitBreaker } from '../policyCanary/policyCanaryCircuitBreaker.js';
import { globalPolicyCanaryProvenanceEngine } from '../policyCanary/policyCanaryProvenanceEngine.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class PolicyGovernanceReporter {
    telemetryAggregator;
    healthMonitor;
    circuitBreaker;
    provenanceEngine;
    evidenceCollector;
    sanitizer;
    isUserStopActiveFn;
    constructor(options) {
        this.telemetryAggregator = options?.telemetryAggregator ?? globalPolicyCanaryTelemetryAggregator;
        this.healthMonitor = options?.healthMonitor ?? globalPolicyCanaryHealthMonitor;
        this.circuitBreaker = options?.circuitBreaker ?? globalPolicyCanaryCircuitBreaker;
        this.provenanceEngine = options?.provenanceEngine ?? globalPolicyCanaryProvenanceEngine;
        this.evidenceCollector = options?.evidenceCollector ?? globalPolicyEvidenceCollector;
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    // ---------------------------------------------------------------------------
    // Runtime Health Snapshot
    // ---------------------------------------------------------------------------
    /**
     * Assembles a read-only PolicyRuntimeHealthSnapshot for a given tenant and candidate.
     * Aggregates evidence from telemetry, health monitor, circuit breaker, provenance,
     * and the local evidence collector.
     *
     * Lắp ráp PolicyRuntimeHealthSnapshot chỉ đọc cho một người thuê và ứng viên đã cho.
     * Tổng hợp bằng chứng từ đo lường, giám sát sức khỏe, bộ ngắt mạch, nguồn gốc
     * và bộ thu thập bằng chứng cục bộ.
     */
    buildHealthSnapshot(input) {
        // USER_STOP check: after USER_STOP, deny snapshot assembly that reads active runtime state
        // Kiểm tra USER_STOP: sau USER_STOP, từ chối lắp ráp ảnh chụp đọc trạng thái thời gian chạy hoạt động
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Runtime health snapshot unavailable during emergency stop.');
        }
        if (!input.tenantPartition || input.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_ISOLATION_VIOLATION: tenantPartition required for health snapshot');
        }
        const snapshotId = createPolicyObservabilitySnapshotId(`snap_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`);
        const observedAt = new Date().toISOString();
        // Collect evidence counts for the tenant
        // Thu thập số liệu bằng chứng cho người thuê
        const counts = this.evidenceCollector.getEvidenceCounts(input.tenantPartition);
        // Get telemetry metrics if candidate is present
        // Lấy chỉ số đo lường nếu có ứng viên
        let totalEvaluations = counts.evaluations;
        let shadowEvaluations = 0;
        let candidateExecutions = 0;
        let activeExecutions = 0;
        let mismatchCount = counts.mismatches;
        let allowCount = 0;
        let denyCount = 0;
        let allowRateDelta = 0;
        let denyRateDelta = 0;
        let highImpactEscalationCount = 0;
        let guardrailViolationCount = counts.guardrails;
        let healthClassification = 'UNKNOWN';
        let healthRecommendation = undefined;
        if (input.candidateId) {
            try {
                const metrics = this.telemetryAggregator.getMetrics(input.tenantPartition, input.candidateId);
                totalEvaluations = metrics.totalEvaluations;
                shadowEvaluations = metrics.shadowEvaluations;
                candidateExecutions = metrics.candidateExecutions;
                activeExecutions = metrics.activeExecutions;
                mismatchCount = metrics.decisionMismatchCount;
                allowCount = Math.round(metrics.allowRate * Math.max(metrics.candidateExecutions, 1));
                denyCount = Math.round(metrics.denyRate * Math.max(metrics.candidateExecutions, 1));
                allowRateDelta = metrics.allowRateDelta;
                denyRateDelta = metrics.denyRateDelta;
                highImpactEscalationCount = metrics.highImpactEscalationCount;
                guardrailViolationCount = metrics.guardrailViolationCount;
                // Get health evaluation (advisory only — never triggers promotion)
                // Lấy đánh giá sức khỏe (chỉ cố vấn — không bao giờ kích hoạt thăng hạng)
                if (input.currentRing && metrics.totalEvaluations > 0) {
                    const healthReport = this.healthMonitor.evaluateHealth({
                        candidateId: input.candidateId,
                        tenantPartition: input.tenantPartition,
                        ring: input.currentRing,
                        metrics,
                    });
                    healthClassification = healthReport.health;
                    healthRecommendation = healthReport.recommendation;
                }
            }
            catch {
                // Health evaluation errors do not crash the snapshot — degrade gracefully
                // Lỗi đánh giá sức khỏe không làm crash ảnh chụp — giảm cấp nhẹ nhàng
                healthClassification = 'UNKNOWN';
            }
        }
        // Circuit breaker state
        // Trạng thái bộ ngắt mạch
        const cbStatus = this.circuitBreaker.getStatus(input.tenantPartition);
        // Provenance validity
        // Tính hợp lệ của nguồn gốc
        let provenanceValid = true;
        if (input.candidateId) {
            try {
                const provenanceResult = this.provenanceEngine.verifyChain(input.candidateId);
                provenanceValid = provenanceResult.valid;
            }
            catch {
                provenanceValid = false;
            }
        }
        // Drift events
        const driftDetected = counts.driftEvents > 0;
        return {
            snapshotId,
            tenantPartition: input.tenantPartition,
            observedAt,
            observationWindowStart: input.observationWindowStart ?? observedAt,
            observationWindowEnd: input.observationWindowEnd ?? observedAt,
            activePolicyVersion: input.activePolicyVersion,
            candidatePolicyVersion: input.candidatePolicyVersion,
            candidateId: input.candidateId,
            candidateState: input.candidateState,
            currentRing: input.currentRing,
            totalEvaluations,
            shadowEvaluations,
            candidateExecutions,
            activeExecutions,
            mismatchCount,
            allowCount,
            denyCount,
            allowRateDelta,
            denyRateDelta,
            highImpactEscalationCount,
            guardrailViolationCount,
            shadowFaultCount: counts.shadowFaults,
            circuitBreakerTripped: cbStatus.tripped,
            circuitBreakerReason: cbStatus.tripReason,
            driftDetected,
            provenanceValid,
            hardForbiddenDowngradeAttempts: counts.hardForbiddenAttempts,
            rollbackCount: counts.rollbacks,
            recoveryCount: counts.recoveries,
            userStopInterruptions: counts.userStops,
            authorizationFailures: counts.authFailures,
            tokenReplayDetections: counts.tokenReplays,
            healthClassification,
            healthRecommendation,
        };
    }
    // ---------------------------------------------------------------------------
    // Governance Report (read-only, advisory only)
    // ---------------------------------------------------------------------------
    /**
     * Generates a read-only PolicyGovernanceReport from evidence in the collector.
     * This report is advisory only. It NEVER triggers promotion, approval, or token issuance.
     *
     * Tạo PolicyGovernanceReport chỉ đọc từ bằng chứng trong bộ thu thập.
     * Báo cáo này chỉ mang tính cố vấn. KHÔNG BAO GIỜ kích hoạt thăng hạng, phê duyệt hoặc cấp mã.
     */
    generateGovernanceReport(input) {
        // USER_STOP: block report generation that reads active runtime state
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Governance report unavailable during emergency stop.');
        }
        if (!input.tenantPartition || input.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_ISOLATION_VIOLATION: tenantPartition required for governance report');
        }
        const reportId = createPolicyGovernanceReportId(`rpt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`);
        const generatedAt = new Date().toISOString();
        // Build the snapshot to get core metrics
        // Xây dựng ảnh chụp để lấy các chỉ số cốt lõi
        const snapshot = this.buildHealthSnapshot({
            tenantPartition: input.tenantPartition,
            activePolicyVersion: input.activePolicyVersion,
            candidateId: input.candidateId,
            candidateState: input.candidateState,
            currentRing: input.currentRing,
            observationWindowStart: input.reportPeriodStart,
            observationWindowEnd: input.reportPeriodEnd,
        });
        // Collect recent evidence for report summaries
        // Thu thập bằng chứng gần đây để tóm tắt báo cáo
        const allEvidence = this.evidenceCollector.getAll(input.tenantPartition);
        const periodEvidence = allEvidence.filter(r => r.timestamp >= input.reportPeriodStart && r.timestamp <= input.reportPeriodEnd);
        const recentMismatches = [];
        const recentGuardrails = [];
        const recentCBEvents = [];
        const healthReasons = [];
        for (const r of periodEvidence) {
            if (r.eventType === 'MISMATCH' && recentMismatches.length < 5) {
                recentMismatches.push({
                    tenantPartition: r.tenantPartition,
                    toolName: r.toolName,
                    activeAllowed: r.activeAllowed,
                    candidateAllowed: r.candidateAllowed,
                    timestamp: r.timestamp,
                });
            }
            if (r.eventType === 'GUARDRAIL' && recentGuardrails.length < 5) {
                recentGuardrails.push({
                    violationType: r.violationType,
                    reason: r.reason,
                    timestamp: r.timestamp,
                });
            }
            if (r.eventType === 'CIRCUIT_BREAKER' && recentCBEvents.length < 5) {
                recentCBEvents.push({
                    tripped: r.tripped,
                    tripReason: r.tripReason,
                    timestamp: r.timestamp,
                });
            }
        }
        // Build health reasons advisory
        // Xây dựng cố vấn lý do sức khỏe
        if (snapshot.circuitBreakerTripped) {
            healthReasons.push(`CIRCUIT_BREAKER TRIPPED: ${snapshot.circuitBreakerReason ?? 'UNKNOWN'}`);
        }
        if (snapshot.hardForbiddenDowngradeAttempts > 0) {
            healthReasons.push(`HARD_FORBIDDEN_DOWNGRADE: ${snapshot.hardForbiddenDowngradeAttempts} attempt(s) detected`);
        }
        if (snapshot.driftDetected) {
            healthReasons.push('DRIFT DETECTED: Policy drift or checksum mismatch observed');
        }
        if (!snapshot.provenanceValid) {
            healthReasons.push('PROVENANCE BROKEN: Cryptographic chain integrity compromised');
        }
        if (snapshot.tokenReplayDetections > 0) {
            healthReasons.push(`TOKEN_REPLAY: ${snapshot.tokenReplayDetections} replay attempt(s) blocked`);
        }
        if (snapshot.userStopInterruptions > 0) {
            healthReasons.push(`USER_STOP: ${snapshot.userStopInterruptions} interruption(s) recorded`);
        }
        if (snapshot.mismatchCount > 0) {
            healthReasons.push(`DECISION_MISMATCH: ${snapshot.mismatchCount} active-vs-candidate mismatch(es)`);
        }
        // Advisory summary — this is informational only
        // Tóm tắt cố vấn — đây chỉ là thông tin
        const advisorySummary = this.buildAdvisorySummary(snapshot, healthReasons);
        return {
            reportId,
            tenantPartition: input.tenantPartition,
            generatedAt,
            reportPeriodStart: input.reportPeriodStart,
            reportPeriodEnd: input.reportPeriodEnd,
            activePolicyVersion: input.activePolicyVersion,
            candidateId: input.candidateId,
            candidateState: input.candidateState,
            currentRing: input.currentRing,
            healthClassification: snapshot.healthClassification,
            healthRecommendation: snapshot.healthRecommendation,
            healthReasons,
            totalEvaluations: snapshot.totalEvaluations,
            mismatchCount: snapshot.mismatchCount,
            allowRateDelta: snapshot.allowRateDelta,
            denyRateDelta: snapshot.denyRateDelta,
            circuitBreakerTripped: snapshot.circuitBreakerTripped,
            circuitBreakerReason: snapshot.circuitBreakerReason,
            hardForbiddenAttempts: snapshot.hardForbiddenDowngradeAttempts,
            driftEvents: snapshot.driftDetected ? 1 : 0,
            provenanceIntact: snapshot.provenanceValid,
            guardrailActivations: snapshot.guardrailViolationCount,
            highImpactEscalations: snapshot.highImpactEscalationCount,
            rollbackEvents: snapshot.rollbackCount,
            recoveryEvents: snapshot.recoveryCount,
            userStopEvents: snapshot.userStopInterruptions,
            authorizationFailures: snapshot.authorizationFailures,
            tokenReplayAttempts: snapshot.tokenReplayDetections,
            recentMismatches,
            recentGuardrailActivations: recentGuardrails,
            recentCircuitBreakerEvents: recentCBEvents,
            advisorySummary,
        };
    }
    // ---------------------------------------------------------------------------
    // Evidence Query Delegation (read-only)
    // ---------------------------------------------------------------------------
    /**
     * Delegates a read-only evidence query to the evidence collector with strict tenant isolation.
     * Anonymous queries fail closed.
     *
     * Ủy quyền truy vấn bằng chứng chỉ đọc cho bộ thu thập bằng chứng với cô lập người thuê nghiêm ngặt.
     * Các truy vấn ẩn danh thất bại theo hướng đóng.
     */
    queryEvidence(filter) {
        return this.evidenceCollector.query(filter);
    }
    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------
    buildAdvisorySummary(snapshot, healthReasons) {
        // This is purely informational text — it has NO execution authority
        // Đây là văn bản thông tin thuần túy — KHÔNG có quyền thực thi
        const parts = [
            `TENANT: ${this.sanitizer.sanitizeString(snapshot.tenantPartition)}`,
            `ACTIVE_POLICY: ${snapshot.activePolicyVersion}`,
        ];
        if (snapshot.candidateId) {
            parts.push(`CANDIDATE: ${snapshot.candidateId}`);
            parts.push(`RING: ${snapshot.currentRing ?? 'UNKNOWN'}`);
            parts.push(`STATE: ${snapshot.candidateState ?? 'UNKNOWN'}`);
        }
        parts.push(`HEALTH: ${snapshot.healthClassification}`);
        if (snapshot.healthRecommendation) {
            parts.push(`RECOMMENDATION: ${snapshot.healthRecommendation} (advisory only — human decision required)`);
        }
        if (snapshot.circuitBreakerTripped) {
            parts.push(`CIRCUIT_BREAKER: TRIPPED (${snapshot.circuitBreakerReason ?? 'UNKNOWN'})`);
        }
        if (!snapshot.provenanceValid) {
            parts.push('PROVENANCE: BROKEN');
        }
        if (snapshot.driftDetected) {
            parts.push('DRIFT: DETECTED');
        }
        if (healthReasons.length > 0) {
            parts.push(`ISSUES: ${healthReasons.join(' | ')}`);
        }
        parts.push('NOTE: This report is advisory only. No action is autonomous.');
        return parts.join(' | ');
    }
}
export const globalPolicyGovernanceReporter = new PolicyGovernanceReporter();
