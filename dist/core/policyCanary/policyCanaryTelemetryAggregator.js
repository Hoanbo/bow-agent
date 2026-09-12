// src/core/policyCanary/policyCanaryTelemetryAggregator.ts
// BOWCON V4.0 — MS-1.3.60: GOVERNED REAL-TIME POLICY CANARY VERIFICATION & MULTI-RING ROLLOUT PIPELINE
//
// Governed Policy Canary Telemetry Aggregator.
// Aggregates granular metrics, shadow evaluations, execution outcomes, guardrail rejections,
// latency deltas, and safety regressions partitioned strictly by tenant and candidate policy.
//
// Bộ tổng hợp đo lường từ xa canary chính sách có quản trị.
// Tổng hợp các chỉ số chi tiết, đánh giá bóng, kết quả thực thi, từ chối rào chắn,
// độ lệch độ trễ và thoái lui an toàn được phân vùng nghiêm ngặt theo người thuê và chính sách ứng viên.
//
// Invariants:
// - Strict tenant and candidate isolation: No cross-tenant metric pollution.
// - Accurately differentiates active executions vs candidate executions vs shadow evaluations.
// - Real-time computation of allowRate, denyRate, deltas, and regression counters.
export class PolicyCanaryTelemetryAggregator {
    // Keyed by `${tenantPartition}:${candidateId}`
    buckets = new Map();
    // Recent observations for inspection / auditing
    observationHistory = new Map();
    getBucketKey(tenantPartition, candidateId) {
        return `${tenantPartition}:${candidateId}`;
    }
    getOrCreateBucket(tenantPartition, candidateId) {
        const key = this.getBucketKey(tenantPartition, candidateId);
        let bucket = this.buckets.get(key);
        if (!bucket) {
            bucket = {
                totalEvaluations: 0,
                shadowEvaluations: 0,
                candidateExecutions: 0,
                activeExecutions: 0,
                decisionMismatchCount: 0,
                activeAllows: 0,
                activeDenies: 0,
                candidateAllows: 0,
                candidateDenies: 0,
                highImpactEscalationCount: 0,
                guardrailViolationCount: 0,
                approvalTimeoutCount: 0,
                retryExhaustionCount: 0,
                concurrencyViolationCount: 0,
                totalLeaseLatencyMs: 0,
                leaseLatencyCount: 0,
                totalCandidateLatencyMs: 0,
                candidateLatencyCount: 0,
                totalActiveLatencyMs: 0,
                activeLatencyCount: 0,
                policyDriftCount: 0,
                checksumFailureCount: 0,
                safetyRegressionCount: 0,
            };
            this.buckets.set(key, bucket);
        }
        return bucket;
    }
    /**
     * Records a Ring 0 shadow evaluation record.
     * Ghi lại bản ghi đánh giá bóng Vòng 0.
     */
    recordShadowEvaluation(record, candidateId) {
        const bucket = this.getOrCreateBucket(record.tenantPartition, candidateId);
        bucket.totalEvaluations++;
        bucket.shadowEvaluations++;
        if (record.divergence) {
            bucket.decisionMismatchCount++;
        }
        if (record.activeDecisionAllowed) {
            bucket.activeAllows++;
        }
        else {
            bucket.activeDenies++;
        }
        if (record.candidateDecisionAllowed) {
            bucket.candidateAllows++;
        }
        else {
            bucket.candidateDenies++;
        }
        if (record.highImpactEscalation) {
            bucket.highImpactEscalationCount++;
        }
        if (record.hardForbiddenDowngradeAttempt) {
            bucket.safetyRegressionCount++;
        }
        if (!record.candidateGuardrailPassed) {
            bucket.guardrailViolationCount++;
        }
        // Save recent observation history (bounded to last 100)
        const key = this.getBucketKey(record.tenantPartition, candidateId);
        let history = this.observationHistory.get(key);
        if (!history) {
            history = [];
            this.observationHistory.set(key, history);
        }
        history.push(record);
        if (history.length > 100) {
            history.shift();
        }
    }
    /**
     * Records a live tool execution (active or candidate).
     * Ghi lại một lần thực thi công cụ trực tiếp (hoạt động hoặc ứng viên).
     */
    recordExecution(input) {
        const bucket = this.getOrCreateBucket(input.tenantPartition, input.candidateId);
        bucket.totalEvaluations++;
        if (input.isCandidate) {
            bucket.candidateExecutions++;
            bucket.totalCandidateLatencyMs += input.latencyMs;
            bucket.candidateLatencyCount++;
            if (input.allowed) {
                bucket.candidateAllows++;
            }
            else {
                bucket.candidateDenies++;
            }
        }
        else {
            bucket.activeExecutions++;
            bucket.totalActiveLatencyMs += input.latencyMs;
            bucket.activeLatencyCount++;
            if (input.allowed) {
                bucket.activeAllows++;
            }
            else {
                bucket.activeDenies++;
            }
        }
        if (input.leaseLatencyMs !== undefined) {
            bucket.totalLeaseLatencyMs += input.leaseLatencyMs;
            bucket.leaseLatencyCount++;
        }
    }
    /**
     * Records guardrail or concurrency violation.
     * Ghi lại vi phạm rào chắn hoặc đồng thời.
     */
    recordViolation(tenantPartition, candidateId, type) {
        const bucket = this.getOrCreateBucket(tenantPartition, candidateId);
        if (type === 'GUARDRAIL')
            bucket.guardrailViolationCount++;
        if (type === 'CONCURRENCY')
            bucket.concurrencyViolationCount++;
        if (type === 'RETRY')
            bucket.retryExhaustionCount++;
        if (type === 'TIMEOUT')
            bucket.approvalTimeoutCount++;
    }
    /**
     * Records policy drift event.
     * Ghi lại sự kiện độ lệch chính sách.
     */
    recordPolicyDrift(tenantPartition, candidateId) {
        const bucket = this.getOrCreateBucket(tenantPartition, candidateId);
        bucket.policyDriftCount++;
    }
    /**
     * Records cryptographic checksum verification failure.
     * Ghi lại thất bại xác minh mã kiểm tra mật mã.
     */
    recordChecksumFailure(tenantPartition, candidateId) {
        const bucket = this.getOrCreateBucket(tenantPartition, candidateId);
        bucket.checksumFailureCount++;
    }
    /**
     * Records critical safety regression.
     * Ghi lại thoái lui an toàn nghiêm trọng.
     */
    recordSafetyRegression(tenantPartition, candidateId) {
        const bucket = this.getOrCreateBucket(tenantPartition, candidateId);
        bucket.safetyRegressionCount++;
    }
    /**
     * Returns aggregated metrics for a specific tenant and candidate.
     * Trả về các chỉ số tổng hợp cho một người thuê và ứng viên cụ thể.
     */
    getMetrics(tenantPartition, candidateId) {
        const bucket = this.getOrCreateBucket(tenantPartition, candidateId);
        const activeTotal = bucket.activeAllows + bucket.activeDenies;
        const candidateTotal = bucket.candidateAllows + bucket.candidateDenies;
        const activeAllowRate = activeTotal > 0 ? bucket.activeAllows / activeTotal : 1.0;
        const activeDenyRate = activeTotal > 0 ? bucket.activeDenies / activeTotal : 0.0;
        const candidateAllowRate = candidateTotal > 0 ? bucket.candidateAllows / candidateTotal : 1.0;
        const candidateDenyRate = candidateTotal > 0 ? bucket.candidateDenies / candidateTotal : 0.0;
        const allowRateDelta = candidateAllowRate - activeAllowRate;
        const denyRateDelta = candidateDenyRate - activeDenyRate;
        const avgLeaseLatency = bucket.leaseLatencyCount > 0 ? bucket.totalLeaseLatencyMs / bucket.leaseLatencyCount : 0;
        const avgCandidateLatency = bucket.candidateLatencyCount > 0 ? bucket.totalCandidateLatencyMs / bucket.candidateLatencyCount : 0;
        const avgActiveLatency = bucket.activeLatencyCount > 0 ? bucket.totalActiveLatencyMs / bucket.activeLatencyCount : 0;
        return {
            totalEvaluations: bucket.totalEvaluations,
            shadowEvaluations: bucket.shadowEvaluations,
            candidateExecutions: bucket.candidateExecutions,
            activeExecutions: bucket.activeExecutions,
            decisionMismatchCount: bucket.decisionMismatchCount,
            allowRate: candidateAllowRate,
            denyRate: candidateDenyRate,
            allowRateDelta,
            denyRateDelta,
            highImpactEscalationCount: bucket.highImpactEscalationCount,
            guardrailViolationCount: bucket.guardrailViolationCount,
            approvalTimeoutCount: bucket.approvalTimeoutCount,
            retryExhaustionCount: bucket.retryExhaustionCount,
            concurrencyViolationCount: bucket.concurrencyViolationCount,
            leaseLatencyMs: Math.round(avgLeaseLatency * 100) / 100,
            candidateLatencyMs: Math.round(avgCandidateLatency * 100) / 100,
            activeLatencyMs: Math.round(avgActiveLatency * 100) / 100,
            policyDriftCount: bucket.policyDriftCount,
            checksumFailureCount: bucket.checksumFailureCount,
            safetyRegressionCount: bucket.safetyRegressionCount,
        };
    }
    /**
     * Retrieves recent shadow observation records.
     * Lấy các bản ghi quan sát bóng gần đây.
     */
    getRecentObservations(tenantPartition, candidateId) {
        const key = this.getBucketKey(tenantPartition, candidateId);
        return this.observationHistory.get(key) ?? [];
    }
    /**
     * Resets telemetry metrics for a tenant and candidate.
     * Đặt lại các chỉ số đo lường từ xa cho người thuê và ứng viên.
     */
    resetMetrics(tenantPartition, candidateId) {
        const key = this.getBucketKey(tenantPartition, candidateId);
        this.buckets.delete(key);
        this.observationHistory.delete(key);
    }
}
export const globalPolicyCanaryTelemetryAggregator = new PolicyCanaryTelemetryAggregator();
