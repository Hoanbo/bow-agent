// src/core/policyEvidence/policyLifecycleTraceEngine.ts
// BOWCON V4.0 — MS-1.3.63: GOVERNED POLICY EVIDENCE QUERY,
// AUDIT CORRELATION & INTEGRITY VERIFICATION LAYER
//
// Governed Policy Lifecycle Trace Engine (Component 724).
// Reconstructs deterministic, read-only policy lifecycle progression:
// STAGED -> RING_0 -> RING_1 -> RING_2 -> RING_3 -> RING_4.
// Distinguishes OBSERVED, AUTHORIZED, EXECUTED, ROLLED_BACK, BLOCKED, FAILED, RECOVERED, and MISSING.
// Never fabricates missing evidence. Strictly read-only.
//
// Động cơ truy vết vòng đời chính sách có quản trị (Thành phần 724).
// Tái tạo tiến trình vòng đời chính sách chỉ đọc, có tính xác định:
// STAGED -> RING_0 -> RING_1 -> RING_2 -> RING_3 -> RING_4.
// Phân biệt OBSERVED, AUTHORIZED, EXECUTED, ROLLED_BACK, BLOCKED, FAILED, RECOVERED và MISSING.
// Không bao giờ ngụy tạo bằng chứng bị thiếu. Hoàn toàn chỉ đọc.
//
// Authority Invariants:
// - Level 0 Read-Only Lifecycle Reconstruction
// - TRACE != EXECUTION
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_AUTONOMOUS_PROMOTION
// - ZERO_AUTONOMOUS_ROLLBACK
// - USER_STOP > ALL_TRACE_OPERATIONS
// - STRICT_TENANT_ISOLATION
// - NO_SPECULATION: Missing evidence explicitly marked MISSING
import crypto from 'node:crypto';
import path from 'node:path';
import { createPolicyLifecycleTraceId, } from './policyEvidenceQueryTypes.js';
import { globalPolicyEvidenceCollector } from '../policyObservability/policyEvidenceCollector.js';
import { globalPolicyCanaryProvenanceEngine } from '../policyCanary/policyCanaryProvenanceEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
const CANONICAL_RINGS = [
    'RING_0',
    'RING_1',
    'RING_2',
    'RING_3',
    'RING_4',
];
export class PolicyLifecycleTraceEngine {
    evidenceCollector;
    provenanceEngine;
    isUserStopActiveFn;
    constructor(options) {
        this.evidenceCollector = options?.evidenceCollector ?? globalPolicyEvidenceCollector;
        this.provenanceEngine = options?.provenanceEngine ?? globalPolicyCanaryProvenanceEngine;
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Policy lifecycle trace reconstruction suspended by USER_STOP');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('LIFECYCLE_TRACE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), path.resolve(process.cwd(), 'data', 'partitions'));
    }
    /**
     * Reconstructs the end-to-end lifecycle trace for a policy candidate.
     * Tái tạo dấu vết vòng đời đầu-cuối cho một ứng viên chính sách.
     */
    reconstructTrace(tenantPartition, candidateId) {
        // 1. Fail-closed on USER_STOP
        this.assertUserStopInactive();
        // 2. Enforce strict tenant isolation
        this.validateTenant(tenantPartition);
        if (!candidateId || typeof candidateId !== 'string' || candidateId.trim().length === 0) {
            throw new Error('INVALID_CANDIDATE_ID: candidateId must be a non-empty string');
        }
        // 3. Gather evidence records for this candidate in this tenant
        const allRecords = this.evidenceCollector.getAll(tenantPartition);
        const candidateRecords = allRecords.filter(r => {
            if ('candidateId' in r && r.candidateId) {
                return r.candidateId === candidateId;
            }
            return false;
        });
        // 4. Gather provenance records from provenance engine
        const provenanceChain = this.provenanceEngine.getChain(candidateId);
        // Filter provenance to matching tenantPartition
        const tenantProvenance = provenanceChain.filter(p => p.tenantPartition === tenantPartition);
        // 5. Build chronological trace events
        const traceEvents = [];
        let detectedCandidateVersion = 'UNKNOWN';
        let proposalId;
        // Process provenance events first as foundational milestones
        for (const prov of tenantProvenance) {
            if (prov.candidatePolicyVersion && detectedCandidateVersion === 'UNKNOWN') {
                detectedCandidateVersion = prov.candidatePolicyVersion;
            }
            if (prov.eventType === 'PROPOSAL' && prov.evidenceReference) {
                proposalId = prov.evidenceReference;
            }
            let status = 'OBSERVED';
            if (prov.eventType === 'AUTHORIZATION') {
                status = 'AUTHORIZED';
            }
            else if (prov.eventType === 'PROMOTION' || prov.eventType === 'ACTIVATION') {
                status = 'EXECUTED';
            }
            else if (prov.eventType === 'ROLLBACK') {
                status = 'ROLLED_BACK';
            }
            traceEvents.push({
                eventId: prov.provenanceId,
                ring: prov.ring,
                eventType: prov.eventType,
                status,
                timestamp: prov.timestamp,
                details: `Provenance record: ${prov.eventType} in ${prov.ring}`,
                provenanceHash: prov.currentHash,
                authorizationRef: prov.authorizationReference,
                evidenceRef: prov.evidenceReference,
            });
        }
        // Process evidence records
        for (const ev of candidateRecords) {
            if ('candidatePolicyVersion' in ev && ev.candidatePolicyVersion && detectedCandidateVersion === 'UNKNOWN') {
                detectedCandidateVersion = ev.candidatePolicyVersion;
            }
            let ring = 'RING_0';
            if ('currentRing' in ev && ev.currentRing) {
                ring = ev.currentRing;
            }
            else if ('rolledBackRing' in ev && ev.rolledBackRing) {
                ring = ev.rolledBackRing;
            }
            else if ('targetRing' in ev && ev.targetRing) {
                ring = ev.targetRing;
            }
            let status = 'OBSERVED';
            let details = `Evidence event: ${ev.eventType}`;
            switch (ev.eventType) {
                case 'EVALUATION':
                    status = ev.isShadowEvaluation ? 'OBSERVED' : 'EXECUTED';
                    details = `Evaluation on ${ev.toolName} (allowed=${ev.activeDecisionAllowed})`;
                    break;
                case 'MISMATCH':
                    status = 'OBSERVED';
                    details = `Decision mismatch on ${ev.toolName} (active=${ev.activeAllowed}, candidate=${ev.candidateAllowed})`;
                    break;
                case 'GUARDRAIL':
                    status = 'BLOCKED';
                    details = `Guardrail violation (${ev.violationType}): ${ev.reason}`;
                    break;
                case 'AUTHORIZATION':
                    status = ev.outcome === 'SUCCESS' ? 'AUTHORIZED' : 'FAILED';
                    details = `Authorization outcome: ${ev.outcome}`;
                    break;
                case 'PROMOTION':
                    status = ev.success ? 'EXECUTED' : 'FAILED';
                    details = `Promotion from ${ev.previousRing} to ${ev.newRing} (success=${ev.success})`;
                    break;
                case 'ROLLBACK':
                    status = 'ROLLED_BACK';
                    details = `Rollback from ${ev.rolledBackRing}: ${ev.reason}`;
                    break;
                case 'CIRCUIT_BREAKER':
                    status = 'BLOCKED';
                    details = `Circuit breaker tripped: ${ev.tripReason ?? 'UNKNOWN'}`;
                    break;
                case 'RECOVERY':
                    status = 'RECOVERED';
                    details = `Recovery reconciliation: ${ev.disposition}`;
                    break;
                case 'USER_STOP':
                    status = 'BLOCKED';
                    details = `Interrupted by USER_STOP: ${ev.interruptedOperation}`;
                    break;
                case 'DRIFT':
                    status = 'FAILED';
                    details = `Drift detected (${ev.driftType}): ${ev.details}`;
                    break;
                case 'HARD_FORBIDDEN_DOWNGRADE_ATTEMPT':
                    status = 'BLOCKED';
                    details = `Hard-forbidden downgrade attempt on ${ev.actionName}`;
                    break;
                case 'SHADOW_FAULT':
                    status = 'FAILED';
                    details = `Shadow evaluation fault: ${ev.faultMessage}`;
                    break;
            }
            traceEvents.push({
                eventId: ev.evidenceId,
                ring,
                eventType: ev.eventType,
                status,
                timestamp: ev.timestamp,
                details,
                provenanceHash: 'provenanceHash' in ev ? ev.provenanceHash : undefined,
            });
        }
        // Sort all events deterministically: timestamp ASC, then eventId ASC
        traceEvents.sort((a, b) => {
            const timeCmp = a.timestamp.localeCompare(b.timestamp);
            if (timeCmp !== 0)
                return timeCmp;
            return a.eventId.localeCompare(b.eventId);
        });
        // 6. Build ring milestones
        const milestones = [];
        const missingRings = [];
        let wasRolledBack = false;
        let rollbackReason;
        let wasCircuitBreakerTripped = false;
        let highestActiveRing = 'RING_0';
        for (const ring of CANONICAL_RINGS) {
            const ringEvents = traceEvents.filter(e => e.ring === ring);
            const ringEvidence = candidateRecords.filter(r => {
                if ('currentRing' in r && r.currentRing === ring)
                    return true;
                if ('rolledBackRing' in r && r.rolledBackRing === ring)
                    return true;
                if ('targetRing' in r && r.targetRing === ring)
                    return true;
                return false;
            });
            const reached = ringEvents.length > 0 || ringEvidence.length > 0;
            if (!reached) {
                missingRings.push(ring);
                milestones.push({
                    ring,
                    reached: false,
                    status: 'MISSING',
                    evaluationCount: 0,
                    mismatchCount: 0,
                    rolledBack: false,
                    circuitBreakerTripped: false,
                    evidenceIds: [],
                });
                continue;
            }
            // Check rollback on this ring
            const ringRollback = ringEvents.find(e => e.status === 'ROLLED_BACK');
            const ringCB = ringEvents.find(e => e.eventType === 'CIRCUIT_BREAKER' || e.eventType === 'HARD_FORBIDDEN_DOWNGRADE_ATTEMPT');
            if (ringRollback) {
                wasRolledBack = true;
                const rbRecord = candidateRecords.find(r => r.eventType === 'ROLLBACK');
                if (rbRecord)
                    rollbackReason = rbRecord.reason;
            }
            if (ringCB) {
                wasCircuitBreakerTripped = true;
            }
            let status = 'OBSERVED';
            if (ringRollback) {
                status = 'ROLLED_BACK';
            }
            else if (ringCB) {
                status = 'BLOCKED';
            }
            else if (ringEvents.some(e => e.status === 'EXECUTED')) {
                status = 'EXECUTED';
            }
            else if (ringEvents.some(e => e.status === 'AUTHORIZED')) {
                status = 'AUTHORIZED';
            }
            const evalCount = ringEvidence.filter(r => r.eventType === 'EVALUATION').length;
            const mismatchCount = ringEvidence.filter(r => r.eventType === 'MISMATCH').length;
            const firstEvent = ringEvents[0];
            const authEvent = ringEvents.find(e => e.eventType === 'AUTHORIZATION' && e.status === 'AUTHORIZED');
            milestones.push({
                ring,
                reached: true,
                status,
                enteredAt: firstEvent?.timestamp,
                authorizedBy: authEvent?.authorizationRef,
                evaluationCount: evalCount,
                mismatchCount,
                rolledBack: Boolean(ringRollback),
                circuitBreakerTripped: Boolean(ringCB),
                evidenceIds: ringEvidence.map(r => r.evidenceId),
            });
            if (!ringRollback && !ringCB) {
                highestActiveRing = ring;
            }
        }
        // 7. Determine final state and global activation status
        const ring4Milestone = milestones.find(m => m.ring === 'RING_4');
        const isGloballyActive = Boolean(ring4Milestone &&
            ring4Milestone.reached &&
            ring4Milestone.status === 'EXECUTED' &&
            !wasRolledBack &&
            !wasCircuitBreakerTripped);
        let currentState = 'STAGED';
        if (wasRolledBack) {
            currentState = 'ROLLED_BACK';
        }
        else if (wasCircuitBreakerTripped) {
            currentState = 'FAILED_CLOSED';
        }
        else if (isGloballyActive) {
            currentState = 'GLOBAL';
        }
        else if (highestActiveRing === 'RING_0') {
            currentState = 'SHADOWING';
        }
        else if (highestActiveRing === 'RING_1') {
            currentState = 'INTERNAL_CANARY';
        }
        else if (highestActiveRing === 'RING_2') {
            currentState = 'COHORT_CANARY';
        }
        else if (highestActiveRing === 'RING_3') {
            currentState = 'EXPANDED_CANARY';
        }
        return Object.freeze({
            traceId: createPolicyLifecycleTraceId(`trc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`),
            candidateId,
            tenantPartition,
            proposalId,
            candidatePolicyVersion: detectedCandidateVersion,
            currentRing: wasRolledBack ? 'RING_0' : highestActiveRing,
            currentState,
            isGloballyActive,
            wasRolledBack,
            rollbackReason,
            wasCircuitBreakerTripped,
            milestones: Object.freeze(milestones),
            events: Object.freeze(traceEvents),
            reconstructedAt: new Date().toISOString(),
            missingRings: Object.freeze(missingRings),
        });
    }
}
export const globalPolicyLifecycleTraceEngine = new PolicyLifecycleTraceEngine();
