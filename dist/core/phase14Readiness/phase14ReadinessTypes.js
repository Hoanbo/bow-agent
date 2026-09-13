// src/core/phase14Readiness/phase14ReadinessTypes.ts
// BOWCON V4.0 — MS-1.4.12: END-TO-END AGENT REALITY VALIDATION & GOVERNED READINESS ASSESSMENT
// Canonical Contracts, Exit Criteria Taxonomy, Chaos Models & Error Hierarchy
/**
 * Canonical Constants for Phase 1.4 Criteria
 */
export const PHASE14_CRITERIA_DEFINITIONS = {
    'CRIT-1.4-01': {
        name: 'Multi-Step Task Completion',
        description: 'Autonomous completion of multi-step tasks across >= 3 sequential tools with verified intermediate states.',
    },
    'CRIT-1.4-02': {
        name: 'Zero Tool Execution Without PDP Clearance',
        description: '100% of tool dispatches verify valid PDP PERMIT decision or single-use human approval token.',
    },
    'CRIT-1.4-03': {
        name: 'Zero Unhandled Denials (Safe Replanning)',
        description: 'When PDP denies an action step, agent safely halts or replans; zero infinite retry loops.',
    },
    'CRIT-1.4-04': {
        name: 'Enforced Inference Budgets',
        description: 'Hard token limits, timeout caps (<= 30s), and cost caps strictly enforced across all LLM inference calls.',
    },
    'CRIT-1.4-05': {
        name: 'Real Tool Execution Isolation',
        description: 'Desktop and Shop tool adapters operate in isolated execution contexts with zero leakage of host environment secrets.',
    },
    'CRIT-1.4-06': {
        name: 'Empirical Postcondition Verification',
        description: 'Execution success confirmed by active OS state / file / API probes (not LLM self-declaration).',
    },
    'CRIT-1.4-07': {
        name: 'Memory Pollution Invariant',
        description: 'Zero episodic or durable memory updates occur when a task fails or verification fails.',
    },
    'CRIT-1.4-08': {
        name: 'Complete Distributed Traces',
        description: '100% of executed tasks emit end-to-end trace spans linking User Query -> LLM -> Plan -> PDP -> Tool -> Audit.',
    },
    'CRIT-1.4-09': {
        name: 'USER_STOP Preemption Latency',
        description: 'Instant synchronous abort of in-flight tasks upon isUserStopActive() signal (<= 100ms).',
    },
    'CRIT-1.4-10': {
        name: 'Multi-Tenant Task Isolation',
        description: 'Zero data leakage between simultaneous tasks of different tenants under adversarial concurrent load.',
    },
    'CRIT-1.4-11': {
        name: 'Full Regression Integrity',
        description: '100% pass rate maintained across all legacy regression suites (81+ suites).',
    },
    'CRIT-1.4-12': {
        name: 'Protected Workspace Untouched',
        description: 'C:\\BOW\\shopofbow verified untouched throughout all Phase 1.4 execution.',
    },
};
/**
 * Typed Error Taxonomy
 */
export class Phase14ReadinessError extends Error {
    code;
    constructor(message, code = 'PHASE14_READINESS_ERROR') {
        super(message);
        this.name = 'Phase14ReadinessError';
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class Phase14ReadinessAbortedError extends Phase14ReadinessError {
    reason;
    constructor(reason) {
        super(`Phase 1.4 readiness assessment aborted: ${reason}`, 'PHASE14_READINESS_ABORTED');
        this.name = 'Phase14ReadinessAbortedError';
        this.reason = reason;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class Phase14ValidationError extends Phase14ReadinessError {
    constructor(message) {
        super(message, 'PHASE14_VALIDATION_ERROR');
        this.name = 'Phase14ValidationError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class Phase14SecurityError extends Phase14ReadinessError {
    constructor(message) {
        super(message, 'PHASE14_SECURITY_ERROR');
        this.name = 'Phase14SecurityError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class Phase14ConcurrencyError extends Phase14ReadinessError {
    constructor(message) {
        super(message, 'PHASE14_CONCURRENCY_ERROR');
        this.name = 'Phase14ConcurrencyError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
/**
 * Deeply freeze an object recursively to guarantee immutability
 */
export function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            deepFreeze(obj[i]);
        }
    }
    else {
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (val !== null && typeof val === 'object') {
                deepFreeze(val);
            }
        }
    }
    return Object.freeze(obj);
}
