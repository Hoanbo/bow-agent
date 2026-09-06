import type { CapabilityRegistry } from './capabilityRegistry.js';
import type { ToolExecutionRequest, GovernedToolExecutionResult } from './executionTypes.js';
import { ToolExecutor } from './toolExecutor.js';
export interface ExecuteOptions {
    readonly orchestrationStatus?: any;
    readonly decisionState?: any;
    readonly approvalMetadata?: any;
    readonly skipReplayCheck?: boolean;
}
export declare class ExecutionService {
    private readonly registry;
    private readonly executor;
    private readonly executedFingerprints;
    constructor(registry: CapabilityRegistry);
    getRegistry(): CapabilityRegistry;
    getExecutor(): ToolExecutor;
    /**
     * EN: Authoritative pipeline executing an authorized request with replay protection.
     * VI: Pipeline có thẩm quyền thực thi yêu cầu đã được ủy quyền kèm bảo vệ chống replay.
     */
    execute(request: ToolExecutionRequest, options?: ExecuteOptions): GovernedToolExecutionResult;
}
