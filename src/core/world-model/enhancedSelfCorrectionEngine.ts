// src/core/world-model/enhancedSelfCorrectionEngine.ts
// BOWCON V4.0 — MS-1.3.42: MASTER OWNER WORLD MODEL, SELF-AWARENESS & CAPABILITY-GROUNDED REASONING RUNTIME
//
// Enhanced Self-Correction Engine with Epistemic Provenance Tracking.
// Records past beliefs, empirical corrections, confidence deltas, and evidence provenance.
// Enforces evidence precedence:
//   VERIFIED_HOST_EVIDENCE > VERIFIED_EXECUTION > OWNER_CONFIRMED > PERSISTED_MEMORY > INFERENCE > MODEL_PREDICTION
//
// Never rewrites history: mistakes and their corrections remain durably auditable.

import crypto from 'node:crypto';
import type {
  WorldModelSelfCorrectionRecord,
  EpistemicProvenance,
} from './worldModelTypes.js';

type SelfCorrectionRecord = WorldModelSelfCorrectionRecord;
import { EPISTEMIC_EVIDENCE_HIERARCHY } from './worldModelTypes.js';

export class EnhancedSelfCorrectionEngine {
  private readonly _corrections: SelfCorrectionRecord[] = [];

  /**
   * Evaluates if new evidence is epistemically superior to the prior belief.
   */
  public canCorrect(priorProvenance: EpistemicProvenance, evidenceProvenance: EpistemicProvenance): boolean {
    const priorScore = EPISTEMIC_EVIDENCE_HIERARCHY[priorProvenance] ?? 0;
    const evidenceScore = EPISTEMIC_EVIDENCE_HIERARCHY[evidenceProvenance] ?? 0;
    return evidenceScore >= priorScore;
  }

  /**
   * Applies and records an honest self-correction without erasing historical records.
   */
  public applyCorrection(
    originalBelief: string,
    provenanceBefore: EpistemicProvenance,
    newEvidence: string,
    evidenceProvenance: EpistemicProvenance,
    correction: string,
    confidenceBefore: number,
    confidenceAfter: number,
    sourceOfCorrection: string,
    contradictionRef?: string
  ): SelfCorrectionRecord {
    // Epistemic precedence validation
    if (!this.canCorrect(provenanceBefore, evidenceProvenance)) {
      throw new Error(
        `EPISTEMIC_CORRECTION_REJECTED: Cannot correct high-tier provenance "${provenanceBefore}" with lower-tier provenance "${evidenceProvenance}".`
      );
    }

    const record: SelfCorrectionRecord = {
      correctionId: `corr_${crypto.randomUUID().slice(0, 8)}`,
      originalBelief,
      provenanceBefore,
      newEvidence,
      contradictionRef,
      correction,
      confidenceBefore,
      confidenceAfter,
      sourceOfCorrection,
      timestamp: Date.now(),
    };

    this._corrections.push(record);
    return record;
  }

  public getHistory(): readonly SelfCorrectionRecord[] {
    return this._corrections;
  }

  public getCorrectionCount(): number {
    return this._corrections.length;
  }

  public getLatestCorrection(): SelfCorrectionRecord | undefined {
    return this._corrections[this._corrections.length - 1];
  }

  public reset(): void {
    this._corrections.length = 0;
  }
}

export const globalEnhancedSelfCorrectionEngine = new EnhancedSelfCorrectionEngine();
