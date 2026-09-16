// src/core/governedPolicyLifecycle/PolicyLifecycleStateManager.ts
// Component 1179: PolicyLifecycleStateManager (REAL)
//
// Governed 8-state policy lifecycle finite-state machine (FSM).
// Enforces allowed/forbidden transition matrices, single-flight mutexes,
// OCC/CAS versioning, crash-safe 4-step atomic persistence, and fail-closed gates.
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { TERMINAL_LIFECYCLE_STATES, InvalidLifecycleTransitionError, PolicyLifecycleOCCConflictError, PolicyLifecycleTenantIsolationError, PolicyLifecycleTerminalStateError, PolicyLifecycleInterlockActiveError, UnauthorizedLifecycleMutationError, computeLifecycleRecordHash, deepFreeze, } from './GovernedPolicyLifecycleTypes.js';
export class PolicyLifecycleStateManager {
    auditLedger;
    interlockCoordinator;
    stateStore = new Map(); // key: tenant:domain:policyId
    singleFlightLocks = new Set(); // key: tenant:domain
    partitionDir;
    constructor(customStoreDir, auditLedger, interlockCoordinator) {
        this.auditLedger = auditLedger;
        this.interlockCoordinator = interlockCoordinator;
        this.partitionDir = customStoreDir || path.resolve(process.cwd(), 'data', 'partitions_governed_policy_lifecycle');
    }
    /**
     * Transition policy operational lifecycle state.
     */
    transitionState(params) {
        this.validateScope(params.tenantId, params.policyDomain);
        const lockKey = `${params.tenantId}:${params.policyDomain}`;
        if (this.singleFlightLocks.has(lockKey)) {
            throw new PolicyLifecycleInterlockActiveError(`CONCURRENT_LIFECYCLE_MUTATION_BLOCKED: A lifecycle transition is already in-flight for tenant '${params.tenantId}' domain '${params.policyDomain}'.`);
        }
        // Pre-transition Interlock Gate
        if (this.interlockCoordinator) {
            this.interlockCoordinator.assertLifecyclePermitted(params.tenantId, params.policyDomain, params.targetState);
        }
        this.singleFlightLocks.add(lockKey);
        try {
            const stateKey = `${params.tenantId}:${params.policyDomain}:${params.policyId}`;
            const currentStateRecord = this.getLifecycleState(params.tenantId, params.policyDomain, params.policyId);
            const currentState = currentStateRecord ? currentStateRecord.state : 'PROPOSED';
            const currentVersion = currentStateRecord ? currentStateRecord.lifecycleVersion : 0;
            const policyVersion = currentStateRecord ? currentStateRecord.policyVersion : 1;
            // 1. OCC / CAS Verification
            if (params.expectedVersion !== undefined && params.expectedVersion !== currentVersion) {
                throw new PolicyLifecycleOCCConflictError(`OCC_CONFLICT: Expected lifecycleVersion ${params.expectedVersion}, but current is ${currentVersion}. Mutation aborted.`);
            }
            // 2. Terminal State Guard
            if (currentStateRecord && TERMINAL_LIFECYCLE_STATES.has(currentStateRecord.state)) {
                throw new PolicyLifecycleTerminalStateError(`TERMINAL_STATE_VIOLATION: Policy is in terminal state '${currentStateRecord.state}'. Resurrection is strictly forbidden.`);
            }
            // 3. State Transition Matrix Validation
            this.assertValidTransition(currentState, params.targetState, params);
            // 4. Construct New Lifecycle Record
            const newRecordId = `lfc_${params.tenantId}_${params.policyId}_v${currentVersion + 1}_${Date.now()}`;
            const canonicalHash = params.canonicalPolicyHash || (currentStateRecord ? currentStateRecord.canonicalPolicyHash : '0'.repeat(64));
            const ratificationId = params.ratificationId || (currentStateRecord ? currentStateRecord.ratificationId : 'rat_bootstrap');
            const rawRecord = {
                recordId: newRecordId,
                tenantId: params.tenantId,
                policyDomain: params.policyDomain,
                policyId: params.policyId,
                policyVersion,
                lifecycleVersion: currentVersion + 1,
                state: params.targetState,
                previousState: currentState,
                reason: params.reason,
                transitionTrigger: params.trigger,
                authorizationRef: params.authorizationRef,
                canonicalPolicyHash: canonicalHash,
                ratificationId,
                updatedAt: Date.now(),
            };
            const recordHash = computeLifecycleRecordHash(rawRecord);
            const frozenRecord = deepFreeze({
                ...rawRecord,
                recordHash,
            });
            // 5. In-Memory and Atomic Disk Persistence
            this.stateStore.set(stateKey, frozenRecord);
            this.persistRecordAtomically(frozenRecord);
            // 6. Operational Audit Emission
            if (this.auditLedger) {
                this.auditLedger.recordEvent({
                    eventType: 'LIFECYCLE_STATE_TRANSITIONED',
                    tenantId: params.tenantId,
                    policyDomain: params.policyDomain,
                    policyId: params.policyId,
                    policyVersion,
                    lifecycleVersion: frozenRecord.lifecycleVersion,
                    fromState: currentState,
                    toState: params.targetState,
                    operatorId: params.authorizationRef?.operatorId,
                    details: {
                        reason: params.reason,
                        trigger: params.trigger,
                        recordHash,
                    },
                });
            }
            return frozenRecord;
        }
        finally {
            this.singleFlightLocks.delete(lockKey);
        }
    }
    /**
     * Retrieve current lifecycle state of a policy.
     */
    getLifecycleState(tenantId, policyDomain, policyId) {
        this.validateScope(tenantId, policyDomain);
        const key = `${tenantId}:${policyDomain}:${policyId}`;
        // Check in-memory store
        const inMemory = this.stateStore.get(key);
        if (inMemory)
            return inMemory;
        // Check on-disk persistence
        const loaded = this.loadFromDisk(tenantId, policyDomain, policyId);
        if (loaded) {
            this.stateStore.set(key, loaded);
            return loaded;
        }
        return undefined;
    }
    /**
     * Register initial ratified policy into lifecycle tracking.
     */
    registerRatifiedPolicy(params) {
        return this.transitionState({
            tenantId: params.tenantId,
            policyDomain: params.policyDomain,
            policyId: params.policyId,
            targetState: 'RATIFIED',
            reason: `Registered authoritative PDP ratification '${params.ratificationId}'`,
            trigger: 'PDP_DEPLOYMENT',
            canonicalPolicyHash: params.canonicalPolicyHash,
            ratificationId: params.ratificationId,
        });
    }
    /**
     * Assert valid transition between FSM states.
     */
    assertValidTransition(from, to, params) {
        if (from === to) {
            throw new InvalidLifecycleTransitionError(`NOOP_TRANSITION_REJECTED: State is already '${from}'. Redundant transition is rejected.`);
        }
        // Explicit Transition Rules
        const allowedTransitions = {
            PROPOSED: ['RATIFIED'],
            RATIFIED: ['STAGED', 'SUSPENDED'],
            STAGED: ['ACTIVE', 'SUSPENDED', 'ROLLED_BACK'],
            ACTIVE: ['DEGRADED', 'SUSPENDED', 'ROLLED_BACK', 'RETIRED'],
            DEGRADED: ['ACTIVE', 'SUSPENDED', 'ROLLED_BACK', 'RETIRED'],
            SUSPENDED: ['ACTIVE', 'ROLLED_BACK', 'RETIRED'],
            ROLLED_BACK: ['RETIRED', 'STAGED'],
            RETIRED: [], // Terminal
        };
        const legalNextStates = allowedTransitions[from] || [];
        if (!legalNextStates.includes(to)) {
            throw new InvalidLifecycleTransitionError(`ILLEGAL_LIFECYCLE_JUMP: Transition from '${from}' to '${to}' is prohibited by the authoritative FSM.`);
        }
        // AUTOMATION != REACTIVATION rule:
        // Any upward transition into ACTIVE from SUSPENDED requires explicit human authorization
        if (from === 'SUSPENDED' && to === 'ACTIVE') {
            if (params.trigger === 'AUTOMATIC_SAFETY_INTERLOCK' || params.trigger === 'HEALTH_DRIFT') {
                throw new UnauthorizedLifecycleMutationError(`AUTOMATION_REACTIVATION_FORBIDDEN: Suspended policy cannot be reactivated by automated triggers or health metrics. Human authorization is required.`);
            }
            if (!params.authorizationRef || !params.authorizationRef.tokenSignature) {
                throw new UnauthorizedLifecycleMutationError(`UNAUTHORIZED_REACTIVATION: Cryptographic Human Authority token is required to reinstate a SUSPENDED policy.`);
            }
        }
        // DEGRADED -> ACTIVE also requires human authorization
        if (from === 'DEGRADED' && to === 'ACTIVE') {
            if (!params.authorizationRef || !params.authorizationRef.tokenSignature) {
                throw new UnauthorizedLifecycleMutationError(`UNAUTHORIZED_DEGRADATION_OVERRIDE: Cryptographic Human Authority token is required to restore an ACTIVE policy from DEGRADED state.`);
            }
        }
        // Retirement requires authorization
        if (to === 'RETIRED') {
            if (!params.authorizationRef || !params.authorizationRef.tokenSignature) {
                throw new UnauthorizedLifecycleMutationError(`UNAUTHORIZED_RETIREMENT: Cryptographic Human Authority token is required to decommission and permanently retire a policy.`);
            }
        }
    }
    /**
     * Multi-tenant scope and Windows filesystem sanitization.
     */
    validateScope(tenantId, policyDomain) {
        if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
            throw new PolicyLifecycleTenantIsolationError('TENANT_ID_REQUIRED: tenantId must be non-empty.');
        }
        if (!policyDomain || typeof policyDomain !== 'string' || policyDomain.trim() === '') {
            throw new PolicyLifecycleTenantIsolationError('POLICY_DOMAIN_REQUIRED: policyDomain must be non-empty.');
        }
        const forbiddenPatterns = [
            /\.\./,
            /\0/,
            /[\\\/]/,
            /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,
        ];
        for (const pattern of forbiddenPatterns) {
            if (pattern.test(tenantId) || pattern.test(policyDomain)) {
                throw new PolicyLifecycleTenantIsolationError(`MALFORMED_TENANT_OR_DOMAIN: Input contains forbidden path traversal, NUL byte, or reserved device name.`);
            }
        }
    }
    /**
     * 4-Step Atomic Persistence: .tmp -> readback verify -> .bak -> atomic rename.
     */
    persistRecordAtomically(record) {
        const tenantDir = path.join(this.partitionDir, record.tenantId, record.policyDomain);
        if (!fs.existsSync(tenantDir)) {
            fs.mkdirSync(tenantDir, { recursive: true });
        }
        const finalPath = path.join(tenantDir, `${record.policyId}_lifecycle.json`);
        const tmpPath = `${finalPath}.tmp`;
        const bakPath = `${finalPath}.bak`;
        const content = JSON.stringify(record, null, 2);
        // 1. Write to temporary file
        fs.writeFileSync(tmpPath, content, 'utf8');
        // 2. Readback checksum verification
        const readback = fs.readFileSync(tmpPath, 'utf8');
        const readbackHash = createHash('sha256').update(readback, 'utf8').digest('hex');
        const expectedHash = createHash('sha256').update(content, 'utf8').digest('hex');
        if (readbackHash !== expectedHash) {
            try {
                fs.unlinkSync(tmpPath);
            }
            catch { }
            throw new Error(`PERSISTENCE_CHECKSUM_MISMATCH: Readback failed for '${tmpPath}'. Write aborted.`);
        }
        // 3. Backup existing record if present
        if (fs.existsSync(finalPath)) {
            fs.copyFileSync(finalPath, bakPath);
        }
        // 4. Atomic rename
        fs.renameSync(tmpPath, finalPath);
    }
    loadFromDisk(tenantId, policyDomain, policyId) {
        const filePath = path.join(this.partitionDir, tenantId, policyDomain, `${policyId}_lifecycle.json`);
        if (!fs.existsSync(filePath))
            return undefined;
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(content);
            return deepFreeze(parsed);
        }
        catch {
            // Check backup on corrupt primary
            const bakPath = `${filePath}.bak`;
            if (fs.existsSync(bakPath)) {
                const content = fs.readFileSync(bakPath, 'utf8');
                const parsed = JSON.parse(content);
                return deepFreeze(parsed);
            }
            return undefined;
        }
    }
}
