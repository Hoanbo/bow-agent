import type { WorldAction } from './worldActionTypes.js';
export declare class WorldActionPlanner {
    /**
     * Prepares a WorldAction for execution without producing ANY physical mutation.
     * Validates tool registration, parameter schema, policy constraints, and risk level.
     */
    prepare(action: WorldAction): WorldAction;
}
export declare const globalWorldActionPlanner: WorldActionPlanner;
