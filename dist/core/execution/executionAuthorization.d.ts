import type { DecisionState } from '../decision/decisionTypes.js';
import type { OrchestrationStatus } from '../orchestration/orchestrationTypes.js';
import type { CapabilityRegistry } from './capabilityRegistry.js';
import type { ExecutionAuthorization, ToolExecutionRequest } from './executionTypes.js';
export interface AuthorizationParams {
    readonly request: ToolExecutionRequest;
    readonly registry: CapabilityRegistry;
    readonly orchestrationStatus?: OrchestrationStatus;
    readonly decisionState?: DecisionState;
    readonly approvalMetadata?: {
        readonly approvalId?: string;
        readonly userId?: string;
        readonly approvedBy?: string;
        readonly sessionId?: string;
        readonly executionFingerprint?: string;
        readonly approved?: boolean;
        readonly token?: string;
        readonly approvalToken?: string;
    };
}
/**
 * EN: Validates authorization before tool execution.
 * VI: Xác thực quyền ủy quyền trước khi thực thi công cụ.
 */
export declare function authorizeExecution(params: AuthorizationParams): ExecutionAuthorization;
/**
 * EN: Class gate encapsulation for checking authorization against a registry.
 * VI: Lớp đóng gói cổng để kiểm tra ủy quyền dựa trên registry.
 */
export declare class ExecutionAuthorizationGate {
    private readonly registry;
    constructor(registry: CapabilityRegistry);
    authorize(request: ToolExecutionRequest, options?: {
        orchestrationStatus?: OrchestrationStatus;
        decisionState?: DecisionState;
        approvalMetadata?: any;
    }): ExecutionAuthorization;
}
