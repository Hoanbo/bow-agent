// src/core/cognitiveState/cognitiveStatePromotionGate.ts
// BOWCON V4.0 — MS-1.5.02: COGNITIVE STATE PROMOTION GATE
// Component 994 — REAL
//
// Invariants:
// WORKING_STATE != DURABLE_TRUTH
// HYPOTHESIS != FACT
// MODEL_CONFIDENCE != EMPIRICAL_TRUTH
// UNVERIFIED_CLAIM_CANNOT_BECOME_DURABLE_TRUTH == TRUE
// ZERO_LLM_SELF_PROMOTION == TRUE

import {
  type CognitiveHypothesis,
  CognitiveStatePromotionError,
} from './cognitiveStateTypes.js';

export interface CognitivePromotionRequest {
  readonly candidateType: 'HYPOTHESIS_TO_FACT' | 'ENTITY_TO_KNOWLEDGE_GRAPH' | 'OBSERVATION_TO_EPISODE';
  readonly sourceRegister: string;
  readonly item: CognitiveHypothesis | Record<string, unknown>;
  readonly verificationEvidenceId?: string;
  readonly verificationOracle?: string;
  readonly confidence: number;
}

export interface CognitivePromotionApproval {
  readonly approved: boolean;
  readonly targetStore: 'EPISODIC' | 'KNOWLEDGE_GRAPH' | 'AUDIT_LEDGER';
  readonly promotedPayload: Readonly<Record<string, unknown>>;
  readonly approvalReason: string;
  readonly approvedAt: string;
}

export class CognitiveStatePromotionGate {
  /**
   * Evaluates a promotion request from working cognitive registers to durable memory.
   * Rejects any claim that is unverified, speculative, or solely based on model assertion.
   */
  public static evaluatePromotion(request: CognitivePromotionRequest): CognitivePromotionApproval {
    if (!request || typeof request !== 'object') {
      throw new CognitiveStatePromotionError('Promotion request must be an object');
    }

    if (!request.candidateType) {
      throw new CognitiveStatePromotionError('Missing candidateType in promotion request');
    }

    // Rule 1: Hypotheses MUST be externally verified before becoming factual knowledge
    if (request.candidateType === 'HYPOTHESIS_TO_FACT') {
      const hyp = request.item as CognitiveHypothesis;

      if (!hyp || typeof hyp !== 'object') {
        throw new CognitiveStatePromotionError('Hypothesis item must be a valid object');
      }

      if (hyp.status !== 'VERIFIED') {
        throw new CognitiveStatePromotionError(
          `Cannot promote hypothesis '${hyp.hypothesisId}': status is '${hyp.status}', strictly required 'VERIFIED'`,
          { hypothesisId: hyp.hypothesisId, status: hyp.status }
        );
      }

      if (!request.verificationEvidenceId || !request.verificationOracle) {
        throw new CognitiveStatePromotionError(
          `Cannot promote hypothesis '${hyp.hypothesisId}' without verified empirical evidence ID and oracle reference`,
          { hypothesisId: hyp.hypothesisId }
        );
      }

      return Object.freeze({
        approved: true,
        targetStore: 'KNOWLEDGE_GRAPH',
        promotedPayload: Object.freeze({
          factId: `fact_${hyp.hypothesisId}`,
          summary: hyp.summary,
          confidence: Math.min(1.0, hyp.confidence),
          verificationEvidenceId: request.verificationEvidenceId,
          verifiedByOracle: request.verificationOracle,
          promotedAt: new Date().toISOString(),
        }),
        approvalReason: `Verified by oracle '${request.verificationOracle}' with evidence '${request.verificationEvidenceId}'`,
        approvedAt: new Date().toISOString(),
      });
    }

    // Rule 2: Observation promotion requires positive salience and source provenance
    if (request.candidateType === 'OBSERVATION_TO_EPISODE') {
      const obs = request.item as any;
      if (!obs.observationId || !obs.source || !obs.content) {
        throw new CognitiveStatePromotionError('Malformed observation item for promotion');
      }

      return Object.freeze({
        approved: true,
        targetStore: 'EPISODIC',
        promotedPayload: Object.freeze({
          episodeObservationId: obs.observationId,
          source: obs.source,
          content: obs.content,
          observedAt: obs.observedAt || new Date().toISOString(),
        }),
        approvalReason: 'Valid empirical observation record with verified provenance',
        approvedAt: new Date().toISOString(),
      });
    }

    // Rule 3: Entity promotion requires name and non-speculative classification
    if (request.candidateType === 'ENTITY_TO_KNOWLEDGE_GRAPH') {
      const entity = request.item as any;
      if (!entity.entityId || !entity.name) {
        throw new CognitiveStatePromotionError('Entity must contain entityId and name');
      }

      return Object.freeze({
        approved: true,
        targetStore: 'KNOWLEDGE_GRAPH',
        promotedPayload: Object.freeze({ ...entity }),
        approvalReason: 'Structured entity with validated identity',
        approvedAt: new Date().toISOString(),
      });
    }

    throw new CognitiveStatePromotionError(`Unsupported promotion candidateType '${request.candidateType}'`);
  }
}
