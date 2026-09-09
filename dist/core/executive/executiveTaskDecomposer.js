// src/core/executive/executiveTaskDecomposer.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Task Decomposition Engine.
// Transforms high-level ExecutiveGoal objectives into discrete, governed, dependency-linked ExecutiveTasks.
import { globalExecutiveTaskManager } from './executiveTask.js';
import { ExecutiveDependencyGraph } from './executiveDependencyGraph.js';
export class ExecutiveTaskDecomposer {
    decompose(goal, customTaskSpecs) {
        const graph = new ExecutiveDependencyGraph();
        const createdTasks = [];
        if (customTaskSpecs && customTaskSpecs.length > 0) {
            // Use explicit task specifications
            for (const spec of customTaskSpecs) {
                const task = globalExecutiveTaskManager.createTask({
                    ...spec,
                    goalId: goal.goalId,
                    priority: spec.priority ?? goal.priority,
                });
                graph.addTask(task);
                createdTasks.push(task);
            }
        }
        else {
            // Deterministic default decomposition based on objective
            const lower = goal.objective.toLowerCase();
            if (lower.includes('monitor') || lower.includes('health') || lower.includes('check')) {
                // Two-phase: Inspect -> Verify
                const task1 = globalExecutiveTaskManager.createTask({
                    goalId: goal.goalId,
                    title: 'Inspect System Host Telemetry',
                    description: 'Gather live host CPU, memory, and runtime health stats',
                    taskType: 'OBSERVE',
                    priority: goal.priority,
                    requiredCapabilities: ['cap_sys_snapshot'],
                    riskLevel: 'LOW',
                    permissionLevel: 'AUTO_EXECUTE',
                    plan: {
                        planId: 'plan_inspect_1',
                        capabilityId: 'cap_sys_snapshot',
                        actionName: 'INSPECT',
                        parameters: {},
                        isDryRun: false,
                    },
                });
                const task2 = globalExecutiveTaskManager.createTask({
                    goalId: goal.goalId,
                    title: 'Verify System Health State',
                    description: 'Verify collected telemetry satisfies health operational thresholds',
                    taskType: 'VERIFY',
                    priority: goal.priority,
                    dependencies: [{ parentTaskId: task1.taskId, requiredStatus: 'COMPLETED' }],
                    requiredCapabilities: ['cap_sys_snapshot'],
                    riskLevel: 'LOW',
                    permissionLevel: 'AUTO_EXECUTE',
                    plan: {
                        planId: 'plan_verify_1',
                        capabilityId: 'cap_sys_snapshot',
                        actionName: 'VERIFY',
                        parameters: {},
                        isDryRun: false,
                    },
                });
                graph.addTask(task1);
                graph.addTask(task2);
                createdTasks.push(task1, task2);
            }
            else if (goal.intent === 'DEPLOY_SERVICE' ||
                lower.includes('deploy') ||
                lower.includes('build') ||
                lower.includes('write') ||
                lower.includes('file') ||
                lower.includes('create')) {
                // Multi-phase: Observe -> Mutate -> Verify
                const task1 = globalExecutiveTaskManager.createTask({
                    goalId: goal.goalId,
                    title: 'Observe Target Environment',
                    description: 'Check target directory and file existence before mutation',
                    taskType: 'OBSERVE',
                    priority: goal.priority,
                    requiredCapabilities: ['cap_obs_fs'],
                    riskLevel: 'LOW',
                    permissionLevel: 'AUTO_EXECUTE',
                    plan: {
                        planId: 'plan_obs_target',
                        capabilityId: 'cap_obs_fs',
                        actionName: 'READ',
                        parameters: { path: 'data/target.txt' },
                        isDryRun: false,
                    },
                });
                const task2 = globalExecutiveTaskManager.createTask({
                    goalId: goal.goalId,
                    title: 'Execute Governed Mutation',
                    description: 'Perform governed file write action',
                    taskType: 'MUTATE',
                    priority: goal.priority,
                    dependencies: [{ parentTaskId: task1.taskId, taskId: task1.taskId, requiredStatus: 'COMPLETED' }],
                    requiredCapabilities: ['cap_fs_write'],
                    riskLevel: 'REVERSIBLE',
                    permissionLevel: 'AUTO_EXECUTE',
                    plan: {
                        planId: 'plan_mutate_target',
                        capabilityId: 'cap_fs_write',
                        actionName: 'CREATE',
                        parameters: { path: 'data/target.txt', content: 'BOWCON Executive Runtime Managed' },
                        isDryRun: false,
                    },
                });
                const task3 = globalExecutiveTaskManager.createTask({
                    goalId: goal.goalId,
                    title: 'Independently Verify Mutation',
                    description: 'Verify file exists on host and matches content checksum',
                    taskType: 'VERIFY',
                    priority: goal.priority,
                    dependencies: [{ parentTaskId: task2.taskId, taskId: task2.taskId, requiredStatus: 'COMPLETED' }],
                    requiredCapabilities: ['cap_obs_fs'],
                    riskLevel: 'LOW',
                    permissionLevel: 'AUTO_EXECUTE',
                    plan: {
                        planId: 'plan_verify_target',
                        capabilityId: 'cap_obs_fs',
                        actionName: 'VERIFY',
                        parameters: { path: 'data/target.txt' },
                        isDryRun: false,
                    },
                });
                graph.addTask(task1);
                graph.addTask(task2);
                graph.addTask(task3);
                createdTasks.push(task1, task2, task3);
            }
            else {
                // Generic 2-task pipeline
                const task1 = globalExecutiveTaskManager.createTask({
                    goalId: goal.goalId,
                    title: `Observe Environment for: ${goal.objective}`,
                    description: 'Initial observation and environment probe',
                    taskType: 'OBSERVE',
                    priority: goal.priority,
                    requiredCapabilities: ['cap_sys_snapshot'],
                    riskLevel: 'LOW',
                    permissionLevel: 'AUTO_EXECUTE',
                    plan: {
                        planId: 'plan_generic_obs',
                        capabilityId: 'cap_sys_snapshot',
                        actionName: 'INSPECT',
                        parameters: {},
                        isDryRun: false,
                    },
                });
                const task2 = globalExecutiveTaskManager.createTask({
                    goalId: goal.goalId,
                    title: `Verify Outcome for: ${goal.objective}`,
                    description: 'Verify objective requirements are met',
                    taskType: 'VERIFY',
                    priority: goal.priority,
                    dependencies: [{ parentTaskId: task1.taskId, taskId: task1.taskId, requiredStatus: 'COMPLETED' }],
                    requiredCapabilities: ['cap_sys_snapshot'],
                    riskLevel: 'LOW',
                    permissionLevel: 'AUTO_EXECUTE',
                    plan: {
                        planId: 'plan_generic_verify',
                        capabilityId: 'cap_sys_snapshot',
                        actionName: 'VERIFY',
                        parameters: {},
                        isDryRun: false,
                    },
                });
                graph.addTask(task1);
                graph.addTask(task2);
                createdTasks.push(task1, task2);
            }
        }
        // Validate graph
        const validation = graph.validateGraph();
        if (!validation.valid) {
            throw new Error(`[TASK_DECOMPOSITION_FAILED] ${validation.errors.join('; ')}`);
        }
        const rootTasks = createdTasks.filter((t) => graph.getDependencies(t.taskId).length === 0);
        const leafTasks = createdTasks.filter((t) => graph.getDependents(t.taskId).length === 0);
        return Object.assign([...createdTasks], {
            goalId: goal.goalId,
            tasks: createdTasks,
            graph,
            rootTasks,
            leafTasks,
        });
    }
}
export const globalExecutiveTaskDecomposer = new ExecutiveTaskDecomposer();
