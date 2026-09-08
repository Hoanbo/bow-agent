import type { DeviceChallenge, ScopedDeviceIdentity } from '../deviceIdentity/persistentDeviceTypes.js';
export declare class AdmissionChallengeTracker {
    private readonly challenges;
    issueChallenge(deviceId: string, scope: ScopedDeviceIdentity, keyVersion?: number, ttlMs?: number, timestamp?: number): DeviceChallenge;
    getChallenge(challengeId: string, now?: number): DeviceChallenge | undefined;
    isChallengeValid(challengeId: string, now?: number): boolean;
    /**
     * Consumes a challenge, removing it to prevent replay attacks.
     */
    consumeChallenge(challengeId: string, now?: number): DeviceChallenge | undefined;
    clearExpired(now?: number): number;
    size(): number;
    clear(): void;
}
