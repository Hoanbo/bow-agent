import { type ExecutionRequest, type GovernedExecutionResultEnvelope } from './executionTypes.js';
import { ExecutionLeaseManager } from './executionLeaseManager.js';
import { ExecutionBoundaryGate } from './executionBoundaryGate.js';
import { ExecutionAuditBridge } from './executionAuditBridge.js';
import { ExecutionPersistenceRecoveryEngine } from './executionPersistenceRecoveryEngine.js';
import { AgentTaskRuntime } from '../taskLifecycle/agentTaskRuntime.js';
export interface GovernedExecutionWorkerOptions {
    readonly leaseManager?: ExecutionLeaseManager;
    readonly boundaryGate?: ExecutionBoundaryGate;
    readonly auditBridge?: ExecutionAuditBridge;
    readonly persistenceEngine?: ExecutionPersistenceRecoveryEngine;
    readonly taskRuntime?: AgentTaskRuntime;
    readonly userStopProvider?: () => boolean;
}
export declare class GovernedExecutionWorker {
    private readonly leaseManager;
    private readonly boundaryGate;
    private readonly auditBridge;
    private readonly persistenceEngine;
    private readonly taskRuntime;
    private readonly userStopProvider;
    constructor(options?: GovernedExecutionWorkerOptions);
    /**
     * EN: Executes an authorized execution request under the governed execution envelope.
     * VI: Thực thi một yêu cầu thực thi đã được ủy quyền dưới phong bì thực thi có quản trị.
     */
    executeTaskStep(request: ExecutionRequest): Promise<GovernedExecutionResultEnvelope>;
    private handlePreExecutionFailure;
    private handleExecutionError;
}
