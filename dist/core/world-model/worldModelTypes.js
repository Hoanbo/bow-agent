// src/core/world-model/worldModelTypes.ts
// BOWCON V4.0 — MS-1.3.42: MASTER OWNER WORLD MODEL, SELF-AWARENESS & CAPABILITY-GROUNDED REASONING RUNTIME
//
// Canonical data contracts, type envelopes, epistemic provenance definitions,
// and invariants for the Master Owner World Model and Self-Awareness Subsystem.
//
// INVARIANTS:
// MASTER_OWNER_AUTHORITY > BOW > BOWCON > OPTIONAL_PROJECT_INTEGRATIONS
// OWNER_DECISION > BOWCON_RECOMMENDATION
// BOWCON_OPINION != AUTHORITY
// BOWCON_CONFIDENCE != AUTHORITY
// BOWCON_INTELLIGENCE != AUTHORITY
// BOWCON_AUTONOMY != OWNERSHIP
// CHALLENGE != AUTHORITY
// RECOMMENDATION != EXECUTION
// PREDICTION != FACT
// INFERENCE != FACT
// MEMORY != TRUTH
// VERIFICATION != AUTHORIZATION
// EXECUTION != VERIFICATION
// VERIFICATION != COMMIT
// USER_STOP > EVERYTHING_AUTONOMOUS
// C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
export const EPISTEMIC_EVIDENCE_HIERARCHY = {
    DIRECT_OBSERVATION: 10,
    HOST_TELEMETRY: 9,
    VERIFIED_EXECUTION: 8,
    VERIFIED_OUTCOME: 7,
    OWNER_CONFIRMED: 6,
    OWNER_STATED: 5,
    PERSISTED_MEMORY: 4,
    INFERENCE: 3,
    HYPOTHESIS: 2,
    ASSUMPTION: 1,
    UNKNOWN: 0,
    CONTRADICTED: -1,
};
/**
 * Validates whether an item with the given provenance is allowed to be treated as an authoritative fact.
 * Only verified direct observations, telemetry, execution outcomes, and owner confirmations qualify.
 */
export function isAuthoritativeFactProvenance(provenance) {
    return (provenance === 'DIRECT_OBSERVATION' ||
        provenance === 'HOST_TELEMETRY' ||
        provenance === 'VERIFIED_EXECUTION' ||
        provenance === 'VERIFIED_OUTCOME' ||
        provenance === 'OWNER_CONFIRMED');
}
/**
 * Asserts that promotion between epistemic categories adheres to strict epistemological discipline.
 * Silently upgrading inferences, assumptions, hypotheses, or memories to facts is strictly forbidden.
 */
export function assertValidEpistemicPromotion(from, to) {
    if (to === 'DIRECT_OBSERVATION' || to === 'HOST_TELEMETRY' || to === 'VERIFIED_EXECUTION' || to === 'VERIFIED_OUTCOME') {
        if (!isAuthoritativeFactProvenance(from)) {
            throw new Error(`EPISTEMIC_VIOLATION: Cannot elevate "${from}" to authoritative fact status "${to}" without direct empirical verification.`);
        }
    }
}
