// src/core/policyCanary/policyCanaryRecoveryEngine.ts
// BOWCON V4.0 — MS-1.3.61: GOVERNED POLICY CANARY RESILIENCE, FAULT INJECTION & FAILURE-RECOVERY VERIFICATION
//
// Governed Policy Canary Recovery Engine.
// Performs crash-recovery reconciliation from durable persistence, expired candidate eviction,
// broken provenance quarantine, token replay defense, and deterministic fail-closed baseline restoration.
//
// Động cơ phục hồi Canary chính sách có quản trị.
// Thực hiện đối soát phục hồi sự cố từ lưu trữ bền vững, trục xuất ứng viên hết hạn,
// cách ly chuỗi nguồn gốc bị hỏng, phòng thủ phát lại mã ủy quyền và khôi phục đường cơ sở đóng an toàn xác định.
//
// Authority Invariants:
// - Level 2 Controlled Fail-Closed Recovery & State Reconciliation
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE: Never calls issueToken() or produces tokens.
// - ZERO_AUTONOMOUS_APPROVAL: Never calls grantApproval() or bypasses human gates.
// - USER_STOP > ALL_RECOVERY_OPERATIONS: Halts immediately if USER_STOP is active.
// - HARD_FORBIDDEN_IMMUTABILITY: Permanently prevents downgrade of hard-forbidden actions during recovery.
// - STRICT_TENANT_ISOLATION: State is isolated per tenantPartition; cross-tenant access fails closed.
// - TOKEN_REPLAY_DEFENSE: Single-use human authorization tokens cannot be reused or replayed across rings.

import crypto from 'node:crypto';
import {
  type PolicyCanaryRecoveryId,
  type ConsumedTokenReplayId,
  type CanaryRecoveryResult,
  type ConsumedTokenLedgerRecord,
  createPolicyCanaryRecoveryId,
  createConsumedTokenReplayId,
} from './policyCanaryResilienceTypes.js';
import {
  type PolicyCandidatePackage,
  type PolicyRingAssignment,
  type PolicyRing,
  type PolicyCanaryStoreRecord,
} from './policyCanaryTypes.js';
import { CANONICAL_HARD_FORBIDDEN_ACTIONS } from '../policyEnforcement/policyEnforcementTypes.js';
import { PolicyCanaryProvenanceEngine, globalPolicyCanaryProvenanceEngine } from './policyCanaryProvenanceEngine.js';
import { PolicyCanaryCircuitBreaker, globalPolicyCanaryCircuitBreaker } from './policyCanaryCircuitBreaker.js';
import { FailClosedBaselineFallback, globalFailClosedBaselineFallback } from '../policyEnforcement/failClosedBaselineFallback.js';
import { DurableJsonStore } from '../persistence/durableJsonStore.js';
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export interface PolicyCanaryRecoveryEngineOptions {
  readonly provenanceEngine?: PolicyCanaryProvenanceEngine;
  readonly circuitBreaker?: PolicyCanaryCircuitBreaker;
  readonly fallbackProvider?: FailClosedBaselineFallback;
  readonly isUserStopActive?: () => boolean;
}

export class PolicyCanaryRecoveryEngine {
  private readonly provenanceEngine: PolicyCanaryProvenanceEngine;
  private readonly circuitBreaker: PolicyCanaryCircuitBreaker;
  private readonly fallbackProvider: FailClosedBaselineFallback;
  private readonly isUserStopActiveFn?: () => boolean;

  // Replay ledger for consumed authorization tokens: tokenHash -> ConsumedTokenLedgerRecord
  private readonly consumedTokens = new Map<string, ConsumedTokenLedgerRecord>();

  constructor(options?: PolicyCanaryRecoveryEngineOptions) {
    this.provenanceEngine = options?.provenanceEngine ?? globalPolicyCanaryProvenanceEngine;
    this.circuitBreaker = options?.circuitBreaker ?? globalPolicyCanaryCircuitBreaker;
    this.fallbackProvider = options?.fallbackProvider ?? globalFailClosedBaselineFallback;
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  /**
   * Hashes an authorization token to avoid persisting raw credentials.
   * Băm mã ủy quyền để tránh lưu trữ thông tin xác thực thô.
   */
  public hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Records a consumed authorization token into the replay prevention ledger.
   * Ghi lại mã ủy quyền đã tiêu thụ vào sổ cái ngăn chặn phát lại.
   */
  public recordConsumedToken(params: {
    readonly token: string;
    readonly candidateId: PolicyCandidatePackage['candidateId'];
    readonly targetRing: PolicyRing;
    readonly tenantPartition: string;
    readonly consumedBy: string;
  }): ConsumedTokenLedgerRecord {
    const tokenHash = this.hashToken(params.token);
    const replayId = createConsumedTokenReplayId(
      `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    );
    const record: ConsumedTokenLedgerRecord = {
      replayId,
      tokenHash,
      candidateId: params.candidateId,
      targetRing: params.targetRing,
      tenantPartition: params.tenantPartition,
      consumedAt: new Date().toISOString(),
      consumedBy: params.consumedBy,
    };

    this.consumedTokens.set(tokenHash, record);

    globalAuditLedger.record({
      timestamp: record.consumedAt,
      actor: { userId: params.consumedBy, role: 'operator', channel: 'admin' },
      domain: 'shop',
      toolName: 'policy_canary_token_consumed',
      classification: 'ROUTINE',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      argumentsHash: tokenHash,
    });

    return record;
  }

  /**
   * Checks if a token has already been consumed or replayed.
   * Kiểm tra xem mã ủy quyền đã được tiêu thụ hoặc phát lại hay chưa.
   */
  public isTokenAlreadyConsumed(token: string): boolean {
    const tokenHash = this.hashToken(token);
    return this.consumedTokens.has(tokenHash);
  }

  /**
   * Retrieves a consumed token record if it exists.
   * Lấy bản ghi mã ủy quyền đã tiêu thụ nếu tồn tại.
   */
  public getConsumedTokenRecord(token: string): ConsumedTokenLedgerRecord | undefined {
    const tokenHash = this.hashToken(token);
    return this.consumedTokens.get(tokenHash);
  }

  /**
   * Performs crash-recovery reconciliation on a tenant's durable storage record.
   * Validates all candidate packages, purges stale/tampered candidates, and verifies assignments.
   *
   * Thực hiện đối soát phục hồi sự cố trên bản ghi lưu trữ bền vững của người thuê.
   * Xác thực tất cả các gói ứng viên, thanh trừng các ứng viên cũ/bị giả mạo và xác minh các phép gán.
   */
  public reconcileTenantState(
    tenantPartition: string,
    store: DurableJsonStore<PolicyCanaryStoreRecord>
  ): CanaryRecoveryResult {
    const recoveryId = createPolicyCanaryRecoveryId(
      `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    );
    const timestamp = new Date().toISOString();
    const details: string[] = [];

    // 1. Enforce USER_STOP supremacy
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      details.push('Recovery aborted: Emergency USER_STOP is active');
      return {
        recoveryId,
        tenantPartition,
        timestamp,
        disposition: 'FAILED_CLOSED',
        reconciledCandidates: 0,
        quarantinedCandidates: 0,
        restoredToBaseline: true,
        activeRing: 'RING_0',
        details,
      };
    }

    // 2. Reject anonymous tenant reconciliation
    if (!tenantPartition || tenantPartition === 'anonymous' || tenantPartition.trim().length === 0) {
      details.push('Recovery rejected: Anonymous tenant access forbidden');
      return {
        recoveryId,
        tenantPartition: 'anonymous',
        timestamp,
        disposition: 'FAILED_CLOSED',
        reconciledCandidates: 0,
        quarantinedCandidates: 0,
        restoredToBaseline: true,
        activeRing: 'RING_0',
        details,
      };
    }

    // 3. Read durable state
    let storeRecord: PolicyCanaryStoreRecord | null = null;
    try {
      storeRecord = store.read();
    } catch (err: any) {
      details.push(`Durable store read failed: ${err?.message}. Restoring fail-closed baseline.`);
    }

    if (!storeRecord) {
      // Store corrupted or empty -> initialize safe default
      const defaultRecord: PolicyCanaryStoreRecord = {
        tenantPartition,
        candidatePackages: [],
        ringAssignments: [],
        circuitBreakerStatus: { tripped: false },
        lastUpdated: timestamp,
      };
      try {
        store.write(defaultRecord);
      } catch (writeErr: any) {
        details.push(`Failed to write default baseline record: ${writeErr?.message}`);
      }

      return {
        recoveryId,
        tenantPartition,
        timestamp,
        disposition: 'RESTORED_TO_BASELINE',
        reconciledCandidates: 0,
        quarantinedCandidates: 0,
        restoredToBaseline: true,
        activeRing: 'RING_0',
        details,
      };
    }

    // 4. Validate and reconcile each candidate package
    const validCandidates: PolicyCandidatePackage[] = [];
    let quarantinedCount = 0;
    const now = Date.now();

    for (const candidate of storeRecord.candidatePackages) {
      let isCorrupted = false;

      // Check A: Hard-Forbidden Downgrades
      for (const forbidden of CANONICAL_HARD_FORBIDDEN_ACTIONS) {
        const cls = candidate.policyConfig.actionClassifications?.[forbidden];
        if (cls && cls !== 'FORBIDDEN') {
          details.push(
            `QUARANTINED: Candidate '${candidate.candidateId}' illegally downgraded hard-forbidden action '${forbidden}' to '${cls}'`
          );
          isCorrupted = true;
          this.circuitBreaker.trip({
            tenantPartition,
            reason: 'HARD_FORBIDDEN_DOWNGRADE',
            details: `Candidate '${candidate.candidateId}' contained illegal downgrade of '${forbidden}' during restart recovery`,
            trippedBy: 'recovery_engine',
          });
          break;
        }
      }

      // Check B: Cryptographic Checksum Integrity
      if (!isCorrupted) {
        const expectedChecksum = this.calculateChecksum(candidate);
        if (candidate.checksum !== expectedChecksum && candidate.policyConfig.checksum !== expectedChecksum) {
          details.push(
            `QUARANTINED: Candidate '${candidate.candidateId}' checksum mismatch. Tampering detected.`
          );
          isCorrupted = true;
        }
      }

      // Check C: Expiration / Stale Candidate Check
      if (!isCorrupted) {
        const expirationTime = Date.parse(candidate.expiresAt);
        if (Number.isFinite(expirationTime) && expirationTime < now) {
          details.push(
            `QUARANTINED: Candidate '${candidate.candidateId}' is expired (expired at ${candidate.expiresAt})`
          );
          isCorrupted = true;
        }
      }

      // Check D: Provenance Chain Integrity
      if (!isCorrupted) {
        const provCheck = this.provenanceEngine.verifyChain(candidate.candidateId);
        if (!provCheck.valid) {
          details.push(
            `QUARANTINED: Candidate '${candidate.candidateId}' has broken provenance chain: ${provCheck.reason}`
          );
          isCorrupted = true;
        }
      }

      if (isCorrupted) {
        quarantinedCount++;
      } else {
        validCandidates.push(candidate);
      }
    }

    // 5. Reconcile Ring Assignments
    const validAssignments: PolicyRingAssignment[] = [];
    const validCandidateIds = new Set(validCandidates.map((c) => c.candidateId));

    for (const asgn of storeRecord.ringAssignments) {
      if (validCandidateIds.has(asgn.candidateId) && asgn.active) {
        validAssignments.push(asgn);
      } else {
        details.push(
          `REVERTED: Ring assignment '${asgn.assignmentId}' for ring '${asgn.ring}' pointed to invalid/quarantined candidate '${asgn.candidateId}'`
        );
      }
    }

    // 6. Persist reconciled state back to store
    const reconciledRecord: PolicyCanaryStoreRecord = {
      tenantPartition,
      candidatePackages: validCandidates,
      ringAssignments: validAssignments,
      circuitBreakerStatus: storeRecord.circuitBreakerStatus,
      lastUpdated: timestamp,
    };

    store.write(reconciledRecord);

    const activeRing: PolicyRing = validAssignments.length > 0 ? validAssignments[0].ring : 'RING_0';
    const disposition = quarantinedCount > 0 ? 'QUARANTINED' : 'RECONCILED';

    globalAuditLedger.record({
      timestamp,
      actor: { userId: 'system', role: 'supervisor', channel: 'internal' },
      domain: 'shop',
      toolName: 'policy_canary_reconciled',
      classification: 'HIGH_IMPACT',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      argumentsHash: crypto
        .createHash('sha256')
        .update(globalDiagnosisSanitizer.sanitizeString(JSON.stringify({ recoveryId, tenantPartition, disposition, quarantinedCount })))
        .digest('hex'),
    });

    return {
      recoveryId,
      tenantPartition,
      timestamp,
      disposition,
      reconciledCandidates: validCandidates.length,
      quarantinedCandidates: quarantinedCount,
      restoredToBaseline: validCandidates.length === 0,
      activeRing,
      details,
    };
  }

  /**
   * Resets in-memory consumed token ledger (used during unit tests).
   * Đặt lại sổ cái mã xác thực trong bộ nhớ (dùng trong kiểm thử đơn vị).
   */
  public clear(): void {
    this.consumedTokens.clear();
  }

  private calculateChecksum(candidate: PolicyCandidatePackage): string {
    const payload = JSON.stringify({
      versionId: candidate.policyConfig.versionId,
      classifications: candidate.policyConfig.actionClassifications,
      guardrails: candidate.policyConfig.guardrails,
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}

export const globalPolicyCanaryRecoveryEngine = new PolicyCanaryRecoveryEngine();
