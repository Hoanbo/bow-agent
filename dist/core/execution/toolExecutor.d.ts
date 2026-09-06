import type { CapabilityRegistry } from './capabilityRegistry.js';
import type { ToolCapability } from './capabilityTypes.js';
import type { ToolExecutionRequest, GovernedToolExecutionResult, ExecutionAuthorization } from './executionTypes.js';
export declare class ToolExecutor {
    private readonly registry?;
    constructor(registry?: CapabilityRegistry);
    /**
     * EN: Executes an authorized tool request. Fails closed if authorization is missing.
     * VI: Thực thi một yêu cầu tool đã được ủy quyền. Thất bại theo dạng đóng (fail-closed) nếu thiếu ủy quyền.
     */
    execute(requestOrCap: ToolExecutionRequest | ToolCapability, maybeReq?: ToolExecutionRequest, maybeAuth?: ExecutionAuthorization): GovernedToolExecutionResult;
}
