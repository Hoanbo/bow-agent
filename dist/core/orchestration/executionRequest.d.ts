import type { ExecutionIntent, ExecutionRequest, OrchestrationStatus } from './orchestrationTypes.js';
/**
 * EN: Maps intent types to corresponding tool names registered in the agent ecosystem.
 * VI: Ánh xạ các loại intent sang tên công cụ tương ứng được đăng ký trong hệ sinh thái agent.
 */
export declare function resolveToolNameForIntent(actionType: string): string | undefined;
/**
 * EN: Builds an immutable ExecutionRequest without executing any tools.
 * VI: Xây dựng ExecutionRequest bất biến mà không thực thi bất kỳ công cụ nào.
 */
export declare function createExecutionRequest(intent: ExecutionIntent, status: OrchestrationStatus): ExecutionRequest;
