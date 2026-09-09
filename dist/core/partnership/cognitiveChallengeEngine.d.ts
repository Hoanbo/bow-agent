import { CognitiveChallenge, ContradictionRecord, PersonalMemoryItem } from './partnershipTypes';
export interface ChallengeEvaluationContext {
    proposedDecision: string;
    targetPath?: string;
    requiredCapabilities?: string[];
    availableCapabilities?: string[];
    knownContradictions?: ContradictionRecord[];
    relevantMemories?: PersonalMemoryItem[];
    isProtectedWorkspaceTarget?: boolean;
    isDestructiveAction?: boolean;
    hasHistoricalFailure?: boolean;
    historicalFailureNotes?: string;
    assumptions?: string[];
    missingEvidence?: string[];
    isReversible?: boolean;
}
export interface EvaluationResult {
    hasConcern: boolean;
    isMandatorySafetyBlock: boolean;
    challenge?: CognitiveChallenge;
    evaluatedDimensions: Record<string, {
        ok: boolean;
        note?: string;
    }>;
}
export declare class CognitiveChallengeEngine {
    private readonly challenges;
    /**
     * Evaluate a proposed decision across 14 dimensions.
     */
    evaluateProposal(context: ChallengeEvaluationContext): EvaluationResult;
    /**
     * Format challenge into the standardized Master Owner review format (Section 3).
     */
    formatChallengeText(challenge: CognitiveChallenge): string;
    /**
     * Update challenge status following Master Owner response.
     */
    resolveChallenge(challengeId: string, decision: 'CONFIRMED' | 'OVERRIDDEN' | 'ABANDONED'): CognitiveChallenge;
    /**
     * Query a challenge by ID.
     */
    getChallenge(challengeId: string): CognitiveChallenge | undefined;
    /**
     * Query all active (unresolved) challenges.
     */
    getActiveChallenges(): CognitiveChallenge[];
    /**
     * Clear all challenges (for reset/testing).
     */
    clear(): void;
}
