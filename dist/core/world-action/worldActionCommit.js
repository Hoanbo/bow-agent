// src/core/world-action/worldActionCommit.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Governed Commit and Verified Rollback Engine.
//
// INVARIANTS:
// VERIFICATION != COMMIT
// Only after VERIFIED -> COMMITTED
// Rollback must never be assumed successful; it must itself be verified.
import { globalWorldActionRegistry } from './worldActionRegistry.js';
import { WorldActionError } from './worldActionFailure.js';
export class WorldActionCommitEngine {
    /**
     * Commits an action whose physical execution has been independently verified.
     */
    commit(action) {
        if (action.lifecycleState !== 'VERIFYING' && action.lifecycleState !== 'EXECUTING') {
            throw new WorldActionError('COMMIT_FAILURE', `Cannot commit action in lifecycle state "${action.lifecycleState}". Must be VERIFYING.`, action.actionId);
        }
        if (action.verificationState !== 'VERIFIED') {
            throw new WorldActionError('COMMIT_FAILURE', `Cannot commit action: verificationState is "${action.verificationState}". Action is not verified.`, action.actionId);
        }
        action.committedAt = Date.now();
        action.lifecycleState = 'COMMITTED';
        return action;
    }
    /**
     * Performs an independently verified rollback for a reversible action.
     */
    async rollback(action) {
        const tool = globalWorldActionRegistry.getTool(action.actionType);
        if (!tool || !tool.rollback) {
            return {
                success: false,
                actionId: action.actionId,
                rolledBackAt: Date.now(),
                verificationPassed: false,
                actualEffect: 'No rollback strategy defined for this action.',
                errorMessage: 'Rollback not supported.',
            };
        }
        if (!action.executionResult) {
            return {
                success: false,
                actionId: action.actionId,
                rolledBackAt: Date.now(),
                verificationPassed: false,
                actualEffect: 'No execution result available to roll back.',
            };
        }
        try {
            const rollbackResult = await tool.rollback(action, action.executionResult);
            action.rollbackResult = rollbackResult;
            if (rollbackResult.success && rollbackResult.verificationPassed) {
                action.lifecycleState = 'ROLLED_BACK';
                action.executionState = 'ROLLED_BACK';
            }
            else {
                action.lifecycleState = 'FAILED';
            }
            return rollbackResult;
        }
        catch (err) {
            action.lifecycleState = 'FAILED';
            return {
                success: false,
                actionId: action.actionId,
                rolledBackAt: Date.now(),
                verificationPassed: false,
                actualEffect: 'Rollback failed with exception.',
                errorMessage: err.message,
            };
        }
    }
}
export const globalWorldActionCommit = new WorldActionCommitEngine();
