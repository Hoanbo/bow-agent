import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import type { AdmissionDecision, NetworkMetadata } from './admissionTypes.js';
export interface AdmittedDeviceRecord {
    readonly deviceId: string;
    readonly scope: ScopedDeviceIdentity;
    readonly currentNetwork: NetworkMetadata;
    readonly sessionId: string;
    readonly admittedAt: number;
    readonly lastActiveAt: number;
    readonly decision: AdmissionDecision;
}
export declare class AdmissionRegistry {
    private readonly records;
    private readonly deviceIdsByUserId;
    recordAdmitted(deviceId: string, scope: ScopedDeviceIdentity, network: NetworkMetadata, sessionId: string, decision: AdmissionDecision, now?: number): AdmittedDeviceRecord;
    getAdmitted(deviceId: string): AdmittedDeviceRecord | undefined;
    isAdmitted(deviceId: string): boolean;
    updateNetwork(deviceId: string, newNetwork: NetworkMetadata, now?: number): boolean;
    remove(deviceId: string): boolean;
    getDevicesForUser(userId: string): readonly AdmittedDeviceRecord[];
    size(): number;
    clear(): void;
}
