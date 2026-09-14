// src/core/cognitive/providerNeutralContracts.ts
// BOWCON V4.0 — MS-1.5.01: PROVIDER-NEUTRAL COGNITIVE CONTRACTS & PROPOSAL INTERFACES
// Component 981 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// LLM_OUTPUT != EXECUTABLE_COMMAND
// MODEL_CONFIDENCE != TRUTH
// PROPOSAL != AUTHORIZATION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// FAIL_CLOSED_ON_MALFORMED_OUTPUT == TRUE
// SANITIZED_CLOUD_ESCALATION == TRUE
import { randomBytes, createHash } from 'node:crypto';
export const PROVIDER_NEUTRAL_CONTRACT_VERSION = '1.5.01';
/**
 * Generates a deterministic SHA-256 hash for proposal provenance.
 */
export function computeProposalProvenanceHash(payload) {
    const serialized = `${payload.proposalId}:${payload.providerName}:${payload.modelName}:${payload.intent}:${payload.createdAt}`;
    return createHash('sha256').update(serialized).digest('hex');
}
/**
 * Generates a unique proposal identifier.
 */
export function makeProposalId() {
    return `cogprop_${randomBytes(8).toString('hex')}`;
}
