// src/core/longHorizonExecution/objectiveProgressEvaluator.ts
// BOWCON V4.0 — MS-1.5.11: OBJECTIVE PROGRESS EVALUATOR
// Component 1081 — REAL
//
// EN: Evaluates objective progress against declared success and failure criteria.
//     Determines deterministic classifications (SUCCESS, PROGRESS, NO_PROGRESS, REGRESSION, etc.).
// VI: Đánh giá tiến độ mục tiêu so với các tiêu chí thành công và thất bại đã khai báo.
//     Xác định phân loại xác định (SUCCESS, PROGRESS, NO_PROGRESS, REGRESSION, v.v.).

import {
  type ProgressClassification,
  type GovernedLongHorizonObjective,
  type LongHorizonProgressRecord,
  computeLongHorizonProgressProvenanceHash,
} from './longHorizonExecutionTypes.js';
import { LongHorizonExecutionValidator } from './longHorizonExecutionValidator.js';
import type { MultiStepExecutionResult } from '../multiStepExecution/multiStepExecutionTypes.js';

export interface EvaluationInput {
  readonly objective: GovernedLongHorizonObjective;
  readonly generationId?: string;
  readonly currentCompletedSteps?: number;
  readonly completedSteps?: number;
  readonly totalSteps?: number;
  readonly priorCompletedSteps?: number;
  readonly verifiedOutcomes?: readonly string[];
  readonly verifiedObservations?: readonly string[];
  readonly environmentSnapshotProvenance?: string;
  readonly stepExecutionResult?: MultiStepExecutionResult;
  readonly failureCount?: number;
  readonly stagnationCounter?: number;
  readonly previousProgressScore?: number;
}

export interface ProgressEvaluationResult {
  readonly record: LongHorizonProgressRecord;
  readonly classification: ProgressClassification;
  readonly isTerminalSuccess: boolean;
  readonly isTerminalFailure: boolean;
  readonly reason: string;
  readonly score: number;
}

export class ObjectiveProgressEvaluator {
  /**
   * EN: Evaluates execution results against objective criteria deterministically.
   * VI: Đánh giá kết quả thực thi so với các tiêu chí mục tiêu một cách xác định.
   */
  public evaluateProgress(input: EvaluationInput): ProgressEvaluationResult {
    const objective = input.objective;
    const generationId = input.generationId ?? objective.currentGenerationId ?? 'gen_0';
    const currentCompletedSteps = input.completedSteps ?? input.currentCompletedSteps ?? 0;
    const priorCompletedSteps = input.priorCompletedSteps ?? 0;
    const verifiedOutcomes = input.verifiedObservations ?? input.verifiedOutcomes ?? [];
    const environmentSnapshotProvenance = input.environmentSnapshotProvenance ?? '0'.repeat(64);
    const failureCount = input.failureCount ?? 0;
    const stagnationCounter = input.stagnationCounter ?? 0;

    LongHorizonExecutionValidator.validateObjective(objective);

    // 1. Check for declared failure criteria violation
    for (const failureCrit of objective.failureCriteria) {
      if (
        verifiedOutcomes.includes(failureCrit) ||
        verifiedOutcomes.some((o) => o.toLowerCase().includes(failureCrit.toLowerCase()))
      ) {
        const record = this.createProgressRecord({
          objectiveId: objective.objectiveId,
          generationId,
          completedSteps: currentCompletedSteps,
          verifiedOutcomes,
          environmentSnapshotProvenance,
          classification: 'FAILURE',
          progressScore: 0.0,
          failureCount: failureCount + 1,
          stagnationCounter,
        });

        return {
          record,
          classification: 'FAILURE',
          isTerminalSuccess: false,
          isTerminalFailure: true,
          reason: `Declared failure criteria met: "${failureCrit}"`,
          score: 0.0,
        };
      }
    }

    // 2. Count declared success criteria verified
    const satisfiedCount = objective.successCriteria.filter((crit) =>
      verifiedOutcomes.includes(crit) ||
      verifiedOutcomes.some((o) => o.toLowerCase().includes(crit.toLowerCase()))
    ).length;

    // 3. Full success criteria satisfaction
    if (satisfiedCount === objective.successCriteria.length && objective.successCriteria.length > 0) {
      const record = this.createProgressRecord({
        objectiveId: objective.objectiveId,
        generationId,
        completedSteps: currentCompletedSteps,
        verifiedOutcomes,
        environmentSnapshotProvenance,
        classification: 'SUCCESS',
        progressScore: 1.0,
        failureCount,
        stagnationCounter: 0,
      });

      return {
        record,
        classification: 'SUCCESS',
        isTerminalSuccess: true,
        isTerminalFailure: false,
        reason: 'All declared objective success criteria verified and satisfied',
        score: 1.0,
      };
    }

    // 4. Regression detection
    if (
      (input.previousProgressScore !== undefined && input.previousProgressScore > 0 && satisfiedCount === 0 && verifiedOutcomes.length === 0) ||
      currentCompletedSteps < priorCompletedSteps
    ) {
      const record = this.createProgressRecord({
        objectiveId: objective.objectiveId,
        generationId,
        completedSteps: currentCompletedSteps,
        verifiedOutcomes,
        environmentSnapshotProvenance,
        classification: 'REGRESSION',
        progressScore: 0.0,
        failureCount: failureCount + 1,
        stagnationCounter: stagnationCounter + 1,
      });

      return {
        record,
        classification: 'REGRESSION',
        isTerminalSuccess: false,
        isTerminalFailure: false,
        reason: 'Regression detected: progress score or completed steps decreased',
        score: 0.0,
      };
    }

    // 5. Unknown outcome detection (observations exist but none correspond to declared criteria)
    if (verifiedOutcomes.length > 0 && satisfiedCount === 0) {
      const record = this.createProgressRecord({
        objectiveId: objective.objectiveId,
        generationId,
        completedSteps: currentCompletedSteps,
        verifiedOutcomes,
        environmentSnapshotProvenance,
        classification: 'UNKNOWN',
        progressScore: 0.0,
        failureCount,
        stagnationCounter,
      });

      return {
        record,
        classification: 'UNKNOWN',
        isTerminalSuccess: false,
        isTerminalFailure: false,
        reason: 'Unverified or unrecognized observations detected; failing closed',
        score: 0.0,
      };
    }

    // 6. Partial progress
    if (satisfiedCount > 0 && satisfiedCount < objective.successCriteria.length) {
      const score = satisfiedCount / objective.successCriteria.length;
      const record = this.createProgressRecord({
        objectiveId: objective.objectiveId,
        generationId,
        completedSteps: currentCompletedSteps,
        verifiedOutcomes,
        environmentSnapshotProvenance,
        classification: 'PARTIAL_PROGRESS',
        progressScore: score,
        failureCount,
        stagnationCounter: 0,
      });

      return {
        record,
        classification: 'PARTIAL_PROGRESS',
        isTerminalSuccess: false,
        isTerminalFailure: false,
        reason: `Partial progress verified: ${satisfiedCount}/${objective.successCriteria.length} criteria satisfied`,
        score,
      };
    }

    // 7. No progress
    const record = this.createProgressRecord({
      objectiveId: objective.objectiveId,
      generationId,
      completedSteps: currentCompletedSteps,
      verifiedOutcomes,
      environmentSnapshotProvenance,
      classification: 'NO_PROGRESS',
      progressScore: 0.0,
      failureCount,
      stagnationCounter: stagnationCounter + 1,
    });

    return {
      record,
      classification: 'NO_PROGRESS',
      isTerminalSuccess: false,
      isTerminalFailure: false,
      reason: 'No verified objective forward progress detected',
      score: 0.0,
    };
  }

  private createProgressRecord(params: {
    readonly objectiveId: string;
    readonly generationId: string;
    readonly completedSteps: number;
    readonly verifiedOutcomes: readonly string[];
    readonly environmentSnapshotProvenance: string;
    readonly classification: ProgressClassification;
    readonly progressScore: number;
    readonly failureCount: number;
    readonly stagnationCounter: number;
  }): LongHorizonProgressRecord {
    const raw = {
      recordId: `prog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      objectiveId: params.objectiveId,
      generationId: params.generationId,
      completedSteps: params.completedSteps,
      verifiedOutcomes: params.verifiedOutcomes,
      environmentSnapshotProvenance: params.environmentSnapshotProvenance,
      objectiveProgressState: params.classification,
      progressScore: params.progressScore,
      failureCount: params.failureCount,
      stagnationCounter: params.stagnationCounter,
      timestamp: new Date().toISOString(),
    };

    const provenanceHash = computeLongHorizonProgressProvenanceHash(raw);
    const record: LongHorizonProgressRecord = {
      ...raw,
      provenanceHash,
    };

    LongHorizonExecutionValidator.validateProgressRecord(record);
    return Object.freeze(record);
  }
}
