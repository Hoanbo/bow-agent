import type { VaultLockReason } from './deviceVaultTypes.js';
export interface VaultLockState {
    readonly isLocked: boolean;
    readonly lockedAt?: number;
    readonly reason?: VaultLockReason;
}
export declare class VaultLockController {
    private locked;
    private lockedTimestamp?;
    private currentReason?;
    isLocked(): boolean;
    getLockState(): VaultLockState;
    lock(reason?: VaultLockReason): void;
    unlock(): void;
    assertUnlocked(operationName?: string): void;
}
