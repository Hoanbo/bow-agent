// src/core/partnership/partnershipTypes.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Authoritative contracts, types, and schemas for the Master Owner Cognitive Partnership.
//
// Invariants:
// MASTER_OWNER_AUTHORITY > BOWCON_REASONING > BOWCON_AUTONOMY
// BOWCON_OPINION != AUTHORITY
// BOWCON_CONFIDENCE != AUTHORITY
// BOWCON_INTELLIGENCE != AUTHORITY
// BOWCON_REASONING != AUTHORITY
// BOWCON_AUTONOMY != OWNERSHIP
// INFERENCE != CONFIRMED MEMORY
// CHALLENGE != AUTHORITY
// RECOMMENDATION != EXECUTION
// LEARNING != AUTHORIZATION
// OWNER OVERRIDE != BOWCON FAILURE
// PROTECTED_WORKSPACE: C:\BOW\shopofbow -> READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
import { createHash, randomBytes } from 'node:crypto';
// ---------------------------------------------------------------------------
// 1. Master Owner Identity & Authorities
// ---------------------------------------------------------------------------
export const MASTER_OWNER_ID = 'master_operator';
export const AUTHORIZED_MASTER_OWNER_ALIASES = Object.freeze([
    'master_operator',
    'user_primary',
    'operator',
    'boss_user',
]);
export function isMasterOwner(ownerId) {
    if (!ownerId || typeof ownerId !== 'string')
        return false;
    return AUTHORIZED_MASTER_OWNER_ALIASES.includes(ownerId.trim().toLowerCase());
}
export function assertMasterOwner(ownerId, actionDescription = 'Operation') {
    if (!isMasterOwner(ownerId)) {
        throw new Error(`[AUTHORITY_DENIED] ${actionDescription} requires Master Owner authority. Provided: '${ownerId}'`);
    }
}
export const EPISTEMIC_CATEGORIES = Object.freeze([
    'FACT',
    'OBSERVATION',
    'INFERENCE',
    'ASSUMPTION',
    'HYPOTHESIS',
    'RECOMMENDATION',
    'UNCERTAINTY',
    'OWNER_DECISION',
]);
export const MEMORY_PROVENANCE_PRECEDENCE = Object.freeze({
    OWNER_EXPLICIT: 5,
    EXECUTION_VERIFIED: 4,
    SYSTEM_OBSERVED: 3,
    DERIVED: 2,
    INFERRED: 1,
    IMPORTED: 0,
});
export function compareProvenance(a, b) {
    return (MEMORY_PROVENANCE_PRECEDENCE[b] ?? 0) - (MEMORY_PROVENANCE_PRECEDENCE[a] ?? 0);
}
export function computeMemoryChecksum(item) {
    const payload = `${item.memoryId}:${item.ownerId}:${item.category}:${item.content}:${item.provenance}:${item.createdAt}`;
    return createHash('sha256').update(payload).digest('hex');
}
// ---------------------------------------------------------------------------
// 13. Unique ID Generators
// ---------------------------------------------------------------------------
export function generatePartnershipId(prefix) {
    const timestamp = Date.now();
    const rand = randomBytes(4).toString('hex');
    return `${prefix}_${timestamp}_${rand}`;
}
