// src/core/policyCanary/policyCanaryRuntime.ts
// BOWCON V4.0 — MS-1.3.60: GOVERNED REAL-TIME POLICY CANARY VERIFICATION & MULTI-RING ROLLOUT PIPELINE
//
// Master Policy Canary Runtime Coordinator.
// Unifies the Policy Ring Router, Shadow Evaluator, Telemetry Aggregator, Health Monitor,
// Circuit Breaker, Promotion Engine, Rollback Engine, Provenance Engine, and Durable Store.
// Provides authoritative Level 2 governed progressive canary deployment operations.
//
// Điều phối viên thời gian chạy canary chính sách chủ.
// Hợp nhất Bộ định tuyến vòng, Bộ đánh giá bóng, Bộ tổng hợp đo lường, Giám sát sức khỏe,
// Ngắt mạch, Động cơ thăng hạng, Động cơ hoàn nguyên, Động cơ nguồn gốc và Kho lưu trữ bền vững.
// Cung cấp các thao tác triển khai canary lũy tiến có quản trị Cấp 2 có thẩm quyền.
//
// Authority Invariants:
// - Level 2 Controlled Progressive Rollout Coordinator
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - USER_STOP > ALL_CANARY_OPERATIONS
// - HARD_FORBIDDEN_IMMUTABILITY
// - STRICT_TENANT_ISOLATION
// - FAIL_CLOSED_SAFETY
import path from 'node:path';
import crypto from 'node:crypto';
import { createPolicyRingAssignmentId, createPolicyCanaryObservationId, } from './policyCanaryTypes.js';
import { globalPolicyRingRouter } from './policyRingRouter.js';
import { globalPolicyShadowEvaluator } from './policyShadowEvaluator.js';
import { globalPolicyCanaryTelemetryAggregator } from './policyCanaryTelemetryAggregator.js';
import { globalPolicyCanaryHealthMonitor } from './policyCanaryHealthMonitor.js';
import { globalPolicyCanaryCircuitBreaker } from './policyCanaryCircuitBreaker.js';
import { globalPolicyRingPromotionEngine } from './policyRingPromotionEngine.js';
import { globalPolicyCanaryRollbackEngine } from './policyCanaryRollbackEngine.js';
import { globalPolicyCanaryProvenanceEngine } from './policyCanaryProvenanceEngine.js';
import { globalPolicyCanaryRecoveryEngine } from './policyCanaryRecoveryEngine.js';
import { globalPolicyCanaryFaultInjector } from './policyCanaryFaultInjector.js';
import { globalPolicyHotSwapEngine } from '../policyEnforcement/policyHotSwapEngine.js';
import { globalFailClosedBaselineFallback } from '../policyEnforcement/failClosedBaselineFallback.js';
import { DurableJsonStore } from '../persistence/durableJsonStore.js';
import { resolveUserPartition, DEFAULT_PRIMARY_USER_ID } from '../persistence/userPartitionResolver.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { globalAuditLedger } from '../auditLedger.js';
function validatePolicyCanaryStoreRecord(data) {
    if (!data || typeof data !== 'object') {
        return { success: false, errors: ['Expected object for PolicyCanaryStoreRecord'] };
    }
    const record = data;
    if (!record.tenantPartition || typeof record.tenantPartition !== 'string') {
        return { success: false, errors: ['Missing tenantPartition in PolicyCanaryStoreRecord'] };
    }
    if (!Array.isArray(record.candidatePackages)) {
        return { success: false, errors: ['Expected array for candidatePackages'] };
    }
    if (!Array.isArray(record.ringAssignments)) {
        return { success: false, errors: ['Expected array for ringAssignments'] };
    }
    return { success: true, data: data };
}
export class PolicyCanaryRuntime {
    baseDir;
    router;
    shadowEvaluator;
    telemetryAggregator;
    healthMonitor;
    circuitBreaker;
    promotionEngine;
    rollbackEngine;
    provenanceEngine;
    recoveryEngine;
    faultInjector;
    hotSwapEngine;
    fallbackProvider;
    sanitizer;
    isUserStopActiveFn;
    // Tenant-partitioned durable stores: tenantPartition -> DurableJsonStore
    stores = new Map();
    // Registered candidates in runtime memory: candidateId -> PolicyCandidatePackage
    candidatePackages = new Map();
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'policy-canary'));
        this.router = options?.router ?? globalPolicyRingRouter;
        this.shadowEvaluator = options?.shadowEvaluator ?? globalPolicyShadowEvaluator;
        this.telemetryAggregator = options?.telemetryAggregator ?? globalPolicyCanaryTelemetryAggregator;
        this.healthMonitor = options?.healthMonitor ?? globalPolicyCanaryHealthMonitor;
        this.circuitBreaker = options?.circuitBreaker ?? globalPolicyCanaryCircuitBreaker;
        this.promotionEngine = options?.promotionEngine ?? globalPolicyRingPromotionEngine;
        this.rollbackEngine = options?.rollbackEngine ?? globalPolicyCanaryRollbackEngine;
        this.provenanceEngine = options?.provenanceEngine ?? globalPolicyCanaryProvenanceEngine;
        this.recoveryEngine = options?.recoveryEngine ?? globalPolicyCanaryRecoveryEngine;
        this.faultInjector = options?.faultInjector ?? globalPolicyCanaryFaultInjector;
        this.hotSwapEngine = options?.hotSwapEngine ?? globalPolicyHotSwapEngine;
        this.fallbackProvider = options?.fallbackProvider ?? globalFailClosedBaselineFallback;
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    /**
     * Resolves or creates a DurableJsonStore for a tenant partition.
     * Giải quyết hoặc tạo DurableJsonStore cho một phân vùng người thuê.
     */
    getStoreForTenant(userId) {
        const partition = resolveUserPartition(userId, this.baseDir);
        let store = this.stores.get(partition.partitionKey);
        if (!store) {
            const filePath = path.join(this.baseDir, partition.partitionKey, 'canary_deployments.json');
            store = new DurableJsonStore({
                filePath,
                validator: validatePolicyCanaryStoreRecord,
                defaultFactory: () => ({
                    tenantPartition: partition.partitionKey,
                    candidatePackages: [],
                    ringAssignments: [],
                    circuitBreakerStatus: { tripped: false },
                    lastUpdated: new Date().toISOString(),
                }),
            });
            this.stores.set(partition.partitionKey, store);
        }
        return { store, tenantPartition: partition.partitionKey };
    }
    /**
     * Stages a candidate package into memory and durable tenant storage.
     * Đưa một gói ứng viên vào bộ nhớ và lưu trữ bền vững của người thuê.
     */
    stageCandidate(candidate, userId = DEFAULT_PRIMARY_USER_ID) {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Cannot stage candidate policy during emergency stop.');
        }
        const { store, tenantPartition } = this.getStoreForTenant(userId);
        // Register in router
        this.router.registerCandidate(candidate);
        this.candidatePackages.set(candidate.candidateId, candidate);
        // Record genesis in provenance chain
        this.provenanceEngine.recordEvent({
            candidateId: candidate.candidateId,
            tenantPartition,
            ring: candidate.currentRing,
            eventType: 'CANDIDATE_STAGED',
            candidatePolicyVersion: candidate.policyConfig.versionId,
            evidenceReference: candidate.sourceSnapshotId,
            authorizationReference: candidate.authorizationTokenId,
        });
        // Persist to durable store
        const existing = store.read() ?? {
            tenantPartition,
            candidatePackages: [],
            ringAssignments: [],
            circuitBreakerStatus: { tripped: false },
            lastUpdated: new Date().toISOString(),
        };
        const sanitizedCandidate = JSON.parse(this.sanitizer.sanitize(JSON.stringify(candidate)));
        const updatedCandidates = [
            ...existing.candidatePackages.filter((c) => c.candidateId !== candidate.candidateId),
            sanitizedCandidate,
        ];
        store.write({
            ...existing,
            candidatePackages: updatedCandidates,
            lastUpdated: new Date().toISOString(),
        });
        globalAuditLedger.record({
            timestamp: new Date().toISOString(),
            actor: { userId, role: 'operator', channel: 'admin' },
            domain: 'shop',
            toolName: 'policy_canary_stage_candidate',
            classification: 'HIGH_IMPACT',
            policyDecision: 'PERMIT',
            executionStatus: 'SUCCESS',
            argumentsHash: candidate.checksum,
        });
    }
    /**
     * Assigns a tenant partition to a candidate and ring.
     * Gán một phân vùng người thuê vào một ứng viên và vòng.
     */
    assignTenantRing(input) {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Cannot assign canary ring during emergency stop.');
        }
        const { store, tenantPartition } = this.getStoreForTenant(input.userId);
        const assignmentId = createPolicyRingAssignmentId(`asgn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
        const assignedAt = new Date().toISOString();
        const assignment = {
            assignmentId,
            candidateId: input.candidateId,
            tenantPartition,
            ring: input.ring,
            assignedAt,
            assignedBy: input.assignedBy,
            authorizationTokenId: input.authorizationTokenId,
            active: true,
        };
        // Register in router
        this.router.assignTenantRing(assignment);
        // Record in provenance
        this.provenanceEngine.recordEvent({
            candidateId: input.candidateId,
            tenantPartition,
            ring: input.ring,
            eventType: 'TENANT_RING_ASSIGNED',
            candidatePolicyVersion: this.candidatePackages.get(input.candidateId)?.policyConfig.versionId || 'unknown',
            authorizationReference: input.authorizationTokenId,
        });
        // Persist
        const existing = store.read() ?? {
            tenantPartition,
            candidatePackages: [],
            ringAssignments: [],
            circuitBreakerStatus: { tripped: false },
            lastUpdated: assignedAt,
        };
        const updatedAssignments = [
            ...existing.ringAssignments.filter((a) => a.tenantPartition !== tenantPartition),
            assignment,
        ];
        store.write({
            ...existing,
            ringAssignments: updatedAssignments,
            lastUpdated: assignedAt,
        });
        return assignment;
    }
    /**
     * Primary route evaluation for live requests.
     * Resolves whether candidate policy or active policy should be used, and provides shadow config if Ring 0.
     *
     * Đánh giá định tuyến chính cho các yêu cầu trực tiếp.
     */
    evaluateExecutionRoute(userId, activePolicyConfig, toolName) {
        // If circuit breaker is tripped for this tenant, fail closed immediately
        if (this.circuitBreaker.isTripped(userId)) {
            const baseline = this.fallbackProvider.getBaselineConfiguration();
            return {
                tenantPartition: userId,
                ring: 'RING_0',
                effectivePolicyConfig: baseline,
                isCandidate: false,
                isBaselineFallback: true,
                reason: 'CIRCUIT_BREAKER_ACTIVE: Candidate routing halted fail-closed; active baseline restored',
                failClosedReason: 'SAFETY_REGRESSION',
            };
        }
        return this.router.resolvePolicyForTenant(userId, activePolicyConfig, toolName);
    }
    /**
     * Executes Ring 0 shadow evaluation against candidate policy.
     * STRICT INVARIANT: Never executes tool, never issues tokens, never causes side effects.
     * Fault Isolation: Uncaught exceptions during shadow evaluation NEVER crash active tool execution.
     *
     * Thực thi đánh giá bóng Vòng 0 đối với chính sách ứng viên.
     * CÔ LẬP LỖI: Ngoại lệ không được bắt trong đánh giá bóng KHÔNG BAO GIỜ làm sập việc thực thi công cụ hoạt động.
     */
    executeShadowEvaluation(input, candidateId) {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Cannot perform shadow evaluation during emergency stop.');
        }
        // Check synthetic fault injection
        if (this.faultInjector.shouldInject('SHADOW_EVALUATOR_THROW', {
            tenantPartition: input.tenantPartition,
            candidateId,
            toolName: input.toolName,
        })) {
            globalAuditLedger.record({
                timestamp: new Date().toISOString(),
                actor: { userId: 'system', role: 'supervisor', channel: 'internal' },
                domain: 'shop',
                toolName: 'policy_canary_shadow_fault',
                classification: 'HIGH_IMPACT',
                policyDecision: 'PERMIT',
                executionStatus: 'FAILURE',
                argumentsHash: crypto
                    .createHash('sha256')
                    .update(this.sanitizer.sanitizeString(JSON.stringify({ tenantPartition: input.tenantPartition, candidateId, fault: 'SHADOW_EVALUATOR_THROW' })))
                    .digest('hex'),
            });
            this.telemetryAggregator.recordSafetyRegression(input.tenantPartition, candidateId);
            return {
                observationId: createPolicyCanaryObservationId(`obs_fault_${Date.now()}`),
                tenantPartition: input.tenantPartition,
                toolName: input.toolName,
                activeVersion: input.activeConfig.versionId,
                candidateVersion: input.candidateConfig.versionId,
                activeClassification: input.activeConfig.actionClassifications[input.toolName] || 'HIGH_IMPACT',
                candidateClassification: 'FORBIDDEN',
                activeDecisionAllowed: true,
                candidateDecisionAllowed: false,
                divergence: true,
                divergenceReason: 'SHADOW_EVALUATION_FAULT: Simulated shadow evaluator exception safely isolated',
                activeGuardrailPassed: true,
                candidateGuardrailPassed: false,
                highImpactEscalation: false,
                hardForbiddenDowngradeAttempt: false,
                timestamp: new Date().toISOString(),
                correlationId: input.correlationId,
            };
        }
        try {
            const record = this.shadowEvaluator.evaluateShadow(input);
            // Record in telemetry aggregator
            this.telemetryAggregator.recordShadowEvaluation(record, candidateId);
            // If candidate attempted illegal hard-forbidden downgrade, immediately trip circuit breaker!
            if (record.hardForbiddenDowngradeAttempt) {
                this.circuitBreaker.trip({
                    tenantPartition: input.tenantPartition,
                    reason: 'HARD_FORBIDDEN_DOWNGRADE',
                    details: `Candidate attempted illegal downgrade of hard-forbidden action '${input.toolName}' in shadow mode`,
                    trippedBy: 'shadow_evaluator',
                });
                this.telemetryAggregator.recordSafetyRegression(input.tenantPartition, candidateId);
            }
            return record;
        }
        catch (err) {
            // Fault containment: Active execution MUST NOT be disrupted by shadow evaluation error
            globalAuditLedger.record({
                timestamp: new Date().toISOString(),
                actor: { userId: 'system', role: 'supervisor', channel: 'internal' },
                domain: 'shop',
                toolName: 'policy_canary_shadow_fault',
                classification: 'HIGH_IMPACT',
                policyDecision: 'PERMIT',
                executionStatus: 'FAILURE',
                argumentsHash: crypto
                    .createHash('sha256')
                    .update(this.sanitizer.sanitizeString(JSON.stringify({ tenantPartition: input.tenantPartition, candidateId, error: err?.message })))
                    .digest('hex'),
            });
            this.telemetryAggregator.recordSafetyRegression(input.tenantPartition, candidateId);
            return {
                observationId: createPolicyCanaryObservationId(`obs_err_${Date.now()}`),
                tenantPartition: input.tenantPartition,
                toolName: input.toolName,
                activeVersion: input.activeConfig.versionId,
                candidateVersion: input.candidateConfig.versionId,
                activeClassification: input.activeConfig.actionClassifications[input.toolName] || 'HIGH_IMPACT',
                candidateClassification: 'FORBIDDEN',
                activeDecisionAllowed: true,
                candidateDecisionAllowed: false,
                divergence: true,
                divergenceReason: `SHADOW_EVALUATION_ERROR: ${err?.message}`,
                activeGuardrailPassed: true,
                candidateGuardrailPassed: false,
                highImpactEscalation: false,
                hardForbiddenDowngradeAttempt: false,
                timestamp: new Date().toISOString(),
                correlationId: input.correlationId,
            };
        }
    }
    /**
     * Evaluates candidate health via PolicyCanaryHealthMonitor.
     * Returns advisory report.
     *
     * Đánh giá sức khỏe ứng viên qua PolicyCanaryHealthMonitor.
     */
    evaluateCandidateHealth(candidateId, tenantPartition) {
        const candidate = this.candidatePackages.get(candidateId);
        const ring = candidate ? candidate.currentRing : 'RING_0';
        const metrics = this.telemetryAggregator.getMetrics(tenantPartition, candidateId);
        return this.healthMonitor.evaluateHealth({
            candidateId,
            tenantPartition,
            ring,
            metrics,
        });
    }
    /**
     * Promotes candidate to the next ring with human authorization token.
     * Thăng hạng ứng viên lên vòng tiếp theo với mã ủy quyền của con người.
     */
    promoteCandidate(candidateId, request) {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Cannot promote candidate policy during emergency stop.');
        }
        const candidate = this.candidatePackages.get(candidateId);
        if (!candidate) {
            throw new Error(`CANDIDATE_NOT_FOUND: Candidate '${candidateId}' is not registered`);
        }
        // Verify provenance chain integrity before promotion
        const chainVerification = this.provenanceEngine.verifyChain(candidateId);
        if (!chainVerification.valid) {
            throw new Error(`PROVENANCE_INTEGRITY_FAILURE: Cannot promote candidate. Provenance chain broken: ${chainVerification.reason}`);
        }
        // Execute promotion through PolicyRingPromotionEngine
        const { updatedCandidate, result } = this.promotionEngine.promote(candidate, request);
        this.candidatePackages.set(candidateId, updatedCandidate);
        // Record promotion in provenance
        this.provenanceEngine.recordEvent({
            candidateId,
            tenantPartition: request.tenantPartition,
            ring: request.targetRing,
            eventType: `PROMOTED_TO_${request.targetRing}`,
            candidatePolicyVersion: updatedCandidate.policyConfig.versionId,
            evidenceReference: request.healthEvidence.healthId,
            authorizationReference: request.authorizationToken,
        });
        // Update assignment in router
        const currentAssignment = this.router.getRingAssignment(request.tenantPartition);
        if (currentAssignment) {
            this.router.assignTenantRing({
                ...currentAssignment,
                ring: request.targetRing,
            });
        }
        // If promoted to RING_4 (GLOBAL), atomically hot-swap candidate into active policy
        if (request.targetRing === 'RING_4') {
            this.hotSwapEngine.swapPolicy({
                tenantPartition: request.tenantPartition,
                newConfig: updatedCandidate.policyConfig,
                provenanceReference: result.provenanceHash,
            });
        }
        // Persist updated candidate and ring assignment to durable store
        const { store } = this.getStoreForTenant(request.tenantPartition);
        const existing = store.read();
        if (existing) {
            const sanitizedCandidate = JSON.parse(this.sanitizer.sanitize(JSON.stringify(updatedCandidate)));
            const updatedCandidates = [
                ...existing.candidatePackages.filter((c) => c.candidateId !== candidateId),
                sanitizedCandidate,
            ];
            const updatedAssignments = existing.ringAssignments.map((a) => a.tenantPartition === request.tenantPartition
                ? { ...a, ring: request.targetRing }
                : a);
            store.write({
                ...existing,
                candidatePackages: updatedCandidates,
                ringAssignments: updatedAssignments,
                lastUpdated: new Date().toISOString(),
            });
        }
        return result;
    }
    /**
     * Rolls back a tenant from canary candidate back to active baseline.
     * Hoàn nguyên một người thuê từ ứng viên canary về đường cơ sở hoạt động.
     */
    rollbackTenant(input) {
        const result = this.rollbackEngine.rollbackTenant(input);
        this.provenanceEngine.recordEvent({
            candidateId: input.candidateId,
            tenantPartition: input.tenantPartition,
            ring: 'RING_0',
            eventType: 'TENANT_ROLLED_BACK',
            candidatePolicyVersion: this.candidatePackages.get(input.candidateId)?.policyConfig.versionId || 'unknown',
            evidenceReference: input.reason,
        });
        return result;
    }
    /**
     * Helper returning registered candidate package.
     * Hàm trợ giúp trả về gói ứng viên đã đăng ký.
     */
    getCandidate(candidateId) {
        return this.candidatePackages.get(candidateId);
    }
    /**
     * Helper returning the router instance.
     * Hàm trợ giúp trả về thể hiện bộ định tuyến.
     */
    getRouter() {
        return this.router;
    }
    /**
     * Helper returning the circuit breaker instance.
     * Hàm trợ giúp trả về thể hiện bộ ngắt mạch.
     */
    getCircuitBreaker() {
        return this.circuitBreaker;
    }
    /**
     * Helper returning the provenance engine instance.
     * Hàm trợ giúp trả về thể hiện động cơ nguồn gốc.
     */
    getProvenanceEngine() {
        return this.provenanceEngine;
    }
    /**
     * Helper returning the telemetry aggregator instance.
     * Hàm trợ giúp trả về thể hiện bộ tổng hợp đo lường.
     */
    getTelemetryAggregator() {
        return this.telemetryAggregator;
    }
    /**
     * Helper returning the recovery engine instance.
     * Hàm trợ giúp trả về thể hiện động cơ phục hồi.
     */
    getRecoveryEngine() {
        return this.recoveryEngine;
    }
    /**
     * Helper returning the fault injector instance.
     * Hàm trợ giúp trả về thể hiện bộ tiêm lỗi.
     */
    getFaultInjector() {
        return this.faultInjector;
    }
    /**
     * Performs crash recovery reconciliation for a tenant partition from durable storage.
     * Restores verified candidate packages into runtime memory and synchs router assignments.
     *
     * Thực hiện đối soát phục hồi sau sự cố cho phân vùng người thuê từ lưu trữ bền vững.
     * Khôi phục các gói ứng viên đã kiểm chứng vào bộ nhớ thời gian chạy và đồng bộ phân bổ của bộ định tuyến.
     */
    reconcileFromDurableStore(userId = DEFAULT_PRIMARY_USER_ID) {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Cannot reconcile canary state during emergency stop.');
        }
        const { store, tenantPartition } = this.getStoreForTenant(userId);
        const result = this.recoveryEngine.reconcileTenantState(tenantPartition, store);
        // Synchronize reconciled memory state
        const postRecord = store.read();
        if (postRecord) {
            for (const candidate of postRecord.candidatePackages) {
                this.candidatePackages.set(candidate.candidateId, candidate);
                this.router.registerCandidate(candidate);
            }
            for (const assignment of postRecord.ringAssignments) {
                this.router.assignTenantRing(assignment);
            }
        }
        return result;
    }
    /**
     * Clears in-memory runtime caches (used in testing).
     * Xóa bộ nhớ cache thời gian chạy trong bộ nhớ (dùng trong kiểm thử).
     */
    clear() {
        this.router.clearAll();
        this.circuitBreaker.clear();
        this.provenanceEngine.clear();
        this.candidatePackages.clear();
        this.faultInjector.disarmAll();
        this.recoveryEngine.clear();
    }
}
export const globalPolicyCanaryRuntime = new PolicyCanaryRuntime();
