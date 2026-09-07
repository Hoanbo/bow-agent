import type { PairingRecord, TrustRecord, ScopedDeviceIdentity } from './pairingTypes.js';
export interface DevicePresentation {
    readonly deviceId: string;
    readonly scope: ScopedDeviceIdentity;
    readonly deviceFingerprint: string;
    readonly capabilityFingerprint: string;
    readonly protocolVersion?: string;
}
export interface RecognitionResult {
    readonly recognized: boolean;
    readonly trusted: boolean;
    readonly pairingRecord?: PairingRecord;
    readonly trustRecord?: TrustRecord;
    readonly rejectionReason?: string;
}
/**
 * Interface for reading pairing and trust records during device recognition.
 */
export interface RecognitionLookupSource {
    getPairingRecord(deviceId: string, scopeString: string): PairingRecord | undefined;
    getTrustRecord(deviceId: string, scopeString: string): TrustRecord | undefined;
}
/**
 * Logically recognizes a previously paired device presenting its identity.
 * Strictly verifies scope, fingerprints, and active trust.
 * NEVER executes tools or mutates cognitive brain state.
 */
export declare function recognizeDevice(source: RecognitionLookupSource, presentation: DevicePresentation): RecognitionResult;
