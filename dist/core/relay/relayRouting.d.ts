import type { RelayMessage } from './relayTypes.js';
export declare class RelayRoutingError extends Error {
    constructor(message: string);
}
export declare class RelayMessageRouter {
    private totalRouted;
    /**
     * Routes an envelope without mutating payload meaning or downgrading risk.
     */
    route(message: RelayMessage): RelayMessage;
    getTotalRouted(): number;
    private validateMessageStructure;
    /**
     * Asserts that routing did not alter critical message invariants.
     */
    static assertRoutingPreservation(original: RelayMessage, forwarded: RelayMessage): void;
}
