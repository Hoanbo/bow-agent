import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import type { NetworkMetadata } from './admissionTypes.js';
export interface AdmissionSessionBinding {
    readonly sessionId: string;
    readonly deviceId: string;
    readonly scope: ScopedDeviceIdentity;
    readonly initialNetwork: NetworkMetadata;
    readonly currentNetwork: NetworkMetadata;
    readonly createdAt: number;
    readonly lastActiveAt: number;
    readonly reconnectedCount: number;
    readonly active: boolean;
}
export declare class AdmissionSessionCoordinator {
    private readonly sessions;
    private readonly deviceActiveSessions;
    /**
     * Binds a newly admitted session to a persistent device.
     * Generates or validates distinct sessionId.
     */
    establishSession(deviceId: string, scope: ScopedDeviceIdentity, network: NetworkMetadata, assignedSessionId?: string, now?: number): AdmissionSessionBinding;
    /**
     * Validates and performs controlled session resume across roaming network transitions.
     * Invariant: RECONNECT != RE-EXECUTE.
     */
    resumeSession(sessionId: string, deviceId: string, scope: ScopedDeviceIdentity, newNetwork: NetworkMetadata, now?: number): AdmissionSessionBinding;
    createSession(deviceId: string, scope: ScopedDeviceIdentity, network: NetworkMetadata, assignedSessionId?: string, now?: number): AdmissionSessionBinding;
    validateSessionResume(sessionId: string, nextSequence: number, lastAckedSequence: number): {
        valid: boolean;
        failureReason?: string;
    };
    terminateSession(sessionId: string): boolean;
    getSession(sessionId: string): AdmissionSessionBinding | undefined;
    getActiveSessionsForDevice(deviceId: string): readonly AdmissionSessionBinding[];
    size(): number;
    clear(): void;
}
