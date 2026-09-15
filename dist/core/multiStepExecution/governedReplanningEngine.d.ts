import { type MultiStepExecutionGeneration, type ExecutionEnvironmentSnapshot, type ReplanningRequest } from './multiStepExecutionTypes.js';
export interface CreateReplanningRequestParams {
    readonly generation: MultiStepExecutionGeneration;
    readonly environmentSnapshot: ExecutionEnvironmentSnapshot;
    readonly reason: string;
    readonly remainingObjective: string;
    readonly failedStepId?: string;
    readonly explicitInvalidatedStepIds?: readonly string[];
    readonly totalPreviousReplans?: number;
}
export declare class GovernedReplanningEngine {
    private readonly userStopProvider;
    constructor(options?: {
        readonly userStopProvider?: () => boolean;
    });
    /**
     * EN: Evaluates whether a replanning request must be created and synthesizes an immutable request envelope.
     * VI: Đánh giá xem có cần tạo yêu cầu lập lại kế hoạch hay không và tổng hợp phong bì yêu cầu bất biến.
     */
    createReplanningRequest(params: CreateReplanningRequestParams): ReplanningRequest;
}
