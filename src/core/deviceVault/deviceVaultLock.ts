// src/core/deviceVault/deviceVaultLock.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Vault locking semantics.
// STRICT INVARIANT: Locking is an internal security/tamper state, NOT a user password system.

import type { VaultLockReason } from './deviceVaultTypes.js';

export interface VaultLockState {
  readonly isLocked: boolean;
  readonly lockedAt?: number;
  readonly reason?: VaultLockReason;
}

export class VaultLockController {
  private locked: boolean = false;
  private lockedTimestamp?: number;
  private currentReason?: VaultLockReason;

  public isLocked(): boolean {
    return this.locked;
  }

  public getLockState(): VaultLockState {
    return {
      isLocked: this.locked,
      lockedAt: this.lockedTimestamp,
      reason: this.currentReason,
    };
  }

  public lock(reason: VaultLockReason = 'ADMIN_LOCK'): void {
    this.locked = true;
    this.lockedTimestamp = Date.now();
    this.currentReason = reason;
  }

  public unlock(): void {
    this.locked = false;
    this.lockedTimestamp = undefined;
    this.currentReason = undefined;
  }

  public assertUnlocked(operationName: string = 'Vault operation'): void {
    if (this.locked) {
      throw new Error(
        `[VAULT_LOCKED] ${operationName} is prohibited while vault is locked (reason: ${this.currentReason ?? 'UNKNOWN'})`
      );
    }
  }
}
