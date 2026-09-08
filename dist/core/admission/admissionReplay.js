// src/core/admission/admissionReplay.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Replay defense and anti-replay nonce tracking.
// STRICT INVARIANTS:
// - REPLAY == REJECT
// - MUTATED_REPLAY == REJECT
// - Single-use nonce & challenge consumption.
export class AdmissionReplayTracker {
    seenNonces = new Map(); // nonce -> expiresAt
    seenProofDigests = new Set();
    /**
     * Checks if a nonce has already been seen or used.
     */
    isNonceReplayed(nonce, now = Date.now()) {
        const expiresAt = this.seenNonces.get(nonce);
        if (expiresAt === undefined) {
            return false;
        }
        // If it hasn't expired yet or is present in history window, it is a replay
        return now <= expiresAt;
    }
    isNonceSeen(nonce, now = Date.now()) {
        return this.isNonceReplayed(nonce, now);
    }
    /**
     * Registers a nonce as consumed with an expiration timestamp.
     * Throws if nonce has already been used.
     */
    registerNonce(nonce, ttlMs = 120_000, now = Date.now()) {
        if (this.isNonceReplayed(nonce, now)) {
            throw new Error(`[ADMISSION_REPLAY_DETECTED] Nonce ${nonce} has already been consumed. Replay blocked.`);
        }
        this.seenNonces.set(nonce, now + ttlMs);
    }
    /**
     * Registers a verified proof signature digest to block mutated proof replays.
     */
    registerProofDigest(digest) {
        if (this.seenProofDigests.has(digest)) {
            throw new Error(`[ADMISSION_REPLAY_DETECTED] Proof signature digest has already been processed. Replay blocked.`);
        }
        this.seenProofDigests.add(digest);
    }
    isProofDigestSeen(digest) {
        return this.seenProofDigests.has(digest);
    }
    prune(now = Date.now()) {
        let pruned = 0;
        for (const [nonce, expiresAt] of this.seenNonces.entries()) {
            if (now > expiresAt) {
                this.seenNonces.delete(nonce);
                pruned++;
            }
        }
        return pruned;
    }
    size() {
        return this.seenNonces.size;
    }
    clear() {
        this.seenNonces.clear();
        this.seenProofDigests.clear();
    }
}
