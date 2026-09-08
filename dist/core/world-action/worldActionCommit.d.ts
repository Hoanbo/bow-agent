import type { WorldAction, ActionRollbackResult } from './worldActionTypes.js';
export declare class WorldActionCommitEngine {
    /**
     * Commits an action whose physical execution has been independently verified.
     */
    commit(action: WorldAction): WorldAction;
    /**
     * Performs an independently verified rollback for a reversible action.
     */
    rollback(action: WorldAction): Promise<ActionRollbackResult>;
}
export declare const globalWorldActionCommit: WorldActionCommitEngine;
