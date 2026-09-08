import type { BrainId } from '../brain/brainTypes.js';
import type { BrainServiceId } from './brainServiceTypes.js';
export declare class BrainServiceRegistry {
    private static _instance;
    private _registeredBrainId;
    private _registeredServiceId;
    private readonly _activeSessions;
    static getInstance(): BrainServiceRegistry;
    registerAuthority(serviceId: BrainServiceId, brainId: BrainId): void;
    unregisterAuthority(serviceId: BrainServiceId): void;
    registerSession(sessionId: string, deviceId: string): void;
    getSession(sessionId: string): {
        sessionId: string;
        deviceId: string;
        lastSeenAt: number;
    } | undefined;
    get registeredBrainId(): BrainId | null;
    get registeredServiceId(): BrainServiceId | null;
    resetForTest(): void;
}
