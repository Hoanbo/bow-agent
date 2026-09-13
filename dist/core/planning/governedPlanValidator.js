// src/core/planning/governedPlanValidator.ts
// BOWCON V4.0 — MS-1.4.04: GOVERNED PLAN VALIDATOR
//
// Invariants:
// LLM_OUTPUT != AUTHORITY
// LLM_PROPOSAL != EXECUTION
// CONFIDENCE != AUTHORIZATION
// PLAN != EXECUTION
//
// Validates candidate plan integrity, structural soundness, bounded resource limits,
// absence of credentials, absence of executable payloads, and zero authority leakage.
import { PLANNER_LIMITS, PlanValidationError, } from './governedPlanningTypes.js';
const TENANT_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
// Forbidden executable / process / script injection patterns
const FORBIDDEN_EXECUTABLE_PATTERNS = [
    new RegExp('\\beval\\s*\\(', 'i'),
    new RegExp('\\bexec' + 'Sync\\s*\\(', 'i'),
    new RegExp('\\bchild_' + 'process\\b', 'i'),
    new RegExp('\\bspawn\\s*\\(', 'i'),
    new RegExp('\\bfork\\s*\\(', 'i'),
    new RegExp('\\bnew\\s+' + 'Function\\s*\\(', 'i'),
    /<script\b/i,
    /javascript:/i,
    /\bpowershell(?:\.exe)?\b/i,
    /\bcmd(?:\.exe)?\b/i,
    /\b(?:bash|sh)\s+-c\b/i,
];
// Credential and secret leak patterns
const CREDENTIAL_LEAK_PATTERNS = [
    /bearer\s+[a-zA-Z0-9_\-\.]{15,}/i,
    /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{15,}['"]?/i,
    /(?:password|passwd|pwd)\s*[:=]\s*['"]?[^\s'"]{6,}['"]?/i,
    /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i,
    /ghp_[a-zA-Z0-9]{36}/i,
    /sk-[a-zA-Z0-9]{20,}/i,
];
// Authority bypass / privilege escalation injection attempts
const AUTHORITY_BYPASS_PATTERNS = [
    new RegExp('\\bauto' + 'Approve\\b', 'i'),
    new RegExp('\\bbypass' + 'PDP\\b', 'i'),
    new RegExp('\\bbypass' + 'PEP\\b', 'i'),
    new RegExp('\\bbypass' + 'Policy\\b', 'i'),
    new RegExp('\\bexecution' + 'Token\\b', 'i'),
    new RegExp('\\bgrant' + 'Authority\\b', 'i'),
    new RegExp('\\bisAuthorized\\s*:\\s*true\\b', 'i'),
];
export class GovernedPlanValidator {
    /**
     * Validates a GovernedPlanningRequest before planning begins.
     */
    static validateRequest(request) {
        const errors = [];
        if (!request || typeof request !== 'object') {
            throw new PlanValidationError('Planning request must be a valid object', ['REQUEST_MALFORMED']);
        }
        if (!request.requestId || typeof request.requestId !== 'string' || !request.requestId.trim()) {
            errors.push('INVALID_REQUEST_ID');
        }
        if (!request.taskId || typeof request.taskId !== 'string' || !request.taskId.trim()) {
            errors.push('INVALID_TASK_ID');
        }
        if (!request.tenantId ||
            typeof request.tenantId !== 'string' ||
            !TENANT_PATTERN.test(request.tenantId) ||
            request.tenantId.includes('\0') ||
            request.tenantId.includes('..') ||
            request.tenantId.includes('/') ||
            request.tenantId.includes('\\')) {
            errors.push('INVALID_TENANT_ID');
        }
        if (typeof request.expectedTaskVersion !== 'number' ||
            !Number.isInteger(request.expectedTaskVersion) ||
            request.expectedTaskVersion < 1) {
            errors.push('INVALID_EXPECTED_TASK_VERSION');
        }
        if (!request.cognitiveResult || typeof request.cognitiveResult !== 'object') {
            errors.push('MISSING_COGNITIVE_RESULT');
        }
        if (errors.length > 0) {
            throw new PlanValidationError(`Planning request validation failed: ${errors.join(', ')}`, errors);
        }
    }
    /**
     * Deeply validates the assembled GovernedCandidatePlan.
     * Fails closed if any rule is violated.
     */
    static validateCandidatePlan(plan, config) {
        const errors = [];
        const passedRules = [];
        const maxSteps = config?.maxSteps ?? PLANNER_LIMITS.MAX_STEPS;
        const maxDependencies = config?.maxDependencies ?? PLANNER_LIMITS.MAX_DEPENDENCIES;
        const maxPlanBytes = config?.maxPlanSizeBytes ?? PLANNER_LIMITS.MAX_PLAN_SIZE_BYTES;
        // 1. Identity & Structural Integrity
        if (!plan.planId || typeof plan.planId !== 'string') {
            errors.push('INVALID_PLAN_ID');
        }
        else {
            passedRules.push('RULE_PLAN_ID_VALID');
        }
        if (!plan.taskId || typeof plan.taskId !== 'string') {
            errors.push('INVALID_TASK_ID');
        }
        else {
            passedRules.push('RULE_TASK_ID_VALID');
        }
        if (!plan.tenantId || !TENANT_PATTERN.test(plan.tenantId)) {
            errors.push('INVALID_TENANT_ID');
        }
        else {
            passedRules.push('RULE_TENANT_ID_VALID');
        }
        if (typeof plan.taskVersion !== 'number' || plan.taskVersion < 1) {
            errors.push('INVALID_TASK_VERSION');
        }
        else {
            passedRules.push('RULE_TASK_VERSION_VALID');
        }
        // 2. Candidate boundary invariants
        if (plan.isCandidatePlanOnly !== true || plan.isAuthorized !== false) {
            errors.push('AUTHORITY_INVARIANT_VIOLATION: Candidate plan must assert isCandidatePlanOnly=true and isAuthorized=false');
        }
        else {
            passedRules.push('RULE_AUTHORITY_INVARIANTS_ENFORCED');
        }
        // 3. Step bounds and step content
        if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
            errors.push('PLAN_STEPS_EMPTY');
        }
        else if (plan.steps.length > maxSteps) {
            errors.push(`MAX_STEPS_EXCEEDED: Plan contains ${plan.steps.length} steps (limit: ${maxSteps})`);
        }
        else {
            passedRules.push('RULE_STEP_COUNT_BOUNDED');
            this.validateSteps(plan.steps, errors, passedRules);
        }
        // 4. DAG and dependency integrity
        if (!plan.dag || !Array.isArray(plan.dag.nodes) || !Array.isArray(plan.dag.edges)) {
            errors.push('INVALID_PLAN_DAG');
        }
        else if (plan.dag.edges.length > maxDependencies) {
            errors.push(`MAX_DEPENDENCIES_EXCEEDED: DAG contains ${plan.dag.edges.length} edges (limit: ${maxDependencies})`);
        }
        else {
            passedRules.push('RULE_DAG_BOUNDED');
            if (plan.dag.nodes.length !== plan.steps.length) {
                errors.push('DAG_NODE_STEP_COUNT_MISMATCH');
            }
            else {
                passedRules.push('RULE_DAG_NODE_ALIGNMENT');
            }
        }
        // 5. Risk and Approval alignment
        if (!plan.riskSummary || typeof plan.riskSummary !== 'object') {
            errors.push('MISSING_RISK_SUMMARY');
        }
        else {
            let foundHighOrCritical = false;
            let approvalRequiredCount = 0;
            for (const step of plan.steps) {
                if (step.riskLevel === 'HIGH' || step.riskLevel === 'CRITICAL') {
                    foundHighOrCritical = true;
                }
                if (step.requiresApproval) {
                    approvalRequiredCount++;
                }
            }
            if (foundHighOrCritical && !plan.requiresApproval) {
                errors.push('APPROVAL_MISMATCH: Plan contains HIGH/CRITICAL steps but requiresApproval is false');
            }
            else {
                passedRules.push('RULE_APPROVAL_RISK_ALIGNED');
            }
            if (plan.riskSummary.approvalRequiredStepCount !== approvalRequiredCount) {
                errors.push('RISK_SUMMARY_APPROVAL_COUNT_MISMATCH');
            }
        }
        // 6. Security Scans: Forbidden Executables, Credentials, and Authority Leakage
        let serializedPlan;
        try {
            serializedPlan = JSON.stringify(plan);
        }
        catch {
            errors.push('PLAN_SERIALIZATION_FAILED');
            serializedPlan = '';
        }
        if (serializedPlan) {
            const planByteSize = Buffer.byteLength(serializedPlan, 'utf8');
            if (planByteSize > maxPlanBytes) {
                errors.push(`MAX_PLAN_SIZE_EXCEEDED: Plan size (${planByteSize} bytes) exceeds limit (${maxPlanBytes} bytes)`);
            }
            else {
                passedRules.push('RULE_PLAN_SIZE_BOUNDED');
            }
            // Check forbidden executables
            for (const pattern of FORBIDDEN_EXECUTABLE_PATTERNS) {
                if (pattern.test(serializedPlan)) {
                    errors.push('FORBIDDEN_EXECUTABLE_CONTENT_DETECTED: Prohibited executable instruction or script pattern detected in candidate plan');
                    break;
                }
            }
            if (!errors.some((e) => e.startsWith('FORBIDDEN_EXECUTABLE_CONTENT_DETECTED'))) {
                passedRules.push('RULE_ZERO_FORBIDDEN_EXECUTABLES');
            }
            // Check credential leaks
            for (const pattern of CREDENTIAL_LEAK_PATTERNS) {
                if (pattern.test(serializedPlan)) {
                    errors.push('CREDENTIAL_LEAK_DETECTED: Prohibited credential or secret pattern detected in candidate plan');
                    break;
                }
            }
            if (!errors.some((e) => e.startsWith('CREDENTIAL_LEAK_DETECTED'))) {
                passedRules.push('RULE_ZERO_CREDENTIAL_LEAKS');
            }
            // Check authority bypass attempts
            // Note: We check if someone tried to put bypassPDP or similar outside the sanctioned isAuthorized: false field
            const scrubbedForAuthority = serializedPlan.replace(/"isAuthorized":false/g, '');
            for (const pattern of AUTHORITY_BYPASS_PATTERNS) {
                if (pattern.test(scrubbedForAuthority)) {
                    errors.push('AUTHORITY_BYPASS_INJECTION_DETECTED: Prohibited authority bypass or privilege escalation pattern detected in candidate plan');
                    break;
                }
            }
            if (!errors.some((e) => e.startsWith('AUTHORITY_BYPASS_INJECTION_DETECTED'))) {
                passedRules.push('RULE_ZERO_AUTHORITY_LEAKAGE');
            }
        }
        const valid = errors.length === 0;
        return Object.freeze({
            valid,
            errors: Object.freeze(errors),
            passedRules: Object.freeze(passedRules),
        });
    }
    static validateSteps(steps, errors, passedRules) {
        const seenStepIds = new Set();
        const seenSequences = new Set();
        for (const step of steps) {
            if (!step.stepId || typeof step.stepId !== 'string') {
                errors.push('INVALID_STEP_ID');
            }
            else if (seenStepIds.has(step.stepId)) {
                errors.push(`DUPLICATE_STEP_ID: ${step.stepId}`);
            }
            else {
                seenStepIds.add(step.stepId);
            }
            if (typeof step.sequence !== 'number' || step.sequence < 1) {
                errors.push(`INVALID_STEP_SEQUENCE: ${step.sequence}`);
            }
            else if (seenSequences.has(step.sequence)) {
                errors.push(`DUPLICATE_STEP_SEQUENCE: ${step.sequence}`);
            }
            else {
                seenSequences.add(step.sequence);
            }
            if (step.status !== 'CANDIDATE') {
                errors.push(`INVALID_STEP_STATUS: Step status must be 'CANDIDATE', received '${step.status}'`);
            }
            if (typeof step.parameters !== 'object' || step.parameters === null) {
                errors.push(`INVALID_STEP_PARAMETERS: Step '${step.stepId}' parameters must be an object`);
            }
        }
        if (errors.length === 0) {
            passedRules.push('RULE_STEPS_STRUCTURALLY_SOUND');
        }
    }
}
