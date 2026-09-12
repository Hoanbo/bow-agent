// src/core/orchestration/taskDependencyEngine.ts
// BOWCON V4.0 — MS-1.3.46: TASK DEPENDENCY & SEQUENCING ENGINE
//
// Governed validation of task dependency graphs, ordering, cycle detection,
// and state propagation.
//
// INVARIANTS:
// - A task cannot enter RUNNING before required dependencies are satisfied.
// - Cyclic dependencies must be detected and rejected fail-closed.
// - Dependency state must remain explicit; no inferred or fabricated completion.
// - Failed dependencies must block dependent tasks, never silently pass.
// - Cross-session dependencies must be strictly rejected.
export class TaskDependencyError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'TaskDependencyError';
    }
}
export class TaskDependencyEngine {
    /**
     * Evaluates if all dependencies of a task are satisfied.
     */
    evaluateDependencies(task, taskLookup) {
        if (!task.dependencies || task.dependencies.length === 0) {
            return {
                status: 'SATISFIED',
                blockingTaskIds: [],
            };
        }
        const blockingIds = [];
        let hasFailed = false;
        let hasUnresolved = false;
        let failReason = '';
        for (const dep of task.dependencies) {
            const parentTask = taskLookup(dep.dependentTaskId);
            if (!parentTask) {
                return {
                    status: 'INVALID',
                    code: 'TASK_DEPENDENCY_INVALID',
                    reason: `Dependent task ${dep.dependentTaskId} does not exist.`,
                    blockingTaskIds: [dep.dependentTaskId],
                };
            }
            // Cross-session check
            if (parentTask.sessionId !== task.sessionId) {
                return {
                    status: 'INVALID',
                    code: 'TASK_DEPENDENCY_CROSS_SESSION',
                    reason: `Cross-session dependency rejected: task ${task.taskId} (session: ${task.sessionId}) depends on task ${parentTask.taskId} (session: ${parentTask.sessionId}).`,
                    blockingTaskIds: [parentTask.taskId],
                };
            }
            const parentState = parentTask.state;
            // Handle terminal failure states
            if (parentState === 'FAILED' || parentState === 'CANCELLED' || parentState === 'REJECTED') {
                hasFailed = true;
                blockingIds.push(parentTask.taskId);
                failReason = `Parent dependency ${parentTask.taskId} terminated with state ${parentState}.`;
                continue;
            }
            // Handle interrupted state
            if (parentState === 'INTERRUPTED') {
                hasFailed = true;
                blockingIds.push(parentTask.taskId);
                failReason = `Parent dependency ${parentTask.taskId} was INTERRUPTED.`;
                continue;
            }
            // Check success criteria
            const isSatisfied = parentState === 'SUCCEEDED' || parentState === 'VERIFIED';
            if (!isSatisfied) {
                hasUnresolved = true;
                blockingIds.push(parentTask.taskId);
            }
            else if (dep.type === 'REQUIRED_ARTIFACT') {
                // Artifact check
                const parentArtifacts = parentTask.result?.outcome.artifacts || [];
                if (dep.requiredArtifactTypes && dep.requiredArtifactTypes.length > 0) {
                    const hasRequiredArtifacts = dep.requiredArtifactTypes.every((reqType) => parentArtifacts.some((art) => art.artifactType === reqType));
                    if (!hasRequiredArtifacts) {
                        hasUnresolved = true;
                        blockingIds.push(parentTask.taskId);
                    }
                }
            }
        }
        if (hasFailed) {
            return {
                status: 'BLOCKED',
                code: 'TASK_DEPENDENCY_FAILED',
                reason: failReason,
                blockingTaskIds: blockingIds,
            };
        }
        if (hasUnresolved) {
            return {
                status: 'WAITING',
                code: 'TASK_DEPENDENCY_UNRESOLVED',
                reason: `Task ${task.taskId} waiting on ${blockingIds.length} dependencies.`,
                blockingTaskIds: blockingIds,
            };
        }
        return {
            status: 'SATISFIED',
            blockingTaskIds: [],
        };
    }
    /**
     * Detects circular dependencies in a set of tasks using Depth First Search.
     */
    detectCycles(tasks) {
        const taskMap = new Map();
        for (const t of tasks) {
            taskMap.set(t.taskId, t);
        }
        const visited = new Set();
        const recStack = new Set();
        const currentPath = [];
        const dfs = (taskId) => {
            visited.add(taskId);
            recStack.add(taskId);
            currentPath.push(taskId);
            const task = taskMap.get(taskId);
            if (task && task.dependencies) {
                for (const dep of task.dependencies) {
                    const nextId = dep.dependentTaskId;
                    if (!visited.has(nextId)) {
                        const cycle = dfs(nextId);
                        if (cycle)
                            return cycle;
                    }
                    else if (recStack.has(nextId)) {
                        // Cycle found
                        const cycleStartIndex = currentPath.indexOf(nextId);
                        return currentPath.slice(cycleStartIndex).concat(nextId);
                    }
                }
            }
            recStack.delete(taskId);
            currentPath.pop();
            return null;
        };
        for (const t of tasks) {
            if (!visited.has(t.taskId)) {
                const cycle = dfs(t.taskId);
                if (cycle) {
                    return { hasCycle: true, cyclePath: cycle };
                }
            }
        }
        return { hasCycle: false };
    }
    /**
     * Asserts that adding a new task with dependencies does not introduce a cycle.
     */
    assertNoCycle(candidateTask, existingTasks) {
        for (const dep of candidateTask.dependencies || []) {
            if (dep.dependentTaskId === candidateTask.taskId) {
                throw new TaskDependencyError('TASK_DEPENDENCY_CYCLE', `Task ${candidateTask.taskId} cannot depend on itself.`);
            }
        }
        const combined = [...existingTasks.filter((t) => t.taskId !== candidateTask.taskId), candidateTask];
        const result = this.detectCycles(combined);
        if (result.hasCycle) {
            throw new TaskDependencyError('TASK_DEPENDENCY_CYCLE', `Cyclic dependency detected: ${result.cyclePath?.join(' -> ')}`, { cyclePath: result.cyclePath });
        }
    }
    /**
     * Determines if a task can safely transition to READY.
     */
    canTransitionToReady(task, taskLookup) {
        const evalResult = this.evaluateDependencies(task, taskLookup);
        return evalResult.status === 'SATISFIED';
    }
}
export const globalTaskDependencyEngine = new TaskDependencyEngine();
