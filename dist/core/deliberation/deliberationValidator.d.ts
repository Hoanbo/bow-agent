import { type HypothesisProposalInput, type DeliberationHypothesis, type EvidenceBinding, type SymbolicConstraint } from './deliberationTypes.js';
export declare class DeliberationValidator {
    /**
     * Validates an untrusted HypothesisProposalInput.
     * Fails closed on any schema, boundary, CoT, or security violation.
     */
    static validateProposal(proposal: unknown): asserts proposal is HypothesisProposalInput;
    /**
     * Validates a constructed DeliberationHypothesis.
     */
    static validateHypothesis(hypo: DeliberationHypothesis): void;
    /**
     * Validates an EvidenceBinding instance.
     */
    static validateEvidence(evidence: EvidenceBinding): void;
    /**
     * Validates a SymbolicConstraint.
     */
    static validateConstraint(constraint: SymbolicConstraint): void;
    /**
     * Validates a DeliberationSessionDocument.
     */
    static validateSession(session: unknown): void;
}
