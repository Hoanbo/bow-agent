import { type MultiStepExecutionGeneration, type MultiStepExecutionStepState } from './multiStepExecutionTypes.js';
export interface SchedulerEvaluationResult {
    readonly readySteps: readonly MultiStepExecutionStepState[];
    readonly blockedSteps: readonly MultiStepExecutionStepState[];
    readonly completedSteps: readonly MultiStepExecutionStepState[];
    readonly failedSteps: readonly MultiStepExecutionStepState[];
    readonly invalidatedSteps: readonly MultiStepExecutionStepState[];
    readonly nextExecutableStep?: MultiStepExecutionStepState;
    readonly isPlanExhausted: boolean;
}
export declare class ExecutionStepScheduler {
    /**
     * EN: Evaluates current step states in a generation and computes ready vs blocked steps.
     * VI: Đánh giá các trạng thái bước hiện tại trong thế hệ và tính toán các bước sẵn sàng so với bị chặn.
     */
    static evaluateStepReadiness(generation: MultiStepExecutionGeneration): SchedulerEvaluationResult;
    /**
     * EN: Identifies which downstream steps must be invalidated when a given step fails or is invalidated.
     * VI: Xác định các bước hạ nguồn nào phải bị vô hiệu hóa khi một bước cụ thể thất bại hoặc bị vô hiệu hóa.
     */
    static computeCascadingInvalidations(failedStepId: string, steps: Readonly<Record<string, MultiStepExecutionStepState>>): string[];
    /**
     * EN: Computes a deterministic topological ordering of all steps in the generation.
     * VI: Tính toán thứ tự topo xác định của tất cả các bước trong thế hệ.
     */
    static getTopologicalOrder(generation: MultiStepExecutionGeneration): string[];
}
