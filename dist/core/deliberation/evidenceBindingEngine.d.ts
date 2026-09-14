import { type EvidenceBinding, type EvidenceSourceType } from './deliberationTypes.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface EvidenceBindingOptions {
    readonly sanitizer?: DiagnosisSanitizer;
    readonly userStopProvider?: () => boolean;
}
export declare class EvidenceBindingEngine {
    private readonly sanitizer;
    private readonly userStopProvider;
    constructor(options?: EvidenceBindingOptions);
    /**
     * Binds an evidence item from an allowed source into an immutable EvidenceBinding.
     *
     * Invariant: RETRIEVED_CONTEXT != VERIFIED_FACT.
     * Semantic memory references are strictly advisory and marked isEmpiricallyVerified: false.
     */
    bindEvidence(input: {
        readonly tenantId: string;
        readonly sessionId?: string;
        readonly sourceType: EvidenceSourceType;
        readonly sourceReferenceId: string;
        readonly statement: string;
        readonly confidence?: number;
        readonly isEmpiricallyVerified?: boolean;
        readonly metadata?: Readonly<Record<string, unknown>>;
    }, activeTenantId?: string): EvidenceBinding;
    private sanitizeText;
}
export declare const globalEvidenceBindingEngine: EvidenceBindingEngine;
