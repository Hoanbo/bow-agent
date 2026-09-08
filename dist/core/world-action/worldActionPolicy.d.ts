import type { ActionRiskLevel, WorldAction } from './worldActionTypes.js';
import { type ActionClassification } from '../policyDecisionPoint.js';
export interface PolicyEvaluationResult {
    readonly allowed: boolean;
    readonly riskLevel: ActionRiskLevel;
    readonly requiresAuthorization: boolean;
    readonly requiresExplicitConfirmation: boolean;
    readonly reason: string;
    readonly classification: ActionClassification;
}
export declare class WorldActionPolicyEngine {
    private customRules;
    /**
     * Evaluates the policy and risk level for a proposed WorldAction.
     */
    evaluate(action: WorldAction): PolicyEvaluationResult;
    /**
     * Formal risk assessment based on actionType, target path, and parameters.
     */
    assessRisk(action: WorldAction): ActionRiskLevel;
    private mapRiskToPDP;
    registerRule(id: string, rule: (action: WorldAction) => PolicyEvaluationResult | null): void;
    removeRule(id: string): void;
}
export declare const globalWorldActionPolicy: WorldActionPolicyEngine;
