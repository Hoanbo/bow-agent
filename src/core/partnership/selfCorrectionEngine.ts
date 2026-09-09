// src/core/partnership/selfCorrectionEngine.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Section 11: Self-Correction Engine
// Tracks explicit SELF_CORRECTION records when verified evidence disproves
// earlier reasoning, assumptions, or model outputs.
//
// Invariants:
// - BOWCON must not protect its previous answer merely because it was previously generated.
// - Verified host evidence > historical model output.
// - Epistemic honesty: track confidence shifts explicitly.

import {
  SelfCorrectionRecord,
  generatePartnershipId,
} from './partnershipTypes';
import { PersonalMemoryStore } from './personalMemoryStore';

export interface CreateSelfCorrectionParams {
  previousAssessment: string;
  newEvidence: string;
  detectedError: string;
  correctedAssessment: string;
  confidenceBefore: number;
  confidenceAfter: number;
  affectedDecisions?: string[];
  associatedMemoryId?: string;
}

export class SelfCorrectionEngine {
  private readonly corrections: Map<string, SelfCorrectionRecord> = new Map();

  /**
   * Record an explicit self-correction.
   * If an associated memory is provided and memoryStore is passed, update its status.
   */
  public recordCorrection(
    params: CreateSelfCorrectionParams,
    memoryStore?: PersonalMemoryStore
  ): SelfCorrectionRecord {
    const correctionId = generatePartnershipId('corr');
    const record: SelfCorrectionRecord = {
      correctionId,
      previousAssessment: params.previousAssessment,
      newEvidence: params.newEvidence,
      detectedError: params.detectedError,
      correctedAssessment: params.correctedAssessment,
      confidenceChange: {
        before: Math.max(0, Math.min(1, params.confidenceBefore)),
        after: Math.max(0, Math.min(1, params.confidenceAfter)),
      },
      affectedDecisions: params.affectedDecisions ?? [],
      timestamp: Date.now(),
    };

    this.corrections.set(correctionId, record);

    // If there is an associated memory item, mark it CONTRADICTED or SUPERSEDED
    if (params.associatedMemoryId && memoryStore) {
      const mem = memoryStore.getMemory(params.associatedMemoryId);
      if (mem) {
        // Demote memory status
        memoryStore.updateMemoryStatus(mem.memoryId, 'CONTRADICTED', {
          supersededByCorrectionId: correctionId,
          correctionNotes: params.detectedError,
        });
      }
    }

    return record;
  }

  /**
   * Retrieve all recorded self-corrections.
   */
  public getAllCorrections(): SelfCorrectionRecord[] {
    return Array.from(this.corrections.values());
  }

  /**
   * Retrieve a specific self-correction record by ID.
   */
  public getCorrection(correctionId: string): SelfCorrectionRecord | undefined {
    return this.corrections.get(correctionId);
  }

  /**
   * Clear all records (for reset/testing).
   */
  public clear(): void {
    this.corrections.clear();
  }
}
