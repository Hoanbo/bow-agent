import type { PolicyActiveRollbackRuntime } from '../policyActiveRollback/policyActiveRollbackRuntime.js';
import type { RecoveryCommitResult } from '../policyActiveRollback/policyActiveRollbackTypes.js';
import type { RecoveryAuthorizationRecord, IncidentRecoveryHandoffRecord, PolicyActiveIncidentResolutionOptions } from './policyActiveIncidentResolutionTypes.js';
export interface RecoveryHandoffParams {
    readonly authorization: RecoveryAuthorizationRecord;
    readonly rollbackRuntime: PolicyActiveRollbackRuntime;
    readonly sourceState?: 'ROLLED_BACK' | 'SUNSET' | 'DEACTIVATED';
    readonly requestedBy?: string;
}
export declare class PolicyIncidentRecoveryHandoffEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResolutionOptions);
    private assertUserStopInactive;
    /**
     * Delegates authorized recovery to MS-1.3.72 PolicyActiveRollbackRuntime.
     */
    executeHandoff(params: RecoveryHandoffParams): {
        readonly handoffRecord: IncidentRecoveryHandoffRecord;
        readonly commitResult: RecoveryCommitResult;
    };
}
