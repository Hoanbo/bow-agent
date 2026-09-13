// src/core/planning/planStepBuilder.ts
// BOWCON V4.0 — MS-1.4.04: CANDIDATE PLAN STEP BUILDER
//
// Invariants:
// LLM_OUTPUT != AUTHORITY
// LLM_PROPOSAL != EXECUTION
// CONFIDENCE != AUTHORIZATION
// PLAN != EXECUTION
// PLANNER != TOOL_EXECUTOR
// COGNITION != AUTHORIZATION
//
// Converts untrusted cognitive output into inert, non-executable candidate step data structures.
import { PLANNER_LIMITS, PlanBudgetExceededError, } from './governedPlanningTypes.js';
const VALID_ACTION_TYPES = new Set([
    'RESPOND',
    'ASK_CLARIFICATION',
    'RETRIEVE_CONTEXT',
    'RETRIEVE_MEMORY',
    'PREPARE_ACTION',
    'REQUEST_APPROVAL',
    'EXECUTE_TOOL',
    'DEFER',
    'REJECT',
]);
const VALID_RISK_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
/**
 * Normalizes an arbitrary string action from cognitive output into a canonical PlanActionType.
 * Never executes anything.
 */
function normalizeActionType(action) {
    if (!action || typeof action !== 'string') {
        return 'PREPARE_ACTION';
    }
    const upper = action.trim().toUpperCase();
    if (VALID_ACTION_TYPES.has(upper)) {
        return upper;
    }
    // Heuristic mapping for typical cognitive action verbs
    if (upper.includes('QUERY') || upper.includes('SEARCH') || upper.includes('RETRIEVE') || upper.includes('GET') || upper.includes('READ')) {
        return 'RETRIEVE_CONTEXT';
    }
    if (upper.includes('ASK') || upper.includes('CLARIF')) {
        return 'ASK_CLARIFICATION';
    }
    if (upper.includes('MEMORY') || upper.includes('RECALL')) {
        return 'RETRIEVE_MEMORY';
    }
    if (upper.includes('APPROV')) {
        return 'REQUEST_APPROVAL';
    }
    if (upper.includes('REJECT') || upper.includes('DENY')) {
        return 'REJECT';
    }
    if (upper.includes('TOOL') || upper.includes('INVOKE') || upper.includes('CALL')) {
        // EN: EXECUTE_TOOL is a candidate marker for future governed evaluation, NOT tool execution.
        // VI: EXECUTE_TOOL là cờ ứng viên cho đánh giá có kiểm soát trong tương lai, KHÔNG PHẢI thực thi tool.
        return 'EXECUTE_TOOL';
    }
    if (upper.includes('REPLY') || upper.includes('RESPOND') || upper.includes('MESSAGE')) {
        return 'RESPOND';
    }
    return 'PREPARE_ACTION';
}
/**
 * Normalizes risk level into PlanRiskLevel.
 */
function normalizeRiskLevel(risk) {
    if (!risk || typeof risk !== 'string') {
        return 'LOW';
    }
    const upper = risk.trim().toUpperCase();
    if (VALID_RISK_LEVELS.has(upper)) {
        return upper;
    }
    return 'LOW';
}
/**
 * Ensures parameters are inert JSON serializable data with no functions or prototype pollution.
 */
function sanitizeInertParameters(rawParams, maxBytes) {
    if (!rawParams || typeof rawParams !== 'object' || Array.isArray(rawParams)) {
        return Object.freeze({});
    }
    let serialized;
    try {
        // JSON round-trip removes functions, undefined values, and prototypes
        serialized = JSON.stringify(rawParams, (key, value) => {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                return undefined;
            }
            if (typeof value === 'function' || typeof value === 'symbol') {
                return undefined;
            }
            return value;
        });
    }
    catch {
        return Object.freeze({});
    }
    if (Buffer.byteLength(serialized, 'utf8') > maxBytes) {
        throw new PlanBudgetExceededError(`Candidate step parameters exceeded maximum allowed byte limit (${maxBytes} bytes)`);
    }
    const parsed = JSON.parse(serialized);
    return Object.freeze(parsed);
}
/**
 * Sanitizes single-line description/intent text.
 */
function sanitizeText(text, maxLength, fallback) {
    if (typeof text !== 'string' || !text.trim()) {
        return fallback;
    }
    return text.trim().slice(0, maxLength);
}
export class PlanStepBuilder {
    /**
     * Constructs an ordered array of inert candidate steps from untrusted cognitive results.
     */
    static buildSteps(cognitiveResult, config) {
        const maxSteps = config?.maxSteps ?? PLANNER_LIMITS.MAX_STEPS;
        const maxParamBytes = config?.maxParameterBytes ?? PLANNER_LIMITS.MAX_PARAMETER_BYTES;
        const enforceStrictApproval = config?.enforceStrictApprovalOnHighRisk !== false;
        const rawSteps = cognitiveResult?.plan?.steps;
        const toolCandidates = cognitiveResult?.toolCandidates;
        const candidateSteps = [];
        if (Array.isArray(rawSteps) && rawSteps.length > 0) {
            if (rawSteps.length > maxSteps) {
                throw new PlanBudgetExceededError(`Cognitive plan step count (${rawSteps.length}) exceeds maximum allowable limit (${maxSteps})`);
            }
            for (let i = 0; i < rawSteps.length; i++) {
                const rawStep = rawSteps[i];
                const seq = i + 1;
                const padSeq = String(seq).padStart(2, '0');
                const stepId = `step-${padSeq}`;
                const actionType = normalizeActionType(rawStep.action);
                const intent = sanitizeText(rawStep.action, PLANNER_LIMITS.MAX_INTENT_LENGTH, `Step ${seq}`);
                const target = rawStep.target ? sanitizeText(rawStep.target, PLANNER_LIMITS.MAX_TARGET_LENGTH, '') : undefined;
                const parameters = sanitizeInertParameters(rawStep.parameters, maxParamBytes);
                // Derive risk level from cognitive plan or step
                const stepRisk = normalizeRiskLevel(cognitiveResult.riskLevel);
                const isHighOrCritical = stepRisk === 'HIGH' || stepRisk === 'CRITICAL';
                const requiresApproval = (enforceStrictApproval && isHighOrCritical) ||
                    cognitiveResult.requiresApproval === true ||
                    cognitiveResult.decision?.requiresApproval === true;
                candidateSteps.push(Object.freeze({
                    stepId,
                    sequence: seq,
                    actionType,
                    intent,
                    target,
                    parameters,
                    dependencies: [], // Dependencies resolved deterministically in PlanDependencyResolver
                    expectedOutcome: sanitizeText(rawStep.validationCriteria, 512, 'Candidate step completion'),
                    riskLevel: stepRisk,
                    requiresApproval,
                    capabilityId: rawStep.requiredCapability,
                    status: 'CANDIDATE',
                }));
            }
        }
        else if (Array.isArray(toolCandidates) && toolCandidates.length > 0) {
            // If cognitive result formulated tool candidates instead of multi-step plan
            if (toolCandidates.length > maxSteps) {
                throw new PlanBudgetExceededError(`Cognitive tool candidate count (${toolCandidates.length}) exceeds maximum allowable limit (${maxSteps})`);
            }
            for (let i = 0; i < toolCandidates.length; i++) {
                const tc = toolCandidates[i];
                const seq = i + 1;
                const padSeq = String(seq).padStart(2, '0');
                const stepId = `step-${padSeq}`;
                const actionType = 'EXECUTE_TOOL';
                const intent = sanitizeText(`Candidate tool evaluation: ${tc.toolName}`, PLANNER_LIMITS.MAX_INTENT_LENGTH, `Tool Step ${seq}`);
                const target = sanitizeText(tc.toolName, PLANNER_LIMITS.MAX_TARGET_LENGTH, '');
                const parameters = sanitizeInertParameters(tc.toolArgs, maxParamBytes);
                const stepRisk = normalizeRiskLevel(cognitiveResult.riskLevel);
                const isHighOrCritical = stepRisk === 'HIGH' || stepRisk === 'CRITICAL';
                const requiresApproval = (enforceStrictApproval && isHighOrCritical) ||
                    cognitiveResult.requiresApproval === true ||
                    cognitiveResult.decision?.requiresApproval === true;
                candidateSteps.push(Object.freeze({
                    stepId,
                    sequence: seq,
                    actionType,
                    intent,
                    target,
                    parameters,
                    dependencies: [],
                    expectedOutcome: `Evaluation outcome for ${tc.toolName}`,
                    riskLevel: stepRisk,
                    requiresApproval,
                    capabilityId: tc.capability,
                    status: 'CANDIDATE',
                }));
            }
        }
        else {
            // Default single inert candidate response step if plan is empty
            const stepRisk = normalizeRiskLevel(cognitiveResult?.riskLevel);
            const isHighOrCritical = stepRisk === 'HIGH' || stepRisk === 'CRITICAL';
            const requiresApproval = (enforceStrictApproval && isHighOrCritical) ||
                cognitiveResult?.requiresApproval === true ||
                cognitiveResult?.decision?.requiresApproval === true;
            candidateSteps.push(Object.freeze({
                stepId: 'step-01',
                sequence: 1,
                actionType: 'RESPOND',
                intent: sanitizeText(cognitiveResult?.interpretation ?? cognitiveResult?.reasoningSummary ?? 'Candidate response formulation', PLANNER_LIMITS.MAX_INTENT_LENGTH, 'Formulate candidate response'),
                parameters: Object.freeze({}),
                dependencies: [],
                expectedOutcome: 'Response formulation completed',
                riskLevel: stepRisk,
                requiresApproval,
                status: 'CANDIDATE',
            }));
        }
        return Object.freeze(candidateSteps);
    }
}
