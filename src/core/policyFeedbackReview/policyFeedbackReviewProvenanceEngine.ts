// src/core/policyFeedbackReview/policyFeedbackReviewProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.67: GOVERNED FEEDBACK REVIEW, POLICY EVOLUTION INTAKE & HUMAN REVIEW QUEUE LAYER
//
// Governed Policy Feedback Review Provenance Engine (Component 762).
// Implements an append-only, tamper-evident cryptographic SHA-256 provenance chain
// linking proposal ingestion, revalidation, queuing, human review decisions, and evolution intake.
//
// Authority Invariants:
// - IMMUTABLE_CHAIN: Hash tampering detected and rejected fail-closed
// - NO_AUTHORITY_GRANT: Provenance records historical evidence only
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import path from 'node:path';
import type {
  FeedbackReviewId,
  FeedbackReviewProvenanceRecord,
  PolicyFeedbackReviewOptions,
} from './policyFeedbackReviewTypes.js';
import { createReviewProvenanceId } from './policyFeedbackReviewTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export class PolicyFeedbackReviewProvenanceEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  // Tenant -> Map<reviewId, FeedbackReviewProvenanceRecord[]>
  private readonly chains: Map<string, Map<string, FeedbackReviewProvenanceRecord[]>> = new Map();

  constructor(options?: PolicyFeedbackReviewOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Provenance operations suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('PROVENANCE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  private getTenantChains(tenantPartition: string): Map<string, FeedbackReviewProvenanceRecord[]> {
    let map = this.chains.get(tenantPartition);
    if (!map) {
      map = new Map();
      this.chains.set(tenantPartition, map);
    }
    return map;
  }

  /**
   * Appends an event to the review provenance chain.
   */
  public appendEvent(
    tenantPartition: string,
    reviewId: FeedbackReviewId,
    eventType: string,
    details?: Record<string, any>
  ): FeedbackReviewProvenanceRecord {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const tenantMap = this.getTenantChains(tenantPartition);
    let chain = tenantMap.get(reviewId);
    if (!chain) {
      chain = [];
      tenantMap.set(reviewId, chain);
    }

    const previousHash = chain.length > 0 ? chain[chain.length - 1].currentHash : 'GENESIS_FEEDBACK_REVIEW_HASH';
    const timestamp = new Date().toISOString();

    const detailsStr = details ? JSON.stringify(details) : '';
    const detailsHash = details ? crypto.createHash('sha256').update(detailsStr).digest('hex') : undefined;

    const currentHash = crypto.createHash('sha256')
      .update(`${reviewId}:${tenantPartition}:${eventType}:${previousHash}:${timestamp}:${detailsHash ?? ''}`)
      .digest('hex');

    const provenanceId = createReviewProvenanceId(`rprov_${currentHash.substring(0, 16)}`);

    const record: FeedbackReviewProvenanceRecord = Object.freeze({
      provenanceId,
      reviewId,
      tenantPartition,
      eventType,
      previousHash,
      currentHash,
      timestamp,
      detailsHash,
    });

    chain.push(record);
    return record;
  }

  /**
   * Gets the head hash of a review provenance chain.
   */
  public getHeadHash(tenantPartition: string, reviewId: FeedbackReviewId): string {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    const chain = this.getTenantChains(tenantPartition).get(reviewId);
    if (!chain || chain.length === 0) {
      return 'GENESIS_FEEDBACK_REVIEW_HASH';
    }
    return chain[chain.length - 1].currentHash;
  }

  /**
   * Cryptographically verifies the integrity of a review provenance chain.
   */
  public verifyChainIntegrity(tenantPartition: string, reviewId: FeedbackReviewId): { valid: boolean; errors: string[] } {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const chain = this.getTenantChains(tenantPartition).get(reviewId);
    if (!chain || chain.length === 0) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];
    let expectedPrev = 'GENESIS_FEEDBACK_REVIEW_HASH';

    for (let i = 0; i < chain.length; i++) {
      const record = chain[i];

      if (record.previousHash !== expectedPrev) {
        errors.push(`HASH_CHAIN_DISCONTINUITY: Entry ${i} previousHash '${record.previousHash}' does not match expected '${expectedPrev}'`);
      }

      if (record.tenantPartition !== tenantPartition) {
        errors.push(`TENANT_MISMATCH: Entry ${i} tenant '${record.tenantPartition}' does not match requested '${tenantPartition}'`);
      }

      if (record.reviewId !== reviewId) {
        errors.push(`REVIEW_ID_MISMATCH: Entry ${i} reviewId '${record.reviewId}' does not match requested '${reviewId}'`);
      }

      const recalculated = crypto.createHash('sha256')
        .update(`${record.reviewId}:${record.tenantPartition}:${record.eventType}:${record.previousHash}:${record.timestamp}:${record.detailsHash ?? ''}`)
        .digest('hex');

      if (recalculated !== record.currentHash) {
        errors.push(`CURRENT_HASH_CORRUPTION: Entry ${i} currentHash does not match recalculated hash`);
      }

      expectedPrev = record.currentHash;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
