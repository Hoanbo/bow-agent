import type { BrainServiceLifecycleState } from './brainServiceStates.js';
import type { BrainServiceAuditLedger } from './brainServiceAudit.js';
export declare class BrainServiceLifecycle {
    private _state;
    private readonly _auditLedger;
    constructor(auditLedger: BrainServiceAuditLedger);
    get state(): BrainServiceLifecycleState;
    transition(to: BrainServiceLifecycleState): void;
    bootstrap(loadStateFn: () => Promise<void> | void): Promise<void>;
}
