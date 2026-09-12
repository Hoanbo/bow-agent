// src/core/orchestration/governedTaskOrchestrator.ts
// BOWCON V4.0 — MS-1.3.46: GOVERNED TASK ORCHESTRATOR
//
// Governed multi-agent task orchestration, lifecycle management, scope containment,
// and delegation verification.
//
// INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - DELEGATED_AUTHORITY <= OWNER_GRANTED_SCOPE
// - CHILD_CAPABILITIES ⊆ PARENT_CAPABILITIES
// - AGENT != MASTER_OWNER & DEVICE != MASTER_OWNER
// - Task orchestration is ADVISORY; never creates authority or bypasses HumanGate.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
import crypto from 'node:crypto';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalAgentIdentityManager } from '../delegation/agentIdentityManager.js';
import { DelegationScopeValidator } from '../delegation/delegationScopeValidator.js';
import { globalTaskDependencyEngine } from './taskDependencyEngine.js';
export class GovernedOrchestrationError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'GovernedOrchestrationError';
    }
}
export class GovernedTaskOrchestrator {
    agentIdentityManager;
    delegationRuntime;
    dependencyEngine;
    groups = new Map();
    tasks = new Map();
    constructor(agentIdentityManager = globalAgentIdentityManager, delegationRuntime, dependencyEngine = globalTaskDependencyEngine) {
        this.agentIdentityManager = agentIdentityManager;
        this.delegationRuntime = delegationRuntime;
        this.dependencyEngine = dependencyEngine;
    }
    /**
     * Asserts that paths do not violate the protected workspace C:\BOW\shopofbow.
     */
    assertProtectedWorkspaceSafe(paths) {
        DelegationScopeValidator.assertProtectedWorkspaceSafe(paths, 'taskPaths');
    }
    /**
     * Creates a governed task group.
     */
    createTaskGroup(input) {
        if (globalMasterHumanAuthority.isUserStopActive) {
            throw new GovernedOrchestrationError('USER_STOP_ACTIVE', 'Cannot create task group while USER_STOP is active.');
        }
        const groupId = `tg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const group = {
            groupId,
            title: input.title,
            description: input.description,
            sessionId: input.sessionId,
            ownerId: input.ownerId,
            taskIds: [],
            state: 'PLANNED',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        this.groups.set(groupId, group);
        return group;
    }
    /**
     * Creates an individual governed task within a task group.
     */
    createTask(input) {
        if (globalMasterHumanAuthority.isUserStopActive) {
            throw new GovernedOrchestrationError('USER_STOP_ACTIVE', 'Cannot create task while USER_STOP is active.');
        }
        const group = this.groups.get(input.groupId);
        if (!group) {
            throw new GovernedOrchestrationError('TASK_GROUP_NOT_FOUND', `TaskGroup ${input.groupId} does not exist.`);
        }
        // Session consistency
        if (group.sessionId !== input.sessionId) {
            throw new GovernedOrchestrationError('CROSS_SESSION_ORCHESTRATION_REJECTED', `Task session ${input.sessionId} does not match group session ${group.sessionId}.`);
        }
        // Protected workspace validation
        const targetPaths = input.targetPaths || [];
        const forbiddenPaths = input.forbiddenPaths || [];
        this.assertProtectedWorkspaceSafe(targetPaths);
        this.assertProtectedWorkspaceSafe(forbiddenPaths);
        const taskId = `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const dependencies = (input.dependencies || []).map((d) => ({
            dependentTaskId: d.dependentTaskId,
            type: d.type || 'FINISH_TO_START',
            requiredArtifactTypes: d.requiredArtifactTypes,
        }));
        const task = {
            taskId,
            groupId: input.groupId,
            title: input.title,
            description: input.description,
            sessionId: input.sessionId,
            state: dependencies.length > 0 ? 'WAITING_DEPENDENCY' : 'PLANNED',
            dependencies,
            requiredCapabilities: input.requiredCapabilities || [],
            targetPaths,
            forbiddenPaths,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        // Cycle detection check against all existing tasks in the group
        const existingTasksInGroup = Array.from(this.tasks.values()).filter((t) => t.groupId === input.groupId);
        this.dependencyEngine.assertNoCycle(task, existingTasksInGroup);
        this.tasks.set(taskId, task);
        // Update group taskIds
        const updatedGroup = {
            ...group,
            taskIds: [...group.taskIds, taskId],
            updatedAt: Date.now(),
        };
        this.groups.set(input.groupId, updatedGroup);
        return task;
    }
    /**
     * Assigns a task to an authorized, governed agent.
     */
    assignTask(input) {
        if (globalMasterHumanAuthority.isUserStopActive) {
            throw new GovernedOrchestrationError('USER_STOP_ACTIVE', 'Cannot assign task while USER_STOP is active.');
        }
        const task = this.tasks.get(input.taskId);
        if (!task) {
            throw new GovernedOrchestrationError('TASK_NOT_FOUND', `Task ${input.taskId} does not exist.`);
        }
        // Validate agent registration
        if (!this.agentIdentityManager.hasAgent(input.agentId)) {
            throw new GovernedOrchestrationError('TARGET_AGENT_NOT_REGISTERED', `Agent ${input.agentId} is not registered in AgentIdentityManager.`);
        }
        const agent = this.agentIdentityManager.getAgent(input.agentId);
        // Session Isolation
        if (agent.sessionId !== task.sessionId) {
            throw new GovernedOrchestrationError('CROSS_SESSION_ORCHESTRATION_REJECTED', `Agent session ${agent.sessionId} does not match task session ${task.sessionId}.`);
        }
        // Delegation Validation (if delegation runtime is available)
        let delegationScope = {
            maxScopePercentage: 100,
            allowedCapabilities: task.requiredCapabilities,
            disallowedCapabilities: [],
            targetPaths: task.targetPaths,
            forbiddenPaths: task.forbiddenPaths,
            maxChildDelegationDepth: 1,
            currentDepth: 0,
            allowSubDelegation: false,
        };
        if (this.delegationRuntime) {
            const delegation = this.delegationRuntime.getDelegation(input.delegationId);
            if (!delegation) {
                throw new GovernedOrchestrationError('DELEGATION_NOT_FOUND', `Delegation ${input.delegationId} not found.`);
            }
            // Check Revocation Supremacy
            if (delegation.status === 'REVOKED' || delegation.revocationState.isRevoked) {
                throw new GovernedOrchestrationError('DELEGATION_REVOKED', `Delegation ${input.delegationId} is revoked. REVOCATION > AGENT_INTENT.`);
            }
            // Check Expiration
            if (delegation.status === 'EXPIRED' || Date.now() > delegation.expiresAt) {
                throw new GovernedOrchestrationError('DELEGATION_EXPIRED', `Delegation ${input.delegationId} has expired.`);
            }
            if (delegation.status !== 'ACTIVE' && delegation.status !== 'AUTHORIZED') {
                throw new GovernedOrchestrationError('DELEGATION_NOT_ACTIVE', `Delegation ${input.delegationId} is in status ${delegation.status}, not ACTIVE.`);
            }
            // Capability containment: Task required capabilities must be a subset of delegated capabilities
            for (const reqCap of task.requiredCapabilities) {
                if (!delegation.grantedCapabilities.includes(reqCap)) {
                    throw new GovernedOrchestrationError('CAPABILITY_NOT_DELEGATED', `Required capability "${reqCap}" is not within delegation granted capabilities: [${delegation.grantedCapabilities.join(', ')}]`);
                }
            }
            delegationScope = delegation.scope;
        }
        const assignmentId = `asgn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const assignment = {
            assignmentId,
            taskId: input.taskId,
            agentId: input.agentId,
            deviceId: input.deviceId,
            delegationId: input.delegationId,
            sessionId: task.sessionId,
            assignedAt: Date.now(),
            scope: delegationScope,
            leaseId: input.leaseId,
        };
        // Determine readiness based on dependencies
        const depEvaluation = this.dependencyEngine.evaluateDependencies(task, (id) => this.tasks.get(id));
        let nextState = 'ASSIGNED';
        if (depEvaluation.status === 'SATISFIED') {
            nextState = 'READY';
        }
        else if (depEvaluation.status === 'WAITING') {
            nextState = 'WAITING_DEPENDENCY';
        }
        else if (depEvaluation.status === 'BLOCKED') {
            nextState = 'BLOCKED';
        }
        const updatedTask = {
            ...task,
            assignment,
            state: nextState,
            updatedAt: Date.now(),
        };
        this.tasks.set(task.taskId, updatedTask);
        return updatedTask;
    }
    /**
     * Transitions task to RUNNING state.
     */
    startTaskExecution(taskId) {
        if (globalMasterHumanAuthority.isUserStopActive) {
            throw new GovernedOrchestrationError('USER_STOP_ACTIVE', 'Cannot start task execution while USER_STOP is active.');
        }
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new GovernedOrchestrationError('TASK_NOT_FOUND', `Task ${taskId} not found.`);
        }
        if (!task.assignment) {
            throw new GovernedOrchestrationError('INVALID_TASK_ASSIGNMENT', `Cannot start task ${taskId}: No agent assigned.`);
        }
        // Evaluate dependencies before entering RUNNING
        const depEvaluation = this.dependencyEngine.evaluateDependencies(task, (id) => this.tasks.get(id));
        if (depEvaluation.status !== 'SATISFIED') {
            throw new GovernedOrchestrationError(depEvaluation.code || 'TASK_DEPENDENCY_UNRESOLVED', `Cannot run task ${taskId}: Dependencies not satisfied. Status: ${depEvaluation.status} (${depEvaluation.reason || ''})`);
        }
        const runningTask = {
            ...task,
            state: 'RUNNING',
            updatedAt: Date.now(),
        };
        this.tasks.set(taskId, runningTask);
        return runningTask;
    }
    /**
     * Records execution result submitted by an agent.
     */
    submitTaskResult(taskId, result) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new GovernedOrchestrationError('TASK_NOT_FOUND', `Task ${taskId} not found.`);
        }
        // Session Isolation
        if (result.sessionId !== task.sessionId) {
            throw new GovernedOrchestrationError('CROSS_SESSION_ORCHESTRATION_REJECTED', `Result session ${result.sessionId} != task session ${task.sessionId}`);
        }
        // Agent binding
        if (task.assignment && task.assignment.agentId !== result.agentId) {
            throw new GovernedOrchestrationError('INVALID_TASK_ASSIGNMENT', `Result submitted by agent ${result.agentId}, but task was assigned to ${task.assignment.agentId}`);
        }
        const nextState = result.outcome.status === 'SUCCESS' ? 'VERIFICATION_PENDING' : 'FAILED';
        const updatedTask = {
            ...task,
            result,
            state: nextState,
            updatedAt: Date.now(),
        };
        this.tasks.set(taskId, updatedTask);
        return updatedTask;
    }
    /**
     * Updates task state (e.g. after verification or review).
     */
    updateTaskState(taskId, newState) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new GovernedOrchestrationError('TASK_NOT_FOUND', `Task ${taskId} not found.`);
        }
        const updatedTask = {
            ...task,
            state: newState,
            updatedAt: Date.now(),
        };
        this.tasks.set(taskId, updatedTask);
        return updatedTask;
    }
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    getTaskGroup(groupId) {
        return this.groups.get(groupId);
    }
    getTasksByGroup(groupId) {
        return Array.from(this.tasks.values()).filter((t) => t.groupId === groupId);
    }
    clear() {
        this.groups.clear();
        this.tasks.clear();
    }
}
export const globalGovernedTaskOrchestrator = new GovernedTaskOrchestrator();
