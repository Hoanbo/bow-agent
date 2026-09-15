import { type MultiStepExecutionGeneration, type MultiStepExecutionSession } from './multiStepExecutionTypes.js';
import type { GroundedPlanTaskBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
export interface CreateGenerationParams {
    readonly tenantId: string;
    readonly sessionId: string;
    readonly taskId: string;
    readonly planId: string;
    readonly planVersion: number;
    readonly generationIndex: number;
    readonly bindingSnapshot: GroundedPlanTaskBinding;
    readonly taskSnapshot: AgentTask;
    readonly status?: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'SUPERSEDED' | 'COMPLETED' | 'FAILED' | 'INVALIDATED';
}
export declare class ExecutionGenerationManager {
    private readonly userStopProvider;
    constructor(options?: {
        readonly userStopProvider?: () => boolean;
    });
    /**
     * EN: Creates a new immutable execution generation (Gen 0 or subsequent Gen N).
     * VI: Tạo một thế hệ thực thi bất biến mới (Gen 0 hoặc Gen N tiếp theo).
     */
    createGeneration(params: CreateGenerationParams): MultiStepExecutionGeneration;
    /**
     * EN: Transitions an active session to a new generation via OCC CAS verification.
     * VI: Chuyển đổi một phiên hoạt động sang thế hệ mới thông qua xác minh OCC CAS.
     */
    transitionToNewGeneration(session: MultiStepExecutionSession, newGeneration: MultiStepExecutionGeneration, expectedSessionVersion: number): MultiStepExecutionSession;
}
