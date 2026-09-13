import { type TaskState, type TaskStepStatus } from './agentTaskTypes.js';
export declare class AgentTaskStateEngine {
    /**
     * EN: Checks whether a transition between two task states is legal.
     * VI: Kiểm tra xem việc chuyển đổi giữa hai trạng thái nhiệm vụ có hợp lệ hay không.
     */
    isValidTransition(from: TaskState, to: TaskState): boolean;
    /**
     * EN: Asserts that a state transition is legal, throwing IllegalStateTransitionError if not.
     * VI: Khẳng định chuyển đổi trạng thái là hợp lệ, ném IllegalStateTransitionError nếu không.
     */
    assertValidTransition(from: TaskState, to: TaskState, taskId?: string, context?: string): void;
    /**
     * EN: Returns true if the given state is an immutable terminal state.
     * VI: Trả về true nếu trạng thái cho trước là trạng thái kết thúc bất biến.
     */
    isTerminalState(state: TaskState): boolean;
    /**
     * EN: Asserts that a task is not in a terminal state.
     * VI: Khẳng định rằng nhiệm vụ không nằm trong trạng thái kết thúc.
     */
    assertNotTerminal(state: TaskState, taskId?: string): void;
    /**
     * EN: Enforces optimistic concurrency control by checking the expected version.
     * VI: Thực thi kiểm soát đồng thời lạc quan bằng cách kiểm tra phiên bản kỳ vọng.
     */
    verifyVersion(currentVersion: number, expectedVersion: number, taskId: string): void;
    /**
     * EN: Checks whether a step status transition is legal.
     * VI: Kiểm tra xem chuyển đổi trạng thái bước có hợp lệ hay không.
     */
    isValidStepTransition(from: TaskStepStatus, to: TaskStepStatus): boolean;
    /**
     * EN: Asserts that a step status transition is legal.
     * VI: Khẳng định rằng chuyển đổi trạng thái bước là hợp lệ.
     */
    assertValidStepTransition(from: TaskStepStatus, to: TaskStepStatus, stepId: string): void;
}
export declare const globalAgentTaskStateEngine: AgentTaskStateEngine;
