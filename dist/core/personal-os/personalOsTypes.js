// src/core/personal-os/personalOsTypes.ts
// BOWCON V4.0 — MS-1.3.40: MASTER OWNER PERSONAL OPERATING SYSTEM & PROACTIVE COGNITIVE AGENCY RUNTIME
//
// Authoritative contracts, types, and schemas for Master Owner Personal OS & Proactive Agency.
//
// Invariants:
// MASTER_OWNER_AUTHORITY > BOWCON_INTELLIGENCE > BOWCON_AUTONOMY
// BOWCON_OPINION != AUTHORITY
// BOWCON_CONFIDENCE != AUTHORITY
// BOWCON_INTELLIGENCE != AUTHORITY
// BOWCON_REASONING != AUTHORITY
// BOWCON_AUTONOMY != OWNERSHIP
// CHALLENGE != AUTHORITY
// RECOMMENDATION != EXECUTION
// LEARNING != AUTHORIZATION
// PREDICTION != FACT
// INFERENCE != MEMORY
// MEMORY != TRUTH
// OWNER_DECISION > BOWCON_RECOMMENDATION
// OWNER_OVERRIDE != BOWCON_FAILURE
// USER_STOP > EVERYTHING_AUTONOMOUS
// PROTECTED_WORKSPACE: C:\BOW\shopofbow -> READS=0, WRITES=0, IMPORTS=0, TOUCHES=0
import { randomBytes } from 'node:crypto';
import { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, assertMasterOwner, } from '../partnership/partnershipTypes';
export { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, assertMasterOwner, };
export const PROACTIVE_ACTION_CLASSES = Object.freeze([
    'CLASS_A_INFORMATIONAL',
    'CLASS_B_REVERSIBLE_INTERNAL',
    'CLASS_C_OWNER_DECISION',
    'CLASS_D_EXTERNAL_HIGH_RISK',
]);
export const ACTION_CLASS_POLICIES = Object.freeze({
    CLASS_A_INFORMATIONAL: {
        autoExecutable: true,
        requiresGovernance: false,
        requiresOwnerApproval: false,
        requiresToken: false,
        description: 'Telemetry, state inspection, metrics, summaries, memory retrieval, contradiction detection.',
    },
    CLASS_B_REVERSIBLE_INTERNAL: {
        autoExecutable: true,
        requiresGovernance: true,
        requiresOwnerApproval: false,
        requiresToken: false,
        description: 'Reorganize internal task metadata, derived context refresh, priority recomputation, plan proposals, cache rebuilds.',
    },
    CLASS_C_OWNER_DECISION: {
        autoExecutable: false,
        requiresGovernance: true,
        requiresOwnerApproval: true,
        requiresToken: false,
        description: 'Changing strategic priorities, abandoning goals, selecting strategy alternatives, changing constraints.',
    },
    CLASS_D_EXTERNAL_HIGH_RISK: {
        autoExecutable: false,
        requiresGovernance: true,
        requiresOwnerApproval: true,
        requiresToken: true,
        description: 'External host interactions, destructive operations, system changes requiring HumanGate / WorldActionAuthorization.',
    },
});
// ---------------------------------------------------------------------------
// 11. ID Generators
// ---------------------------------------------------------------------------
export function generatePersonalOsId(prefix) {
    const ts = Date.now();
    const rand = randomBytes(4).toString('hex');
    return `${prefix}_${ts}_${rand}`;
}
