import { type HypothesisProposalInput, type DeliberationHypothesis, type HypothesisStatus } from './deliberationTypes.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export declare const LEGAL_HYPOTHESIS_TRANSITIONS: Readonly<Record<HypothesisStatus, readonly HypothesisStatus[]>>;
export interface HypothesisEngineOptions {
    readonly sanitizer?: DiagnosisSanitizer;
    readonly userStopProvider?: () => boolean;
}
export declare class HypothesisEngine {
    private readonly sanitizer;
    private readonly userStopProvider;
    constructor(options?: HypothesisEngineOptions);
    /**
     * Generates a strongly typed DeliberationHypothesis from an untrusted proposal.
     */
    createHypothesis(proposal: HypothesisProposalInput, sessionId: string, activeTenantId?: string, customCreatedAt?: string): DeliberationHypothesis;
    /**
     * Transitions a hypothesis to a new lifecycle status with provenance chaining.
     */
    transitionHypothesis(hypo: DeliberationHypothesis, nextStatus: HypothesisStatus, options?: {
        readonly statusReason?: string;
        readonly validityScore?: number;
        readonly combinedConfidence?: number;
        readonly supportingEvidenceIds?: readonly string[];
        readonly refutingEvidenceIds?: readonly string[];
        readonly satisfiedConstraintIds?: readonly string[];
        readonly violatedConstraintIds?: readonly string[];
    }): DeliberationHypothesis;
    private sanitizeText;
}
export declare const globalHypothesisEngine: HypothesisEngine;
