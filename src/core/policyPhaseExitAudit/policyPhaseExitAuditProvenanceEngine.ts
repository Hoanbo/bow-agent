// src/core/policyPhaseExitAudit/policyPhaseExitAuditProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Dedicated Audit Provenance Engine (Component 897).
// Append-only SHA-256 cryptographic chain binding all audit events, criteria evaluations, and reports.
//
// Core Authority Invariants:
// - PROVENANCE_IS_APPEND_ONLY
// - FAIL_CLOSED_ON_TAMPERING
// - USER_STOP > EVERYTHING

import * as crypto from 'crypto';
import {
  type AuditProvenanceRecord,
  type PhaseExitAuditId,
  type AuditCriterionId,
  type AuditEvidenceId,
  type AuditReadinessStatus,
  createAuditProvenanceId,
} from './policyPhaseExitAuditTypes.js';

export const AUDIT_PROVENANCE_GENESIS_ANCHOR = 'GENESIS_PHASE_1_3_EXIT_AUDIT';

export interface AuditProvenanceVerificationResult {
  readonly valid: boolean;
  readonly recordCount: number;
  readonly error?: string;
}

export class PolicyPhaseExitAuditProvenanceEngine {
  private readonly chains = new Map<string, AuditProvenanceRecord[]>();
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Audit provenance engine suspended by USER_STOP supremacy');
    }
  }

  private calculateRecordHash(params: {
    readonly previousHash: string;
    readonly payloadHash: string;
    readonly tenantPartition: string;
    readonly auditId: string;
    readonly timestamp: string;
  }): string {
    return crypto
      .createHash('sha256')
      .update(`${params.previousHash}:${params.payloadHash}:${params.tenantPartition}:${params.auditId}:${params.timestamp}`)
      .digest('hex');
  }

  /**
   * Appends an audit provenance record to the tenant's chain.
   */
  public recordAuditEvent(params: {
    readonly tenantPartition: string;
    readonly auditId: PhaseExitAuditId;
    readonly criterionId?: AuditCriterionId;
    readonly evidenceId?: AuditEvidenceId;
    readonly assessmentStatus: AuditReadinessStatus;
    readonly payload: Record<string, any>;
  }): AuditProvenanceRecord {
    this.assertUserStopInactive();

    let chain = this.chains.get(params.tenantPartition);
    if (!chain) {
      chain = [];
      this.chains.set(params.tenantPartition, chain);
    }

    const previousHash = chain.length > 0 ? chain[chain.length - 1].recordHash : AUDIT_PROVENANCE_GENESIS_ANCHOR;
    const now = new Date().toISOString();
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(params.payload)).digest('hex');

    const recordHash = this.calculateRecordHash({
      previousHash,
      payloadHash,
      tenantPartition: params.tenantPartition,
      auditId: params.auditId,
      timestamp: now,
    });

    const record: AuditProvenanceRecord = Object.freeze({
      provenanceId: createAuditProvenanceId(`prov_audit_${Date.now()}_${chain.length}`),
      tenantPartition: params.tenantPartition,
      auditId: params.auditId,
      criterionId: params.criterionId,
      evidenceId: params.evidenceId,
      assessmentStatus: params.assessmentStatus,
      timestamp: now,
      previousHash,
      payloadHash,
      recordHash,
    });

    chain.push(record);
    return record;
  }

  /**
   * Verifies the cryptographic integrity of a tenant's audit provenance chain.
   */
  public verifyChain(tenantPartition: string): AuditProvenanceVerificationResult {
    this.assertUserStopInactive();

    const chain = this.chains.get(tenantPartition);
    if (!chain || chain.length === 0) {
      return Object.freeze({ valid: true, recordCount: 0 });
    }

    let expectedPreviousHash = AUDIT_PROVENANCE_GENESIS_ANCHOR;

    for (let i = 0; i < chain.length; i++) {
      const rec = chain[i];

      if (rec.previousHash !== expectedPreviousHash) {
        return Object.freeze({
          valid: false,
          recordCount: chain.length,
          error: `PROVENANCE_TAMPER_DETECTED: Broken parent link at index ${i}`,
        });
      }

      const recomputedHash = this.calculateRecordHash({
        previousHash: rec.previousHash,
        payloadHash: rec.payloadHash,
        tenantPartition: rec.tenantPartition,
        auditId: rec.auditId,
        timestamp: rec.timestamp,
      });

      if (recomputedHash !== rec.recordHash) {
        return Object.freeze({
          valid: false,
          recordCount: chain.length,
          error: `PROVENANCE_TAMPER_DETECTED: Hash mismatch at index ${i}`,
        });
      }

      expectedPreviousHash = rec.recordHash;
    }

    return Object.freeze({ valid: true, recordCount: chain.length });
  }
}
