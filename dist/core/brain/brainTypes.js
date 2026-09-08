// src/core/brain/brainTypes.ts
// BOWCON V4.0 — MS-1.3.30: REAL BOWCON BRAIN RUNTIME FOUNDATION
//
// Canonical types, constants, and invariants for the Brain Runtime.
//
// INVARIANTS:
// BRAIN != LLM           — LLM is a cognitive component, not the brain itself
// BRAIN != SESSION        — Brain persists beyond individual sessions
// BRAIN != DEVICE         — Brain identity != device identity
// BRAIN != SURFACE        — Desktop/Mobile/Robot are surfaces, not brain
// TASK_ID != SESSION_ID   — Task IDs are independent from session IDs
// TASK_ID != BRAIN_ID     — Task IDs are independent from brain IDs
// EXECUTION != VERIFIED   — A successful tool call != verified result
// RECONNECT != RE-EXECUTE — Network reconnect never re-executes tasks
// LLM_PROPOSE != EXECUTE  — LLM proposals require deterministic approval
import { randomBytes } from 'node:crypto';
// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------
export const BRAIN_SUBSYSTEM_VERSION = '4.0.0';
export const BRAIN_ID_PREFIX = 'brain';
export const BRAIN_TASK_ID_PREFIX = 'task';
// ---------------------------------------------------------------------------
// Limits & Timeouts
// ---------------------------------------------------------------------------
export const BRAIN_MAX_ITERATIONS_PER_TASK = 10;
export const BRAIN_MAX_RECOVERY_DEPTH = 3;
export const BRAIN_MAX_RETRY_ATTEMPTS = 3;
export const BRAIN_TASK_DEFAULT_DEADLINE_MS = 60_000; // 60 seconds
export const BRAIN_IDLE_TIMEOUT_MS = 300_000; // 5 minutes
export const BRAIN_TOOL_EXECUTION_TIMEOUT_MS = 30_000;
export const BRAIN_LLM_TIMEOUT_MS = 30_000;
export function makeBrainId(seed) {
    const hash = randomBytes(8).toString('hex');
    return `${BRAIN_ID_PREFIX}_${seed.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${hash}`;
}
export function makeBrainTaskId() {
    const ts = Date.now().toString(36);
    const rand = randomBytes(6).toString('hex');
    return `${BRAIN_TASK_ID_PREFIX}_${ts}_${rand}`;
}
export const BRAIN_TASK_TERMINAL_STATUSES = Object.freeze([
    'COMPLETED', 'CANCELLED', 'FAILED',
]);
export const BRAIN_TASK_ACTIVE_STATUSES = Object.freeze([
    'UNDERSTANDING', 'REASONING', 'PLANNING', 'DECIDING',
    'ACTION_PREPARING', 'EXECUTING', 'OBSERVING', 'VERIFYING',
    'COMMITTING',
]);
export function isBrainTaskTerminal(status) {
    return BRAIN_TASK_TERMINAL_STATUSES.includes(status);
}
export function isBrainTaskActive(status) {
    return BRAIN_TASK_ACTIVE_STATUSES.includes(status);
}
export function appendBrainAuditEvent(ledger, event) {
    ledger.events.push({
        ...event,
        timestamp: event.timestamp ?? Date.now(),
    });
}
