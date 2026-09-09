import type { DelegationRecord, CapabilityLease } from './delegationTypes.js';
import { DELEGATION_SCHEMA_VERSION } from './delegationTypes.js';
export interface DurableDelegationPayload {
    readonly schemaVersion: typeof DELEGATION_SCHEMA_VERSION;
    readonly ownerSessionId: string;
    readonly delegations: readonly DelegationRecord[];
    readonly capabilityLeases: readonly CapabilityLease[];
    readonly savedAt: number;
}
export interface DurableDelegationFileStructure {
    readonly payload: DurableDelegationPayload;
    readonly integrityHash: string;
}
export declare class DurableDelegationStore {
    private readonly _storageDir;
    private readonly _filePath;
    constructor(storageDir?: string);
    get filePath(): string;
    /**
     * Computes deterministic SHA-256 hash over the canonical serialized payload.
     */
    computeIntegrityHash(payload: DurableDelegationPayload): string;
    /**
     * Persists delegation records and leases safely to disk.
     */
    saveState(ownerSessionId: string, delegations: readonly DelegationRecord[], capabilityLeases: readonly CapabilityLease[]): DurableDelegationFileStructure;
    /**
     * Restores delegation state from disk.
     * Fails closed if file is missing, corrupted, or has invalid SHA-256 integrity hash.
     */
    loadState(): DurableDelegationPayload | null;
    /**
     * Cleans up persistence files.
     */
    clean(): void;
}
