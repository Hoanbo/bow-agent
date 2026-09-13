// src/core/policyCandidateAuthorization/policyAuthorizationProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.69: GOVERNED CANDIDATE AUTHORIZATION & ACTIVATION READINESS LAYER
//
// Governed Policy Authorization Provenance Engine (Component 782).
// Implements an append-only, tamper-evident cryptographic SHA-256 provenance chain
// linking candidate validation, authorization request, human authorization decision,
// and activation readiness evaluations.
//
// Authority Invariants:
// - IMMUTABLE_PROVENANCE_CHAIN: Tampering produces PROVENANCE_TAMPER_DETECTED fail-closed
// - READ_ONLY_EVIDENCE: Provenance records evidence only; grants zero authority
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import path from 'node:path';
import type {
  EvolutionPlanId,
  CandidateDraftId,
} from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';
import type {
  AuthorizationRequestId,
  AuthorizationDecisionId,
  ActivationReadinessId,
  AuthorizationProvenanceRecord,
  PolicyCandidateAuthorizationOptions,
} from './policyCandidateAuthorizationTypes.js';
import { createAuthorizationProvenanceId } from './policyCandidateAuthorizationTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export class PolicyAuthorizationProvenanceEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  // Tenant -> candidateDraftId -> AuthorizationProvenanceRecord[]
  private readonly chains: Map<string, Map<string, AuthorizationProvenanceRecord[]>> = new Map();

  constructor(options?: PolicyCandidateAuthorizationOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Authorization provenance suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('PROVENANCE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  private getTenantChains(tenantPartition: string): Map<string, AuthorizationProvenanceRecord[]> {
    let map = this.chains.get(tenantPartition);
    if (!map) {
      map = new Map();
      this.chains.set(tenantPartition, map);
    }
    return map;
  }

  /**
   * Appends an authorization lifecycle event to the cryptographic provenance chain.
   */
  public appendEvent(
    tenantPartition: string,
    candidateDraftId: CandidateDraftId,
    evolutionPlanId: EvolutionPlanId,
    eventType: string,
    payload: {
      readonly authorizationRequestId?: AuthorizationRequestId;
      readonly authorizationDecisionId?: AuthorizationDecisionId;
      readonly activationReadinessId?: ActivationReadinessId;
      readonly details?: Record<string, any>;
    }
  ): AuthorizationProvenanceRecord {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const tenantChains = this.getTenantChains(tenantPartition);
    let chain = tenantChains.get(candidateDraftId);
    if (!chain) {
      chain = [];
      tenantChains.set(candidateDraftId, chain);
    }

    const previousHash = chain.length > 0
      ? chain[chain.length - 1].recordHash
      : '0000000000000000000000000000000000000000000000000000000000000000';

    const timestamp = new Date().toISOString();
    const payloadHash = crypto.createHash('sha256')
      .update(JSON.stringify(payload.details ?? {}))
      .digest('hex');

    const recordData = JSON.stringify({
      tenantPartition,
      candidateDraftId,
      evolutionPlanId,
      authorizationRequestId: payload.authorizationRequestId,
      authorizationDecisionId: payload.authorizationDecisionId,
      activationReadinessId: payload.activationReadinessId,
      eventType,
      timestamp,
      previousHash,
      payloadHash,
    });

    const recordHash = crypto.createHash('sha256').update(recordData).digest('hex');
    const provenanceId = createAuthorizationProvenanceId(`authprov_${recordHash.substring(0, 16)}`);

    const record: AuthorizationProvenanceRecord = Object.freeze({
      provenanceId,
      tenantPartition,
      candidateDraftId,
      evolutionPlanId,
      authorizationRequestId: payload.authorizationRequestId,
      authorizationDecisionId: payload.authorizationDecisionId,
      activationReadinessId: payload.activationReadinessId,
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
   * Cryptographically verifies the provenance chain for a candidate draft.
   */
  public verifyChain(tenantPartition: string, candidateDraftId: CandidateDraftId): boolean {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const tenantChains = this.getTenantChains(tenantPartition);
    const chain = tenantChains.get(candidateDraftId);

    if (!chain || chain.length === 0) {
      return true;
    }

    let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';

    for (const record of chain) {
      if (record.tenantPartition !== tenantPartition) {
        throw new Error(`PROVENANCE_TAMPER_DETECTED: Tenant partition mismatch in record '${record.provenanceId}'`);
      }
      if (record.candidateDraftId !== candidateDraftId) {
        throw new Error(`PROVENANCE_TAMPER_DETECTED: Candidate draft mismatch in record '${record.provenanceId}'`);
      }
      if (record.previousHash !== expectedPrev) {
        throw new Error(`PROVENANCE_TAMPER_DETECTED: Broken cryptographic hash link in record '${record.provenanceId}'`);
      }

      const recomputedData = JSON.stringify({
        tenantPartition: record.tenantPartition,
        candidateDraftId: record.candidateDraftId,
        evolutionPlanId: record.evolutionPlanId,
        authorizationRequestId: record.authorizationRequestId,
        authorizationDecisionId: record.authorizationDecisionId,
        activationReadinessId: record.activationReadinessId,
        eventType: record.eventType,
        timestamp: record.timestamp,
        previousHash: record.previousHash,
        payloadHash: record.payloadHash,
      });

      const recomputedHash = crypto.createHash('sha256').update(recomputedData).digest('hex');
      if (recomputedHash !== record.recordHash) {
        throw new Error(`PROVENANCE_TAMPER_DETECTED: Hash verification failed for record '${record.provenanceId}'`);
      }

      expectedPrev = record.recordHash;
    }

    return true;
  }

  /**
   * Retrieves the current provenance head hash for a candidate draft.
   */
  public getProvenanceHead(tenantPartition: string, candidateDraftId: CandidateDraftId): string {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const tenantChains = this.getTenantChains(tenantPartition);
    const chain = tenantChains.get(candidateDraftId);
    if (!chain || chain.length === 0) {
      return '0000000000000000000000000000000000000000000000000000000000000000';
    }
    return chain[chain.length - 1].recordHash;
  }

  /**
   * Retrieves immutable provenance history records for a candidate draft.
   */
  public getProvenanceRecords(tenantPartition: string, candidateDraftId: CandidateDraftId): readonly AuthorizationProvenanceRecord[] {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const tenantChains = this.getTenantChains(tenantPartition);
    const chain = tenantChains.get(candidateDraftId) ?? [];
    return Object.freeze([...chain]);
  }
}
