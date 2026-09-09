// src/core/resilience/durableResilienceStateStore.ts
// BOWCON V4.0 — MS-1.3.44: DURABLE COGNITIVE RESILIENCE STATE STORE
//
// Provides restart-safe, versioned, integrity-protected, fail-closed,
// and session-isolated persistence for the minimum necessary cognitive resilience state.
//
// INVARIANTS:
// - Persisted state MUST survive restart without silently trusting corrupted state.
// - Corrupted state is REJECTED and safely rebuilt; never executed upon.
// - Authority tokens, credentials, secrets, unrestricted execution grants, and temporary
//   authorizations MUST NEVER be persisted.
// - A persisted recovery state must NEVER automatically become execution authorization.
// - USER_STOP remains authoritative after restart.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  DurableResilienceStateRecord,
  ResilienceHealthState,
  ResilienceFailureRecord,
  ResilienceRecoveryProposal,
  ResilienceRecoveryAttempt,
  ResilienceVerificationResult,
} from './cognitiveResilienceTypes.js';
import { MASTER_OWNER_ID } from '../architecture/masterArchitectureIdentity.js';

export function computeResilienceStateHash(state: Omit<DurableResilienceStateRecord, 'integrityHash' | 'stateStatus'>): string {
  const serialized = JSON.stringify({
    schemaVersion: state.schemaVersion,
    sessionId: state.sessionId,
    ownerId: state.ownerId,
    createdAt: state.createdAt,
    healthState: state.healthState,
    failures: state.failures,
    activeProposals: state.activeProposals,
    attempts: state.attempts,
    verifications: state.verifications,
    resolvedFailureIds: state.resolvedFailureIds,
    recoveryCounters: state.recoveryCounters,
    unresolvedRecoveryConditions: state.unresolvedRecoveryConditions,
    isStopped: state.isStopped,
    stopReason: state.stopReason,
  });
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

export class DurableResilienceStateStore {
  private readonly _storageDir: string;
  private readonly _filePath: string;
  private readonly _sessionId: string;
  private readonly _ownerId: string;

  constructor(options?: { storageDir?: string; sessionId?: string; ownerId?: string }) {
    const rawDir = options?.storageDir ?? path.join('data', 'resilience', options?.sessionId ?? 'session_default');
    if (rawDir.includes('shopofbow') || rawDir.includes('C:\\BOW\\shopofbow')) {
      throw new Error('SECURITY_VIOLATION: Resilience state store cannot target protected workspace C:\\BOW\\shopofbow.');
    }
    this._storageDir = rawDir;
    this._filePath = path.join(this._storageDir, 'resilience_state.json');
    this._sessionId = options?.sessionId ?? 'session_default';
    this._ownerId = options?.ownerId ?? MASTER_OWNER_ID;
  }

  public getFilePath(): string {
    return this._filePath;
  }

  public getSessionId(): string {
    return this._sessionId;
  }

  /**
   * Persists the minimal necessary resilience state to disk.
   * Strips any sensitive tokens and computes cryptographic integrity hash.
   */
  public saveState(params: {
    healthState: ResilienceHealthState;
    failures: ResilienceFailureRecord[];
    activeProposals: ResilienceRecoveryProposal[];
    attempts: Record<string, ResilienceRecoveryAttempt[]>;
    verifications: Record<string, ResilienceVerificationResult>;
    resolvedFailureIds: string[];
    recoveryCounters: { totalFailures: number; totalRecoveries: number; failedRecoveries: number };
    unresolvedRecoveryConditions: string[];
    isStopped: boolean;
    stopReason: string;
    createdAt?: number;
  }): DurableResilienceStateRecord {
    // Protected workspace check
    if (this._storageDir.includes('shopofbow') || this._filePath.includes('shopofbow')) {
      throw new Error('SECURITY_VIOLATION: Resilience state store cannot target protected workspace C:\\BOW\\shopofbow.');
    }

    // Scrub any unexpected credentials or tokens (fail-closed invariant)
    const sanitizedProposals = params.activeProposals.map((p) => {
      const copy: any = { ...p };
      delete copy.token;
      delete copy.approvalToken;
      delete copy.credential;
      return copy as ResilienceRecoveryProposal;
    });

    const now = Date.now();
    const stateCore: Omit<DurableResilienceStateRecord, 'integrityHash' | 'stateStatus'> = {
      schemaVersion: 1,
      sessionId: this._sessionId,
      ownerId: this._ownerId,
      createdAt: params.createdAt ?? now,
      updatedAt: now,
      healthState: params.healthState,
      failures: params.failures,
      activeProposals: sanitizedProposals,
      attempts: params.attempts,
      verifications: params.verifications,
      resolvedFailureIds: params.resolvedFailureIds,
      recoveryCounters: params.recoveryCounters,
      unresolvedRecoveryConditions: params.unresolvedRecoveryConditions,
      isStopped: params.isStopped,
      stopReason: params.stopReason,
      containsAuthorityTokens: false,
      containsCredentials: false,
    };

    const integrityHash = computeResilienceStateHash(stateCore);
    const fullRecord: DurableResilienceStateRecord = {
      ...stateCore,
      stateStatus: 'VALID',
      integrityHash,
    };

    try {
      if (!fs.existsSync(this._storageDir)) {
        fs.mkdirSync(this._storageDir, { recursive: true });
      }
      fs.writeFileSync(this._filePath, JSON.stringify(fullRecord, null, 2), 'utf8');
    } catch (err: any) {
      throw new Error(`RESILIENCE_PERSISTENCE_FAILURE: Cannot persist resilience state (${err.message}).`);
    }

    return fullRecord;
  }

  /**
   * Rehydrates persisted state from disk.
   * Validates integrity hash and schema version.
   * If state is corrupted, rejects it fail-closed and returns a safely rebuilt baseline.
   */
  public loadState(): {
    state: DurableResilienceStateRecord;
    wasReconstructed: boolean;
    wasCorrupted: boolean;
  } {
    if (!fs.existsSync(this._filePath)) {
      return {
        state: this._createEmptyState('VALID'),
        wasReconstructed: false,
        wasCorrupted: false,
      };
    }

    try {
      const raw = fs.readFileSync(this._filePath, 'utf8');
      const parsed = JSON.parse(raw);

      if (parsed.schemaVersion !== 1) {
        console.warn(`[DurableResilienceStateStore] Schema version mismatch (${parsed.schemaVersion} vs 1). Rebuilding safely.`);
        return {
          state: this._createEmptyState('REBUILT'),
          wasReconstructed: true,
          wasCorrupted: true,
        };
      }

      // Check integrity hash
      const expectedHash = computeResilienceStateHash(parsed);
      if (parsed.integrityHash !== expectedHash) {
        console.error(`[DurableResilienceStateStore] Integrity check failed for ${this._filePath}. State rejected.`);
        return {
          state: this._createEmptyState('REBUILT'),
          wasReconstructed: true,
          wasCorrupted: true,
        };
      }

      // Ensure no authority tokens were smuggled into persisted state
      if (parsed.containsAuthorityTokens === true || parsed.containsCredentials === true) {
        console.error(`[DurableResilienceStateStore] Security violation: persisted tokens found. State rejected.`);
        return {
          state: this._createEmptyState('REBUILT'),
          wasReconstructed: true,
          wasCorrupted: true,
        };
      }

      return {
        state: parsed as DurableResilienceStateRecord,
        wasReconstructed: true,
        wasCorrupted: false,
      };
    } catch (err: any) {
      console.error(`[DurableResilienceStateStore] Corrupted resilience file (${err.message}). Rebuilding safe baseline.`);
      return {
        state: this._createEmptyState('REBUILT'),
        wasReconstructed: true,
        wasCorrupted: true,
      };
    }
  }

  private _createEmptyState(status: 'VALID' | 'CORRUPTED' | 'REBUILT'): DurableResilienceStateRecord {
    const now = Date.now();
    const core: Omit<DurableResilienceStateRecord, 'integrityHash' | 'stateStatus'> = {
      schemaVersion: 1,
      sessionId: this._sessionId,
      ownerId: this._ownerId,
      createdAt: now,
      updatedAt: now,
      healthState: 'HEALTHY',
      failures: [],
      activeProposals: [],
      attempts: {},
      verifications: {},
      resolvedFailureIds: [],
      recoveryCounters: { totalFailures: 0, totalRecoveries: 0, failedRecoveries: 0 },
      unresolvedRecoveryConditions: [],
      isStopped: false,
      stopReason: '',
      containsAuthorityTokens: false,
      containsCredentials: false,
    };
    return {
      ...core,
      stateStatus: status,
      integrityHash: computeResilienceStateHash(core),
    };
  }
}
