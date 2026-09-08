// src/core/world-action/worldActionPlanner.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Phase 1: Action Preparation Engine (ZERO Physical Side Effects)
//
// INVARIANTS:
// No physical side effect may occur during PREPARE.
// PREVIEW != EXECUTION
// PLAN != AUTHORIZATION
import { globalWorldActionPolicy } from './worldActionPolicy.js';
import { globalWorldActionRegistry } from './worldActionRegistry.js';
import { WorldActionError } from './worldActionFailure.js';
export class WorldActionPlanner {
    /**
     * Prepares a WorldAction for execution without producing ANY physical mutation.
     * Validates tool registration, parameter schema, policy constraints, and risk level.
     */
    prepare(action) {
        action.lifecycleState = 'UNDERSTOOD';
        // 1. Resolve Tool Definition
        const tool = globalWorldActionRegistry.getTool(action.actionType);
        if (!tool) {
            action.lifecycleState = 'FAILED';
            action.failureCode = 'TOOL_NOT_FOUND';
            action.failureReason = `Tool "${action.actionType}" is not registered in WorldActionRegistry.`;
            throw new WorldActionError('TOOL_NOT_FOUND', action.failureReason, action.actionId, action.target);
        }
        if (!tool.enabled) {
            action.lifecycleState = 'FAILED';
            action.failureCode = 'TOOL_NOT_FOUND';
            action.failureReason = `Tool "${action.actionType}" is currently disabled.`;
            throw new WorldActionError('TOOL_NOT_FOUND', action.failureReason, action.actionId, action.target);
        }
        // 2. Validate Parameters against Schema
        if (tool.inputSchema?.required && Array.isArray(tool.inputSchema.required)) {
            for (const reqField of tool.inputSchema.required) {
                if (action.parameters[reqField] === undefined) {
                    action.lifecycleState = 'FAILED';
                    action.failureCode = 'PLANNING_FAILURE';
                    action.failureReason = `Missing required parameter "${reqField}" for tool "${tool.toolId}".`;
                    throw new WorldActionError('PLANNING_FAILURE', action.failureReason, action.actionId, action.target);
                }
            }
        }
        // 3. Policy & Risk Assessment
        const policyResult = globalWorldActionPolicy.evaluate(action);
        if (!policyResult.allowed) {
            action.lifecycleState = 'DENIED';
            action.failureCode = 'POLICY_DENIAL';
            action.failureReason = policyResult.reason;
            throw new WorldActionError('POLICY_DENIAL', policyResult.reason, action.actionId, action.target);
        }
        // 4. Synthesize Prepared Plan
        const preparedPlan = {
            actionId: action.actionId,
            toolId: tool.toolId,
            toolName: tool.name,
            target: action.target,
            normalizedParameters: action.parameters,
            riskLevel: policyResult.riskLevel,
            requiresAuthorization: policyResult.requiresAuthorization,
            requiresExplicitConfirmation: policyResult.requiresExplicitConfirmation,
            expectedEffect: `Execute ${tool.name} on target "${action.target}"`,
            verificationStrategy: `${tool.name}_verifier`,
            rollbackStrategy: tool.rollback ? `${tool.name}_rollback` : 'NONE',
            preparedAt: Date.now(),
        };
        action.preparedPlan = preparedPlan;
        action.executionState = 'PREPARED';
        // 5. Update Authorization Lifecycle
        if (!policyResult.requiresAuthorization) {
            action.authorizationState = 'NOT_REQUIRED';
            action.lifecycleState = 'AUTHORIZED';
        }
        else if (policyResult.requiresExplicitConfirmation) {
            action.authorizationState = 'AWAITING_CONFIRMATION';
            action.lifecycleState = 'AWAITING_CONFIRMATION';
        }
        else {
            action.authorizationState = 'REQUIRED';
            action.lifecycleState = 'AUTHORIZATION_REQUIRED';
        }
        return action;
    }
}
export const globalWorldActionPlanner = new WorldActionPlanner();
