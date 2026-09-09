import type { InformationGap, GapCategory, BowconSelfModel } from './worldModelTypes.js';
export declare class InformationGapEngine {
    private readonly _gaps;
    registerGap(category: GapCategory, description: string, impact: string, resolutionRequirement: string, options?: {
        isUnknownNotFalse?: boolean;
        isNotAvailableNotUnauthorized?: boolean;
    }): InformationGap;
    /**
     * Evaluates self-model to discover implicit knowledge gaps.
     */
    detectGapsFromSelfModel(selfModel: BowconSelfModel): InformationGap[];
    /**
     * Assesses information gaps for a proposed task or plan.
     */
    detectGapsForPlan(planId: string, requiredCapabilities: string[], availableCapabilities: string[], authorizedCapabilities: string[]): InformationGap[];
    resolveGap(gapId: string): boolean;
    getActiveGaps(): InformationGap[];
    getAllGaps(): InformationGap[];
    formatGapReport(): string;
    reset(): void;
    private _hasActiveGapFor;
}
export declare const globalInformationGapEngine: InformationGapEngine;
