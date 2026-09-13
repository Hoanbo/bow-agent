// src/core/policyActiveIncidentResponse/policyActiveIncidentProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Governed Incident Provenance Engine (Component 837).
// Manages append-only SHA-256 cryptographic hash chains for active policy incident detection,
// safety boundary activations, human escalations, and incident resolutions.
//
// Core Authority Invariants:
// - PROVENANCE_ENGINE_GRANTS_ZERO_AUTHORITY: Produces cryptographic audit trail only
// - TAMPER_EVIDENT_HASH_CHAINS: Any alteration fails closed (PROVENANCE_TAMPER_DETECTED)
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import crypto from 'node:crypto';
import type {
  ActiveIncidentId,
  IncidentProvenanceRecord,
  IncidentSeverity,
  PolicyActiveIncidentResponseOptions,
} from './policyActiveIncidentResponseTypes.js';
import { createIncidentProvenanceId } from './policyActiveIncidentResponseTypes.js';

export class PolicyActiveIncidentProvenanceEngine {
  private readonly isUserStopActiveFn?: () => boolean;
  // In-memory tenant provenance chains: tenantPartition -> IncidentProvenanceRecord[]
  private readonly chains: Map<string, IncidentProvenanceRecord[]> = new Map();

  constructor(options?: PolicyActiveIncidentResponseOptions) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Incident provenance logging suspended by USER_STOP supremacy');
    }
  }

  /**
   * Appends an immutable incident response event to the cryptographic provenance chain.
   */
  public appendIncidentEvent(
    tenantPartition: string,
    incidentId: ActiveIncidentId,
    severity: IncidentSeverity,
    eventType: string,
    payload: Record<string, any>
  ): IncidentProvenanceRecord {
    this.assertUserStopInactive();

    let chain = this.chains.get(tenantPartition);
    if (!chain) {
      chain = [];
      this.chains.set(tenantPartition, chain);
    }

    const previousHash =
      chain.length > 0
        ? chain[chain.length - 1].recordHash
        : '0000000000000000000000000000000000000000000000000000000000000000';

    const timestamp = new Date().toISOString();
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload ?? {}))
      .digest('hex');

    const recordData = `${tenantPartition}:${incidentId}:${severity}:${eventType}:${timestamp}:${previousHash}:${payloadHash}`;
    const recordHash = crypto.createHash('sha256').update(recordData).digest('hex');

    const record: IncidentProvenanceRecord = Object.freeze({
      provenanceId: createIncidentProvenanceId(`iprv_${recordHash.substring(0, 16)}`),
      tenantPartition,
      incidentId,
      severity,
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
   * Verifies the cryptographic integrity of the incident provenance chain for a tenant.
   */
  public verifyChainIntegrity(tenantPartition: string): boolean {
    this.assertUserStopInactive();

    const chain = this.chains.get(tenantPartition);
    if (!chain || chain.length === 0) {
      return true;
    }

    let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';

    for (const record of chain) {
      if (record.tenantPartition !== tenantPartition) {
        throw new Error(`PROVENANCE_TAMPER_DETECTED: Tenant partition mismatch in record '${record.provenanceId}'`);
      }
      if (record.previousHash !== expectedPrev) {
        throw new Error(`PROVENANCE_TAMPER_DETECTED: Broken cryptographic hash link in record '${record.provenanceId}'`);
      }

      const recomputedData = `${record.tenantPartition}:${record.incidentId}:${record.severity}:${record.eventType}:${record.timestamp}:${record.previousHash}:${record.payloadHash}`;
      const recomputedHash = crypto.createHash('sha256').update(recomputedData).digest('hex');

      if (recomputedHash !== record.recordHash) {
        throw new Error(`PROVENANCE_TAMPER_DETECTED: Hash verification failed for record '${record.provenanceId}'`);
      }

      expectedPrev = record.recordHash;
    }

    return true;
  }

  /**
   * Retrieves the immutable provenance chain for a tenant.
   */
  public getChain(tenantPartition: string): readonly IncidentProvenanceRecord[] {
    this.assertUserStopInactive();
    return Object.freeze([...(this.chains.get(tenantPartition) ?? [])]);
  }
}
