import { ProactiveRecommendation } from './personalOsTypes';
import { ContradictionRecord } from '../partnership/partnershipTypes';
export interface ProactiveScanContext {
    goals?: Array<{
        goalId: string;
        title: string;
        state?: string;
        isStalled?: boolean;
        hasBlocker?: boolean;
        blockers?: string[];
    }>;
    contradictions?: ContradictionRecord[];
    patterns?: Array<{
        patternType: string;
        observedPattern: string;
        evidenceCount: number;
    }>;
    resourceBottlenecks?: string[];
    ownerId?: string;
    sessionId?: string;
}
export declare class ProactiveRecommendationEngine {
    private readonly recommendations;
    /**
     * Create an explicit structured recommendation.
     */
    createRecommendation(params: Omit<ProactiveRecommendation, 'recommendationId' | 'createdAt' | 'status'>): ProactiveRecommendation;
    /**
     * Proactively scan context for opportunities, risks, and contradictions.
     */
    scanAndGenerateRecommendations(context: ProactiveScanContext): ProactiveRecommendation[];
    /**
     * Resolve a recommendation following Owner action or governance evaluation.
     */
    resolveRecommendation(recommendationId: string, status: 'ACCEPTED' | 'OVERRIDDEN' | 'DISCARDED'): ProactiveRecommendation;
    /**
     * Retrieve all pending proposed recommendations.
     */
    getPendingRecommendations(): ProactiveRecommendation[];
    /**
     * Retrieve all recommendations.
     */
    getAllRecommendations(): ProactiveRecommendation[];
    /**
     * Format recommendation into human-readable text.
     */
    formatRecommendationText(rec: ProactiveRecommendation): string;
    /**
     * Clear all records (for reset/testing).
     */
    clear(): void;
}
