import type { DecisionResult } from '../decision/decisionTypes.js';
import type { ExecutionIntent, ExecutionRequest, OrchestrationResult, OrchestrationStatus } from './orchestrationTypes.js';
export interface CreateResultParams {
    success: boolean;
    status: OrchestrationStatus;
    decision: DecisionResult;
    executionIntent?: ExecutionIntent;
    executionRequest?: ExecutionRequest;
    errors?: readonly string[];
    reasons?: readonly string[];
    clarificationQuestion?: string;
}
/**
 * EN: Creates an immutable OrchestrationResult from orchestration parameters.
 * VI: Tạo OrchestrationResult bất biến từ các tham số điều phối.
 */
export declare function buildOrchestrationResult(params: CreateResultParams): OrchestrationResult;
