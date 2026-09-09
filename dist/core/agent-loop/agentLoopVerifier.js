// src/core/agent-loop/agentLoopVerifier.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Independent Outcome Verifier.
//
// Invariants:
// EXECUTION != VERIFICATION
// VERIFICATION != COMMIT
// Never treat execution output as outcome proof without independent verification.
import { globalCapabilityVerifier } from '../capability/capabilityVerifier.js';
import { globalCapabilityRegistry } from '../capability/capabilityRegistry.js';
export class AgentLoopVerifier {
    async verifyPlanOutcome(plan, executionOutputs) {
        const checks = [];
        // Empty plan trivially passes
        if (plan.steps.length === 0) {
            return { verified: true, checksPerformed: ['no_steps_to_verify'] };
        }
        for (const step of plan.steps) {
            checks.push(`verify_step_${step.stepIndex}_${step.capabilityId}`);
            const desc = globalCapabilityRegistry.getCapability(step.capabilityId);
            if (desc && desc.state === 'UNAVAILABLE') {
                return {
                    verified: false,
                    checksPerformed: checks,
                    failureReason: `Target capability "${step.capabilityId}" is in UNAVAILABLE state.`,
                };
            }
            if (desc) {
                checks.push(`capability_independent_verification_${step.capabilityId}`);
                const outcome = await globalCapabilityVerifier.verify(desc, {
                    requestId: `req_verif_${step.stepIndex}_${Date.now()}`,
                    capabilityId: step.capabilityId,
                    parameters: step.parameters,
                    target: step.target,
                }, {
                    success: true,
                    capabilityId: step.capabilityId,
                    executionId: `verif_${step.stepIndex}`,
                    startedAt: Date.now(),
                    completedAt: Date.now(),
                    actualEffect: 'verification_check',
                    output: executionOutputs[step.stepIndex - 1],
                    metadata: {},
                });
                if (!outcome.passed) {
                    return {
                        verified: false,
                        checksPerformed: checks,
                        failureReason: outcome.failureReason || `Verification failed for capability ${step.capabilityId}`,
                    };
                }
            }
        }
        return {
            verified: true,
            checksPerformed: checks,
        };
    }
}
export const globalAgentLoopVerifier = new AgentLoopVerifier();
