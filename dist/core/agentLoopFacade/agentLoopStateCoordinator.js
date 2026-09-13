// src/core/agentLoopFacade/agentLoopStateCoordinator.ts
// BOWCON V4.0 — MS-1.4.10: AGENT LOOP STATE COORDINATOR
//
// EN:
// Coordinates deterministic loop state transitions, enforces transition validity,
// guards against split-brain execution, and validates task concurrency version freshness.
// Never directly mutates task files; coordinates state through AgentTaskRuntime.
//
// VI:
// Điều phối các chuyển đổi trạng thái chu trình tất định, thực thi tính hợp lệ của chuyển đổi,
// phòng chống thực thi chia đôi (split-brain) và xác thực độ tươi phiên bản đồng thời của nhiệm vụ.
// Không bao giờ ghi đè trực tiếp file nhiệm vụ; điều phối trạng thái qua AgentTaskRuntime.
import { AgentLoopValidationError, AgentLoopConcurrencyError, } from './agentLoopFacadeTypes.js';
export class AgentLoopStateCoordinator {
    currentState = 'IDLE';
    history = [];
    // Allowed state transitions map
    static ALLOWED_TRANSITIONS = {
        IDLE: ['TASK_ACCEPTED', 'SECURITY_REJECTED', 'USER_STOP_ABORTED', 'FAILED'],
        TASK_ACCEPTED: ['CONTEXT_ASSEMBLED', 'USER_STOP_ABORTED', 'SECURITY_REJECTED', 'STALE_TASK_CONCURRENCY_ABORT', 'FAILED'],
        CONTEXT_ASSEMBLED: ['COGNITION_COMPLETED', 'USER_STOP_ABORTED', 'SECURITY_REJECTED', 'FAILED'],
        COGNITION_COMPLETED: ['PLAN_FORMULATED', 'USER_STOP_ABORTED', 'SECURITY_REJECTED', 'FAILED'],
        PLAN_FORMULATED: ['ACTION_PROPOSED', 'COMPLETED', 'USER_STOP_ABORTED', 'SECURITY_REJECTED', 'FAILED'],
        ACTION_PROPOSED: ['AUTHORIZATION_EVALUATED', 'AWAITING_HUMAN_APPROVAL', 'USER_STOP_ABORTED', 'SECURITY_REJECTED', 'FAILED'],
        AUTHORIZATION_EVALUATED: ['TOOL_EXECUTING', 'AWAITING_HUMAN_APPROVAL', 'PLAN_FORMULATED', 'USER_STOP_ABORTED', 'SECURITY_REJECTED', 'FAILED'],
        AWAITING_HUMAN_APPROVAL: ['TOOL_EXECUTING', 'USER_STOP_ABORTED', 'FAILED'],
        TOOL_EXECUTING: ['REALITY_VERIFYING', 'ACTION_PROPOSED', 'USER_STOP_ABORTED', 'SECURITY_REJECTED', 'FAILED'],
        REALITY_VERIFYING: ['DURABLE_COMMITTING', 'ACTION_PROPOSED', 'USER_STOP_ABORTED', 'SECURITY_REJECTED', 'FAILED'],
        DURABLE_COMMITTING: ['MEMORY_SYNTHESIZING', 'USER_STOP_ABORTED', 'FAILED'],
        MEMORY_SYNTHESIZING: ['CYCLE_EVALUATION', 'USER_STOP_ABORTED', 'FAILED'],
        CYCLE_EVALUATION: ['CONTEXT_ASSEMBLED', 'PLAN_FORMULATED', 'ACTION_PROPOSED', 'COMPLETED', 'CYCLE_BUDGET_EXCEEDED', 'USER_STOP_ABORTED', 'FAILED'],
        COMPLETED: [],
        FAILED: [],
        USER_STOP_ABORTED: [],
        SECURITY_REJECTED: [],
        STALE_TASK_CONCURRENCY_ABORT: [],
        CYCLE_BUDGET_EXCEEDED: [],
    };
    /**
     * EN: Returns the current state of the agent loop.
     */
    getCurrentState() {
        return this.currentState;
    }
    /**
     * EN: Returns a copy of the transition history.
     */
    getHistory() {
        return [...this.history];
    }
    /**
     * EN: Validates whether a state is terminal.
     */
    isTerminal(state) {
        return [
            'COMPLETED',
            'FAILED',
            'USER_STOP_ABORTED',
            'SECURITY_REJECTED',
            'STALE_TASK_CONCURRENCY_ABORT',
            'CYCLE_BUDGET_EXCEEDED',
        ].includes(state);
    }
    /**
     * EN: Verifies task version concurrency freshness.
     * Throws AgentLoopConcurrencyError if current version doesn't match expected version.
     */
    verifyTaskVersion(task, expectedVersion) {
        if (task.version !== expectedVersion) {
            throw new AgentLoopConcurrencyError(`Optimistic concurrency violation on task '${task.taskId}': expected version ${expectedVersion} but current version is ${task.version}`, { taskId: task.taskId, expectedVersion, currentVersion: task.version });
        }
    }
    /**
     * EN: Transitions the loop state machine deterministically.
     */
    transitionTo(nextState, reason) {
        const allowed = AgentLoopStateCoordinator.ALLOWED_TRANSITIONS[this.currentState];
        if (!allowed || !allowed.includes(nextState)) {
            throw new AgentLoopValidationError(`Invalid agent loop state transition: cannot transition from '${this.currentState}' to '${nextState}' (${reason ?? 'unspecified'})`, { fromState: this.currentState, toState: nextState, reason });
        }
        const event = {
            fromState: this.currentState,
            toState: nextState,
            timestamp: new Date().toISOString(),
            reason,
        };
        this.history.push(event);
        this.currentState = nextState;
        return this.currentState;
    }
    /**
     * EN: Returns the immutable history of state transitions.
     */
    getStateHistory() {
        return [...this.history];
    }
    /**
     * EN: Resets the state coordinator back to IDLE.
     */
    reset() {
        this.currentState = 'IDLE';
        this.history.length = 0;
    }
}
