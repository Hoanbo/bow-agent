// src/core/agent-loop/agentLoopRecovery.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Bounded Autonomous Recovery Coordinator.
//
// Invariants:
// FAILURE != BRAIN_DEATH
// Recovery is bounded and deterministic. Never random retry loops.
import { globalSupervisorRuntime } from '../supervisor/supervisorRuntime.js';
import { globalSupervisorDiagnosis } from '../supervisor/supervisorDiagnosis.js';
import { globalSupervisorRecoveryPlanner } from '../supervisor/supervisorRecoveryPlanner.js';
import { globalAgentLoopControl } from './agentLoopControl.js';
import { globalAgentLoopCancellation } from './agentLoopCancellation.js';
export class AgentLoopRecoveryCoordinator {
    async attemptRecovery(plan, error, attempt) {
        // 1. Mandatory USER_STOP Check
        if (globalAgentLoopControl.isStopped()) {
            return {
                recovered: false,
                reason: 'Recovery aborted: USER_STOP is active.',
            };
        }
        globalAgentLoopCancellation.throwIfCancelled();
        // 2. Bound Check
        if (attempt >= plan.maxAttempts) {
            return {
                recovered: false,
                reason: `Recovery limit reached (${attempt}/${plan.maxAttempts} attempts).`,
            };
        }
        // 3. Structured Recovery via Supervisor Subsystem
        const firstStep = plan.steps[0];
        const syntheticAnomaly = {
            anomalyId: `anom_rec_${Date.now()}`,
            sessionId: 'agent_loop',
            deviceId: 'local',
            timestamp: Date.now(),
            source: `AgentLoop:${firstStep?.capabilityId || 'action'}`,
            type: 'CAPABILITY_DEGRADED',
            severity: 'MEDIUM',
            observedState: { error, capabilityId: firstStep?.capabilityId },
            expectedState: { state: 'AVAILABLE' },
            evidence: `Loop step failed: ${error}`,
            confidence: 0.95,
        };
        const diagnosis = globalSupervisorDiagnosis.diagnose(syntheticAnomaly);
        const recPlan = globalSupervisorRecoveryPlanner.planRecovery(diagnosis);
        const execRes = await globalSupervisorRuntime.executeRecovery(recPlan, diagnosis);
        if (execRes.success && execRes.verified) {
            return {
                recovered: true,
                reason: 'Autonomous recovery succeeded and independently verified.',
            };
        }
        return {
            recovered: false,
            reason: execRes.error || 'Autonomous recovery verification failed.',
        };
    }
}
export const globalAgentLoopRecovery = new AgentLoopRecoveryCoordinator();
