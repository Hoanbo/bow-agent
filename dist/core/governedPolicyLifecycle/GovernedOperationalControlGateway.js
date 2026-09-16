// src/core/governedPolicyLifecycle/GovernedOperationalControlGateway.ts
// Component 1184: GovernedOperationalControlGateway (REAL)
//
// Authoritative cryptographic sole-human gateway for privileged lifecycle mutations.
// Reuses MS-1.5.20 HumanDecisionTokenVerificationEngine (Component 1170).
// Enforces anti-agent defenses, secondary-authority rejection, emergency stop dominance,
// and OCC versioning. Enforces SOLE_HUMAN_AUTHORITY = TRUE.
import { AntiAgentIdentityRejectedError, PolicyLifecycleInterlockActiveError, SecondaryAuthorityRejectedError, UnauthorizedLifecycleMutationError, } from './GovernedPolicyLifecycleTypes.js';
export class GovernedOperationalControlGateway {
    stateManager;
    tokenVerifier;
    healthEngine;
    interlockCoordinator;
    constructor(stateManager, tokenVerifier, healthEngine, interlockCoordinator) {
        this.stateManager = stateManager;
        this.tokenVerifier = tokenVerifier;
        this.healthEngine = healthEngine;
        this.interlockCoordinator = interlockCoordinator;
    }
    /**
     * Reinstate a SUSPENDED policy back to ACTIVE.
     * Strictly requires cryptographic Human Authority.
     */
    reinstateActivePolicy(params) {
        this.assertHumanAuthority(params, 'REINSTATE_ACTIVE_POLICY');
        return this.stateManager.transitionState({
            tenantId: params.tenantId,
            policyDomain: params.policyDomain,
            policyId: params.policyId,
            targetState: 'ACTIVE',
            expectedVersion: params.expectedVersion,
            reason: `Human Authority reinstated policy: ${params.reason}`,
            trigger: 'OPERATOR_COMMAND',
            authorizationRef: {
                operatorId: params.token.operatorId,
                nonce: params.token.nonce,
                tokenSignature: params.token.operatorSignature,
            },
        });
    }
    /**
     * Override DEGRADED state and restore policy to ACTIVE.
     */
    overrideDegradation(params) {
        this.assertHumanAuthority(params, 'OVERRIDE_DEGRADATION');
        return this.stateManager.transitionState({
            tenantId: params.tenantId,
            policyDomain: params.policyDomain,
            policyId: params.policyId,
            targetState: 'ACTIVE',
            expectedVersion: params.expectedVersion,
            reason: `Human Authority overrode degraded status: ${params.reason}`,
            trigger: 'OPERATOR_COMMAND',
            authorizationRef: {
                operatorId: params.token.operatorId,
                nonce: params.token.nonce,
                tokenSignature: params.token.operatorSignature,
            },
        });
    }
    /**
     * Decommission and permanently retire an active, suspended, or rolled-back policy.
     * RETIRED is strictly terminal.
     */
    retirePolicy(params) {
        this.assertHumanAuthority(params, 'RETIRE_POLICY');
        return this.stateManager.transitionState({
            tenantId: params.tenantId,
            policyDomain: params.policyDomain,
            policyId: params.policyId,
            targetState: 'RETIRED',
            expectedVersion: params.expectedVersion,
            reason: `Human Authority permanently retired policy: ${params.reason}`,
            trigger: 'OPERATOR_COMMAND',
            authorizationRef: {
                operatorId: params.token.operatorId,
                nonce: params.token.nonce,
                tokenSignature: params.token.operatorSignature,
            },
        });
    }
    /**
     * Operator-initiated manual suspension of an active policy.
     */
    manualSuspend(params) {
        this.assertHumanAuthority(params, 'MANUAL_SUSPEND');
        return this.stateManager.transitionState({
            tenantId: params.tenantId,
            policyDomain: params.policyDomain,
            policyId: params.policyId,
            targetState: 'SUSPENDED',
            expectedVersion: params.expectedVersion,
            reason: `Operator manual suspension: ${params.reason}`,
            trigger: 'OPERATOR_COMMAND',
            authorizationRef: {
                operatorId: params.token.operatorId,
                nonce: params.token.nonce,
                tokenSignature: params.token.operatorSignature,
            },
        });
    }
    /**
     * Cryptographic verification and constitutional assertions.
     */
    assertHumanAuthority(params, operationName) {
        const { token, record, tenantId, policyDomain } = params;
        // 0. Emergency Stop Interlock Barrier (EMERGENCY_STOP > GOVERNANCE)
        if (this.interlockCoordinator) {
            this.interlockCoordinator.assertLifecyclePermitted(tenantId, policyDomain, 'ACTIVE');
        }
        if (!token || !record) {
            throw new UnauthorizedLifecycleMutationError(`UNAUTHORIZED_MUTATION: HumanDecisionToken and HumanDecisionRecord are required for '${operationName}'.`);
        }
        // 1. Anti-Agent Identity Barrier
        const prohibitedPrefixes = ['agent', 'bot', 'synthetic', 'system', 'model', 'assistant', 'autonomous', 'auto', 'ai'];
        const opLower = token.operatorId.normalize('NFKC').trim().toLowerCase();
        for (const prefix of prohibitedPrefixes) {
            if (opLower === prefix ||
                opLower.startsWith(`${prefix}:`) ||
                opLower.startsWith(`${prefix}_`) ||
                opLower.startsWith(`${prefix}-`)) {
                throw new AntiAgentIdentityRejectedError(`ANTI_AGENT_REJECTION: Operator '${token.operatorId}' is an agent or synthetic identity. Sole Human Authority is required.`);
            }
        }
        // 2. Secondary Authority / Committee Rejection Barrier
        const rawAny = token;
        if (rawAny.twoPersonVerifierId ||
            rawAny.twoPersonVerifierSignature ||
            rawAny.secondaryOperatorId ||
            rawAny.coSigners ||
            rawAny.additionalSignatures) {
            throw new SecondaryAuthorityRejectedError(`SECONDARY_AUTHORITY_REJECTED: Secondary operator or committee approval claims are prohibited. SOLE_HUMAN_AUTHORITY is enforced.`);
        }
        // 3. Cryptographic Verification via MS-1.5.20 Engine
        if (this.tokenVerifier) {
            try {
                const provenanceHash = record.provenanceHash || token.policyDeltaHash;
                const verification = this.tokenVerifier.verifyDecisionToken(token, record, provenanceHash);
                if (!verification.verified) {
                    throw new UnauthorizedLifecycleMutationError('HMAC_VERIFICATION_FAILED: Invalid cryptographic signature.');
                }
            }
            catch (err) {
                if (err instanceof UnauthorizedLifecycleMutationError ||
                    err instanceof AntiAgentIdentityRejectedError ||
                    err instanceof SecondaryAuthorityRejectedError ||
                    err instanceof PolicyLifecycleInterlockActiveError) {
                    throw err;
                }
                throw new UnauthorizedLifecycleMutationError(`HMAC_VERIFICATION_FAILED: ${err.message}`);
            }
        }
    }
}
