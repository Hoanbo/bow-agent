import type { PairingRequest, PairingRecord } from './pairingTypes.js';
export type PairingReplayClassification = 'VALID_NEW' | 'IDEMPOTENT_DUPLICATE' | 'STALE_REPLAY' | 'MUTATED_REPLAY' | 'CROSS_SCOPE_REPLAY' | 'CROSS_DEVICE_REPLAY' | 'REVOKED_REPLAY';
export declare class PairingReplayDetector {
    private readonly seenNonces;
    private readonly highestSequence;
    private readonly seenFingerprints;
    /**
     * Evaluates an incoming PairingRequest against existing pairing state and seen history.
     */
    evaluateRequest(req: PairingRequest, existingRecord?: PairingRecord): PairingReplayClassification;
    /**
     * Records a successfully validated request to track seen nonces and sequence numbers.
     */
    recordSeen(req: PairingRequest): void;
    /**
     * Asserts that a request is valid and not an unauthorized replay.
     * Throws typed fail-closed errors for all unsafe conditions.
     */
    assertNotReplay(req: PairingRequest, existingRecord?: PairingRecord): void;
    /**
     * Resets replay state (used for testing or scope teardown).
     */
    clear(): void;
}
