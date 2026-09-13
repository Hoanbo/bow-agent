import { type AuditLedger } from '../auditLedger.js';
import { type AgentTask, type CreateAgentTaskOptions, type TaskTransitionOptions, type UpdateStepOptions, type RehydrationResult } from './agentTaskTypes.js';
import { AgentTaskStateEngine } from './agentTaskStateEngine.js';
import { type AgentTaskStoreOptions } from './agentTaskStore.js';
export interface AgentTaskRuntimeOptions extends AgentTaskStoreOptions {
    readonly isUserStopActive?: () => boolean;
    readonly auditLedger?: AuditLedger;
    readonly stateEngine?: AgentTaskStateEngine;
}
export declare class AgentTaskRuntime {
    private readonly store;
    private readonly stateEngine;
    private readonly auditLedger;
    private readonly sanitizer;
    private readonly externalUserStopFn?;
    private internalUserStop;
    constructor(options?: AgentTaskRuntimeOptions);
    /**
     * EN: Sets the internal USER_STOP flag.
     * VI: Đặt cờ USER_STOP nội bộ.
     */
    setUserStopActive(active: boolean): void;
    /**
     * EN: Returns true if USER_STOP is active from either external or internal provider.
     * VI: Trả về true nếu USER_STOP đang kích hoạt từ nguồn ngoài hoặc cờ nội bộ.
     */
    isUserStopActive(): boolean;
    /**
     * EN: Asserts that USER_STOP is not active, throwing UserStopActiveError if it is.
     * VI: Khẳng định USER_STOP không kích hoạt, ném UserStopActiveError nếu đang kích hoạt.
     */
    assertUserStopInactive(operation: string): void;
    /**
     * EN: Creates and persists a new Agent Task in SUBMITTED state.
     * VI: Tạo mới và lưu trữ một Nhiệm vụ Agent ở trạng thái SUBMITTED.
     */
    createTask(opts: CreateAgentTaskOptions): AgentTask;
    /**
     * EN: Retrieves an Agent Task by ID from its tenant partition.
     * VI: Lấy một Nhiệm vụ Agent theo ID từ phân vùng tenant của nó.
     */
    getTask(tenantId: string, taskId: string): AgentTask;
    /**
     * EN: Lists all tasks in a tenant partition.
     * VI: Liệt kê tất cả các nhiệm vụ trong phân vùng tenant.
     */
    listTasks(tenantId: string): readonly AgentTask[];
    /**
     * EN: Transitions an Agent Task to a new state with optimistic concurrency validation.
     * VI: Chuyển đổi trạng thái Nhiệm vụ Agent với kiểm thực đồng thời lạc quan.
     */
    transitionTask(tenantId: string, taskId: string, opts: TaskTransitionOptions): AgentTask;
    /**
     * EN: Updates the status of an individual step within a task.
     * VI: Cập nhật trạng thái của một bước riêng lẻ trong nhiệm vụ.
     */
    updateStep(tenantId: string, taskId: string, opts: UpdateStepOptions): AgentTask;
    /**
     * EN: Pauses an active task.
     * VI: Tạm dừng một nhiệm vụ đang hoạt động.
     */
    pauseTask(tenantId: string, taskId: string, expectedVersion: number, reason?: string): AgentTask;
    /**
     * EN: Resumes a paused task to an active operational state.
     * VI: Tiếp tục một nhiệm vụ đã tạm dừng chuyển sang trạng thái hoạt động.
     */
    resumeTask(tenantId: string, taskId: string, expectedVersion: number, targetState?: 'ACCEPTED' | 'PLANNING' | 'EXECUTING'): AgentTask;
    /**
     * EN: Cancels an Agent Task, transitioning it to terminal CANCELLED state.
     * VI: Hủy một Nhiệm vụ Agent, chuyển nó sang trạng thái kết thúc CANCELLED.
     */
    cancelTask(tenantId: string, taskId: string, expectedVersion: number, reason?: string): AgentTask;
    /**
     * EN: Rehydrates tasks from tenant partition and recovers interrupted tasks.
     * VI: Tái lập nhiệm vụ từ phân vùng tenant và phục hồi các nhiệm vụ bị ngắt quãng.
     */
    rehydrate(tenantId: string): RehydrationResult;
}
export declare const globalAgentTaskRuntime: AgentTaskRuntime;
