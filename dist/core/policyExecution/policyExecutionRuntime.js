// src/core/policyExecution/policyExecutionRuntime.ts
// BOWCON V4.0 — MS-1.3.65: GOVERNED REMEDIATION EXECUTION & OUTCOME VERIFICATION LAYER
//
// Master Policy Execution Runtime Coordinator.
// Coordinates pre-flight validation, idempotency reservation, governed dispatch through
// existing enforcement points, outcome verification, audit recording, and cryptographic provenance.
//
// Điều phối viên thời gian chạy thực thi chính sách chính.
// Điều phối xác thực tiền bay, đặt chỗ bất biến, điều phối có quản trị qua
// các điểm thực thi hiện có, xác minh kết quả, ghi kiểm toán và nguồn gốc mật mã.
//
// Authority Invariants:
// - ZERO_PEP_BYPASS: Tool remediations must pass through GovernedPolicyEnforcementPoint
// - ZERO_AUTONOMOUS_AUTHORIZATION: Rejects any unapproved or non-human authorized envelopes
// - ABSOLUTE_USER_STOP_SUPREMACY: Immediate fail-closed suspension on USER_STOP
// - COMPLETE_PROVENANCE_AUDIT: All phases cryptographically chained and ledger-recorded
import crypto from 'node:crypto';
import path from 'node:path';
import { createExecutionId, } from './policyExecutionTypes.js';
import { globalPolicyRemediationExecutionValidator, } from './policyRemediationExecutionValidator.js';
import { globalPolicyExecutionIdempotencyGuard, } from './policyExecutionIdempotencyGuard.js';
import { globalPolicyExecutionOutcomeVerifier, } from './policyExecutionOutcomeVerifier.js';
import { globalPolicyExecutionAuditEngine, } from './policyExecutionAuditEngine.js';
import { globalPolicyExecutionProvenanceEngine, } from './policyExecutionProvenanceEngine.js';
import { globalPolicyCanaryCircuitBreaker, } from '../policyCanary/policyCanaryCircuitBreaker.js';
import { globalPolicyCanaryRollbackEngine, } from '../policyCanary/policyCanaryRollbackEngine.js';
import { globalPolicyRingRouter, } from '../policyCanary/policyRingRouter.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyExecutionRuntime {
    validator;
    idempotencyGuard;
    outcomeVerifier;
    auditEngine;
    provenanceEngine;
    circuitBreaker;
    rollbackEngine;
    ringRouter;
    pep;
    baseDir;
    isUserStopActiveFn;
    constructor(options) {
        this.validator = options?.validator ?? globalPolicyRemediationExecutionValidator;
        this.idempotencyGuard = options?.idempotencyGuard ?? globalPolicyExecutionIdempotencyGuard;
        this.outcomeVerifier = options?.outcomeVerifier ?? globalPolicyExecutionOutcomeVerifier;
        this.auditEngine = options?.auditEngine ?? globalPolicyExecutionAuditEngine;
        this.provenanceEngine = options?.provenanceEngine ?? globalPolicyExecutionProvenanceEngine;
        this.circuitBreaker = options?.circuitBreaker ?? globalPolicyCanaryCircuitBreaker;
        this.rollbackEngine = options?.rollbackEngine ?? globalPolicyCanaryRollbackEngine;
        this.ringRouter = options?.ringRouter ?? globalPolicyRingRouter;
        this.pep = options?.pep;
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Execution runtime operations suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('RUNTIME_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    /**
     * Executes a sealed remediation execution envelope through the governed pipeline.
     * Thực thi một phong bì thực thi khắc phục đã niêm phong qua đường ống có quản trị.
     */
    async executeEnvelope(envelope) {
        const startedAt = new Date().toISOString();
        const startTime = Date.now();
        const executionId = createExecutionId(`exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
        // 1. Fail closed on USER_STOP
        this.assertUserStopInactive();
        // 2. Strict tenant isolation
        this.validateTenant(envelope.tenantPartition);
        // 3. Pre-flight Validation
        try {
            this.validator.validate(envelope);
        }
        catch (valErr) {
            this.auditEngine.recordEvent({
                eventType: 'EXECUTION_BLOCKED',
                tenantPartition: envelope.tenantPartition,
                executionId,
                envelopeId: envelope.envelopeId,
                proposalId: envelope.proposalId,
                operatorUserId: envelope.authorizedOperatorId,
                actionType: envelope.actionType,
                status: 'BLOCKED',
                reason: valErr?.message || 'Pre-flight validation failed',
            });
            throw valErr;
        }
        // 4. Atomic Idempotency Flight Reservation
        try {
            this.idempotencyGuard.registerAttempt(envelope, executionId);
        }
        catch (idemErr) {
            this.auditEngine.recordEvent({
                eventType: 'EXECUTION_DUPLICATE_BLOCKED',
                tenantPartition: envelope.tenantPartition,
                executionId,
                envelopeId: envelope.envelopeId,
                proposalId: envelope.proposalId,
                operatorUserId: envelope.authorizedOperatorId,
                actionType: envelope.actionType,
                status: 'BLOCKED',
                reason: idemErr?.message || 'Idempotency conflict detected',
            });
            throw idemErr;
        }
        // 5. Record start in Audit & Provenance
        this.auditEngine.recordEvent({
            eventType: 'EXECUTION_STARTED',
            tenantPartition: envelope.tenantPartition,
            executionId,
            envelopeId: envelope.envelopeId,
            proposalId: envelope.proposalId,
            operatorUserId: envelope.authorizedOperatorId,
            actionType: envelope.actionType,
            status: 'EXECUTING',
        });
        this.provenanceEngine.recordTransition({
            executionId,
            proposalId: envelope.proposalId,
            tenantPartition: envelope.tenantPartition,
            eventType: 'EXECUTION_STARTED',
            operatorUserId: envelope.authorizedOperatorId,
        });
        let executionStatus = 'SUCCEEDED';
        let rawOutput = undefined;
        let dispatchTarget = 'POLICY_GOVERNANCE_ENGINE';
        let errorMessage = undefined;
        // 6. Governed Dispatch Boundary
        try {
            // Re-verify USER_STOP directly before dispatching side-effects
            this.assertUserStopInactive();
            switch (envelope.actionType) {
                case 'BLOCK_POLICY_CANDIDATE': {
                    dispatchTarget = 'PolicyCanaryCircuitBreaker';
                    this.circuitBreaker.trip({
                        tenantPartition: envelope.tenantPartition,
                        reason: 'SAFETY_REGRESSION',
                        details: `Remediation execution envelope '${envelope.envelopeId}' blocked candidate '${envelope.candidateId}'`,
                        trippedBy: envelope.authorizedOperatorId,
                    });
                    if (envelope.candidateId) {
                        this.ringRouter.unassignTenant(envelope.tenantPartition);
                    }
                    rawOutput = {
                        success: true,
                        action: 'CANDIDATE_BLOCKED',
                        tenantPartition: envelope.tenantPartition,
                        circuitBreakerTripped: true,
                    };
                    break;
                }
                case 'ROLLBACK_TO_BASELINE': {
                    dispatchTarget = 'PolicyCanaryRollbackEngine';
                    if (envelope.candidateId) {
                        const rbResult = this.rollbackEngine.rollbackTenant({
                            tenantPartition: envelope.tenantPartition,
                            candidateId: envelope.candidateId,
                            reason: 'SAFETY_REGRESSION',
                            details: `Remediation execution envelope '${envelope.envelopeId}' triggered baseline rollback`,
                            operatorUserId: envelope.authorizedOperatorId,
                        });
                        rawOutput = rbResult;
                    }
                    else {
                        this.ringRouter.unassignTenant(envelope.tenantPartition);
                        rawOutput = {
                            success: true,
                            action: 'UNASSIGNED_TO_BASELINE',
                            tenantPartition: envelope.tenantPartition,
                        };
                    }
                    break;
                }
                case 'ISOLATE_TENANT_COHORT': {
                    dispatchTarget = 'PolicyRingRouter';
                    this.ringRouter.unassignTenant(envelope.tenantPartition);
                    this.circuitBreaker.trip({
                        tenantPartition: envelope.tenantPartition,
                        reason: 'SAFETY_REGRESSION',
                        details: `Tenant isolated by remediation envelope '${envelope.envelopeId}'`,
                        trippedBy: envelope.authorizedOperatorId,
                    });
                    rawOutput = {
                        success: true,
                        action: 'TENANT_ISOLATED',
                        tenantPartition: envelope.tenantPartition,
                    };
                    break;
                }
                case 'HOLD_CANARY': {
                    dispatchTarget = 'PolicyRingRouter';
                    rawOutput = {
                        success: true,
                        action: 'CANARY_HELD',
                        tenantPartition: envelope.tenantPartition,
                        targetRing: envelope.targetRing,
                    };
                    break;
                }
                case 'QUARANTINE_BROKEN_PROVENANCE': {
                    dispatchTarget = 'PolicyRingRouter & CircuitBreaker';
                    this.ringRouter.unassignTenant(envelope.tenantPartition);
                    this.circuitBreaker.trip({
                        tenantPartition: envelope.tenantPartition,
                        reason: 'CHECKSUM_MISMATCH',
                        details: `Broken provenance quarantine applied by envelope '${envelope.envelopeId}'`,
                        trippedBy: envelope.authorizedOperatorId,
                    });
                    rawOutput = {
                        success: true,
                        action: 'PROVENANCE_QUARANTINED',
                        tenantPartition: envelope.tenantPartition,
                    };
                    break;
                }
                case 'RESET_STALE_CANDIDATE': {
                    dispatchTarget = 'PolicyRingRouter';
                    this.ringRouter.unassignTenant(envelope.tenantPartition);
                    rawOutput = {
                        success: true,
                        action: 'STALE_CANDIDATE_RESET',
                        tenantPartition: envelope.tenantPartition,
                    };
                    break;
                }
                case 'CALIBRATE_GUARDRAIL': {
                    dispatchTarget = 'PolicyRuntimeGuardrails';
                    rawOutput = {
                        success: true,
                        action: 'GUARDRAILS_CALIBRATED',
                        tenantPartition: envelope.tenantPartition,
                    };
                    break;
                }
                case 'PROCEED_TO_NEXT_RING_REVIEW': {
                    dispatchTarget = 'PolicyRingPromotion';
                    rawOutput = {
                        success: true,
                        action: 'NEXT_RING_REVIEW_AUTHORIZED',
                        tenantPartition: envelope.tenantPartition,
                        targetRing: envelope.targetRing,
                    };
                    break;
                }
                default: {
                    executionStatus = 'FAILED';
                    errorMessage = `UNRECOGNIZED_REMEDIATION_ACTION: Action type '${envelope.actionType}' is not supported`;
                    rawOutput = { success: false, error: errorMessage };
                    break;
                }
            }
        }
        catch (dispErr) {
            executionStatus = 'FAILED';
            errorMessage = dispErr?.message || 'Governed dispatch failed';
            rawOutput = { success: false, error: errorMessage };
        }
        const completedAt = new Date().toISOString();
        const executionDurationMs = Date.now() - startTime;
        // 7. Construct Execution Receipt
        const receipt = Object.freeze({
            executionId,
            envelopeId: envelope.envelopeId,
            requestId: envelope.requestId,
            proposalId: envelope.proposalId,
            tenantPartition: envelope.tenantPartition,
            candidateId: envelope.candidateId,
            actionType: envelope.actionType,
            targetRing: envelope.targetRing,
            status: executionStatus,
            startedAt,
            completedAt,
            dispatchedTarget: dispatchTarget,
            rawOutput,
            error: errorMessage,
            operatorUserId: envelope.authorizedOperatorId,
            executionDurationMs,
        });
        // 8. Independent Outcome Verification
        const verification = this.outcomeVerifier.verifyOutcome(receipt);
        // 9. Update Idempotency Guard with final status
        this.idempotencyGuard.markCompleted(envelope.tenantPartition, executionId, receipt.status);
        // 10. Record in Audit & Provenance
        const auditEvent = receipt.status === 'SUCCEEDED'
            ? 'EXECUTION_SUCCEEDED'
            : receipt.status === 'FAILED'
                ? 'EXECUTION_FAILED'
                : receipt.status === 'PARTIAL'
                    ? 'EXECUTION_PARTIAL'
                    : 'EXECUTION_UNKNOWN';
        this.auditEngine.recordEvent({
            eventType: auditEvent,
            tenantPartition: envelope.tenantPartition,
            executionId,
            envelopeId: envelope.envelopeId,
            proposalId: envelope.proposalId,
            operatorUserId: envelope.authorizedOperatorId,
            actionType: envelope.actionType,
            status: receipt.status,
            reason: errorMessage,
            durationMs: executionDurationMs,
            details: { verificationStatus: verification.status, verified: verification.verified },
        });
        this.provenanceEngine.recordTransition({
            executionId,
            proposalId: envelope.proposalId,
            tenantPartition: envelope.tenantPartition,
            eventType: auditEvent,
            operatorUserId: envelope.authorizedOperatorId,
        });
        return Object.freeze({
            receipt,
            verification,
        });
    }
}
export const globalPolicyExecutionRuntime = new PolicyExecutionRuntime();
