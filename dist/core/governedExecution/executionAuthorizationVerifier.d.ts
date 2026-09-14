import { type ExecutionAuthorizationEnvelope, type ExecutionLease } from './executionTypes.js';
import { type GroundedPlanTaskBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
export interface AuthorizationVerificationParams {
    readonly tenantId: string;
    readonly sessionId: string;
    readonly binding: GroundedPlanTaskBinding;
    readonly task: AgentTask;
    readonly stepIndex: number;
    readonly lease: ExecutionLease;
}
export declare class ExecutionAuthorizationVerifier {
    /**
     * EN: Verifies that an execution request possesses an unbroken, tamper-free authorization chain.
     * VI: Xác minh rằng yêu cầu thực thi sở hữu một chuỗi ủy quyền không bị đứt đoạn và không bị can thiệp.
     */
    static verifyAuthorizationChain(params: AuthorizationVerificationParams): ExecutionAuthorizationEnvelope;
}
