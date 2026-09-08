// src/core/deviceVault/deviceVaultLock.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Vault locking semantics.
// STRICT INVARIANT: Locking is an internal security/tamper state, NOT a user password system.
export class VaultLockController {
    locked = false;
    lockedTimestamp;
    currentReason;
    isLocked() {
        return this.locked;
    }
    getLockState() {
        return {
            isLocked: this.locked,
            lockedAt: this.lockedTimestamp,
            reason: this.currentReason,
        };
    }
    lock(reason = 'ADMIN_LOCK') {
        this.locked = true;
        this.lockedTimestamp = Date.now();
        this.currentReason = reason;
    }
    unlock() {
        this.locked = false;
        this.lockedTimestamp = undefined;
        this.currentReason = undefined;
    }
    assertUnlocked(operationName = 'Vault operation') {
        if (this.locked) {
            throw new Error(`[VAULT_LOCKED] ${operationName} is prohibited while vault is locked (reason: ${this.currentReason ?? 'UNKNOWN'})`);
        }
    }
}
