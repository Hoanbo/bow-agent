// src/core/policyObservability/policyEvidenceCollector.ts
// BOWCON V4.0 — MS-1.3.62: GOVERNED POLICY OPERATIONAL OBSERVABILITY,
// GOVERNANCE EVIDENCE & RUNTIME INTEGRITY AUDIT LAYER
//
// Governed Policy Evidence Collector (Component 720).
// Passively collects structured evidence records from existing canary pipeline components.
// Does NOT create a second execution path. Does NOT execute tools. Purely observational.
//
// Bộ thu thập bằng chứng chính sách có quản trị (Thành phần 720).
// Thu thập bị động các bản ghi bằng chứng có cấu trúc từ các thành phần đường ống canary hiện có.
// KHÔNG tạo đường dẫn thực thi thứ hai. KHÔNG thực thi công cụ. Thuần túy quan sát.
//
// Authority Invariants:
// - Level 0 Read-Only Evidence Collection
// - OBSERVABILITY != AUTHORITY
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_AUTONOMOUS_PROMOTION
// - USER_STOP > ALL_OBSERVABILITY_OPERATIONS
// - STRICT_TENANT_ISOLATION: Evidence keyed by tenant partition
// - NO_SENSITIVE_PERSISTENCE: Credentials, raw tokens, keys are never stored
import crypto from 'node:crypto';
import { createPolicyEvidenceId, } from './policyObservabilityTypes.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { globalAuditLedger } from '../auditLedger.js';
// In-memory evidence store keyed by tenantPartition
// Each partition stores an ordered ring buffer of evidence records (max 500 per tenant).
// Bộ lưu trữ bằng chứng trong bộ nhớ được khóa theo partitionKey của người thuê.
const MAX_EVIDENCE_PER_TENANT = 500;
export class PolicyEvidenceCollector {
    sanitizer;
    isUserStopActiveFn;
    maxPerTenant;
    // Map<tenantPartition, PolicyEvidenceRecord[]>
    store = new Map();
    constructor(options) {
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.maxPerTenant = options?.maxEvidencePerTenant ?? MAX_EVIDENCE_PER_TENANT;
    }
    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------
    generateId() {
        return `evd_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }
    sanitize(value) {
        return this.sanitizer.sanitizeString(value);
    }
    /**
     * Returns the evidence ring buffer for a tenant partition, creating it if absent.
     * Trả về vòng đệm bằng chứng cho phân vùng người thuê, tạo nếu vắng mặt.
     */
    getBucket(tenantPartition) {
        let bucket = this.store.get(tenantPartition);
        if (!bucket) {
            bucket = [];
            this.store.set(tenantPartition, bucket);
        }
        return bucket;
    }
    /**
     * Appends a record to a tenant bucket, enforcing the ring-buffer limit.
     * Thêm bản ghi vào nhóm người thuê, thực thi giới hạn vòng đệm.
     */
    push(tenantPartition, record) {
        const bucket = this.getBucket(tenantPartition);
        bucket.push(record);
        if (bucket.length > this.maxPerTenant) {
            bucket.shift(); // Evict oldest / Loại bỏ cũ nhất
        }
    }
    // ---------------------------------------------------------------------------
    // Evidence Recording API (passive — called by canary components or tests)
    // API Ghi bằng chứng (thụ động — được gọi bởi các thành phần canary hoặc thử nghiệm)
    // ---------------------------------------------------------------------------
    /**
     * Records a policy evaluation event.
     * Ghi lại sự kiện đánh giá chính sách.
     */
    recordEvaluation(input) {
        if (!input.tenantPartition || input.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_INVARIANT_VIOLATION: tenantPartition required for evidence recording');
        }
        const evidence = {
            evidenceId: createPolicyEvidenceId(this.generateId()),
            eventType: 'EVALUATION',
            tenantPartition: input.tenantPartition,
            activePolicyVersion: input.activePolicyVersion,
            candidatePolicyVersion: input.candidatePolicyVersion,
            currentRing: input.currentRing,
            toolName: this.sanitize(input.toolName),
            activeDecisionAllowed: input.activeDecisionAllowed,
            candidateDecisionAllowed: input.candidateDecisionAllowed,
            isShadowEvaluation: input.isShadowEvaluation,
            correlationId: input.correlationId,
            timestamp: new Date().toISOString(),
            observationWindowStart: input.observationWindowStart,
            observationWindowEnd: input.observationWindowEnd,
        };
        this.push(input.tenantPartition, evidence);
        return evidence;
    }
    /**
     * Records a policy mismatch between active and candidate decision.
     * Ghi lại sự không khớp chính sách giữa quyết định hoạt động và ứng viên.
     */
    recordMismatch(input) {
        if (!input.tenantPartition || input.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_INVARIANT_VIOLATION: tenantPartition required for mismatch evidence');
        }
        const evidence = {
            evidenceId: createPolicyEvidenceId(this.generateId()),
            eventType: 'MISMATCH',
            tenantPartition: input.tenantPartition,
            candidateId: input.candidateId,
            activePolicyVersion: input.activePolicyVersion,
            candidatePolicyVersion: input.candidatePolicyVersion,
            currentRing: input.currentRing,
            toolName: this.sanitize(input.toolName),
            activeAllowed: input.activeAllowed,
            candidateAllowed: input.candidateAllowed,
            divergenceReason: input.divergenceReason,
            timestamp: new Date().toISOString(),
        };
        this.push(input.tenantPartition, evidence);
        return evidence;
    }
    /**
     * Records a guardrail activation event.
     * Ghi lại sự kiện kích hoạt rào chắn.
     */
    recordGuardrail(input) {
        if (!input.tenantPartition || input.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_INVARIANT_VIOLATION: tenantPartition required for guardrail evidence');
        }
        const evidence = {
            evidenceId: createPolicyEvidenceId(this.generateId()),
            eventType: 'GUARDRAIL',
            tenantPartition: input.tenantPartition,
            candidateId: input.candidateId,
            violationType: input.violationType,
            toolName: input.toolName ? this.sanitize(input.toolName) : undefined,
            currentRing: input.currentRing,
            reason: this.sanitize(input.reason),
            timestamp: new Date().toISOString(),
        };
        this.push(input.tenantPartition, evidence);
        return evidence;
    }
    /**
     * Records a ring promotion attempt (success or failure).
     * Ghi lại nỗ lực thăng hạng vòng (thành công hoặc thất bại).
     */
    recordPromotion(input) {
        if (!input.tenantPartition || input.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_INVARIANT_VIOLATION: tenantPartition required for promotion evidence');
        }
        const evidence = {
            evidenceId: createPolicyEvidenceId(this.generateId()),
            eventType: 'PROMOTION',
            tenantPartition: input.tenantPartition,
            candidateId: input.candidateId,
            previousRing: input.previousRing,
            newRing: input.newRing,
            // Hash operator ID to avoid raw user ID exposure in evidence
            // Băm ID người vận hành để tránh lộ ID người dùng thô trong bằng chứng
            operatorUserId: crypto.createHash('sha256').update(input.operatorUserId).digest('hex').slice(0, 16),
            provenanceHash: input.provenanceHash,
            success: input.success,
            failureReason: input.failureReason ? this.sanitize(input.failureReason) : undefined,
            timestamp: new Date().toISOString(),
        };
        this.push(input.tenantPartition, evidence);
        return evidence;
    }
    /**
     * Records a rollback event from RollbackResult.
     * Ghi lại sự kiện hoàn nguyên từ RollbackResult.
     */
    recordRollback(tenantPartition, result, reason) {
        if (!tenantPartition || tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_INVARIANT_VIOLATION: tenantPartition required for rollback evidence');
        }
        const evidence = {
            evidenceId: createPolicyEvidenceId(this.generateId()),
            eventType: 'ROLLBACK',
            tenantPartition,
            candidateId: result.candidateId,
            rolledBackRing: result.rolledBackRing,
            affectedTenants: result.affectedTenants,
            reason,
            restoredBaselineVersion: result.restoredBaselineVersion,
            provenanceHash: result.provenanceHash,
            timestamp: result.rolledBackAt,
        };
        this.push(tenantPartition, evidence);
        return evidence;
    }
    /**
     * Records a circuit breaker state change (trip or reset).
     * Ghi lại thay đổi trạng thái bộ ngắt mạch (kích hoạt hoặc đặt lại).
     */
    recordCircuitBreaker(input) {
        if (!input.tenantPartition || input.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_INVARIANT_VIOLATION: tenantPartition required for circuit breaker evidence');
        }
        const evidence = {
            evidenceId: createPolicyEvidenceId(this.generateId()),
            eventType: 'CIRCUIT_BREAKER',
            tenantPartition: input.tenantPartition,
            candidateId: input.candidateId,
            tripped: input.tripped,
            tripReason: input.tripReason,
            trippedBy: input.trippedBy ? this.sanitize(input.trippedBy) : undefined,
            details: input.details ? this.sanitize(input.details) : undefined,
            timestamp: new Date().toISOString(),
        };
        this.push(input.tenantPartition, evidence);
        return evidence;
    }
    /**
     * Records a crash-recovery reconciliation event from CanaryRecoveryResult.
     * Ghi lại sự kiện đối soát phục hồi sự cố từ CanaryRecoveryResult.
     */
    recordRecovery(tenantPartition, result) {
        if (!tenantPartition || tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_INVARIANT_VIOLATION: tenantPartition required for recovery evidence');
        }
        const evidence = {
            evidenceId: createPolicyEvidenceId(this.generateId()),
            eventType: 'RECOVERY',
            tenantPartition,
            reconciledCandidates: result.reconciledCandidates,
            quarantinedCandidates: result.quarantinedCandidates,
            restoredToBaseline: result.restoredToBaseline,
            disposition: result.disposition,
            details: result.details,
            timestamp: result.timestamp,
        };
        this.push(tenantPartition, evidence);
        return evidence;
    }
    /**
     * Records a human authorization event (success, failure, or token replay rejection).
     * Raw authorization tokens are NEVER stored; operator user IDs are hashed.
     *
     * Ghi lại sự kiện ủy quyền con người (thành công, thất bại hoặc từ chối phát lại mã).
     * Mã ủy quyền thô KHÔNG BAO GIỜ được lưu trữ; ID người dùng vận hành được băm.
     */
    recordAuthorization(input) {
        if (!input.tenantPartition || input.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_INVARIANT_VIOLATION: tenantPartition required for authorization evidence');
        }
        const evidence = {
            evidenceId: createPolicyEvidenceId(this.generateId()),
            eventType: 'AUTHORIZATION',
            tenantPartition: input.tenantPartition,
            candidateId: input.candidateId,
            // Only store a short prefix hash of the operator user ID
            // Chỉ lưu trữ tiền tố băm ngắn của ID người dùng vận hành
            operatorUserIdHash: crypto.createHash('sha256').update(input.operatorUserId).digest('hex').slice(0, 16),
            outcome: input.outcome,
            targetRing: input.targetRing,
            failureReason: input.failureReason ? this.sanitize(input.failureReason) : undefined,
            timestamp: new Date().toISOString(),
        };
        this.push(input.tenantPartition, evidence);
        return evidence;
    }
    /**
     * Records a USER_STOP interruption event.
     * Ghi lại sự kiện ngắt USER_STOP.
     */
    recordUserStop(input) {
        if (!input.tenantPartition || input.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_INVARIANT_VIOLATION: tenantPartition required for USER_STOP evidence');
        }
        const evidence = {
            evidenceId: createPolicyEvidenceId(this.generateId()),
            eventType: 'USER_STOP',
            tenantPartition: input.tenantPartition,
            candidateId: input.candidateId,
            interruptedOperation: this.sanitize(input.interruptedOperation),
            timestamp: new Date().toISOString(),
        };
        this.push(input.tenantPartition, evidence);
        // USER_STOP events are always recorded to the global audit ledger
        // Sự kiện USER_STOP luôn được ghi vào sổ cái kiểm toán toàn cục
        globalAuditLedger.record({
            timestamp: evidence.timestamp,
            actor: { userId: 'policy_observability', role: 'observer', channel: 'internal' },
            domain: 'policy_observability',
            toolName: 'policy_evidence_user_stop',
            classification: 'HIGH_IMPACT',
            policyDecision: 'DENY',
            executionStatus: 'BLOCKED',
            argumentsHash: crypto.createHash('sha256').update(evidence.interruptedOperation).digest('hex').slice(0, 16),
        });
        return evidence;
    }
    /**
     * Records a policy drift or checksum mismatch detection event.
     * Ghi lại sự kiện phát hiện độ lệch chính sách hoặc không khớp mã kiểm tra.
     */
    recordDrift(input) {
        if (!input.tenantPartition || input.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_INVARIANT_VIOLATION: tenantPartition required for drift evidence');
        }
        const evidence = {
            evidenceId: createPolicyEvidenceId(this.generateId()),
            eventType: 'DRIFT',
            tenantPartition: input.tenantPartition,
            candidateId: input.candidateId,
            driftType: input.driftType,
            details: this.sanitize(input.details),
            timestamp: new Date().toISOString(),
        };
        this.push(input.tenantPartition, evidence);
        return evidence;
    }
    /**
     * Records a hard-forbidden action downgrade attempt detection.
     * Ghi lại phát hiện nỗ lực hạ cấp hành động bị cấm tuyệt đối.
     */
    recordHardForbiddenAttempt(input) {
        if (!input.tenantPartition || input.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_INVARIANT_VIOLATION: tenantPartition required for hard-forbidden evidence');
        }
        const evidence = {
            evidenceId: createPolicyEvidenceId(this.generateId()),
            eventType: 'HARD_FORBIDDEN_DOWNGRADE_ATTEMPT',
            tenantPartition: input.tenantPartition,
            candidateId: input.candidateId,
            actionName: this.sanitize(input.actionName),
            circuitBreakerTripped: input.circuitBreakerTripped,
            timestamp: new Date().toISOString(),
        };
        this.push(input.tenantPartition, evidence);
        // Hard-forbidden attempts always recorded to audit ledger as security anomalies
        // Các nỗ lực bị cấm tuyệt đối luôn được ghi vào sổ cái kiểm toán dưới dạng bất thường bảo mật
        globalAuditLedger.record({
            timestamp: evidence.timestamp,
            actor: { userId: 'policy_observability', role: 'observer', channel: 'internal' },
            domain: 'policy_observability',
            toolName: 'policy_evidence_hard_forbidden',
            classification: 'HIGH_IMPACT',
            policyDecision: 'DENY',
            executionStatus: 'BLOCKED',
            argumentsHash: crypto.createHash('sha256').update(evidence.actionName).digest('hex').slice(0, 16),
        });
        return evidence;
    }
    /**
     * Records a shadow evaluation fault containment event.
     * Sanitizes the fault message before storage.
     *
     * Ghi lại sự kiện kiểm soát lỗi đánh giá bóng.
     * Khử trùng thông báo lỗi trước khi lưu trữ.
     */
    recordShadowFault(input) {
        if (!input.tenantPartition || input.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_INVARIANT_VIOLATION: tenantPartition required for shadow fault evidence');
        }
        const evidence = {
            evidenceId: createPolicyEvidenceId(this.generateId()),
            eventType: 'SHADOW_FAULT',
            tenantPartition: input.tenantPartition,
            candidateId: input.candidateId,
            faultMessage: this.sanitize(input.faultMessage),
            activeExecutionUnaffected: input.activeExecutionUnaffected,
            timestamp: new Date().toISOString(),
        };
        this.push(input.tenantPartition, evidence);
        return evidence;
    }
    // ---------------------------------------------------------------------------
    // Evidence Query API (read-only, with strict tenant isolation)
    // API Truy vấn bằng chứng (chỉ đọc, với cô lập người thuê nghiêm ngặt)
    // ---------------------------------------------------------------------------
    /**
     * Executes a read-only evidence query with strict tenant isolation.
     * Anonymous queries (empty tenantPartition) fail closed.
     *
     * Thực thi truy vấn bằng chứng chỉ đọc với cô lập người thuê nghiêm ngặt.
     * Các truy vấn ẩn danh (tenantPartition trống) thất bại theo hướng đóng.
     */
    query(filter) {
        // Strict tenant isolation: anonymous or missing tenant fails closed
        // Cô lập người thuê nghiêm ngặt: người thuê ẩn danh hoặc thiếu thất bại theo hướng đóng
        if (!filter.tenantPartition || filter.tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_ISOLATION_VIOLATION: Anonymous evidence queries are forbidden. tenantPartition required.');
        }
        const bucket = this.store.get(filter.tenantPartition);
        if (!bucket || bucket.length === 0) {
            return [];
        }
        let results = [...bucket];
        // Apply optional filters / Áp dụng bộ lọc tùy chọn
        if (filter.eventTypes && filter.eventTypes.length > 0) {
            const typeSet = new Set(filter.eventTypes);
            results = results.filter(r => typeSet.has(r.eventType));
        }
        if (filter.candidateId) {
            results = results.filter(r => {
                if ('candidateId' in r && r.candidateId) {
                    return r.candidateId === filter.candidateId;
                }
                return false;
            });
        }
        if (filter.rings && filter.rings.length > 0) {
            const ringSet = new Set(filter.rings);
            results = results.filter(r => {
                if ('currentRing' in r && r.currentRing) {
                    return ringSet.has(r.currentRing);
                }
                if ('rolledBackRing' in r && r.rolledBackRing) {
                    return ringSet.has(r.rolledBackRing);
                }
                return false;
            });
        }
        if (filter.fromTimestamp) {
            results = results.filter(r => r.timestamp >= filter.fromTimestamp);
        }
        if (filter.toTimestamp) {
            results = results.filter(r => r.timestamp <= filter.toTimestamp);
        }
        if (filter.correlationId) {
            results = results.filter(r => {
                if ('correlationId' in r && r.correlationId) {
                    return r.correlationId === filter.correlationId;
                }
                return false;
            });
        }
        if (filter.limit && filter.limit > 0) {
            results = results.slice(-filter.limit);
        }
        return Object.freeze(results);
    }
    /**
     * Returns all evidence for a tenant partition (bounded).
     * Strict tenant isolation: no cross-tenant access.
     *
     * Trả về tất cả bằng chứng cho phân vùng người thuê (có giới hạn).
     * Cô lập người thuê nghiêm ngặt: không có quyền truy cập liên người thuê.
     */
    getAll(tenantPartition) {
        if (!tenantPartition || tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_ISOLATION_VIOLATION: tenantPartition required for evidence retrieval');
        }
        return Object.freeze([...(this.store.get(tenantPartition) ?? [])]);
    }
    /**
     * Returns aggregated counts for a tenant partition.
     * Trả về số liệu tổng hợp cho phân vùng người thuê.
     */
    getEvidenceCounts(tenantPartition) {
        if (!tenantPartition || tenantPartition.trim() === '') {
            throw new Error('OBSERVABILITY_ISOLATION_VIOLATION: tenantPartition required for evidence counts');
        }
        const bucket = this.store.get(tenantPartition) ?? [];
        let evaluations = 0, mismatches = 0, guardrails = 0, circuitBreakers = 0;
        let rollbacks = 0, recoveries = 0, userStops = 0, driftEvents = 0;
        let authFailures = 0, tokenReplays = 0, hardForbiddenAttempts = 0, shadowFaults = 0;
        for (const r of bucket) {
            switch (r.eventType) {
                case 'EVALUATION':
                    evaluations++;
                    break;
                case 'MISMATCH':
                    mismatches++;
                    break;
                case 'GUARDRAIL':
                    guardrails++;
                    break;
                case 'CIRCUIT_BREAKER':
                    circuitBreakers++;
                    break;
                case 'ROLLBACK':
                    rollbacks++;
                    break;
                case 'RECOVERY':
                    recoveries++;
                    break;
                case 'USER_STOP':
                    userStops++;
                    break;
                case 'DRIFT':
                    driftEvents++;
                    break;
                case 'AUTHORIZATION':
                    if (r.outcome === 'FAILURE')
                        authFailures++;
                    if (r.outcome === 'REPLAY_REJECTED')
                        tokenReplays++;
                    break;
                case 'HARD_FORBIDDEN_DOWNGRADE_ATTEMPT':
                    hardForbiddenAttempts++;
                    break;
                case 'SHADOW_FAULT':
                    shadowFaults++;
                    break;
            }
        }
        return {
            total: bucket.length,
            evaluations,
            mismatches,
            guardrails,
            circuitBreakers,
            rollbacks,
            recoveries,
            userStops,
            driftEvents,
            authFailures,
            tokenReplays,
            hardForbiddenAttempts,
            shadowFaults,
        };
    }
    /**
     * Clears all evidence for a tenant partition (for testing only).
     * Xóa tất cả bằng chứng cho phân vùng người thuê (chỉ dùng trong thử nghiệm).
     */
    clearTenant(tenantPartition) {
        this.store.delete(tenantPartition);
    }
}
export const globalPolicyEvidenceCollector = new PolicyEvidenceCollector();
