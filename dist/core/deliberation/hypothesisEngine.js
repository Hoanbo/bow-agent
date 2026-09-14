// src/core/deliberation/hypothesisEngine.ts
// BOWCON V4.0 — MS-1.5.05: HYPOTHESIS ENGINE
// Component 1021 — REAL
//
// Invariants:
// HYPOTHESIS != FACT
// HYPOTHESIS != EVIDENCE
// USER_STOP > ALL_MUTATION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// COGNITION != AUTHORITY
import { DeliberationUserStopError, DeliberationTransitionError, CrossTenantDeliberationError, computeDeterministicHypothesisId, computeHypothesisHash, } from './deliberationTypes.js';
import { DeliberationValidator } from './deliberationValidator.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { CloudEscalationSanitizer } from '../cognitive/cloudEscalationSanitizer.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export const LEGAL_HYPOTHESIS_TRANSITIONS = Object.freeze({
    PROPOSED: Object.freeze(['VALIDATING', 'CONTRADICTED', 'REFUTED']),
    VALIDATING: Object.freeze(['SUPPORTED', 'REFUTED', 'CONTRADICTED', 'INCONCLUSIVE', 'SUPERSEDED']),
    SUPPORTED: Object.freeze(['CONTRADICTED', 'REFUTED', 'SUPERSEDED']),
    REFUTED: Object.freeze([]), // Terminal
    CONTRADICTED: Object.freeze([]), // Terminal
    INCONCLUSIVE: Object.freeze(['VALIDATING', 'REFUTED']),
    SUPERSEDED: Object.freeze([]), // Terminal
});
export class HypothesisEngine {
    sanitizer;
    userStopProvider;
    constructor(options) {
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
        this.userStopProvider =
            options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    }
    /**
     * Generates a strongly typed DeliberationHypothesis from an untrusted proposal.
     */
    createHypothesis(proposal, sessionId, activeTenantId, customCreatedAt) {
        // 1. Synchronous USER_STOP check
        if (this.userStopProvider()) {
            throw new DeliberationUserStopError('hypothesis_creation');
        }
        // 2. Tenant isolation check
        if (activeTenantId && proposal.tenantId !== activeTenantId) {
            throw new CrossTenantDeliberationError(proposal.tenantId, activeTenantId);
        }
        // 3. Fails-closed schema & boundary validation
        DeliberationValidator.validateProposal(proposal);
        // 4. Sanitize text
        const sanitizedTitle = this.sanitizeText(proposal.title);
        const sanitizedPremise = this.sanitizeText(proposal.premise);
        const sanitizedOutcome = this.sanitizeText(proposal.predictedOutcome || '');
        const createdAt = customCreatedAt || new Date().toISOString();
        const hypothesisId = computeDeterministicHypothesisId(proposal.tenantId, sessionId, sanitizedTitle, createdAt);
        const plausibilityScore = Math.max(0.0, Math.min(1.0, proposal.plausibilityScore ?? 0.5));
        const draft = {
            hypothesisId,
            sessionId,
            tenantId: proposal.tenantId.trim(),
            title: sanitizedTitle,
            premise: sanitizedPremise,
            predictedOutcome: sanitizedOutcome,
            status: 'PROPOSED',
            statusReason: undefined,
            supportingEvidenceIds: Object.freeze([...(proposal.supportingEvidenceIds ?? [])]),
            refutingEvidenceIds: Object.freeze([...(proposal.refutingEvidenceIds ?? [])]),
            satisfiedConstraintIds: Object.freeze([]),
            violatedConstraintIds: Object.freeze([]),
            plausibilityScore,
            validityScore: 0.0,
            combinedConfidence: Math.round(plausibilityScore * 0.40 * 10000) / 10000,
            version: 1,
            createdAt,
            updatedAt: createdAt,
        };
        const provenanceHash = computeHypothesisHash(draft);
        const finalHypo = Object.freeze({
            ...draft,
            provenanceHash,
        });
        DeliberationValidator.validateHypothesis(finalHypo);
        return finalHypo;
    }
    /**
     * Transitions a hypothesis to a new lifecycle status with provenance chaining.
     */
    transitionHypothesis(hypo, nextStatus, options) {
        if (this.userStopProvider()) {
            throw new DeliberationUserStopError('hypothesis_transition');
        }
        const legalNext = LEGAL_HYPOTHESIS_TRANSITIONS[hypo.status] || [];
        if (!legalNext.includes(nextStatus)) {
            throw new DeliberationTransitionError(hypo.status, nextStatus, options?.statusReason);
        }
        const updatedAt = new Date().toISOString();
        const version = hypo.version + 1;
        const draft = {
            hypothesisId: hypo.hypothesisId,
            sessionId: hypo.sessionId,
            tenantId: hypo.tenantId,
            title: hypo.title,
            premise: hypo.premise,
            predictedOutcome: hypo.predictedOutcome,
            status: nextStatus,
            statusReason: options?.statusReason ?? hypo.statusReason,
            supportingEvidenceIds: Object.freeze([...(options?.supportingEvidenceIds ?? hypo.supportingEvidenceIds)]),
            refutingEvidenceIds: Object.freeze([...(options?.refutingEvidenceIds ?? hypo.refutingEvidenceIds)]),
            satisfiedConstraintIds: Object.freeze([...(options?.satisfiedConstraintIds ?? hypo.satisfiedConstraintIds)]),
            violatedConstraintIds: Object.freeze([...(options?.violatedConstraintIds ?? hypo.violatedConstraintIds)]),
            plausibilityScore: hypo.plausibilityScore,
            validityScore: options?.validityScore !== undefined ? options.validityScore : hypo.validityScore,
            combinedConfidence: options?.combinedConfidence !== undefined ? options.combinedConfidence : hypo.combinedConfidence,
            version,
            createdAt: hypo.createdAt,
            updatedAt,
        };
        const provenanceHash = computeHypothesisHash(draft, hypo.provenanceHash);
        const updatedHypo = Object.freeze({
            ...draft,
            provenanceHash,
        });
        DeliberationValidator.validateHypothesis(updatedHypo);
        return updatedHypo;
    }
    sanitizeText(raw) {
        const s1 = this.sanitizer.sanitizeString(raw || '');
        const s2 = CloudEscalationSanitizer.sanitizeString(s1).sanitized;
        return s2
            .replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]')
            .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]')
            .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_GOOGLE_KEY]')
            .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
            .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[REDACTED_ANTHROPIC_KEY]')
            .replace(/ghp_[A-Za-z0-9]{30,}/g, '[REDACTED_GITHUB_TOKEN]')
            .replace(/(?:password|passwd|pwd)\s*=\s*[^\s,;]+/gi, '[REDACTED_PASSWORD]')
            .replace(/(?:api_key|apikey)\s*=\s*[^\s,;]+/gi, '[REDACTED_API_KEY]')
            .replace(/[A-Za-z]:\\\\BOW\\\\shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
            .replace(/[A-Za-z]:[\\/]BOW[\\/]shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
            .replace(/shopofbow/gi, '[REDACTED_PROTECTED_WORKSPACE]')
            .trim();
    }
}
export const globalHypothesisEngine = new HypothesisEngine();
