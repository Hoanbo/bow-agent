// src/core/diagnosis/rootCauseHypothesisEngine.ts
// BOWCON V4.0 — MS-1.3.54: GOVERNED AUTONOMOUS SELF-DIAGNOSIS, INCIDENT CLASSIFICATION & SUPERVISOR DECISION-SUPPORT SYNTHESIS
//
// Deterministic Root-Cause Hypothesis Formulation Engine.
// Evaluates correlated evidence clusters against well-defined failure topology patterns,
// scoring probabilistic confidence and uncertainty without ever establishing hypothesis as fact.
// Động cơ xây dựng giả thuyết nguyên nhân gốc xác định.
// Đánh giá các cụm bằng chứng tương quan dựa trên các mẫu cấu trúc liên kết lỗi được định nghĩa rõ ràng,
// chấm điểm tin cậy xác suất và độ không chắc chắn mà không bao giờ coi giả thuyết là sự thật.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - ROOT_CAUSE_HYPOTHESIS != FACT: Hypotheses are strictly probabilistic inferences.
// - CONFIDENCE != AUTHORITY: High confidence grants zero execution authority.
// - CONFIDENCE_CEILING: Confidence score MUST NEVER exceed 0.95 (Capped at 0.95).
// - CONFIDENCE_UNCERTAINTY_SUM: Confidence + Uncertainty MUST mathematically equal 1.0.
// - PRESERVE ALTERNATIVES: When multiple patterns match, all hypotheses are preserved.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { createHypothesisId } from './diagnosisTypes.js';
export class RootCauseHypothesisEngine {
    static MAX_CONFIDENCE = 0.95;
    static MIN_CONFIDENCE = 0.05;
    static DISSENT_PENALTY = 0.40;
    static CONTRADICTION_PENALTY_PER_ITEM = 0.35;
    /**
     * Evaluates correlated evidence cluster against deterministic failure topology patterns.
     * Đánh giá cụm bằng chứng tương quan dựa trên các mẫu cấu trúc liên kết lỗi xác định.
     */
    evaluateHypotheses(cluster, options) {
        const hypotheses = [];
        const hasDissent = options?.hasMultiAgentDissent ?? false;
        const contradictingIds = options?.contradictingEvidenceIds ?? [];
        const invariantItems = cluster.items.filter((i) => i.source === 'INVARIANT');
        const driftItems = cluster.items.filter((i) => i.source === 'DRIFT');
        const alertItems = cluster.items.filter((i) => i.source === 'ALERT');
        const telemetryItems = cluster.items.filter((i) => i.source === 'TELEMETRY');
        // -------------------------------------------------------------------------
        // 1. PATTERN_UNAUTHORIZED_MUTATION / MẪU ĐỘT BIẾN KHÔNG ĐƯỢC PHÉP
        // -------------------------------------------------------------------------
        const mutationDrift = driftItems.filter((d) => d.category === 'UNAUTHORIZED_MUTATION' || d.category === 'FILESYSTEM');
        const boundaryViolations = invariantItems.filter((i) => i.category === 'PROTECTED_WORKSPACE' || i.category === 'BOUNDARY' || i.category === 'MANIFEST');
        if (mutationDrift.length > 0 || boundaryViolations.length > 0) {
            const supportingIds = [
                ...mutationDrift.map((d) => d.evidenceId),
                ...boundaryViolations.map((b) => b.evidenceId),
            ];
            hypotheses.push(this.buildHypothesis({
                category: 'UNAUTHORIZED_MUTATION',
                title: 'Unauthorized Workspace Mutation or Boundary Breach Detected',
                description: 'Observed unapproved filesystem changes or boundary violations outside authorized release channels.',
                primarySubsystem: 'filesystem_boundary',
                supportingEvidenceIds: supportingIds,
                contradictingEvidenceIds: contradictingIds,
                expectedEvidenceCount: 2,
                hasDissent,
                clusterStart: cluster.windowStart,
                clusterEnd: cluster.windowEnd,
            }));
        }
        // -------------------------------------------------------------------------
        // 2. PATTERN_RESOURCE_EXHAUSTION / MẪU CẠN KIỆT TÀI NGUYÊN
        // -------------------------------------------------------------------------
        const resourceViolations = invariantItems.filter((i) => i.description.toLowerCase().includes('memory') ||
            i.description.toLowerCase().includes('cpu') ||
            i.description.toLowerCase().includes('thread') ||
            i.category === 'PROBE');
        const perfDegradations = telemetryItems.filter((t) => t.category === 'PERFORMANCE_DEGRADATION');
        const highLatencyAlerts = alertItems.filter((a) => a.description.toLowerCase().includes('latency') || a.description.toLowerCase().includes('error'));
        if (resourceViolations.length > 0 || (perfDegradations.length > 0 && highLatencyAlerts.length > 0)) {
            const supportingIds = [
                ...resourceViolations.map((v) => v.evidenceId),
                ...perfDegradations.map((p) => p.evidenceId),
                ...highLatencyAlerts.map((a) => a.evidenceId),
            ];
            hypotheses.push(this.buildHypothesis({
                category: 'RESOURCE_EXHAUSTION',
                title: 'Host Resource Exhaustion or Thread Starvation',
                description: 'Performance metrics indicate resource saturation, memory starvation, or thread pool exhaustion.',
                primarySubsystem: 'host_resources',
                supportingEvidenceIds: supportingIds,
                contradictingEvidenceIds: contradictingIds,
                expectedEvidenceCount: 3,
                hasDissent,
                clusterStart: cluster.windowStart,
                clusterEnd: cluster.windowEnd,
            }));
        }
        // -------------------------------------------------------------------------
        // 3. PATTERN_CONFIGURATION_DRIFT / MẪU SAI LỆCH CẤU HÌNH
        // -------------------------------------------------------------------------
        const configDrift = driftItems.filter((d) => d.category === 'CONFIGURATION' ||
            d.category === 'MANIFEST' ||
            d.category === 'DEPLOYMENT_VERSION');
        const configInvariants = invariantItems.filter((i) => i.category === 'CONFIGURATION');
        if (configDrift.length > 0 || configInvariants.length > 0) {
            const supportingIds = [
                ...configDrift.map((d) => d.evidenceId),
                ...configInvariants.map((c) => c.evidenceId),
            ];
            hypotheses.push(this.buildHypothesis({
                category: 'CONFIGURATION_DRIFT',
                title: 'Runtime Configuration or Manifest Drift',
                description: 'Active runtime configuration differs from canonical deployment manifest or release specifications.',
                primarySubsystem: 'configuration_management',
                supportingEvidenceIds: supportingIds,
                contradictingEvidenceIds: contradictingIds,
                expectedEvidenceCount: 2,
                hasDissent,
                clusterStart: cluster.windowStart,
                clusterEnd: cluster.windowEnd,
            }));
        }
        // -------------------------------------------------------------------------
        // 4. PATTERN_CANARY_REGRESSION / MẪU THOÁI HÓA BẢN CANARY
        // -------------------------------------------------------------------------
        const canaryDegradations = telemetryItems.filter((t) => t.severity === 'HIGH' && t.description.toLowerCase().includes('consecutive degradations'));
        if (canaryDegradations.length > 0) {
            const supportingIds = canaryDegradations.map((c) => c.evidenceId);
            hypotheses.push(this.buildHypothesis({
                category: 'CANARY_REGRESSION',
                title: 'Canary Deployment Performance Regression',
                description: 'Target demonstrates consecutive degradation streaks exceeding safety thresholds against canary baseline.',
                primarySubsystem: 'canary_verification',
                supportingEvidenceIds: supportingIds,
                contradictingEvidenceIds: contradictingIds,
                expectedEvidenceCount: 2,
                hasDissent,
                clusterStart: cluster.windowStart,
                clusterEnd: cluster.windowEnd,
            }));
        }
        // -------------------------------------------------------------------------
        // 5. PATTERN_UPSTREAM_DEPENDENCY / MẪU SUY GIẢM PHỤ THUỘC THƯỢNG NGUỒN
        // -------------------------------------------------------------------------
        const upstreamAlerts = alertItems.filter((a) => a.description.toLowerCase().includes('timeout') ||
            a.description.toLowerCase().includes('502') ||
            a.description.toLowerCase().includes('503') ||
            a.description.toLowerCase().includes('504') ||
            a.description.toLowerCase().includes('upstream'));
        if (upstreamAlerts.length > 0 && resourceViolations.length === 0) {
            const supportingIds = upstreamAlerts.map((u) => u.evidenceId);
            hypotheses.push(this.buildHypothesis({
                category: 'UPSTREAM_DEPENDENCY',
                title: 'Upstream Network or Service Degradation',
                description: 'Error spikes with healthy host resources indicate an upstream service degradation or network partition.',
                primarySubsystem: 'network_edge',
                supportingEvidenceIds: supportingIds,
                contradictingEvidenceIds: contradictingIds,
                expectedEvidenceCount: 2,
                hasDissent,
                clusterStart: cluster.windowStart,
                clusterEnd: cluster.windowEnd,
            }));
        }
        // -------------------------------------------------------------------------
        // 6. FALLBACK / UNKNOWN PATTERN / MẪU DỰ PHÒNG KHÔNG XÁC ĐỊNH
        // -------------------------------------------------------------------------
        if (hypotheses.length === 0 && cluster.items.length > 0) {
            hypotheses.push(this.buildHypothesis({
                category: 'UNKNOWN_PATTERN',
                title: 'Unclassified Anomaly Cluster',
                description: 'Evidence signals detected but do not unambiguously match known failure topology profiles.',
                primarySubsystem: 'unclassified_subsystem',
                supportingEvidenceIds: cluster.items.map((i) => i.evidenceId),
                contradictingEvidenceIds: contradictingIds,
                expectedEvidenceCount: cluster.items.length,
                hasDissent,
                clusterStart: cluster.windowStart,
                clusterEnd: cluster.windowEnd,
            }));
        }
        // Sort hypotheses deterministically: highest confidenceScore first, then category name
        hypotheses.sort((a, b) => {
            if (b.confidenceScore !== a.confidenceScore) {
                return b.confidenceScore - a.confidenceScore;
            }
            return a.category.localeCompare(b.category);
        });
        // Mark the top hypothesis as primary (immutable copy)
        return Object.freeze(hypotheses.map((h, index) => ({
            ...h,
            isPrimary: index === 0,
        })));
    }
    /**
     * Formulates a single hypothesis with mathematically bounded confidence and uncertainty.
     * Xây dựng một giả thuyết đơn lẻ với độ tin cậy và độ không chắc chắn bị giới hạn về mặt toán học.
     */
    buildHypothesis(args) {
        const rawSupportRatio = args.expectedEvidenceCount > 0
            ? Math.min(1.0, args.supportingEvidenceIds.length / args.expectedEvidenceCount)
            : 0.5;
        // Base score
        const baseScore = 0.5 + 0.45 * rawSupportRatio; // Scales from ~0.50 to 0.95
        // Penalties
        const contradictionPenalty = args.contradictingEvidenceIds.length * RootCauseHypothesisEngine.CONTRADICTION_PENALTY_PER_ITEM;
        const dissentPenalty = args.hasDissent ? RootCauseHypothesisEngine.DISSENT_PENALTY : 0.0;
        // Mathematical bounds: [0.05, 0.95]
        const rawConfidence = baseScore - contradictionPenalty - dissentPenalty;
        const confidenceScore = Number(Math.max(RootCauseHypothesisEngine.MIN_CONFIDENCE, Math.min(RootCauseHypothesisEngine.MAX_CONFIDENCE, rawConfidence)).toFixed(4));
        // Invariant: confidenceScore + uncertaintyScore === 1.0
        const uncertaintyScore = Number((1.0 - confidenceScore).toFixed(4));
        const temporalCorrelationMs = Math.max(0, args.clusterEnd - args.clusterStart);
        const hashPayload = `${args.category}:${args.primarySubsystem}:${args.supportingEvidenceIds.join(',')}:${confidenceScore}`;
        const hypothesisHash = crypto.createHash('sha256').update(hashPayload).digest('hex').substring(0, 10);
        const hypothesisId = createHypothesisId(`hyp_${args.category.toLowerCase()}_${hypothesisHash}`);
        return {
            hypothesisId,
            category: args.category,
            title: args.title,
            description: args.description,
            primarySubsystem: args.primarySubsystem,
            supportingEvidenceIds: Object.freeze([...args.supportingEvidenceIds]),
            contradictingEvidenceIds: Object.freeze([...args.contradictingEvidenceIds]),
            confidenceScore,
            uncertaintyScore,
            temporalCorrelationMs,
            isPrimary: false, // will be assigned in caller
        };
    }
}
export const globalRootCauseHypothesisEngine = new RootCauseHypothesisEngine();
