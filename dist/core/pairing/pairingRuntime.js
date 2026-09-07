// src/core/pairing/pairingRuntime.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Authoritative Pairing and Trust Orchestration Runtime.
// Coordinates pairing requests, validation, explicit confirmation, trust establishment,
// device recognition, revocation, re-pairing, and immutable audit trails.
//
// STRICT ARCHITECTURAL INVARIANTS:
// - Zero tool execution.
// - Zero LLM calls.
// - Zero cognitive mutation of Brain memory.
// - Zero bypass of PDP, ApprovalService, VerificationService, CommitService, or RecoveryService.
// - Zero robot actuator control or mobile automation.
// - Pairing establishes device trust only, never execution authority.
import { PairingRegistry } from './pairingRegistry.js';
import { PairingTrustRegistry } from './pairingTrustRegistry.js';
import { PairingAuditLedger } from './pairingAudit.js';
import { PairingReplayDetector } from './pairingReplay.js';
import { validatePairingRequest } from './pairingRequest.js';
import { createPairingResponse } from './pairingResponse.js';
import { createPairingRecord, createTrustRecord } from './pairingRecord.js';
import { confirmPairing } from './pairingConfirmation.js';
import { revokeDeviceTrust, initiateRePair } from './pairingRevocation.js';
import { recognizeDevice } from './pairingRecognition.js';
import { createDeviceScope } from './pairingScope.js';
import { PairingError } from './pairingError.js';
export class PairingRuntime {
    registry;
    trustRegistry;
    auditLedger;
    replayDetector;
    constructor(registry, auditLedger, replayDetector) {
        this.registry = registry ?? new PairingRegistry();
        this.trustRegistry = new PairingTrustRegistry(this.registry);
        this.auditLedger = auditLedger ?? new PairingAuditLedger();
        this.replayDetector = replayDetector ?? new PairingReplayDetector();
    }
    getRegistry() {
        return this.registry;
    }
    getTrustRegistry() {
        return this.trustRegistry;
    }
    getAuditLedger() {
        return this.auditLedger;
    }
    getReplayDetector() {
        return this.replayDetector;
    }
    /**
     * Authoritatively handles an incoming PairingRequest.
     * Validates structure, replay safety, capabilities, and scope.
     */
    requestPairing(req) {
        const scopeString = createDeviceScope(req.scope);
        // 1. Authoritative request schema validation
        try {
            validatePairingRequest(req);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.auditLedger.record({
                eventType: 'PAIRING_REJECTED',
                deviceId: req.deviceId,
                scopeString,
                details: { reason: msg },
            });
            if (msg.includes('PAIRING_PROTOCOL_MISMATCH')) {
                throw new PairingError('PAIRING_PROTOCOL_MISMATCH', msg);
            }
            if (msg.includes('PAIRING_CAPABILITY_REJECTED')) {
                throw new PairingError('PAIRING_CAPABILITY_REJECTED', msg);
            }
            if (msg.includes('PAIRING_SCOPE_MISMATCH')) {
                throw new PairingError('PAIRING_SCOPE_MISMATCH', msg);
            }
            if (msg.includes('PAIRING_DEVICE_MISMATCH')) {
                throw new PairingError('PAIRING_DEVICE_MISMATCH', msg);
            }
            throw new PairingError('PAIRING_INVALID_REQUEST', msg);
        }
        // 2. Existing record lookup
        const existing = this.registry.getPairingRecord(req.deviceId, scopeString);
        // 3. Replay defense evaluation
        try {
            this.replayDetector.assertNotReplay(req, existing);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.auditLedger.record({
                eventType: 'REPLAY_REJECTED',
                deviceId: req.deviceId,
                scopeString,
                details: { reason: msg, sequence: req.sequence, nonce: req.nonce },
            });
            if (msg.includes('PAIRING_MUTATED_REPLAY')) {
                throw new PairingError('PAIRING_MUTATED_REPLAY', msg);
            }
            if (msg.includes('PAIRING_REVOKED')) {
                throw new PairingError('PAIRING_REVOKED', msg);
            }
            if (msg.includes('PAIRING_SCOPE_MISMATCH')) {
                throw new PairingError('PAIRING_SCOPE_MISMATCH', msg);
            }
            if (msg.includes('PAIRING_DEVICE_MISMATCH')) {
                throw new PairingError('PAIRING_DEVICE_MISMATCH', msg);
            }
            throw new PairingError('PAIRING_REPLAY', msg);
        }
        // 4. Check if already paired and active
        if (existing && !existing.revoked && existing.pairingState === 'TRUSTED') {
            throw new PairingError('PAIRING_ALREADY_PAIRED', `Device ${req.deviceId} is already paired and trusted in this scope`);
        }
        // 5. Create new pairing record in PAIRING_PENDING state
        const newRecord = createPairingRecord({
            deviceId: req.deviceId,
            deviceType: req.deviceType,
            surfaceId: req.surfaceId,
            scope: req.scope,
            capabilities: req.capabilities,
            deviceFingerprint: req.deviceFingerprint,
            pairingState: 'PAIRING_PENDING',
            trustLevel: 'NONE',
            sequence: req.sequence,
            metadata: req.metadata,
        });
        this.registry.registerPairing(newRecord);
        this.replayDetector.recordSeen(req);
        // 6. Audit logging
        this.auditLedger.record({
            eventType: 'PAIRING_REQUESTED',
            deviceId: req.deviceId,
            pairingId: newRecord.pairingId,
            scopeString,
            pairingState: 'PAIRING_PENDING',
            trustLevel: 'NONE',
            details: {
                deviceType: req.deviceType,
                surfaceId: req.surfaceId,
                sequence: req.sequence,
                capabilities: req.capabilities,
            },
        });
        // 7. Return canonical pending response
        return createPairingResponse({
            outcome: 'PAIRING_PENDING',
            pairingId: newRecord.pairingId,
            deviceId: req.deviceId,
            pairingState: 'PAIRING_PENDING',
            trustLevel: 'NONE',
            scope: req.scope,
            sequence: req.sequence,
            message: 'Pairing request received; awaiting explicit user confirmation',
        });
    }
    /**
     * Authoritatively confirms a pending pairing request.
     * Transitions state from PAIRING_PENDING to PAIRING_CONFIRMED -> PAIRED -> TRUSTED.
     */
    confirmPairing(deviceId, scopeString, confirmedBy) {
        const record = this.registry.getPairingRecord(deviceId, scopeString);
        if (!record) {
            throw new PairingError('PAIRING_NOT_FOUND', `No pairing record found for device ${deviceId} in specified scope`);
        }
        try {
            const trustedRecord = confirmPairing(record, confirmedBy);
            this.registry.updatePairing(trustedRecord);
            // Create authoritative TrustRecord
            const trust = createTrustRecord(trustedRecord, 'TRUSTED');
            this.registry.saveTrustRecord(trust);
            // Audit confirmation & trust
            this.auditLedger.record({
                eventType: 'PAIRING_CONFIRMED',
                deviceId,
                pairingId: trustedRecord.pairingId,
                scopeString,
                pairingState: 'PAIRING_CONFIRMED',
                trustLevel: 'NONE',
                details: { confirmedBy },
            });
            this.auditLedger.record({
                eventType: 'TRUST_GRANTED',
                deviceId,
                pairingId: trustedRecord.pairingId,
                scopeString,
                pairingState: 'TRUSTED',
                trustLevel: 'TRUSTED',
                details: { confirmedBy, trustId: trust.trustId },
            });
            return createPairingResponse({
                outcome: 'PAIRING_ACCEPTED',
                pairingId: trustedRecord.pairingId,
                deviceId,
                pairingState: 'TRUSTED',
                trustLevel: 'TRUSTED',
                scope: trustedRecord.scope,
                sequence: 1,
                message: 'Device successfully paired and trusted',
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('PAIRING_REVOKED')) {
                throw new PairingError('PAIRING_REVOKED', msg);
            }
            if (msg.includes('PAIRING_NOT_CONFIRMABLE')) {
                throw new PairingError('PAIRING_NOT_CONFIRMABLE', msg);
            }
            throw new PairingError('PAIRING_INVALID_REQUEST', msg);
        }
    }
    /**
     * Logically recognizes a previously paired device without traditional password login.
     */
    recognizeDevice(presentation) {
        const result = recognizeDevice(this.registry, presentation);
        const scopeString = createDeviceScope(presentation.scope);
        if (result.recognized && result.trusted) {
            this.auditLedger.record({
                eventType: 'DEVICE_RECOGNIZED',
                deviceId: presentation.deviceId,
                pairingId: result.pairingRecord?.pairingId,
                scopeString,
                pairingState: result.pairingRecord?.pairingState,
                trustLevel: result.pairingRecord?.trustLevel,
                details: {
                    trusted: true,
                    deviceFingerprint: presentation.deviceFingerprint,
                },
            });
        }
        return result;
    }
    /**
     * Authoritatively revokes trust and pairing for a device.
     */
    revokeDevice(deviceId, scopeString, revokedBy, reason) {
        const record = this.registry.getPairingRecord(deviceId, scopeString);
        if (!record) {
            throw new PairingError('PAIRING_NOT_FOUND', `Cannot revoke unknown device ${deviceId} in scope ${scopeString}`);
        }
        const trust = this.registry.getTrustRecord(deviceId, scopeString);
        const result = revokeDeviceTrust(record, trust, revokedBy, reason);
        this.registry.updatePairing(result.revokedPairing);
        if (result.revokedTrust) {
            this.registry.saveTrustRecord(result.revokedTrust);
        }
        this.registry.recordRevocation(deviceId, scopeString, reason);
        this.auditLedger.record({
            eventType: 'TRUST_REVOKED',
            deviceId,
            pairingId: record.pairingId,
            scopeString,
            pairingState: 'REVOKED',
            trustLevel: 'REVOKED',
            details: { revokedBy, reason },
        });
        return result;
    }
    /**
     * Initiates a re-pairing lifecycle for a previously revoked or terminal device.
     */
    initiateRePair(deviceId, scopeString, newSequence) {
        const record = this.registry.getPairingRecord(deviceId, scopeString);
        if (!record) {
            throw new PairingError('PAIRING_NOT_FOUND', `Cannot re-pair unknown device ${deviceId} in scope ${scopeString}`);
        }
        try {
            const reset = initiateRePair(record, newSequence);
            this.registry.updatePairing(reset);
            this.auditLedger.record({
                eventType: 'REPAIR_REQUESTED',
                deviceId,
                pairingId: reset.pairingId,
                scopeString,
                pairingState: 'PAIRING_REQUESTED',
                trustLevel: 'NONE',
                details: { sequence: newSequence },
            });
            return reset;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new PairingError('PAIRING_INVALID_REQUEST', msg);
        }
    }
    isDevicePaired(deviceId, scopeString) {
        return this.trustRegistry.isDevicePaired(deviceId, scopeString);
    }
    isDeviceTrusted(deviceId, scopeString) {
        return this.trustRegistry.isDeviceTrusted(deviceId, scopeString);
    }
    isDeviceRevoked(deviceId, scopeString) {
        return this.trustRegistry.isDeviceRevoked(deviceId, scopeString);
    }
}
