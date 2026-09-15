// src/core/federatedCollaborationMemory/agentObservationReconciliationEngine.ts
// BOWCON V4.0 — MS-1.5.15: NATIVE GOVERNED FEDERATED COLLABORATION MEMORY, SHARED CONTEXT & CONSENSUS GOVERNANCE ENGINE
// Component 1122 — REAL
//
// EN: Governed observation reconciliation engine comparing multi-agent observations, detecting contradictions,
//     enforcing confidence thresholds, and preserving strict cryptographic provenance without silent compromise.
// VI: Động cơ đối soát quan sát có quản trị so sánh các quan sát đa tác tử, phát hiện mâu thuẫn,
//     thực thi ngưỡng tin cậy, và bảo toàn nguồn gốc mật mã nghiêm ngặt mà không thỏa hiệp ngầm.

import {
  AgentObservation,
  ObservationReconciliationRecord,
  ObservationReconciliationStatus,
  ConsensusConflictCategory,
  FederatedCollaborationMemoryValidationError,
  FederatedCollaborationMemoryTenantIsolationError,
  FederatedCollaborationMemorySessionIsolationError,
  computeObservationHash,
  computeObservationReconciliationHash,
} from './federatedCollaborationMemoryTypes.js';
import { CollaborationMemorySecurityBoundary } from './collaborationMemorySecurityBoundary.js';

export interface SubmitObservationParams {
  readonly observationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly federationId: string;
  readonly agentId: string;
  readonly generation: number;
  readonly observationType: string;
  readonly target: string;
  readonly observedValue: string;
  readonly confidence: number;
}

export class AgentObservationReconciliationEngine {
  private readonly securityBoundary: CollaborationMemorySecurityBoundary;
  private readonly observations: Map<string, AgentObservation> = new Map();
  private readonly reconciliations: Map<string, ObservationReconciliationRecord> = new Map();

  constructor(options?: { readonly securityBoundary?: CollaborationMemorySecurityBoundary }) {
    this.securityBoundary = options?.securityBoundary ?? new CollaborationMemorySecurityBoundary();
  }

  /**
   * EN: Submits a single agent observation with security validation.
   * VI: Gửi một quan sát tác tử đơn lẻ với xác thực bảo mật.
   */
  public submitObservation(params: SubmitObservationParams): AgentObservation {
    // 1. Checkpoint: PRE_OBSERVATION_SUBMISSION
    this.securityBoundary.assertStopInactive('PRE_OBSERVATION_SUBMISSION', params.tenantId, params.federationId);

    if (!params.observationId || params.observationId.trim().length === 0) {
      throw new FederatedCollaborationMemoryValidationError('Observation ID cannot be empty');
    }
    if (this.observations.has(params.observationId)) {
      throw new FederatedCollaborationMemoryValidationError(
        `Observation '${params.observationId}' already exists`
      );
    }

    if (!params.target || params.target.trim().length === 0) {
      throw new FederatedCollaborationMemoryValidationError('Observation target cannot be empty');
    }

    // Scrub deliberation / CoT markers
    if (
      params.observedValue.includes('<thought>') ||
      params.observedValue.includes('[scratchpad]') ||
      params.observedValue.includes('chainOfThought')
    ) {
      throw new FederatedCollaborationMemoryValidationError('CoT or deliberation marker detected in observed value');
    }

    const now = Date.now();
    const base: Omit<AgentObservation, 'provenanceHash'> = {
      observationId: params.observationId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      missionId: params.missionId,
      objectiveId: params.objectiveId,
      federationId: params.federationId,
      agentId: params.agentId,
      generation: params.generation,
      observationType: params.observationType,
      target: params.target,
      observedValue: params.observedValue,
      confidence: Math.max(0, Math.min(1, params.confidence)),
      timestamp: now,
    };

    const provenanceHash = computeObservationHash(base);
    const observation: AgentObservation = {
      ...base,
      provenanceHash,
    };

    this.observations.set(observation.observationId, observation);
    return observation;
  }

  /**
   * EN: Reconciles a set of observation IDs for a specific target.
   * VI: Đối soát một tập hợp các mã định danh quan sát cho một mục tiêu cụ thể.
   */
  public reconcileObservations(
    reconciliationId: string,
    observationIds: readonly string[],
    tenantId: string,
    sessionId: string,
    federationId: string,
    target: string,
    minConfidenceThreshold = 0.5
  ): ObservationReconciliationRecord {
    // 1. Checkpoint: PRE_OBSERVATION_RECONCILIATION
    this.securityBoundary.assertStopInactive('PRE_OBSERVATION_RECONCILIATION', tenantId, federationId);

    if (!observationIds || observationIds.length === 0) {
      throw new FederatedCollaborationMemoryValidationError('At least one observation is required for reconciliation');
    }

    const matchedObservations: AgentObservation[] = [];
    for (const id of observationIds) {
      const obs = this.observations.get(id);
      if (!obs) {
        throw new FederatedCollaborationMemoryValidationError(`Observation '${id}' not found`);
      }
      if (obs.tenantId !== tenantId) {
        throw new FederatedCollaborationMemoryTenantIsolationError(
          `Observation tenant mismatch: '${obs.tenantId}' != '${tenantId}'`,
          tenantId
        );
      }
      if (obs.sessionId !== sessionId) {
        throw new FederatedCollaborationMemorySessionIsolationError(
          `Observation session mismatch: '${obs.sessionId}' != '${sessionId}'`,
          tenantId
        );
      }
      if (obs.federationId !== federationId) {
        throw new FederatedCollaborationMemoryValidationError(
          `Observation federation mismatch: '${obs.federationId}' != '${federationId}'`
        );
      }
      if (obs.target !== target) {
        throw new FederatedCollaborationMemoryValidationError(
          `Observation target mismatch: expected '${target}', got '${obs.target}'`
        );
      }

      // Verify cryptographic integrity
      const base: Omit<AgentObservation, 'provenanceHash'> = {
        observationId: obs.observationId,
        tenantId: obs.tenantId,
        sessionId: obs.sessionId,
        missionId: obs.missionId,
        objectiveId: obs.objectiveId,
        federationId: obs.federationId,
        agentId: obs.agentId,
        generation: obs.generation,
        observationType: obs.observationType,
        target: obs.target,
        observedValue: obs.observedValue,
        confidence: obs.confidence,
        timestamp: obs.timestamp,
      };
      if (computeObservationHash(base) !== obs.provenanceHash) {
        const recBase: Omit<ObservationReconciliationRecord, 'provenanceHash'> = {
          reconciliationId,
          tenantId,
          sessionId,
          federationId,
          observationIds,
          target,
          status: 'PROVENANCE_INVALID',
          confidence: 0,
          conflictCategory: 'AUTHORIZATION_CONFLICT',
          resolvedAt: Date.now(),
        };
        const invalidRec: ObservationReconciliationRecord = {
          ...recBase,
          provenanceHash: computeObservationReconciliationHash(recBase),
        };
        this.reconciliations.set(reconciliationId, invalidRec);
        return invalidRec;
      }

      matchedObservations.push(obs);
    }

    // Check confidence threshold
    const lowConfidence = matchedObservations.some((o) => o.confidence < minConfidenceThreshold);
    if (lowConfidence) {
      const recBase: Omit<ObservationReconciliationRecord, 'provenanceHash'> = {
        reconciliationId,
        tenantId,
        sessionId,
        federationId,
        observationIds,
        target,
        status: 'LOW_CONFIDENCE',
        confidence: Math.min(...matchedObservations.map((o) => o.confidence)),
        conflictCategory: 'OBSERVATION_CONFLICT',
        resolvedAt: Date.now(),
      };
      const rec: ObservationReconciliationRecord = {
        ...recBase,
        provenanceHash: computeObservationReconciliationHash(recBase),
      };
      this.reconciliations.set(reconciliationId, rec);
      return rec;
    }

    // Determine value agreement
    const uniqueValues = Array.from(new Set(matchedObservations.map((o) => o.observedValue)));
    let status: ObservationReconciliationStatus;
    let resolvedValue: string | undefined;
    let conflictCategory: ConsensusConflictCategory | undefined;

    if (uniqueValues.length === 1) {
      status = 'CONGRUENT';
      resolvedValue = uniqueValues[0];
    } else {
      // Contradiction detected
      status = 'CONTRADICTORY';
      conflictCategory = 'OBSERVATION_CONFLICT';
      resolvedValue = undefined;
    }

    const avgConfidence =
      matchedObservations.reduce((acc, o) => acc + o.confidence, 0) / matchedObservations.length;

    const recBase: Omit<ObservationReconciliationRecord, 'provenanceHash'> = {
      reconciliationId,
      tenantId,
      sessionId,
      federationId,
      observationIds,
      target,
      status,
      resolvedValue,
      confidence: avgConfidence,
      conflictCategory,
      resolvedAt: Date.now(),
    };

    const reconciliation: ObservationReconciliationRecord = {
      ...recBase,
      provenanceHash: computeObservationReconciliationHash(recBase),
    };

    this.reconciliations.set(reconciliationId, reconciliation);
    return reconciliation;
  }

  /**
   * EN: Retrieves an observation by ID.
   * VI: Lấy một quan sát theo mã định danh.
   */
  public getObservation(id: string): AgentObservation | undefined {
    return this.observations.get(id);
  }

  /**
   * EN: Retrieves a reconciliation record by ID.
   * VI: Lấy một bản ghi đối soát theo mã định danh.
   */
  public getReconciliation(id: string): ObservationReconciliationRecord | undefined {
    return this.reconciliations.get(id);
  }

  /**
   * EN: Clears state.
   * VI: Xóa trạng thái.
   */
  public clear(): void {
    this.observations.clear();
    this.reconciliations.clear();
  }
}
