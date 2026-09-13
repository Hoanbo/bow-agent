// src/core/policyPhaseTransition/policyPhaseTransitionStore.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Governed Phase Transition Store (Component 879).
// Provides durable, crash-safe, tenant-partitioned persistence for phase transitions.
// Enforces atomic file replacement, secret sanitization, and path traversal rejection via resolveUserPartition.
//
// Core Authority Invariants:
// - STORE_GRANTS_ZERO_AUTHORITY
// - USER_STOP > ALL_PERSISTENCE_OPERATIONS
// - ZERO_DESTRUCTIVE_DELETION
// - FAIL_CLOSED

import fs from 'node:fs';
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type {
  PhaseState,
  PhaseExitCandidate,
  PhaseExitReviewPackage,
  PhaseExitAuthorizationRecord,
  PhaseExitCommitRecord,
  Phase14EntryReadinessRecord,
  Phase14EntryAuthorizationRecord,
  Phase14EntryCommitRecord,
} from './policyPhaseTransitionTypes.js';

export interface PhaseTransitionStateSnapshot {
  readonly tenantId: string;
  readonly currentPhase: PhaseState;
  readonly candidates: readonly PhaseExitCandidate[];
  readonly exitAuthorizations: readonly PhaseExitAuthorizationRecord[];
  readonly exitCommit?: PhaseExitCommitRecord;
  readonly entryReadiness?: Phase14EntryReadinessRecord;
  readonly entryAuthorizations: readonly Phase14EntryAuthorizationRecord[];
  readonly entryCommit?: Phase14EntryCommitRecord;
  readonly updatedAt: string;
}

export class PolicyPhaseTransitionStore {
  private readonly baseDir: string;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly isUserStopActiveFn?: () => boolean;

  // In-memory tenant state caches
  private readonly states = new Map<string, PhaseTransitionStateSnapshot>();

  constructor(options?: {
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
    readonly sanitizer?: DiagnosisSanitizer;
  }) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions_phase_transition'));
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Transition store suspended by USER_STOP supremacy');
    }
  }

  private getPartitionDir(tenantId: string): string {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      throw new Error('STORE_SECURITY_VIOLATION: tenantId must be a non-empty string');
    }
    const resolved = resolveUserPartition(tenantId.trim(), this.baseDir);
    const dir = path.join(resolved.baseDir, resolved.partitionKey, 'phase_transition');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private loadSnapshot(tenantId: string): PhaseTransitionStateSnapshot {
    if (this.states.has(tenantId)) {
      return this.states.get(tenantId)!;
    }

    const dir = this.getPartitionDir(tenantId);
    const filePath = path.join(dir, 'phase_transition_state.json');

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as PhaseTransitionStateSnapshot;
        this.states.set(tenantId, parsed);
        return parsed;
      } catch {
        // Corrupted file -> fail closed
        throw new Error(`PERSISTENCE_CORRUPTION: Unable to parse phase transition state for tenant '${tenantId}'`);
      }
    }

    // Default initial phase is PHASE_1_3_ACTIVE
    const initial: PhaseTransitionStateSnapshot = Object.freeze({
      tenantId,
      currentPhase: 'PHASE_1_3_ACTIVE',
      candidates: Object.freeze([]),
      exitAuthorizations: Object.freeze([]),
      entryAuthorizations: Object.freeze([]),
      updatedAt: new Date().toISOString(),
    });

    this.states.set(tenantId, initial);
    return initial;
  }

  private persistSnapshot(snapshot: PhaseTransitionStateSnapshot): void {
    this.assertUserStopInactive();

    this.states.set(snapshot.tenantId, snapshot);

    const dir = this.getPartitionDir(snapshot.tenantId);
    const filePath = path.join(dir, 'phase_transition_state.json');
    const tempPath = `${filePath}.tmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const sanitizedData = this.sanitizer.sanitize(JSON.stringify(snapshot, null, 2));
    fs.writeFileSync(tempPath, sanitizedData, 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  /**
   * Retrieves current phase state for tenant.
   */
  public getCurrentPhase(tenantId: string): PhaseState {
    this.assertUserStopInactive();
    const snapshot = this.loadSnapshot(tenantId);
    return snapshot.currentPhase;
  }

  /**
   * Saves a PhaseExitCandidate.
   */
  public saveCandidate(candidate: PhaseExitCandidate): void {
    this.assertUserStopInactive();
    const current = this.loadSnapshot(candidate.tenantId);

    const updatedCandidates = [...current.candidates, candidate];
    const updated: PhaseTransitionStateSnapshot = Object.freeze({
      ...current,
      currentPhase: 'PHASE_1_3_EXIT_PENDING_REVIEW',
      candidates: Object.freeze(updatedCandidates),
      updatedAt: new Date().toISOString(),
    });

    this.persistSnapshot(updated);
  }

  /**
   * Saves a PhaseExitAuthorizationRecord.
   */
  public saveExitAuthorization(authorization: PhaseExitAuthorizationRecord): void {
    this.assertUserStopInactive();
    const current = this.loadSnapshot(authorization.tenantId);

    const updatedAuths = [...current.exitAuthorizations, authorization];
    const updated: PhaseTransitionStateSnapshot = Object.freeze({
      ...current,
      currentPhase: authorization.decision === 'AUTHORIZED' ? 'PHASE_1_3_EXIT_AUTHORIZED' : current.currentPhase,
      exitAuthorizations: Object.freeze(updatedAuths),
      updatedAt: new Date().toISOString(),
    });

    this.persistSnapshot(updated);
  }

  /**
   * Saves a PhaseExitCommitRecord.
   */
  public saveExitCommit(commit: PhaseExitCommitRecord): void {
    this.assertUserStopInactive();
    const current = this.loadSnapshot(commit.tenantId);

    const updated: PhaseTransitionStateSnapshot = Object.freeze({
      ...current,
      currentPhase: 'PHASE_1_3_EXIT_COMMITTED',
      exitCommit: commit,
      updatedAt: new Date().toISOString(),
    });

    this.persistSnapshot(updated);
  }

  /**
   * Saves a Phase14EntryReadinessRecord.
   */
  public saveEntryReadiness(readiness: Phase14EntryReadinessRecord): void {
    this.assertUserStopInactive();
    const current = this.loadSnapshot(readiness.tenantId);

    const updated: PhaseTransitionStateSnapshot = Object.freeze({
      ...current,
      currentPhase: readiness.status === 'PHASE_1_4_ENTRY_READY' ? 'PHASE_1_4_ENTRY_READY' : current.currentPhase,
      entryReadiness: readiness,
      updatedAt: new Date().toISOString(),
    });

    this.persistSnapshot(updated);
  }

  /**
   * Saves a Phase14EntryAuthorizationRecord.
   */
  public saveEntryAuthorization(authorization: Phase14EntryAuthorizationRecord): void {
    this.assertUserStopInactive();
    const current = this.loadSnapshot(authorization.tenantId);

    const updatedAuths = [...current.entryAuthorizations, authorization];
    const updated: PhaseTransitionStateSnapshot = Object.freeze({
      ...current,
      currentPhase: authorization.decision === 'AUTHORIZED' ? 'PHASE_1_4_ENTRY_AUTHORIZED' : current.currentPhase,
      entryAuthorizations: Object.freeze(updatedAuths),
      updatedAt: new Date().toISOString(),
    });

    this.persistSnapshot(updated);
  }

  /**
   * Saves a Phase14EntryCommitRecord.
   */
  public saveEntryCommit(commit: Phase14EntryCommitRecord): void {
    this.assertUserStopInactive();
    const current = this.loadSnapshot(commit.tenantId);

    const updated: PhaseTransitionStateSnapshot = Object.freeze({
      ...current,
      currentPhase: 'PHASE_1_4_ENTRY_COMMITTED',
      entryCommit: commit,
      updatedAt: new Date().toISOString(),
    });

    this.persistSnapshot(updated);
  }

  /**
   * Returns full snapshot for inspection.
   */
  public getSnapshot(tenantId: string): PhaseTransitionStateSnapshot {
    this.assertUserStopInactive();
    return this.loadSnapshot(tenantId);
  }
}
