export type ClarificationReason = 'MISSING_PARAMETER' | 'AMBIGUOUS_ENTITY' | 'UNRESOLVED_REFERENCE' | 'CONFLICTING_PARAMETERS' | 'UNSUPPORTED_INTENT' | 'INSUFFICIENT_CONTEXT' | 'MALFORMED_INPUT';
export interface ClarificationRequirement {
    reason: ClarificationReason;
    parameter?: string;
    reference?: string;
    candidates?: string[];
}
