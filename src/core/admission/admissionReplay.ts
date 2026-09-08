// src/core/admission/admissionReplay.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Replay defense and anti-replay nonce tracking.
// STRICT INVARIANTS:
// - REPLAY == REJECT
// - MUTATED_REPLAY == REJECT
// - Single-use nonce & challenge consumption.

export class AdmissionReplayTracker {
  private readonly seenNonces = new Map<string, number>(); // nonce -> expiresAt
  private readonly seenProofDigests = new Set<string>();

  /**
   * Checks if a nonce has already been seen or used.
   */
  public isNonceReplayed(nonce: string, now: number = Date.now()): boolean {
    const expiresAt = this.seenNonces.get(nonce);
    if (expiresAt === undefined) {
      return false;
    }
    // If it hasn't expired yet or is present in history window, it is a replay
    return now <= expiresAt;
  }

  public isNonceSeen(nonce: string, now: number = Date.now()): boolean {
    return this.isNonceReplayed(nonce, now);
  }

  /**
   * Registers a nonce as consumed with an expiration timestamp.
   * Throws if nonce has already been used.
   */
  public registerNonce(nonce: string, ttlMs: number = 120_000, now: number = Date.now()): void {
    if (this.isNonceReplayed(nonce, now)) {
      throw new Error(`[ADMISSION_REPLAY_DETECTED] Nonce ${nonce} has already been consumed. Replay blocked.`);
    }
    this.seenNonces.set(nonce, now + ttlMs);
  }

  /**
   * Registers a verified proof signature digest to block mutated proof replays.
   */
  public registerProofDigest(digest: string): void {
    if (this.seenProofDigests.has(digest)) {
      throw new Error(`[ADMISSION_REPLAY_DETECTED] Proof signature digest has already been processed. Replay blocked.`);
    }
    this.seenProofDigests.add(digest);
  }

  public isProofDigestSeen(digest: string): boolean {
    return this.seenProofDigests.has(digest);
  }

  public prune(now: number = Date.now()): number {
    let pruned = 0;
    for (const [nonce, expiresAt] of this.seenNonces.entries()) {
      if (now > expiresAt) {
        this.seenNonces.delete(nonce);
        pruned++;
      }
    }
    return pruned;
  }

  public size(): number {
    return this.seenNonces.size;
  }

  public clear(): void {
    this.seenNonces.clear();
    this.seenProofDigests.clear();
  }
}
