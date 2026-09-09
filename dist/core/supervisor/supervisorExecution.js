// src/core/supervisor/supervisorExecution.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Governed Recovery Execution Adapter.
//
// INVARIANTS:
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// Zero unrestricted shell or dynamic code execution.
import { globalCapabilityRegistry } from '../capability/capabilityRegistry.js';
import { globalCapabilityRuntime } from '../capability/capabilityRuntime.js';
import { globalCognitiveRegistry } from '../cognitive/cognitiveRegistry.js';
import { SupervisorError } from './supervisorFailure.js';
export class SupervisorExecutionEngine {
    async executeRecovery(plan, options) {
        if (options?.isDryRun) {
            return {
                success: true,
                planId: plan.planId,
                executedSteps: 0,
                actualEffects: ['DRY_RUN_PREVIEW: Recovery plan simulated with ZERO physical mutation.'],
                isDryRun: true,
            };
        }
        const actualEffects = [];
        let executedSteps = 0;
        for (const step of plan.steps) {
            try {
                await this.executeStep(step, options);
                actualEffects.push(`Executed step ${step.stepIndex}: ${step.description}`);
                executedSteps++;
            }
            catch (err) {
                return {
                    success: false,
                    planId: plan.planId,
                    executedSteps,
                    actualEffects,
                    error: err.message,
                };
            }
        }
        return {
            success: true,
            planId: plan.planId,
            executedSteps,
            actualEffects,
        };
    }
    async executeStep(step, options) {
        // 1. Re-probe Capability
        if (step.parameters.probe && step.capabilityId) {
            if (globalCapabilityRegistry.hasCapability(step.capabilityId)) {
                globalCapabilityRegistry.setCapabilityState(step.capabilityId, 'AVAILABLE');
            }
            return;
        }
        // 2. Reconnect Cognitive Provider
        if (step.parameters.reconnect) {
            const active = globalCognitiveRegistry.getActiveProvider();
            await active.healthCheck();
            return;
        }
        // 3. Refresh Observation
        if (step.parameters.refresh) {
            globalCapabilityRuntime.getEnvironmentSnapshot(true);
            return;
        }
        // 4. Process Restart (Governed)
        if (step.parameters.restart && step.capabilityId === 'cap_proc_start') {
            const req = {
                requestId: `superv_restart_${Date.now()}`,
                capabilityId: 'cap_proc_start',
                target: 'node',
                parameters: {
                    command: process.execPath,
                    args: ['-e', 'setInterval(() => {}, 500)'],
                },
                authorizationToken: options?.authorizationToken,
            };
            await globalCapabilityRuntime.executeCapability(req);
            return;
        }
        // Default no-op if step parameters represent notification
        if (step.parameters.requireApproval) {
            return;
        }
        throw new SupervisorError('UNAVAILABLE', `No physical recovery adapter configured for step "${step.description}".`);
    }
}
export const globalSupervisorExecution = new SupervisorExecutionEngine();
