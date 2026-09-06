import type { SemanticEntity } from './entityTypes.js';
import type { ClarificationRequirement } from './clarification.js';
export type IntentType = 'INFORMATION_REQUEST' | 'EXPLANATION_REQUEST' | 'SEARCH_REQUEST' | 'CREATE_REQUEST' | 'UPDATE_REQUEST' | 'DELETE_REQUEST' | 'EXECUTE_REQUEST' | 'CANCEL_REQUEST' | 'APPROVE_REQUEST' | 'REVOKE_REQUEST' | 'STATUS_REQUEST' | 'COMPARISON_REQUEST' | 'CONFIGURATION_REQUEST' | 'UNKNOWN';
export type Actionability = 'INFORMATIONAL' | 'ACTIONABLE';
export type IntentConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export interface SemanticReference {
    phrase: string;
    resolved: boolean;
    targetText?: string;
    targetTurnId?: string;
    confidence: number;
}
export interface CandidateAction {
    intentType: IntentType;
    actionability: Actionability;
    entityType?: string;
    parameters: Readonly<Record<string, string | number | boolean>>;
}
export interface SemanticIntent {
    intentType: IntentType;
    confidence: number;
    confidenceLevel: IntentConfidence;
    entities: readonly SemanticEntity[];
    parameters: Readonly<Record<string, string | number | boolean>>;
    references: readonly SemanticReference[];
    missingParameters: readonly string[];
    ambiguities: readonly string[];
    clarification: readonly ClarificationRequirement[];
    requiresClarification: boolean;
    actionability: Actionability;
    sourceText: string;
    normalizedText: string;
    candidateAction?: CandidateAction;
}
export interface IntentInterpretationInput {
    userId: string;
    sessionId: string;
    userText: unknown;
    context?: {
        recentTurns?: readonly {
            id: string;
            sender: string;
            content: string;
        }[];
    };
    workingMemory?: readonly {
        id: string;
        sender: string;
        content: string;
    }[];
}
