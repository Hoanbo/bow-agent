// src/core/admission/admissionChallenge.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Bridge to persistent device challenge system (MS-1.3.24).
// Manages ephemeral, single-use admission challenges with strict TTL.
import { createDeviceChallenge, DEFAULT_CHALLENGE_TTL_MS } from '../deviceIdentity/persistentDeviceProof.js';
export class AdmissionChallengeTracker {
    challenges = new Map();
    issueChallenge(deviceId, scope, keyVersion = 1, ttlMs = DEFAULT_CHALLENGE_TTL_MS, timestamp) {
        const challenge = createDeviceChallenge({
            deviceId,
            scope,
            keyVersion,
            ttlMs,
            timestamp,
        });
        this.challenges.set(challenge.challengeId, challenge);
        return challenge;
    }
    getChallenge(challengeId, now) {
        const challenge = this.challenges.get(challengeId);
        if (!challenge) {
            return undefined;
        }
        const effectiveNow = now ?? Date.now();
        if (effectiveNow > challenge.expiresAt) {
            this.challenges.delete(challengeId);
            return undefined;
        }
        return challenge;
    }
    isChallengeValid(challengeId, now = Date.now()) {
        const challenge = this.challenges.get(challengeId);
        if (!challenge) {
            return false;
        }
        return now <= challenge.expiresAt;
    }
    /**
     * Consumes a challenge, removing it to prevent replay attacks.
     */
    consumeChallenge(challengeId, now = Date.now()) {
        const challenge = this.challenges.get(challengeId);
        if (!challenge) {
            return undefined;
        }
        this.challenges.delete(challengeId);
        if (now > challenge.expiresAt) {
            return undefined; // Expired
        }
        return challenge;
    }
    clearExpired(now = Date.now()) {
        let cleared = 0;
        for (const [id, chlng] of this.challenges.entries()) {
            if (now > chlng.expiresAt) {
                this.challenges.delete(id);
                cleared++;
            }
        }
        return cleared;
    }
    size() {
        return this.challenges.size;
    }
    clear() {
        this.challenges.clear();
    }
}
