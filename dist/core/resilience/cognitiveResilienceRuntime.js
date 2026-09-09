// src/core/resilience/cognitiveResilienceRuntime.ts
// BOWCON V4.0 — MS-1.3.43: MASTER OWNER COGNITIVE RESILIENCE RUNTIME
//
// Bounded Recovery Lifecycle:
//   DETECT → CLASSIFY → ASSESS → PROPOSE RECOVERY → GOVERN →
//   AUTHORIZE IF REQUIRED → RECOVER → VERIFY → LEARN
//
// INVARIANTS:
// USER_STOP > EVERYTHING_AUTONOMOUS
// RECOVERY cannot bypass HumanGate for sensitive operations.
// Recovery cannot become a mechanism for authority escalation.
// Infinite retry is prohibited. Recursive recovery is prohibited.
// C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
import { generateResilienceId, } from './cognitiveResilienceTypes.js';
import { MASTER_OWNER_ID, isMasterOwner } from '../architecture/masterArchitectureIdentity.js';
// Maximum recovery attempts before escalation to BLOCKED
const MAX_RECOVERY_ATTEMPTS_DEFAULT = 3;
// Maximum active recovery proposals before storm prevention kicks in
const MAX_ACTIVE_PROPOSALS = 5;
export class CognitiveResilienceRuntime {
    _healthState = 'HEALTHY';
    _isStopped = false;
    _stopReason = '';
    _failures = new Map();
    _proposals = new Map();
    _attempts = new Map();
    _verifications = new Map();
    _resolvedFailures = new Set();
    _stateStore;
    _createdAt = Date.now();
    constructor(options) {
        this._stateStore = options?.stateStore;
        if (this._stateStore) {
            this.restoreDurableState();
        }
    }
    getStateStore() {
        return this._stateStore;
    }
    // INVARIANT: USER_STOP > EVERYTHING_AUTONOMOUS
    emergencyStop(reason = 'Master Owner USER_STOP invoked') {
        this._isStopped = true;
        this._stopReason = reason;
        this._healthState = 'BLOCKED';
        // Cancel all in-progress attempts
        for (const attempts of this._attempts.values()) {
            for (const att of attempts) {
                if (att.status === 'IN_PROGRESS') {
                    att.status = 'BLOCKED_BY_STOP';
                    att.error = `Halted by USER_STOP: ${reason}`;
                }
            }
        }
        if (this._stateStore) {
            this.saveDurableState();
        }
    }
    resetStop(operatorId) {
        if (!isMasterOwner(operatorId)) {
            throw new Error(`[AUTHORITY_DENIED] Only Master Owner (${MASTER_OWNER_ID}) may reset emergency stop.`);
        }
        this._isStopped = false;
        this._stopReason = '';
        this._healthState = 'HEALTHY';
        if (this._stateStore) {
            this.saveDurableState();
        }
    }
    isStopped() {
        return this._isStopped;
    }
    getHealthState() {
        return this._healthState;
    }
    // ---------------------------------------------------------------------------
    // STEP 1: DETECT & CLASSIFY a failure event
    // ---------------------------------------------------------------------------
    detectFailure(params) {
        // Infer class from evidence if not supplied
        const inferredClass = params.failureClass ?? this._inferFailureClass(params.description, params.evidence);
        // Check for recurring failures
        const priorFailureIds = Array.from(this._failures.values())
            .filter((f) => f.affectedComponent === params.affectedComponent && !this._resolvedFailures.has(f.failureId))
            .map((f) => f.failureId);
        const isRecurring = priorFailureIds.length >= 2;
        const finalClass = isRecurring ? 'REPEATED_RECOVERY_FAILURE' : inferredClass;
        const record = {
            failureId: generateResilienceId('fail'),
            timestamp: Date.now(),
            failureClass: finalClass,
            description: params.description,
            affectedComponent: params.affectedComponent,
            affectedCapability: params.affectedCapability,
            evidence: params.evidence,
            severity: params.severity,
            isRecurring,
            priorFailureIds,
        };
        this._failures.set(record.failureId, record);
        // Update health state
        if (params.severity === 'CRITICAL' || params.severity === 'HIGH') {
            this._healthState = 'DEGRADED';
        }
        else if (this._healthState === 'HEALTHY') {
            this._healthState = 'DEGRADED';
        }
        if (this._stateStore) {
            this.saveDurableState();
        }
        return record;
    }
    _inferFailureClass(description, evidence) {
        const combined = [description, ...evidence].join(' ').toLowerCase();
        if (combined.includes('stale') || combined.includes('expired') || combined.includes('outdated'))
            return 'STALE_STATE';
        if (combined.includes('unavailable') || combined.includes('not found') || combined.includes('missing capability'))
            return 'CAPABILITY_UNAVAILABLE';
        if (combined.includes('interrupt') || combined.includes('partial') && combined.includes('execution'))
            return 'PARTIAL_EXECUTION';
        if (combined.includes('corrupt') || combined.includes('integrity') || combined.includes('hash mismatch'))
            return 'STATE_CORRUPTED';
        if (combined.includes('contradict'))
            return 'CONTRADICTED';
        if (combined.includes('telemetry') || combined.includes('unmeasured') || combined.includes('unknown host'))
            return 'TELEMETRY_DEGRADED';
        if (combined.includes('verification') || combined.includes('unverified'))
            return 'VERIFICATION_INCOMPLETE';
        if (combined.includes('execution failed') || combined.includes('error'))
            return 'EXECUTION_FAILURE';
        return 'TRANSIENT';
    }
    // ---------------------------------------------------------------------------
    // STEP 2: ASSESS and PROPOSE RECOVERY
    // ---------------------------------------------------------------------------
    proposeRecovery(failureId) {
        if (this._isStopped) {
            throw new Error(`RUNTIME_STOPPED: Cannot propose recovery under USER_STOP (${this._stopReason}).`);
        }
        const failure = this._failures.get(failureId);
        if (!failure)
            throw new Error(`Failure record '${failureId}' not found.`);
        // Recovery storm prevention: cap active proposals
        const activeProposals = Array.from(this._proposals.values())
            .filter((p) => !this._resolvedFailures.has(p.failureId)).length;
        if (activeProposals >= MAX_ACTIVE_PROPOSALS) {
            throw new Error(`RECOVERY_STORM_PREVENTION: Too many active recovery proposals (${activeProposals}/${MAX_ACTIVE_PROPOSALS}). Operator intervention required.`);
        }
        const { recoveryClass, steps, requiresOwnerApproval, isReversible } = this._classifyRecovery(failure);
        const proposal = {
            proposalId: generateResilienceId('prop'),
            failureId,
            timestamp: Date.now(),
            recoveryClass,
            description: `Proposed recovery for ${failure.failureClass}: ${failure.description}`,
            steps,
            isReversible,
            estimatedImpact: requiresOwnerApproval ? 'HIGH — requires authorization' : 'LOW — autonomous safe operation',
            maxAttempts: MAX_RECOVERY_ATTEMPTS_DEFAULT,
            requiresOwnerApproval,
        };
        this._proposals.set(proposal.proposalId, proposal);
        if (this._stateStore) {
            this.saveDurableState();
        }
        return proposal;
    }
    _classifyRecovery(failure) {
        switch (failure.failureClass) {
            case 'TRANSIENT':
                return {
                    recoveryClass: 'AUTO_SAFE',
                    steps: ['Wait for transient condition to clear', 'Re-run cognitive observation cycle', 'Verify health state'],
                    requiresOwnerApproval: false,
                    isReversible: true,
                };
            case 'STALE_STATE':
                return {
                    recoveryClass: 'AUTO_SAFE',
                    steps: ['Trigger re-discovery of stale component', 'Update world model with fresh telemetry', 'Verify temporal freshness'],
                    requiresOwnerApproval: false,
                    isReversible: true,
                };
            case 'TELEMETRY_DEGRADED':
                return {
                    recoveryClass: 'AUTO_SAFE',
                    steps: ['Mark degraded telemetry as UNKNOWN', 'Re-attempt host discovery', 'Report UNKNOWN state to Owner briefing'],
                    requiresOwnerApproval: false,
                    isReversible: true,
                };
            case 'CAPABILITY_UNAVAILABLE':
                return {
                    recoveryClass: 'AUTO_SAFE',
                    steps: ['Mark capability as UNAVAILABLE', 'Update plan feasibility to PLAN_BLOCKED', 'Notify Owner with gap report'],
                    requiresOwnerApproval: false,
                    isReversible: true,
                };
            case 'VERIFICATION_INCOMPLETE':
                return {
                    recoveryClass: 'AUTO_REVERSIBLE',
                    steps: ['Re-attempt verification of execution output', 'If re-verification fails, escalate to BLOCKED', 'Preserve original execution record'],
                    requiresOwnerApproval: false,
                    isReversible: true,
                };
            case 'CYCLE_INTERRUPTED':
                return {
                    recoveryClass: 'AUTO_REVERSIBLE',
                    steps: ['Detect interrupted cycle checkpoint', 'Resume from last verified checkpoint', 'Verify cycle completion'],
                    requiresOwnerApproval: false,
                    isReversible: true,
                };
            case 'CONTRADICTED':
                return {
                    recoveryClass: 'AUTO_SAFE',
                    steps: ['Preserve both contradicting claims', 'Flag as CONTRADICTED in world model', 'Request Owner resolution if critical'],
                    requiresOwnerApproval: failure.severity === 'CRITICAL',
                    isReversible: true,
                };
            case 'STATE_CORRUPTED':
                return {
                    recoveryClass: 'HUMAN_REQUIRED',
                    steps: ['Reject corrupted state entirely', 'Trigger fresh state rebuild from authoritative sources', 'Verify integrity hash of rebuilt state', 'Request Owner confirmation before resuming'],
                    requiresOwnerApproval: true,
                    isReversible: false,
                };
            case 'EXECUTION_FAILURE':
                return {
                    recoveryClass: 'HUMAN_REQUIRED',
                    steps: ['Record execution failure with evidence', 'Do not retry without Owner authorization', 'Present failure context to Owner', 'Await Owner decision on retry or abandon'],
                    requiresOwnerApproval: true,
                    isReversible: false,
                };
            case 'PARTIAL_EXECUTION':
                return {
                    recoveryClass: 'HUMAN_REQUIRED',
                    steps: ['Record partial execution state', 'Determine if rollback is safe', 'Present rollback or completion options to Owner', 'Execute chosen option only after Owner authorization'],
                    requiresOwnerApproval: true,
                    isReversible: false,
                };
            case 'REPEATED_RECOVERY_FAILURE':
                return {
                    recoveryClass: 'BLOCKED',
                    steps: ['Halt all autonomous recovery attempts', 'Escalate to Owner with full failure history', 'Await explicit Owner intervention'],
                    requiresOwnerApproval: true,
                    isReversible: false,
                };
            default:
                return {
                    recoveryClass: 'HUMAN_REQUIRED',
                    steps: ['Classify failure manually', 'Request Owner guidance'],
                    requiresOwnerApproval: true,
                    isReversible: false,
                };
        }
    }
    // ---------------------------------------------------------------------------
    // STEP 3: EXECUTE RECOVERY (bounded, governed)
    // ---------------------------------------------------------------------------
    executeRecovery(proposalId, ownerApprovalToken) {
        if (this._isStopped) {
            throw new Error(`RUNTIME_STOPPED: Cannot execute recovery under USER_STOP (${this._stopReason}).`);
        }
        const proposal = this._proposals.get(proposalId);
        if (!proposal)
            throw new Error(`Recovery proposal '${proposalId}' not found.`);
        // Authorization check
        if (proposal.requiresOwnerApproval && !ownerApprovalToken) {
            throw new Error(`AUTHORIZATION_REQUIRED: Recovery '${proposalId}' requires Master Owner approval token before execution.`);
        }
        // Bounded attempt check
        const priorAttempts = this._attempts.get(proposalId) ?? [];
        if (priorAttempts.length >= proposal.maxAttempts) {
            this._healthState = 'BLOCKED';
            throw new Error(`MAX_ATTEMPTS_REACHED: Recovery '${proposalId}' has exhausted ${proposal.maxAttempts} attempts. Escalation required.`);
        }
        // Protected workspace guard
        if (proposal.target && (proposal.target.includes('shopofbow') || proposal.target.includes('C:\\BOW\\shopofbow'))) {
            throw new Error('SECURITY_VIOLATION: Recovery cannot target protected workspace C:\\BOW\\shopofbow.');
        }
        this._healthState = 'RECOVERING';
        const attempt = {
            attemptId: generateResilienceId('att'),
            proposalId,
            failureId: proposal.failureId,
            attemptIndex: priorAttempts.length,
            startedAt: Date.now(),
            status: 'IN_PROGRESS',
        };
        if (!this._attempts.has(proposalId)) {
            this._attempts.set(proposalId, []);
        }
        this._attempts.get(proposalId).push(attempt);
        if (this._stateStore) {
            this.saveDurableState();
        }
        return attempt;
    }
    // ---------------------------------------------------------------------------
    // STEP 4: VERIFY RECOVERY
    // ---------------------------------------------------------------------------
    verifyRecovery(attemptId, passed, evidence, method = 'DIRECT_OBSERVATION') {
        const verification = {
            verificationId: generateResilienceId('ver'),
            attemptId,
            verifiedAt: Date.now(),
            passed,
            evidence,
            method,
        };
        this._verifications.set(attemptId, verification);
        // Update attempt status and health state
        for (const attempts of this._attempts.values()) {
            const att = attempts.find((a) => a.attemptId === attemptId);
            if (att) {
                att.status = passed ? 'SUCCEEDED' : 'FAILED';
                att.completedAt = Date.now();
                att.verificationPassed = passed;
                // Find the proposal and mark failure resolved if successful
                const proposal = this._proposals.get(att.proposalId);
                if (proposal && passed) {
                    this._resolvedFailures.add(proposal.failureId);
                    this._healthState = 'RECOVERED';
                }
                else if (!passed) {
                    this._healthState = 'DEGRADED';
                }
                break;
            }
        }
        if (this._stateStore) {
            this.saveDurableState();
        }
        return verification;
    }
    // ---------------------------------------------------------------------------
    // STEP 5: LEARN from recovery outcomes (advisory only)
    // ---------------------------------------------------------------------------
    generateRecoveryLessons(failureId) {
        const failure = this._failures.get(failureId);
        if (!failure)
            return [];
        const proposals = Array.from(this._proposals.values()).filter((p) => p.failureId === failureId);
        const lessons = [];
        if (failure.isRecurring) {
            lessons.push(`Recurring failure in '${failure.affectedComponent}' (class: ${failure.failureClass}). Root cause analysis recommended.`);
        }
        for (const prop of proposals) {
            const attempts = this._attempts.get(prop.proposalId) ?? [];
            const succeeded = attempts.filter((a) => a.status === 'SUCCEEDED').length;
            const failed = attempts.filter((a) => a.status === 'FAILED').length;
            if (succeeded > 0) {
                lessons.push(`Recovery class '${prop.recoveryClass}' succeeded after ${attempts.length} attempt(s).`);
            }
            else if (failed === attempts.length && attempts.length > 0) {
                lessons.push(`Recovery class '${prop.recoveryClass}' failed on all ${attempts.length} attempt(s). Consider alternative approach.`);
            }
        }
        if (failure.failureClass === 'REPEATED_RECOVERY_FAILURE') {
            lessons.push('Systemic issue detected. Owner intervention required to break the recovery loop.');
        }
        return lessons;
    }
    // ---------------------------------------------------------------------------
    // Accessors
    // ---------------------------------------------------------------------------
    getAllFailures() {
        return Array.from(this._failures.values());
    }
    getActiveFailures() {
        return Array.from(this._failures.values()).filter((f) => !this._resolvedFailures.has(f.failureId));
    }
    getAllProposals() {
        return Array.from(this._proposals.values());
    }
    getAttemptsForProposal(proposalId) {
        return this._attempts.get(proposalId) ?? [];
    }
    getVerificationForAttempt(attemptId) {
        return this._verifications.get(attemptId);
    }
    isFailureResolved(failureId) {
        return this._resolvedFailures.has(failureId);
    }
    getStopReason() {
        return this._stopReason;
    }
    saveDurableState() {
        if (!this._stateStore)
            return undefined;
        const attemptsRecord = {};
        for (const [key, val] of this._attempts.entries()) {
            attemptsRecord[key] = [...val];
        }
        const verificationsRecord = {};
        for (const [key, val] of this._verifications.entries()) {
            verificationsRecord[key] = val;
        }
        let failedRecoveries = 0;
        let totalRecoveries = 0;
        for (const atts of this._attempts.values()) {
            for (const a of atts) {
                if (a.status === 'SUCCEEDED')
                    totalRecoveries++;
                if (a.status === 'FAILED')
                    failedRecoveries++;
            }
        }
        return this._stateStore.saveState({
            healthState: this._healthState,
            failures: Array.from(this._failures.values()),
            activeProposals: Array.from(this._proposals.values()),
            attempts: attemptsRecord,
            verifications: verificationsRecord,
            resolvedFailureIds: Array.from(this._resolvedFailures.values()),
            recoveryCounters: {
                totalFailures: this._failures.size,
                totalRecoveries,
                failedRecoveries,
            },
            unresolvedRecoveryConditions: Array.from(this._failures.values())
                .filter((f) => !this._resolvedFailures.has(f.failureId))
                .map((f) => f.description),
            isStopped: this._isStopped,
            stopReason: this._stopReason,
            createdAt: this._createdAt,
        });
    }
    restoreDurableState() {
        if (!this._stateStore)
            return undefined;
        const res = this._stateStore.loadState();
        const st = res.state;
        this._healthState = st.healthState;
        this._isStopped = st.isStopped;
        this._stopReason = st.stopReason;
        this._createdAt = st.createdAt;
        this._failures.clear();
        for (const f of st.failures) {
            this._failures.set(f.failureId, f);
        }
        this._proposals.clear();
        for (const p of st.activeProposals) {
            this._proposals.set(p.proposalId, p);
        }
        this._attempts.clear();
        for (const [k, v] of Object.entries(st.attempts)) {
            this._attempts.set(k, v);
        }
        this._verifications.clear();
        for (const [k, v] of Object.entries(st.verifications)) {
            this._verifications.set(k, v);
        }
        this._resolvedFailures.clear();
        for (const r of st.resolvedFailureIds) {
            this._resolvedFailures.add(r);
        }
        return {
            wasReconstructed: res.wasReconstructed,
            wasCorrupted: res.wasCorrupted,
        };
    }
    clear() {
        this._failures.clear();
        this._proposals.clear();
        this._attempts.clear();
        this._verifications.clear();
        this._resolvedFailures.clear();
        this._healthState = 'HEALTHY';
        this._isStopped = false;
        this._stopReason = '';
        if (this._stateStore) {
            this.saveDurableState();
        }
    }
}
export const globalCognitiveResilienceRuntime = new CognitiveResilienceRuntime();
