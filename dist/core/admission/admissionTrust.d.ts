import type { PersistentDeviceTrustRecord } from '../deviceIdentity/persistentDeviceTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
export interface AdmissionTrustEvaluationResult {
    readonly trusted: boolean;
    readonly failureCode?: string;
    readonly failureReason?: string;
    readonly record?: PersistentDeviceTrustRecord;
}
export interface AdmissionTrustProvider {
    getTrustRecord(deviceId: string, scope: ScopedDeviceIdentity): PersistentDeviceTrustRecord | undefined;
}
/**
 * In-memory trust provider implementation for deterministic testing and runtime integration.
 */
export declare class InMemoryAdmissionTrustProvider implements AdmissionTrustProvider {
    private readonly records;
    register(record: PersistentDeviceTrustRecord): void;
    getTrustRecord(deviceId: string, _scope: ScopedDeviceIdentity): PersistentDeviceTrustRecord | undefined;
    clear(): void;
}
export declare function evaluateAdmissionTrust(deviceId: string, recordOrScope: PersistentDeviceTrustRecord | undefined | ScopedDeviceIdentity, providerOrNow?: AdmissionTrustProvider | number, now?: number): AdmissionTrustEvaluationResult;
export declare function assertAdmissionTrust(result: AdmissionTrustEvaluationResult): void;
