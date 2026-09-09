// src/core/resilience/cognitiveResilienceTypes.ts
// BOWCON V4.0 — MS-1.3.43: MASTER OWNER COGNITIVE RESILIENCE, ADAPTIVE HOST ORCHESTRATION
//               & SELF-REFLECTIVE EPISODIC SYNTHESIS RUNTIME
//
// Canonical type contracts for:
//   - Failure classification
//   - Bounded recovery lifecycle
//   - Episodic memory schema
//   - Self-reflection schema
//   - Confidence calibration schema
//   - Temporal reconciliation
//
// INVARIANTS:
// MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// OWNER_DECISION       > BOWCON_RECOMMENDATION
// USER_STOP            > EVERYTHING_AUTONOMOUS
// SELF_REFLECTION      != AUTHORITY
// SELF_CORRECTION      != AUTHORIZATION
// LEARNING             != EXECUTION
// RECOMMENDATION       != AUTHORIZATION
// PREDICTION           != FACT
// INFERENCE            != FACT
// MEMORY               != TRUTH
// C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
import { randomBytes } from 'node:crypto';
// ---------------------------------------------------------------------------
// Identity Generator
// ---------------------------------------------------------------------------
export function generateResilienceId(prefix) {
    return `${prefix}_${Date.now()}_${randomBytes(3).toString('hex')}`;
}
