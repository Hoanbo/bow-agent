// src/core/policyActiveRollback/policyActiveRollbackProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.72: GOVERNED ACTIVE POLICY ROLLBACK, SUNSET & RECOVERY BOUNDARY
//
// Governed Active Rollback Provenance Engine (Component 815).
// Maintains an append-only, SHA-256 cryptographic provenance chain for rollback,
// sunset, and recovery operations with tamper detection.
//
// Invariants:
// - APPEND_ONLY_HASH_CHAIN: Records are linked via SHA-256 hash chains
// - PROVENANCE_TAMPER_DETECTED: Tampering fails closed immediately
// - NEVER_REWRITE_HISTORY: Corrupted or diverging chains are never rewritten
// - STRICT_TENANT_ISOLATION: Chains are partitioned per tenant
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import type {
  RollbackProvenanceRecord,
  RollbackProvenanceId,
  ActiveRollbackRequestId,
  SunsetRequestId,
  RecoveryRequestId,
  PolicyActiveRollbackOptions,
} from './policyActiveRollbackTypes.js';

export const ROLLBACK_PROVENANCE_GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class PolicyActiveRollbackProvenanceEngine {
  private readonly isUserStopActiveFn?: () => boolean;
  // tenantPartition -> RollbackProvenanceRecord[]
  private readonly chains: Map<string, RollbackProvenanceRecord[]> = new Map();

  constructor(options?: PolicyActiveRollbackOptions) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Rollback provenance engine suspended by USER_STOP supremacy');
    }
  }

  private computePayloadHash(payload: Record<string, any>): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  private computeRecordHash(params: {
    tenantPartition: string;
    eventType: string;
    timestamp: string;
    previousHash: string;
    payloadHash: string;
  }): string {
    return crypto
      .createHash('sha256')
      .update(
        `${params.tenantPartition}:${params.eventType}:${params.timestamp}:${params.previousHash}:${params.payloadHash}`
      )
      .digest('hex');
  }

  /**
   * Appends a new cryptographic provenance record to the tenant's chain.
   */
  public appendRecord(params: {
    readonly tenantPartition: string;
    readonly eventType: string;
    readonly payload: Record<string, any>;
    readonly activePolicyStateId?: string;
    readonly targetPolicyVersion?: string;
    readonly rollbackRequestId?: ActiveRollbackRequestId;
    readonly sunsetRequestId?: SunsetRequestId;
    readonly recoveryRequestId?: RecoveryRequestId;
    readonly authorizationDecisionId?: string;
    readonly commitId?: string;
  }): RollbackProvenanceRecord {
    this.assertUserStopInactive();

    const { tenantPartition, eventType, payload } = params;
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('PROVENANCE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }

    if (!this.chains.has(tenantPartition)) {
      this.chains.set(tenantPartition, []);
    }
    const chain = this.chains.get(tenantPartition)!;

    // Verify existing chain integrity before appending
    this.verifyChainIntegrity(tenantPartition);

    const previousHash = chain.length === 0
      ? ROLLBACK_PROVENANCE_GENESIS_HASH
      : chain[chain.length - 1].recordHash;

    const timestamp = new Date().toISOString();
    const payloadHash = this.computePayloadHash(payload);
    const recordHash = this.computeRecordHash({
      tenantPartition,
      eventType,
      timestamp,
      previousHash,
      payloadHash,
    });

    const provenanceId = `rolprov_${recordHash.substring(0, 16)}` as RollbackProvenanceId;

    const record: RollbackProvenanceRecord = Object.freeze({
      provenanceId,
      tenantPartition,
      activePolicyStateId: params.activePolicyStateId,
      targetPolicyVersion: params.targetPolicyVersion,
      rollbackRequestId: params.rollbackRequestId,
      sunsetRequestId: params.sunsetRequestId,
      recoveryRequestId: params.recoveryRequestId,
      authorizationDecisionId: params.authorizationDecisionId,
      commitId: params.commitId,
      eventType,
      timestamp,
      previousHash,
      recordHash,
      payloadHash,
    });

    chain.push(record);
    return record;
  }

  /**
   * Retrieves the full provenance record chain for a tenant.
   */
  public getChain(tenantPartition: string): readonly RollbackProvenanceRecord[] {
    this.assertUserStopInactive();
    return Object.freeze(this.chains.get(tenantPartition) ?? []);
  }

  /**
   * Returns the current head record hash for a tenant.
   */
  public getHeadHash(tenantPartition: string): string {
    this.assertUserStopInactive();
    const chain = this.chains.get(tenantPartition);
    if (!chain || chain.length === 0) {
      return ROLLBACK_PROVENANCE_GENESIS_HASH;
    }
    return chain[chain.length - 1].recordHash;
  }

  /**
   * Verifies the cryptographic integrity of a tenant's provenance chain.
   * Throws PROVENANCE_TAMPER_DETECTED if any link is broken.
   */
  public verifyChainIntegrity(tenantPartition: string): boolean {
    this.assertUserStopInactive();

    const chain = this.chains.get(tenantPartition);
    if (!chain || chain.length === 0) {
      return true;
    }

    let expectedPrevious = ROLLBACK_PROVENANCE_GENESIS_HASH;

    for (let i = 0; i < chain.length; i++) {
      const record = chain[i];

      if (record.previousHash !== expectedPrevious) {
        throw new Error(
          `PROVENANCE_TAMPER_DETECTED: Broken chain link at index ${i} for tenant '${tenantPartition}'. Expected previousHash '${expectedPrevious}', found '${record.previousHash}'.`
        );
      }

      const recomputedHash = this.computeRecordHash({
        tenantPartition: record.tenantPartition,
        eventType: record.eventType,
        timestamp: record.timestamp,
        previousHash: record.previousHash,
        payloadHash: record.payloadHash,
      });

      if (recomputedHash !== record.recordHash) {
        throw new Error(
          `PROVENANCE_TAMPER_DETECTED: Tampered recordHash at index ${i} for tenant '${tenantPartition}'. Expected '${recomputedHash}', found '${record.recordHash}'.`
        );
      }

      expectedPrevious = record.recordHash;
    }

    return true;
  }
}
