// src/core/admission/admissionChallenge.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Bridge to persistent device challenge system (MS-1.3.24).
// Manages ephemeral, single-use admission challenges with strict TTL.

import type { DeviceChallenge, ScopedDeviceIdentity } from '../deviceIdentity/persistentDeviceTypes.js';
import { createDeviceChallenge, DEFAULT_CHALLENGE_TTL_MS } from '../deviceIdentity/persistentDeviceProof.js';

export class AdmissionChallengeTracker {
  private readonly challenges = new Map<string, DeviceChallenge>();

  public issueChallenge(
    deviceId: string,
    scope: ScopedDeviceIdentity,
    keyVersion: number = 1,
    ttlMs: number = DEFAULT_CHALLENGE_TTL_MS,
    timestamp?: number
  ): DeviceChallenge {
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

  public getChallenge(challengeId: string, now?: number): DeviceChallenge | undefined {
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

  public isChallengeValid(challengeId: string, now: number = Date.now()): boolean {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return false;
    }
    return now <= challenge.expiresAt;
  }

  /**
   * Consumes a challenge, removing it to prevent replay attacks.
   */
  public consumeChallenge(challengeId: string, now: number = Date.now()): DeviceChallenge | undefined {
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

  public clearExpired(now: number = Date.now()): number {
    let cleared = 0;
    for (const [id, chlng] of this.challenges.entries()) {
      if (now > chlng.expiresAt) {
        this.challenges.delete(id);
        cleared++;
      }
    }
    return cleared;
  }

  public size(): number {
    return this.challenges.size;
  }

  public clear(): void {
    this.challenges.clear();
  }
}
