import { ResilienceHealthState, FailureClass, ResilienceFailureRecord, ResilienceRecoveryProposal, ResilienceRecoveryAttempt, ResilienceVerificationResult, DurableResilienceStateRecord } from './cognitiveResilienceTypes.js';
import { DurableResilienceStateStore } from './durableResilienceStateStore.js';
export declare class CognitiveResilienceRuntime {
    private _healthState;
    private _isStopped;
    private _stopReason;
    private readonly _failures;
    private readonly _proposals;
    private readonly _attempts;
    private readonly _verifications;
    private readonly _resolvedFailures;
    private readonly _stateStore?;
    private _createdAt;
    constructor(options?: {
        stateStore?: DurableResilienceStateStore;
    });
    getStateStore(): DurableResilienceStateStore | undefined;
    emergencyStop(reason?: string): void;
    resetStop(operatorId: string): void;
    isStopped(): boolean;
    getHealthState(): ResilienceHealthState;
    detectFailure(params: {
        description: string;
        affectedComponent: string;
        affectedCapability?: string;
        evidence: string[];
        severity: ResilienceFailureRecord['severity'];
        failureClass?: FailureClass;
    }): ResilienceFailureRecord;
    private _inferFailureClass;
    proposeRecovery(failureId: string): ResilienceRecoveryProposal;
    private _classifyRecovery;
    executeRecovery(proposalId: string, ownerApprovalToken?: string): ResilienceRecoveryAttempt;
    verifyRecovery(attemptId: string, passed: boolean, evidence: string, method?: ResilienceVerificationResult['method']): ResilienceVerificationResult;
    generateRecoveryLessons(failureId: string): string[];
    getAllFailures(): ResilienceFailureRecord[];
    getActiveFailures(): ResilienceFailureRecord[];
    getAllProposals(): ResilienceRecoveryProposal[];
    getAttemptsForProposal(proposalId: string): ResilienceRecoveryAttempt[];
    getVerificationForAttempt(attemptId: string): ResilienceVerificationResult | undefined;
    isFailureResolved(failureId: string): boolean;
    getStopReason(): string;
    saveDurableState(): DurableResilienceStateRecord | undefined;
    restoreDurableState(): {
        wasReconstructed: boolean;
        wasCorrupted: boolean;
    } | undefined;
    clear(): void;
}
export declare const globalCognitiveResilienceRuntime: CognitiveResilienceRuntime;
