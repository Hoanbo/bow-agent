import { CognitiveChallenge2 } from './personalOsTypes';
export interface Challenge2EvaluationContext {
    targetProposal: string;
    targetPath?: string;
    dependencies?: string[];
    missingDependencies?: string[];
    assumptions?: string[];
    historicalFailures?: string[];
    resourceEstimates?: {
        estimatedTimeSeconds?: number;
        estimatedMemoryMb?: number;
        highCost?: boolean;
    };
    isProtectedWorkspaceTarget?: boolean;
    isDestructive?: boolean;
    reliabilityConcerns?: string[];
    maintainabilityConcerns?: string[];
    scalabilityConcerns?: string[];
}
export declare class CognitiveChallenge2Engine {
    private readonly challenges;
    /**
     * Evaluate a proposal across 14 distinct dimensions.
     */
    evaluateProposal(context: Challenge2EvaluationContext): {
        hasConcern: boolean;
        isMandatorySafetyBlock: boolean;
        challenge?: CognitiveChallenge2;
    };
    /**
     * Format Cognitive Challenge 2.0 into structured text.
     */
    formatChallengeText(challenge: CognitiveChallenge2): string;
    /**
     * Resolve challenge following Master Owner decision.
     */
    resolveChallenge(challengeId: string, decision: 'CONFIRMED' | 'OVERRIDDEN' | 'ABANDONED'): CognitiveChallenge2;
    /**
     * Retrieve challenge by ID.
     */
    getChallenge(challengeId: string): CognitiveChallenge2 | undefined;
    /**
     * Clear challenges.
     */
    clear(): void;
}
