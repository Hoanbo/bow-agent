import { OwnerBriefing } from './personalOsTypes';
import { PersonalOperatingModel } from '../partnership/partnershipTypes';
import { PersonalMemoryStore } from '../partnership/personalMemoryStore';
import { PersonalKnowledgeGraph } from '../partnership/personalKnowledgeGraph';
import { ContradictionEngine } from '../partnership/contradictionEngine';
import { ProactiveRecommendationEngine } from './proactiveRecommendationEngine';
export interface BriefingCompilationContext {
    operatingModel?: PersonalOperatingModel;
    memoryStore?: PersonalMemoryStore;
    knowledgeGraph?: PersonalKnowledgeGraph;
    contradictionEngine?: ContradictionEngine;
    recommendationEngine?: ProactiveRecommendationEngine;
    ownerId?: string;
    activeBlockers?: string[];
    pendingDecisions?: string[];
}
export declare class OwnerBriefingEngine {
    /**
     * Helper to create an EpistemicItem.
     */
    private createEpistemicItem;
    /**
     * Compile a complete Owner Briefing answering the 10 core questions.
     */
    compileBriefing(context: BriefingCompilationContext): OwnerBriefing;
    /**
     * Format the briefing into a structured markdown report for the Master Owner.
     */
    formatBriefingText(briefing: OwnerBriefing): string;
}
