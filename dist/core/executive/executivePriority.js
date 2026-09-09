// src/core/executive/executivePriority.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Priority Management and Scheduling Precedence.
export const PRIORITY_WEIGHTS = {
    CRITICAL: 1000,
    HIGH: 500,
    MEDIUM: 100,
    NORMAL: 100,
    LOW: 10,
    BACKGROUND: 1,
};
export class ExecutivePriorityManager {
    _starvationThresholdMs = 30000; // 30 seconds
    getWeight(priority) {
        return PRIORITY_WEIGHTS[priority] ?? 0;
    }
    /**
     * Compares two tasks for scheduling priority.
     * Positive if a should execute before b, negative if b should execute before a.
     * Enforces starvation prevention: tasks waiting longer than threshold receive a priority boost.
     */
    compareTasks(a, b, now = Date.now()) {
        let weightA = this.getWeight(a.priority);
        let weightB = this.getWeight(b.priority);
        // Starvation prevention
        const waitTimeA = now - a.createdAt;
        const waitTimeB = now - b.createdAt;
        if (waitTimeA > this._starvationThresholdMs && a.priority !== 'CRITICAL') {
            weightA += 200; // boost
        }
        if (waitTimeB > this._starvationThresholdMs && b.priority !== 'CRITICAL') {
            weightB += 200; // boost
        }
        if (weightA !== weightB) {
            return weightB - weightA; // higher weight comes first
        }
        // Tie-breaker: older creation time comes first (FIFO)
        return a.createdAt - b.createdAt;
    }
}
export const globalExecutivePriority = new ExecutivePriorityManager();
export function compareTaskPriority(a, b) {
    return (PRIORITY_WEIGHTS[b] ?? 0) - (PRIORITY_WEIGHTS[a] ?? 0);
}
export function compareGoalPriority(a, b) {
    return compareTaskPriority(a, b);
}
export function isHigherPriority(a, b) {
    return (PRIORITY_WEIGHTS[a] ?? 0) > (PRIORITY_WEIGHTS[b] ?? 0);
}
