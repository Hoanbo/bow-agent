// src/core/cognitive/cognitiveTypes.ts
// BOWCON V4.0 — MS-1.3.32: REAL BOWCON COGNITIVE PROVIDER & LOCAL INTELLIGENCE RUNTIME
//
// Invariants:
// ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// HIGH_CONFIDENCE != EXECUTION_AUTHORITY
// COGNITIVE_PROVIDER != TOOL_REGISTRY
// FAILURE != BRAIN_DEATH
import { randomBytes } from 'node:crypto';
export const COGNITIVE_RUNTIME_VERSION = '4.0.0';
export function makeCognitiveRequestId() {
    const rand = randomBytes(8).toString('hex');
    return `cogreq_${rand}`;
}
export function makeCognitiveTraceId() {
    const rand = randomBytes(8).toString('hex');
    return `cogtrc_${rand}`;
}
export function makeCognitivePlanId() {
    const rand = randomBytes(6).toString('hex');
    return `cogpln_${rand}`;
}
