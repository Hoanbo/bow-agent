import { PersonalMemoryItem, KnowledgeGraphNode } from './partnershipTypes';
import { PersonalKnowledgeGraph } from './personalKnowledgeGraph';
export interface ContextQuery {
    objective: string;
    projectId?: string;
    taskId?: string;
    tags?: string[];
    includeUnresolvedProblems?: boolean;
    includePreferences?: boolean;
    includeDecisions?: boolean;
    limit?: number;
    minScoreThreshold?: number;
}
export interface ScoredMemoryItem {
    item: PersonalMemoryItem;
    relevanceScore: number;
    matchReasons: string[];
    isUncertain: boolean;
}
export declare class ContextRelevanceEngine {
    private readonly defaultLimit;
    private readonly minScoreThreshold;
    constructor(options?: {
        defaultLimit?: number;
        minScoreThreshold?: number;
    });
    /**
     * Tokenize text into lower-case semantic tokens, stripping punctuation.
     */
    private tokenize;
    /**
     * Compute Jaccard / Overlap similarity between query tokens and target text/tags.
     */
    private computeTokenOverlap;
    /**
     * Filter and score personal memory items honestly.
     */
    selectRelevantContext(query: ContextQuery, candidates: PersonalMemoryItem[]): ScoredMemoryItem[];
    /**
     * Retrieve relevant nodes from the PersonalKnowledgeGraph.
     */
    selectFromKnowledgeGraph(query: ContextQuery, graph: PersonalKnowledgeGraph): KnowledgeGraphNode[];
}
