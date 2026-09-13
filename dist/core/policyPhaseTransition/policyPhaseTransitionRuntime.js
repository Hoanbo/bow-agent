// src/core/policyPhaseTransition/policyPhaseTransitionRuntime.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Master Phase Transition Runtime Coordinator (Component 882).
// Orchestrates the end-to-end, human-governed phase exit and Phase 1.4 entry lifecycle.
//
// Core Authority Invariants:
// - READINESS != AUTHORIZATION
// - RECOMMENDATION != DECLARATION
// - PHASE_EXIT_CANDIDATE != PHASE_EXIT_COMMIT
// - PHASE_EXIT_COMMIT != PHASE_1_4_ENTRY
// - PHASE_1_4_ENTRY_READY != PHASE_1_4_ENTRY_COMMIT
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - AUTONOMOUS_PHASE_EXIT = FORBIDDEN
// - AUTONOMOUS_PHASE_1_4_ENTRY = FORBIDDEN
// - ZERO POLICY MUTATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import { PolicyPhaseExitReviewEngine } from './policyPhaseExitReviewEngine.js';
import { PolicyPhaseExitAuthorizationBoundary } from './policyPhaseExitAuthorizationBoundary.js';
import { PolicyPhaseExitTransitionEngine } from './policyPhaseExitTransitionEngine.js';
import { PolicyPhase14EntryReadinessEngine } from './policyPhase14EntryReadinessEngine.js';
import { PolicyPhase14EntryAuthorizationBoundary } from './policyPhase14EntryAuthorizationBoundary.js';
import { PolicyPhase14EntryTransitionEngine } from './policyPhase14EntryTransitionEngine.js';
import { PolicyPhaseTransitionStore } from './policyPhaseTransitionStore.js';
import { PolicyPhaseTransitionProvenanceEngine } from './policyPhaseTransitionProvenanceEngine.js';
import { PolicyPhaseTransitionAuditEngine } from './policyPhaseTransitionAuditEngine.js';
export class PolicyPhaseTransitionRuntime {
    reviewEngine;
    exitAuthBoundary;
    exitTransitionEngine;
    entryReadinessEngine;
    entryAuthBoundary;
    entryTransitionEngine;
    store;
    provenanceEngine;
    auditEngine;
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.reviewEngine = new PolicyPhaseExitReviewEngine(options);
        this.exitAuthBoundary = new PolicyPhaseExitAuthorizationBoundary(options);
        this.exitTransitionEngine = new PolicyPhaseExitTransitionEngine(options);
        this.entryReadinessEngine = new PolicyPhase14EntryReadinessEngine(options);
        this.entryAuthBoundary = new PolicyPhase14EntryAuthorizationBoundary(options);
        this.entryTransitionEngine = new PolicyPhase14EntryTransitionEngine(options);
        this.store = new PolicyPhaseTransitionStore(options);
        this.provenanceEngine = new PolicyPhaseTransitionProvenanceEngine(options);
        this.auditEngine = new PolicyPhaseTransitionAuditEngine(options);
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Transition runtime suspended by USER_STOP supremacy');
        }
    }
    /**
     * Returns the current phase for a given tenant.
     */
    getCurrentPhase(tenantId) {
        this.assertUserStopInactive();
        return this.store.getCurrentPhase(tenantId);
    }
    /**
     * 1. Generates a PhaseExitCandidate and ReviewPackage from verified MS-1.3.76 evidence.
     * Strictly non-mutating; does NOT alter current phase state or authorize exit.
     */
    generatePhaseExitCandidate(params) {
        this.assertUserStopInactive();
        const result = this.reviewEngine.generateExitCandidate(params);
        // Save candidate in store
        this.store.saveCandidate(result.candidate);
        // Record in append-only provenance
        this.provenanceEngine.recordTransitionEvent({
            tenantId: result.candidate.tenantId,
            transitionType: 'PHASE_1_3_EXIT',
            targetPhase: 'PHASE_1_3_EXIT_PENDING_REVIEW',
            entityId: result.candidate.candidateId,
            payload: {
                candidateId: result.candidate.candidateId,
                readinessReportId: result.candidate.readinessReportId,
                proposedBy: result.candidate.proposedBy,
            },
        });
        // Record audit event
        this.auditEngine.recordEvent({
            eventType: 'PHASE_EXIT_CANDIDATE_CREATED',
            tenantId: result.candidate.tenantId,
            actorUserId: params.proposedBy,
            details: {
                candidateId: result.candidate.candidateId,
                readinessReportId: result.candidate.readinessReportId,
            },
        });
        return result;
    }
    /**
     * 2. Authorizes Phase 1.3 Exit through the non-bypassable human authorization boundary.
     */
    authorizePhaseExit(params) {
        this.assertUserStopInactive();
        try {
            const authRecord = this.exitAuthBoundary.authorizePhaseExit(params.candidate, params.request);
            // Save authorization in store
            this.store.saveExitAuthorization(authRecord);
            // Record in provenance chain
            this.provenanceEngine.recordTransitionEvent({
                tenantId: authRecord.tenantId,
                transitionType: 'PHASE_1_3_EXIT',
                targetPhase: authRecord.decision === 'AUTHORIZED' ? 'PHASE_1_3_EXIT_AUTHORIZED' : 'PHASE_1_3_EXIT_PENDING_REVIEW',
                entityId: authRecord.authorizationId,
                payload: {
                    authorizationId: authRecord.authorizationId,
                    candidateId: authRecord.candidateId,
                    authorizedBy: authRecord.authorizedBy,
                    decision: authRecord.decision,
                },
            });
            // Audit event
            this.auditEngine.recordEvent({
                eventType: authRecord.decision === 'AUTHORIZED' ? 'PHASE_EXIT_AUTHORIZED' : 'PHASE_EXIT_AUTHORIZATION_BLOCKED',
                tenantId: authRecord.tenantId,
                actorUserId: authRecord.authorizedBy,
                actorRole: authRecord.operatorRole,
                details: {
                    authorizationId: authRecord.authorizationId,
                    candidateId: authRecord.candidateId,
                    decision: authRecord.decision,
                    rationale: authRecord.rationale,
                },
            });
            return authRecord;
        }
        catch (err) {
            this.auditEngine.recordEvent({
                eventType: 'PHASE_EXIT_AUTHORIZATION_BLOCKED',
                tenantId: params.candidate.tenantId,
                actorUserId: params.request.authorizedBy,
                details: {
                    candidateId: params.candidate.candidateId,
                    error: err.message,
                },
                executionStatus: 'BLOCKED',
            });
            throw err;
        }
    }
    /**
     * 3. Atomically commits Phase 1.3 exit.
     * Strictly requires Phase 1.3 human authorization.
     * Does NOT automatically transition into Phase 1.4.
     */
    commitPhaseExit(params) {
        this.assertUserStopInactive();
        // Verify provenance chain integrity before committing
        const chainVerification = this.provenanceEngine.verifyChain(params.candidate.tenantId);
        if (!chainVerification.valid) {
            throw new Error(`PROVENANCE_INTEGRITY_FAILURE: Cannot commit phase exit: ${chainVerification.error}`);
        }
        const currentPhase = this.store.getCurrentPhase(params.candidate.tenantId);
        const commitRecord = this.exitTransitionEngine.commitPhaseExit({
            candidate: params.candidate,
            authorization: params.authorization,
            currentPhase,
            committedBy: params.committedBy,
        });
        // Save commit in store
        this.store.saveExitCommit(commitRecord);
        // Record in provenance chain
        this.provenanceEngine.recordTransitionEvent({
            tenantId: commitRecord.tenantId,
            transitionType: 'PHASE_1_3_EXIT',
            targetPhase: 'PHASE_1_3_EXIT_COMMITTED',
            entityId: commitRecord.commitId,
            payload: {
                commitId: commitRecord.commitId,
                candidateId: commitRecord.candidateId,
                authorizationId: commitRecord.authorizationId,
                committedBy: commitRecord.committedBy,
            },
        });
        // Emit canonical audit event
        this.auditEngine.recordEvent({
            eventType: 'PHASE_EXIT_COMMITTED',
            tenantId: commitRecord.tenantId,
            actorUserId: commitRecord.committedBy,
            details: {
                commitId: commitRecord.commitId,
                candidateId: commitRecord.candidateId,
                previousPhase: commitRecord.previousPhase,
                committedPhase: commitRecord.committedPhase,
            },
        });
        return commitRecord;
    }
    /**
     * 4. Evaluates whether Phase 1.4 entry prerequisites are satisfied.
     * Advisory only; creates ZERO entry transitions.
     */
    evaluatePhase14EntryReadiness(params) {
        this.assertUserStopInactive();
        const readinessRecord = this.entryReadinessEngine.evaluateEntryReadiness(params);
        this.store.saveEntryReadiness(readinessRecord);
        this.auditEngine.recordEvent({
            eventType: readinessRecord.status === 'PHASE_1_4_ENTRY_READY' ? 'PHASE_1_4_ENTRY_READY' : 'PHASE_1_4_ENTRY_BLOCKED',
            tenantId: params.tenantId,
            details: {
                readinessId: readinessRecord.readinessId,
                status: readinessRecord.status,
                reasons: readinessRecord.reasons,
            },
        });
        return readinessRecord;
    }
    /**
     * 5. Authorizes Phase 1.4 entry through separate, non-bypassable human authorization boundary.
     */
    authorizePhase14Entry(params) {
        this.assertUserStopInactive();
        try {
            const authRecord = this.entryAuthBoundary.authorizePhase14Entry(params.readiness, params.request);
            this.store.saveEntryAuthorization(authRecord);
            this.provenanceEngine.recordTransitionEvent({
                tenantId: authRecord.tenantId,
                transitionType: 'PHASE_1_4_ENTRY',
                targetPhase: authRecord.decision === 'AUTHORIZED' ? 'PHASE_1_4_ENTRY_AUTHORIZED' : 'PHASE_1_4_ENTRY_READY',
                entityId: authRecord.authorizationId,
                payload: {
                    authorizationId: authRecord.authorizationId,
                    readinessId: authRecord.readinessId,
                    authorizedBy: authRecord.authorizedBy,
                    decision: authRecord.decision,
                },
            });
            this.auditEngine.recordEvent({
                eventType: authRecord.decision === 'AUTHORIZED' ? 'PHASE_1_4_ENTRY_AUTHORIZED' : 'PHASE_1_4_ENTRY_AUTHORIZATION_BLOCKED',
                tenantId: authRecord.tenantId,
                actorUserId: authRecord.authorizedBy,
                actorRole: authRecord.operatorRole,
                details: {
                    authorizationId: authRecord.authorizationId,
                    readinessId: authRecord.readinessId,
                    decision: authRecord.decision,
                    rationale: authRecord.rationale,
                },
            });
            return authRecord;
        }
        catch (err) {
            this.auditEngine.recordEvent({
                eventType: 'PHASE_1_4_ENTRY_AUTHORIZATION_BLOCKED',
                tenantId: params.readiness.tenantId,
                actorUserId: params.request.authorizedBy,
                details: {
                    readinessId: params.readiness.readinessId,
                    error: err.message,
                },
                executionStatus: 'BLOCKED',
            });
            throw err;
        }
    }
    /**
     * 6. Atomically commits Phase 1.4 entry.
     * Requires Phase 1.3 exit commit and separate Phase 1.4 human authorization.
     */
    commitPhase14Entry(params) {
        this.assertUserStopInactive();
        const chainVerification = this.provenanceEngine.verifyChain(params.exitCommit.tenantId);
        if (!chainVerification.valid) {
            throw new Error(`PROVENANCE_INTEGRITY_FAILURE: Cannot commit Phase 1.4 entry: ${chainVerification.error}`);
        }
        const currentPhase = this.store.getCurrentPhase(params.exitCommit.tenantId);
        const commitRecord = this.entryTransitionEngine.commitPhase14Entry({
            exitCommit: params.exitCommit,
            entryReadiness: params.entryReadiness,
            entryAuthorization: params.entryAuthorization,
            currentPhase,
            committedBy: params.committedBy,
        });
        this.store.saveEntryCommit(commitRecord);
        this.provenanceEngine.recordTransitionEvent({
            tenantId: commitRecord.tenantId,
            transitionType: 'PHASE_1_4_ENTRY',
            targetPhase: 'PHASE_1_4_ENTRY_COMMITTED',
            entityId: commitRecord.commitId,
            payload: {
                commitId: commitRecord.commitId,
                exitCommitId: commitRecord.exitCommitId,
                entryReadinessId: commitRecord.entryReadinessId,
                authorizationId: commitRecord.authorizationId,
                committedBy: commitRecord.committedBy,
            },
        });
        this.auditEngine.recordEvent({
            eventType: 'PHASE_1_4_ENTRY_COMMITTED',
            tenantId: commitRecord.tenantId,
            actorUserId: commitRecord.committedBy,
            details: {
                commitId: commitRecord.commitId,
                previousPhase: commitRecord.previousPhase,
                committedPhase: commitRecord.committedPhase,
            },
        });
        return commitRecord;
    }
}
