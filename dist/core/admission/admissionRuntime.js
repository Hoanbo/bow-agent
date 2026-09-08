// src/core/admission/admissionRuntime.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Central ZeroTrustAdmissionRuntime orchestrator.
// Coordinates:
// Network Context -> Transport Validation -> Protocol Validation -> Scope Validation ->
// Identity Resolution -> Trust Resolution -> Challenge -> Proof -> Replay -> Revocation ->
// Session -> Capability Filter -> Decision -> Audit.
//
// STRICT INVARIANTS:
// - ADMISSION_RUNTIME != BRAIN
// - ADMISSION_RUNTIME != AUTHORIZATION_RUNTIME
// - ADMISSION_RUNTIME != EXECUTION_RUNTIME
// - ZERO IP-BASED TRUST
// - ZERO PASSWORD LOGIN
// - RECONNECT != RE-EXECUTE
import { ADMISSION_PROTOCOL_VERSION } from './admissionTypes.js';
import { isValidEndpoint } from './admissionEndpoint.js';
import { resolveAdmissionDeviceIdentity } from './admissionIdentity.js';
import { validateAdmissionDeviceScope, areAdmissionScopesCompatible, areDeviceAndConnectionScopesAligned } from './admissionScope.js';
import { AdmissionChallengeTracker } from './admissionChallenge.js';
import { validateAdmissionProof } from './admissionProof.js';
import { InMemoryAdmissionTrustProvider, evaluateAdmissionTrust } from './admissionTrust.js';
import { AdmissionRevocationRegistry } from './admissionRevocation.js';
import { AdmissionReplayTracker } from './admissionReplay.js';
import { AdmissionSessionCoordinator } from './admissionSession.js';
import { filterAdmissionCapabilities } from './admissionCapabilities.js';
import { createAdmitDecision, createRejectDecision, createChallengeRequiredDecision, createAdmissionDecision } from './admissionDecision.js';
import { AdmissionAuditLedger } from './admissionAudit.js';
import { AdmissionRegistry } from './admissionRegistry.js';
import { InMemoryDeviceKeyStore } from '../deviceIdentity/persistentDeviceKey.js';
export class ZeroTrustAdmissionRuntime {
    trustProvider;
    keyStore;
    challengeTracker;
    replayTracker;
    sessionCoordinator;
    revocationRegistry;
    auditLedger;
    registry;
    totalEvaluated = 0;
    totalAdmitted = 0;
    totalRejected = 0;
    roamingTransitionsCount = 0;
    constructor(options) {
        this.trustProvider = options?.trustProvider ?? new InMemoryAdmissionTrustProvider();
        this.keyStore = options?.keyStore ?? new InMemoryDeviceKeyStore();
        this.challengeTracker = options?.challengeTracker ?? new AdmissionChallengeTracker();
        this.replayTracker = options?.replayTracker ?? new AdmissionReplayTracker();
        this.sessionCoordinator = options?.sessionCoordinator ?? new AdmissionSessionCoordinator();
        this.revocationRegistry = options?.revocationRegistry ?? new AdmissionRevocationRegistry();
        this.auditLedger = options?.auditLedger ?? new AdmissionAuditLedger();
        this.registry = options?.registry ?? new AdmissionRegistry();
    }
    getTrustProvider() {
        return this.trustProvider;
    }
    getKeyStore() {
        return this.keyStore;
    }
    getChallengeTracker() {
        return this.challengeTracker;
    }
    getReplayTracker() {
        return this.replayTracker;
    }
    getSessionCoordinator() {
        return this.sessionCoordinator;
    }
    getRevocationRegistry() {
        return this.revocationRegistry;
    }
    getAuditLedger() {
        return this.auditLedger;
    }
    getRegistry() {
        return this.registry;
    }
    async admit(request, now = Date.now()) {
        const normalizedRequest = {
            requestId: request.requestId || request.admissionRequestId || `req_adm_${Date.now()}`,
            deviceId: request.deviceId,
            scope: request.scope,
            connectionScope: request.connectionScope,
            network: request.network || request.networkMetadata,
            endpoint: request.endpoint,
            protocolVersion: request.protocolVersion || ADMISSION_PROTOCOL_VERSION,
            requestedCapabilities: request.requestedCapabilities || [],
            challengeId: request.challengeId,
            proof: request.proof,
            sessionId: request.sessionId,
            timestamp: request.timestamp || request.requestedAt || now,
        };
        return this.evaluateAdmission(normalizedRequest, now);
    }
    /**
     * Evaluates an incoming connection request through the complete fail-closed Zero-Trust admission pipeline.
     */
    evaluateAdmission(request, now = Date.now()) {
        this.totalEvaluated++;
        this.auditLedger.record({
            eventType: 'ADMISSION_REQUESTED',
            deviceId: request?.deviceId || 'unknown',
            details: {
                requestId: request?.requestId,
                networkType: request?.network?.networkType,
                ipAddress: request?.network?.ipAddress,
                locality: request?.network?.locality,
                isRoaming: request?.network?.isRoaming,
            },
            timestamp: now,
        });
        // 1. Structure & Endpoint Validation
        if (!request || !isValidEndpoint(request.endpoint)) {
            this.totalRejected++;
            this.auditLedger.record({
                eventType: 'ADMISSION_REJECTED',
                deviceId: request?.deviceId || 'unknown',
                details: { reason: 'INVALID_ENDPOINT' },
                timestamp: now,
            });
            return createRejectDecision(request, 'INVALID_ENDPOINT', 'Endpoint metadata is missing, malformed, or unauthorized.', now);
        }
        // 2. Protocol Validation
        if (request.protocolVersion !== ADMISSION_PROTOCOL_VERSION) {
            this.totalRejected++;
            this.auditLedger.record({
                eventType: 'ADMISSION_REJECTED',
                deviceId: request.deviceId,
                details: { reason: 'PROTOCOL_VERSION_MISMATCH', version: request.protocolVersion },
                timestamp: now,
            });
            return createRejectDecision(request, 'PROTOCOL_VERSION_MISMATCH', `Unsupported protocol version ${request.protocolVersion}.`, now);
        }
        // 3. Scope Validation
        const scopeRes = validateAdmissionDeviceScope(request.scope);
        if (!scopeRes.valid) {
            this.totalRejected++;
            this.auditLedger.record({
                eventType: 'SCOPE_MISMATCH_BLOCKED',
                deviceId: request.deviceId,
                details: { failureReason: scopeRes.failureReason },
                timestamp: now,
            });
            return createRejectDecision(request, 'SCOPE_MISMATCH', scopeRes.failureReason || 'Malformed scope', now);
        }
        if (request.connectionScope && !areDeviceAndConnectionScopesAligned(request.scope, request.connectionScope)) {
            this.totalRejected++;
            this.auditLedger.record({
                eventType: 'SCOPE_MISMATCH_BLOCKED',
                deviceId: request.deviceId,
                details: { reason: 'DEVICE_AND_CONNECTION_SCOPE_MISMATCH' },
                timestamp: now,
            });
            return createRejectDecision(request, 'SCOPE_MISMATCH', 'Connection scope does not align with device scope.', now);
        }
        // 4. Device Identity Resolution
        try {
            resolveAdmissionDeviceIdentity(request);
        }
        catch (err) {
            this.totalRejected++;
            return createRejectDecision(request, 'MALFORMED_REQUEST', err.message, now);
        }
        // 5. Authoritative Revocation Validation
        const isRevoked = this.revocationRegistry.isDeviceRevoked(request.deviceId);
        if (isRevoked) {
            const revEntry = this.revocationRegistry.getRevocationEntry(request.deviceId);
            const reason = revEntry?.reason || 'Device permanently revoked';
            this.totalRejected++;
            this.auditLedger.record({
                eventType: 'REVOKED_DEVICE_BLOCKED',
                deviceId: request.deviceId,
                details: { reason },
                timestamp: now,
            });
            return createAdmissionDecision({
                request,
                decision: 'REVOKED',
                admitted: false,
                rejectionReason: 'DEVICE_REVOKED',
                rejectionDetails: reason,
                timestamp: now,
            });
        }
        // 6. Persistent Trust Lookup
        const trustRes = evaluateAdmissionTrust(request.deviceId, request.scope, this.trustProvider, now);
        if (!trustRes.trusted || !trustRes.record) {
            this.totalRejected++;
            const isExpired = trustRes.failureCode === 'ADMISSION_TRUST_EXPIRED';
            const isRevoked = trustRes.failureCode === 'ADMISSION_DEVICE_REVOKED';
            if (isExpired) {
                this.auditLedger.record({
                    eventType: 'EXPIRED_TRUST_BLOCKED',
                    deviceId: request.deviceId,
                    details: { reason: trustRes.failureReason },
                    timestamp: now,
                });
                return createAdmissionDecision({
                    request,
                    decision: 'EXPIRED',
                    admitted: false,
                    rejectionReason: 'TRUST_EXPIRED',
                    rejectionDetails: trustRes.failureReason,
                    timestamp: now,
                });
            }
            if (isRevoked) {
                this.auditLedger.record({
                    eventType: 'REVOKED_DEVICE_BLOCKED',
                    deviceId: request.deviceId,
                    details: { reason: trustRes.failureReason },
                    timestamp: now,
                });
                return createAdmissionDecision({
                    request,
                    decision: 'REVOKED',
                    admitted: false,
                    rejectionReason: 'DEVICE_REVOKED',
                    rejectionDetails: trustRes.failureReason,
                    timestamp: now,
                });
            }
            this.auditLedger.record({
                eventType: 'ADMISSION_REJECTED',
                deviceId: request.deviceId,
                details: { failureCode: trustRes.failureCode },
                timestamp: now,
            });
            return createRejectDecision(request, (trustRes.failureCode === 'ADMISSION_DEVICE_NOT_FOUND' ? 'DEVICE_NOT_TRUSTED' : 'UNKNOWN_DEVICE'), trustRes.failureReason || 'Trust verification failed', now);
        }
        // Verify stored scope matches request scope
        if (!areAdmissionScopesCompatible(request.scope, trustRes.record.scope)) {
            this.totalRejected++;
            this.auditLedger.record({
                eventType: 'SCOPE_MISMATCH_BLOCKED',
                deviceId: request.deviceId,
                details: { reason: 'CROSS_SCOPE_MISMATCH' },
                timestamp: now,
            });
            return createAdmissionDecision({
                request,
                decision: 'SCOPE_MISMATCH',
                admitted: false,
                rejectionReason: 'SCOPE_MISMATCH',
                rejectionDetails: 'Request scope does not match registered trusted scope.',
                timestamp: now,
            });
        }
        // 7. Capability Filtering (Fail-closed on any forbidden capability)
        const capRes = filterAdmissionCapabilities(request.requestedCapabilities);
        if (!capRes.valid) {
            this.totalRejected++;
            this.auditLedger.record({
                eventType: 'CAPABILITY_ESCALATION_BLOCKED',
                deviceId: request.deviceId,
                details: { forbidden: capRes.forbidden },
                timestamp: now,
            });
            return createAdmissionDecision({
                request,
                decision: 'CAPABILITY_REJECTED',
                admitted: false,
                allowedCapabilities: capRes.allowed,
                rejectedCapabilities: capRes.rejected,
                rejectionReason: 'CAPABILITY_REJECTED',
                rejectionDetails: `Requested forbidden execution capabilities: ${capRes.forbidden.join(', ')}`,
                timestamp: now,
            });
        }
        // 8. Challenge / Proof of Possession
        if (!request.proof) {
            // Step A: Issue ephemeral challenge
            const challenge = this.challengeTracker.issueChallenge(request.deviceId, request.scope, trustRes.record.keyVersion);
            this.auditLedger.record({
                eventType: 'CHALLENGE_ISSUED',
                deviceId: request.deviceId,
                details: { challengeId: challenge.challengeId, nonce: challenge.nonce },
                timestamp: now,
            });
            return createChallengeRequiredDecision(request, challenge, now);
        }
        // Step B: Proof provided - strictly verify challenge & proof
        const challenge = this.challengeTracker.getChallenge(request.proof.challengeId);
        if (!challenge) {
            this.totalRejected++;
            this.auditLedger.record({
                eventType: 'ADMISSION_REJECTED',
                deviceId: request.deviceId,
                details: { reason: 'CHALLENGE_NOT_FOUND_OR_EXPIRED' },
                timestamp: now,
            });
            return createRejectDecision(request, 'INVALID_PROOF', 'Referenced challenge not found or already consumed.', now);
        }
        // Verify key revocation for the active key
        const isKeyRevoked = this.revocationRegistry.isKeyRevoked(request.proof.keyId);
        if (isKeyRevoked) {
            const reason = `Key ${request.proof.keyId} is revoked`;
            this.totalRejected++;
            this.auditLedger.record({
                eventType: 'REVOKED_DEVICE_BLOCKED',
                deviceId: request.deviceId,
                details: { reason, keyId: request.proof.keyId },
                timestamp: now,
            });
            return createAdmissionDecision({
                request,
                decision: 'REVOKED',
                admitted: false,
                rejectionReason: 'KEY_REVOKED',
                rejectionDetails: reason,
                timestamp: now,
            });
        }
        // Validate cryptographic proof
        const proofRes = validateAdmissionProof(challenge, request.proof, this.keyStore, now);
        if (!proofRes.valid) {
            this.totalRejected++;
            this.auditLedger.record({
                eventType: 'ADMISSION_REJECTED',
                deviceId: request.deviceId,
                details: { failureCode: proofRes.failureCode, failureReason: proofRes.failureReason },
                timestamp: now,
            });
            return createRejectDecision(request, 'INVALID_PROOF', proofRes.failureReason || 'Proof validation failed', now);
        }
        // Validate anti-replay
        try {
            this.replayTracker.registerNonce(request.proof.nonce, 120_000, now);
            this.replayTracker.registerProofDigest(request.proof.proofSignature);
        }
        catch (err) {
            this.totalRejected++;
            this.auditLedger.record({
                eventType: 'REPLAY_ATTACK_BLOCKED',
                deviceId: request.deviceId,
                details: { error: err.message },
                timestamp: now,
            });
            return createRejectDecision(request, 'REPLAY_DETECTED', err.message, now);
        }
        // Consume challenge so it cannot be reused
        this.challengeTracker.consumeChallenge(challenge.challengeId, now);
        this.auditLedger.record({
            eventType: 'PROOF_VERIFIED',
            deviceId: request.deviceId,
            details: { challengeId: challenge.challengeId, proofId: request.proof.proofId },
            timestamp: now,
        });
        // 9. Session Binding / Resume
        let assignedSessionId;
        try {
            if (request.sessionId) {
                const sessionBinding = this.sessionCoordinator.resumeSession(request.sessionId, request.deviceId, request.scope, request.network, now);
                assignedSessionId = sessionBinding.sessionId;
                this.roamingTransitionsCount++;
                this.auditLedger.record({
                    eventType: 'SESSION_RESUMED',
                    deviceId: request.deviceId,
                    details: { sessionId: assignedSessionId, reconnectedCount: sessionBinding.reconnectedCount },
                    timestamp: now,
                });
            }
            else {
                const sessionBinding = this.sessionCoordinator.establishSession(request.deviceId, request.scope, request.network, undefined, now);
                assignedSessionId = sessionBinding.sessionId;
            }
        }
        catch (err) {
            this.totalRejected++;
            return createRejectDecision(request, 'SESSION_TERMINATED', err.message, now);
        }
        // 10. Complete Admission
        this.totalAdmitted++;
        const decision = createAdmitDecision(request, assignedSessionId, capRes.allowed, now);
        this.registry.recordAdmitted(request.deviceId, request.scope, request.network, assignedSessionId, decision, now);
        this.auditLedger.record({
            eventType: 'ADMISSION_ADMITTED',
            deviceId: request.deviceId,
            details: {
                assignedSessionId,
                networkType: request.network.networkType,
                allowedCapabilities: capRes.allowed,
            },
            timestamp: now,
        });
        return decision;
    }
    getSnapshot() {
        return Object.freeze({
            protocolVersion: ADMISSION_PROTOCOL_VERSION,
            totalAdmissionsEvaluated: this.totalEvaluated,
            totalAdmitted: this.totalAdmitted,
            totalRejected: this.totalRejected,
            activeSessionsCount: this.sessionCoordinator.size(),
            activeChallengesCount: this.challengeTracker.size(),
            roamingTransitionsCount: this.roamingTransitionsCount,
            state: 'OPERATIONAL',
            timestamp: Date.now(),
        });
    }
}
