// src/core/world-action/worldAction.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// High-Level Governed Physical Action Execution Facade.
// Integrates with BrainRuntime, BrainService, and CognitivePipeline.
import { buildWorldAction } from './worldActionRequest.js';
import { globalWorldActionRuntime } from './worldActionRuntime.js';
import { globalWorldActionApproval } from './worldActionApproval.js';
import { globalWorldActionPlanner } from './worldActionPlanner.js';
export class WorldActionFacade {
    /**
     * Submits a WorldAction for governed physical execution.
     */
    async submitAction(params, token) {
        const action = buildWorldAction(params);
        if (token) {
            action.authorizationToken = token;
        }
        return globalWorldActionRuntime.executeAction(action);
    }
    /**
     * Generates a preview plan (Dry-Run) with zero physical mutation.
     */
    async previewAction(params) {
        const action = buildWorldAction({ ...params, isDryRun: true });
        return globalWorldActionRuntime.executeAction(action);
    }
    /**
     * Prepares an action and initiates human confirmation request if required.
     */
    requestConfirmation(params) {
        const action = buildWorldAction(params);
        globalWorldActionPlanner.prepare(action);
        const confirmation = globalWorldActionApproval.createConfirmationRequest(action);
        return { action, confirmation };
    }
    /**
     * Approves a pending confirmation and immediately executes the action with the issued token.
     */
    async confirmAndExecute(confirmationId, approverUserId, action) {
        const token = globalWorldActionApproval.approve(confirmationId, approverUserId);
        action.authorizationToken = token;
        return globalWorldActionRuntime.executeAction(action);
    }
}
export const worldAction = new WorldActionFacade();
