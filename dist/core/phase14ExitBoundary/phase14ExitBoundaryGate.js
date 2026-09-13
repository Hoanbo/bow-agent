// src/core/phase14ExitBoundary/phase14ExitBoundaryGate.ts
// BOWCON V4.0 — MS-1.4.13: PHASE 1.4 EXIT BOUNDARY & INDEPENDENT GOVERNANCE AUDIT
// Component 978: Phase14ExitBoundaryGate
// 7-Checkpoint Synchronous USER_STOP Security Gate & Tenant Boundary Enforcer
import { globalAuditLedger } from '../auditLedger.js';
import { Phase14AuditAbortedError, Phase14SecurityError, Phase14ValidationError, } from './phase14ExitCertificateTypes.js';
export class Phase14ExitBoundaryGate {
    _authority;
    constructor(options) {
        this._authority = options?.authority;
    }
    isUserStopActive() {
        if (this._authority) {
            return this._authority.isUserStopActive;
        }
        // Fallback check on master human authority if instantiated globally
        try {
            const { globalMasterHumanAuthority } = require('../authority/masterHumanAuthority.js');
            if (globalMasterHumanAuthority?.isUserStopActive) {
                return true;
            }
        }
        catch {
            // Ignored if global is not exposed in this module context
        }
        return false;
    }
    getUserStopReason() {
        if (this._authority) {
            return this._authority.userStopReason || 'Master Human Operator Emergency Stop';
        }
        return 'Master Human Operator Emergency Stop';
    }
    emitAbortedAudit(checkpoint, tenantId, reason) {
        try {
            globalAuditLedger.record({
                timestamp: new Date().toISOString(),
                actor: {
                    userId: 'phase14_exit_boundary_gate',
                    role: 'SECURITY_GATE',
                    channel: 'GOVERNANCE_AUDIT',
                },
                domain: 'phase14_exit_boundary',
                toolName: 'Phase14ExitBoundaryGate',
                classification: 'USER_STOP_PREEMPTION',
                argumentsHash: `checkpoint_${checkpoint}_tenant_${tenantId}`,
                policyDecision: 'DENY',
                executionStatus: 'BLOCKED',
                resultHash: 'user_stop_preempted',
            });
        }
        catch {
            // Fail closed audit recording
        }
    }
    /**
     * Validate general string identifier against prototype pollution, path traversal and null bytes
     */
    validateIdentifier(id, paramName) {
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            throw new Phase14ValidationError(`Invalid ${paramName}: must be a non-empty string`);
        }
        if (id.includes('\0')) {
            throw new Phase14SecurityError(`Null byte detected in ${paramName}`);
        }
        if (id.includes('..') || id.includes('/') || id.includes('\\')) {
            throw new Phase14SecurityError(`Path traversal attempt detected in ${paramName}`);
        }
        const lower = id.toLowerCase();
        if (lower.includes('__proto__') ||
            lower.includes('constructor') ||
            lower.includes('prototype')) {
            throw new Phase14SecurityError(`Prototype pollution pattern detected in ${paramName}`);
        }
    }
    /**
     * Checkpoint 1: Audit Initialization Gate
     */
    assertCheckpoint1_AuditInit(tenantId) {
        this.validateIdentifier(tenantId, 'tenantId');
        if (this.isUserStopActive()) {
            const reason = this.getUserStopReason();
            this.emitAbortedAudit('CP1_AUDIT_INIT', tenantId, reason);
            throw new Phase14AuditAbortedError(`Preempted at Checkpoint 1 (Audit Init): ${reason}`);
        }
    }
    /**
     * Checkpoint 2: Evidence Collection Gate
     */
    assertCheckpoint2_EvidenceCollection(tenantId) {
        this.validateIdentifier(tenantId, 'tenantId');
        if (this.isUserStopActive()) {
            const reason = this.getUserStopReason();
            this.emitAbortedAudit('CP2_EVIDENCE_COLLECTION', tenantId, reason);
            throw new Phase14AuditAbortedError(`Preempted at Checkpoint 2 (Evidence Collection): ${reason}`);
        }
    }
    /**
     * Checkpoint 3: Evidence Reconciliation Gate
     */
    assertCheckpoint3_EvidenceReconciliation(tenantId) {
        this.validateIdentifier(tenantId, 'tenantId');
        if (this.isUserStopActive()) {
            const reason = this.getUserStopReason();
            this.emitAbortedAudit('CP3_EVIDENCE_RECONCILIATION', tenantId, reason);
            throw new Phase14AuditAbortedError(`Preempted at Checkpoint 3 (Evidence Reconciliation): ${reason}`);
        }
    }
    /**
     * Checkpoint 4: Exit Criterion Evaluation Gate
     */
    assertCheckpoint4_CriteriaEvaluation(criterionId, tenantId) {
        this.validateIdentifier(tenantId, 'tenantId');
        if (this.isUserStopActive()) {
            const reason = this.getUserStopReason();
            this.emitAbortedAudit(`CP4_EVALUATION_${criterionId}`, tenantId, reason);
            throw new Phase14AuditAbortedError(`Preempted at Checkpoint 4 (Criterion ${criterionId} Evaluation): ${reason}`);
        }
    }
    /**
     * Checkpoint 5: Certificate Construction Gate
     */
    assertCheckpoint5_CertificateConstruction(auditId, tenantId) {
        this.validateIdentifier(auditId, 'auditId');
        this.validateIdentifier(tenantId, 'tenantId');
        if (this.isUserStopActive()) {
            const reason = this.getUserStopReason();
            this.emitAbortedAudit('CP5_CERTIFICATE_CONSTRUCTION', tenantId, reason);
            throw new Phase14AuditAbortedError(`Preempted at Checkpoint 5 (Certificate Construction): ${reason}`);
        }
    }
    /**
     * Checkpoint 6: Certificate Sealing Gate
     */
    assertCheckpoint6_CertificateSealing(auditId, tenantId) {
        this.validateIdentifier(auditId, 'auditId');
        this.validateIdentifier(tenantId, 'tenantId');
        if (this.isUserStopActive()) {
            const reason = this.getUserStopReason();
            this.emitAbortedAudit('CP6_CERTIFICATE_SEALING', tenantId, reason);
            throw new Phase14AuditAbortedError(`Preempted at Checkpoint 6 (Certificate Sealing): ${reason}`);
        }
    }
    /**
     * Checkpoint 7: Certificate Export Gate
     */
    assertCheckpoint7_CertificateExport(auditId, tenantId) {
        this.validateIdentifier(auditId, 'auditId');
        this.validateIdentifier(tenantId, 'tenantId');
        if (this.isUserStopActive()) {
            const reason = this.getUserStopReason();
            this.emitAbortedAudit('CP7_CERTIFICATE_EXPORT', tenantId, reason);
            throw new Phase14AuditAbortedError(`Preempted at Checkpoint 7 (Certificate Export): ${reason}`);
        }
    }
}
