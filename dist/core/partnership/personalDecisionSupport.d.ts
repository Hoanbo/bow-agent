import { MasterOwnerCommand, MasterOwnerCommandType, OwnerOverrideRecord, CognitiveChallenge } from './partnershipTypes';
import { CognitiveChallengeEngine } from './cognitiveChallengeEngine';
export interface DecisionResponse {
    readonly commandId: string;
    readonly type: MasterOwnerCommandType;
    readonly status: 'SUCCESS' | 'CHALLENGE_RAISED' | 'OVERRIDDEN' | 'SAFETY_BLOCKED' | 'STOPPED' | 'PAUSED' | 'RESUMED';
    readonly message: string;
    readonly challenge?: CognitiveChallenge;
    readonly overrideRecord?: OwnerOverrideRecord;
    readonly data?: any;
}
export declare class PersonalDecisionSupport {
    private readonly challengeEngine;
    private readonly overrideRecords;
    private isPaused;
    constructor(challengeEngine: CognitiveChallengeEngine);
    /**
     * Process a first-class Master Owner command.
     */
    handleCommand(command: MasterOwnerCommand): DecisionResponse;
    /**
     * Record an Owner override event.
     */
    recordOverride(params: Omit<OwnerOverrideRecord, 'overrideId' | 'timestamp'>): OwnerOverrideRecord;
    /**
     * Retrieve all recorded owner overrides.
     */
    getAllOverrides(): OwnerOverrideRecord[];
    /**
     * Check paused status.
     */
    getIsPaused(): boolean;
    /**
     * Clear all overrides (for testing).
     */
    clear(): void;
}
