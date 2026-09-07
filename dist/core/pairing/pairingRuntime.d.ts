import type { PairingRequest, PairingResponse, PairingRecord, TrustRecord } from './pairingTypes.js';
import { PairingRegistry } from './pairingRegistry.js';
import { PairingTrustRegistry } from './pairingTrustRegistry.js';
import { PairingAuditLedger } from './pairingAudit.js';
import { PairingReplayDetector } from './pairingReplay.js';
import { type DevicePresentation, type RecognitionResult } from './pairingRecognition.js';
export declare class PairingRuntime {
    private readonly registry;
    private readonly trustRegistry;
    private readonly auditLedger;
    private readonly replayDetector;
    constructor(registry?: PairingRegistry, auditLedger?: PairingAuditLedger, replayDetector?: PairingReplayDetector);
    getRegistry(): PairingRegistry;
    getTrustRegistry(): PairingTrustRegistry;
    getAuditLedger(): PairingAuditLedger;
    getReplayDetector(): PairingReplayDetector;
    /**
     * Authoritatively handles an incoming PairingRequest.
     * Validates structure, replay safety, capabilities, and scope.
     */
    requestPairing(req: PairingRequest): PairingResponse;
    /**
     * Authoritatively confirms a pending pairing request.
     * Transitions state from PAIRING_PENDING to PAIRING_CONFIRMED -> PAIRED -> TRUSTED.
     */
    confirmPairing(deviceId: string, scopeString: string, confirmedBy: string): PairingResponse;
    /**
     * Logically recognizes a previously paired device without traditional password login.
     */
    recognizeDevice(presentation: DevicePresentation): RecognitionResult;
    /**
     * Authoritatively revokes trust and pairing for a device.
     */
    revokeDevice(deviceId: string, scopeString: string, revokedBy: string, reason: string): {
        readonly revokedPairing: PairingRecord;
        readonly revokedTrust?: TrustRecord;
    };
    /**
     * Initiates a re-pairing lifecycle for a previously revoked or terminal device.
     */
    initiateRePair(deviceId: string, scopeString: string, newSequence: number): PairingRecord;
    isDevicePaired(deviceId: string, scopeString: string): boolean;
    isDeviceTrusted(deviceId: string, scopeString: string): boolean;
    isDeviceRevoked(deviceId: string, scopeString: string): boolean;
}
