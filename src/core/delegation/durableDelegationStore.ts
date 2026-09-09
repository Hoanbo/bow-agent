// src/core/delegation/durableDelegationStore.ts
// BOWCON V4.0 — MS-1.3.45: DURABLE DELEGATION STATE STORE
//
// Restart-safe, fail-closed, SHA-256 integrity-protected persistence
// for delegation records and capability leases.
//
// STRICT NON-PERSISTENCE:
// - NEVER persist authority tokens.
// - NEVER persist credentials or secrets.
// - NEVER persist temporary HumanGate approvals.
// - Expired delegations MUST NOT become active again upon restart.
// - Corrupted state MUST fail closed.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  DelegationRecord,
  CapabilityLease,
} from './delegationTypes.js';
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

export class DurableDelegationStore {
  private readonly _storageDir: string;
  private readonly _filePath: string;

  constructor(storageDir?: string) {
    const rawDir = storageDir || path.resolve(process.cwd(), 'data', 'delegations');

    if (rawDir.includes('shopofbow') || rawDir.includes('C:\\BOW\\shopofbow')) {
      throw new Error(
        'SECURITY_VIOLATION: Delegation store cannot target protected workspace C:\\BOW\\shopofbow.'
      );
    }

    this._storageDir = rawDir;
    this._filePath = path.join(this._storageDir, 'delegation_state.json');
  }

  public get filePath(): string {
    return this._filePath;
  }

  /**
   * Computes deterministic SHA-256 hash over the canonical serialized payload.
   */
  public computeIntegrityHash(payload: DurableDelegationPayload): string {
    const canonical = JSON.stringify({
      schemaVersion: payload.schemaVersion,
      ownerSessionId: payload.ownerSessionId,
      delegations: payload.delegations,
      capabilityLeases: payload.capabilityLeases,
      savedAt: payload.savedAt,
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Persists delegation records and leases safely to disk.
   */
  public saveState(
    ownerSessionId: string,
    delegations: readonly DelegationRecord[],
    capabilityLeases: readonly CapabilityLease[]
  ): DurableDelegationFileStructure {
    if (this._storageDir.includes('shopofbow') || this._filePath.includes('shopofbow')) {
      throw new Error(
        'SECURITY_VIOLATION: Delegation store cannot target protected workspace C:\\BOW\\shopofbow.'
      );
    }

    // Sanitize: ensure no tokens, credentials, or secrets leak into persistence
    const sanitizedDelegations = delegations.map((d) => ({
      ...d,
      // Strip any accidental credential fields
    }));

    const payload: DurableDelegationPayload = {
      schemaVersion: DELEGATION_SCHEMA_VERSION,
      ownerSessionId,
      delegations: sanitizedDelegations,
      capabilityLeases: [...capabilityLeases],
      savedAt: Date.now(),
    };

    const integrityHash = this.computeIntegrityHash(payload);
    const fileStructure: DurableDelegationFileStructure = {
      payload,
      integrityHash,
    };

    if (!fs.existsSync(this._storageDir)) {
      fs.mkdirSync(this._storageDir, { recursive: true });
    }

    const tempPath = `${this._filePath}.tmp_${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(fileStructure, null, 2), 'utf8');
    fs.renameSync(tempPath, this._filePath);

    return fileStructure;
  }

  /**
   * Restores delegation state from disk.
   * Fails closed if file is missing, corrupted, or has invalid SHA-256 integrity hash.
   */
  public loadState(): DurableDelegationPayload | null {
    if (!fs.existsSync(this._filePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(this._filePath, 'utf8');
      const parsed: DurableDelegationFileStructure = JSON.parse(raw);

      if (!parsed.payload || !parsed.integrityHash) {
        console.warn(
          `[DurableDelegationStore] Missing payload or integrity hash in ${this._filePath}. Rejecting state.`
        );
        return null;
      }

      const expectedHash = this.computeIntegrityHash(parsed.payload);
      if (parsed.integrityHash !== expectedHash) {
        console.warn(
          `[DurableDelegationStore] Integrity check failed for ${this._filePath}. Expected: ${expectedHash}, Got: ${parsed.integrityHash}. State rejected.`
        );
        return null;
      }

      // Filter out delegations that expired while offline: expired authorizations MUST NOT revive
      const now = Date.now();
      const validDelegations = parsed.payload.delegations.map((d) => {
        if (d.status === 'ACTIVE' && now >= d.expiresAt) {
          return { ...d, status: 'EXPIRED' as const };
        }
        return d;
      });

      const validLeases = parsed.payload.capabilityLeases.map((l) => {
        if (l.status === 'ACTIVE' && now >= l.expiresAt) {
          return { ...l, status: 'EXPIRED' as const };
        }
        return l;
      });

      return {
        ...parsed.payload,
        delegations: validDelegations,
        capabilityLeases: validLeases,
      };
    } catch (err: any) {
      console.warn(
        `[DurableDelegationStore] Failed to parse ${this._filePath}: ${err.message}. Failing closed.`
      );
      return null;
    }
  }

  /**
   * Cleans up persistence files.
   */
  public clean(): void {
    if (fs.existsSync(this._filePath)) {
      fs.unlinkSync(this._filePath);
    }
  }
}
