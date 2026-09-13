// src/core/policyCandidateAuthorization/policyAuthorizationDecisionStore.ts
// BOWCON V4.0 — MS-1.3.69: GOVERNED CANDIDATE AUTHORIZATION & ACTIVATION READINESS LAYER
//
// Governed Policy Authorization Decision Store (Component 781).
// Provides durable, tenant-isolated, crash-safe, and sanitized persistence for
// human authorization decisions and activation readiness evaluations.
//
// Guarantees:
// 1. Strict tenant partition isolation via resolveUserPartition
// 2. Anti-duplicate idempotency (same candidateDraftId, reviewer, and decision returns cached record)
// 3. Replay and conflicting modification prevention (conflicting terminal decision fails closed)
// 4. Atomic durable file replacement (temp file write + rename)
// 5. Deep secret sanitization via DiagnosisSanitizer
// 6. Fail-closed storage corruption handling
// 7. USER_STOP supremacy over all persistence operations
//
// Authority Invariants:
// - STORE_GRANTS_ZERO_AUTHORITY: Storage holds audit/governance records only
// - USER_STOP > ALL_PERSISTENCE_OPERATIONS

import fs from 'node:fs';
import path from 'node:path';
import type {
  HumanAuthorizationDecision,
  ActivationReadinessDecision,
  PolicyCandidateAuthorizationOptions,
} from './policyCandidateAuthorizationTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export interface ListDecisionsOptions {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface ListDecisionsResult {
  readonly decisions: readonly HumanAuthorizationDecision[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

interface TenantStoragePayload {
  readonly decisions: HumanAuthorizationDecision[];
  readonly readinessDecisions: ActivationReadinessDecision[];
}

export class PolicyAuthorizationDecisionStore {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly sanitizer: DiagnosisSanitizer;

  // In-memory tenant partition cache:
  // tenantPartition -> decisionId -> HumanAuthorizationDecision
  private readonly tenantDecisions: Map<string, Map<string, HumanAuthorizationDecision>> = new Map();
  // tenantPartition -> candidateDraftId -> decisionId
  private readonly candidateDecisionLookup: Map<string, Map<string, string>> = new Map();
  // tenantPartition -> readinessId -> ActivationReadinessDecision
  private readonly tenantReadiness: Map<string, Map<string, ActivationReadinessDecision>> = new Map();
  // tenantPartition -> candidateDraftId -> readinessId
  private readonly candidateReadinessLookup: Map<string, Map<string, string>> = new Map();

  constructor(options?: PolicyCandidateAuthorizationOptions, sanitizer?: DiagnosisSanitizer) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.sanitizer = sanitizer ?? globalDiagnosisSanitizer;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Authorization store suspended by USER_STOP supremacy');
    }
  }

  private getTenantStorageDir(tenantPartition: string): string {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('STORE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    const resolved = resolveUserPartition(tenantPartition.trim(), this.baseDir);
    const authDir = path.join(resolved.baseDir, resolved.partitionKey, 'candidate_authorizations');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    return authDir;
  }

  private loadTenantStateIfEmpty(tenantPartition: string): void {
    if (this.tenantDecisions.has(tenantPartition)) {
      return;
    }

    const decMap = new Map<string, HumanAuthorizationDecision>();
    const candMap = new Map<string, string>();
    const readMap = new Map<string, ActivationReadinessDecision>();
    const candReadMap = new Map<string, string>();

    this.tenantDecisions.set(tenantPartition, decMap);
    this.candidateDecisionLookup.set(tenantPartition, candMap);
    this.tenantReadiness.set(tenantPartition, readMap);
    this.candidateReadinessLookup.set(tenantPartition, candReadMap);

    const authDir = this.getTenantStorageDir(tenantPartition);
    const storeFile = path.join(authDir, 'authorizations.json');

    if (fs.existsSync(storeFile)) {
      try {
        const raw = fs.readFileSync(storeFile, 'utf8');
        const parsed: TenantStoragePayload = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.decisions)) {
            for (const dec of parsed.decisions) {
              if (dec && dec.decisionId && dec.tenantPartition === tenantPartition) {
                decMap.set(dec.decisionId, Object.freeze(dec));
                candMap.set(dec.candidateDraftId, dec.decisionId);
              }
            }
          }
          if (Array.isArray(parsed.readinessDecisions)) {
            for (const r of parsed.readinessDecisions) {
              if (r && r.readinessId && r.tenantPartition === tenantPartition) {
                readMap.set(r.readinessId, Object.freeze(r));
                candReadMap.set(r.candidateDraftId, r.readinessId);
              }
            }
          }
        }
      } catch (err: any) {
        throw new Error(`AUTHORIZATION_STORE_CORRUPTION: Failed to parse storage for tenant '${tenantPartition}': ${err.message}`);
      }
    }
  }

  private persistTenantState(tenantPartition: string): void {
    const authDir = this.getTenantStorageDir(tenantPartition);
    const storeFile = path.join(authDir, 'authorizations.json');
    const tempFile = path.join(authDir, `authorizations_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);

    const decisions = Array.from(this.tenantDecisions.get(tenantPartition)?.values() ?? []);
    const readinessDecisions = Array.from(this.tenantReadiness.get(tenantPartition)?.values() ?? []);

    const sanitizedPayload = this.sanitizer.sanitize({
      decisions,
      readinessDecisions,
    });

    fs.writeFileSync(tempFile, JSON.stringify(sanitizedPayload, null, 2), 'utf8');
    fs.renameSync(tempFile, storeFile);
  }

  /**
   * Saves a human authorization decision.
   * Guarantees duplicate-idempotency and conflicting modification rejection.
   */
  public saveDecision(decision: HumanAuthorizationDecision): HumanAuthorizationDecision {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(decision.tenantPartition);

    const decMap = this.tenantDecisions.get(decision.tenantPartition)!;
    const candMap = this.candidateDecisionLookup.get(decision.tenantPartition)!;

    // Check if candidate draft already has an existing decision
    if (candMap.has(decision.candidateDraftId)) {
      const existingId = candMap.get(decision.candidateDraftId)!;
      const existing = decMap.get(existingId)!;

      // Idempotent duplicate: identical reviewer and decision
      if (existing.reviewerId === decision.reviewerId && existing.decision === decision.decision) {
        return existing;
      }

      // Conflicting rewrite: fail closed
      throw new Error(`CONFLICTING_AUTHORIZATION_DECISION: Candidate draft '${decision.candidateDraftId}' already has a recorded decision '${existing.decision}' by reviewer '${existing.reviewerId}'. Rewriting decisions is strictly forbidden.`);
    }

    const frozen = Object.freeze({ ...decision });
    decMap.set(frozen.decisionId, frozen);
    candMap.set(frozen.candidateDraftId, frozen.decisionId);

    this.persistTenantState(decision.tenantPartition);
    return frozen;
  }

  /**
   * Saves an activation readiness decision.
   */
  public saveReadiness(readiness: ActivationReadinessDecision): ActivationReadinessDecision {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(readiness.tenantPartition);

    const readMap = this.tenantReadiness.get(readiness.tenantPartition)!;
    const candReadMap = this.candidateReadinessLookup.get(readiness.tenantPartition)!;

    const frozen = Object.freeze({ ...readiness });
    readMap.set(frozen.readinessId, frozen);
    candReadMap.set(frozen.candidateDraftId, frozen.readinessId);

    this.persistTenantState(readiness.tenantPartition);
    return frozen;
  }

  /**
   * Retrieves an authorization decision by candidateDraftId.
   */
  public getDecisionByCandidate(tenantPartition: string, candidateDraftId: string): HumanAuthorizationDecision | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);

    const candMap = this.candidateDecisionLookup.get(tenantPartition);
    const existingId = candMap?.get(candidateDraftId);
    if (!existingId) return null;

    return this.tenantDecisions.get(tenantPartition)?.get(existingId) ?? null;
  }

  /**
   * Retrieves an activation readiness decision by candidateDraftId.
   */
  public getReadinessByCandidate(tenantPartition: string, candidateDraftId: string): ActivationReadinessDecision | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);

    const candReadMap = this.candidateReadinessLookup.get(tenantPartition);
    const existingId = candReadMap?.get(candidateDraftId);
    if (!existingId) return null;

    return this.tenantReadiness.get(tenantPartition)?.get(existingId) ?? null;
  }

  /**
   * Lists decisions with bounded pagination.
   */
  public listDecisions(tenantPartition: string, options?: ListDecisionsOptions): ListDecisionsResult {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);

    const all = Array.from(this.tenantDecisions.get(tenantPartition)?.values() ?? []);
    // Sort reverse chronological
    all.sort((a, b) => Date.parse(b.decidedAt) - Date.parse(a.decidedAt));

    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 20));
    const offset = (page - 1) * pageSize;
    const paged = all.slice(offset, offset + pageSize);

    return {
      decisions: Object.freeze(paged),
      total: all.length,
      page,
      pageSize,
    };
  }
}
