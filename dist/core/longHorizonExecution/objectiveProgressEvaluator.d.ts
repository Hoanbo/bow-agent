import { type ProgressClassification, type GovernedLongHorizonObjective, type LongHorizonProgressRecord } from './longHorizonExecutionTypes.js';
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
export declare class ObjectiveProgressEvaluator {
    /**
     * EN: Evaluates execution results against objective criteria deterministically.
     * VI: Đánh giá kết quả thực thi so với các tiêu chí mục tiêu một cách xác định.
     */
    evaluateProgress(input: EvaluationInput): ProgressEvaluationResult;
    private createProgressRecord;
}
