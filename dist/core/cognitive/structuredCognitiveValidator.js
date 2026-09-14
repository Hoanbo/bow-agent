// src/core/cognitive/structuredCognitiveValidator.ts
// BOWCON V4.0 — MS-1.5.01: STRUCTURED COGNITIVE OUTPUT VALIDATOR
// Component 983 — REAL
//
// Invariants:
// FAIL_CLOSED_ON_MALFORMED_OUTPUT == TRUE
// ZERO_SILENT_REPAIR == TRUE
// UNTRUSTED_MODEL_OUTPUT == TRUE
// PROPOSAL != EXECUTION_AUTHORITY
// DEFENSE_AGAINST_PROTOTYPE_POLLUTION == TRUE
import { computeProposalProvenanceHash, makeProposalId, } from './providerNeutralContracts.js';
import { CognitiveValidationError, } from './cognitiveTypes.js';
const VALID_INTENTS = new Set([
    'OBSERVE',
    'READ',
    'WRITE',
    'APPEND',
    'UPDATE',
    'SEARCH',
    'ANALYZE',
    'PLAN',
    'DECIDE',
    'COMMUNICATE',
    'QUERY',
    'SYSTEM',
    'UNKNOWN',
]);
const VALID_DECISION_TYPES = new Set([
    'PROCEED',
    'REQUIRE_APPROVAL',
    'REJECT',
    'CLARIFY',
]);
const VALID_RISK_LEVELS = new Set([
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
]);
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
export class StructuredCognitiveValidator {
    /**
     * Parses raw model output string and strictly validates against schema.
     * Fails closed by throwing CognitiveValidationError on any defect.
     */
    static parseAndValidate(rawText, context) {
        if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
            throw new CognitiveValidationError('Raw model output is empty or not a string', [
                'EMPTY_MODEL_OUTPUT',
            ]);
        }
        let parsed;
        try {
            // Extract first valid JSON object if wrapped in markdown code fence
            const cleanJson = this.extractJson(rawText);
            parsed = JSON.parse(cleanJson);
        }
        catch (err) {
            throw new CognitiveValidationError(`Failed to parse model JSON: ${err.message}`, [
                'INVALID_JSON_SYNTAX',
                err.message,
            ]);
        }
        return this.validateParsedObject(parsed, rawText, context);
    }
    /**
     * Validates a parsed JavaScript object structure.
     */
    static validateParsedObject(parsed, rawText, context) {
        const errors = [];
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new CognitiveValidationError('Model output root must be a JSON object', [
                'ROOT_NOT_OBJECT',
            ]);
        }
        // 1. Intent validation
        const rawIntent = (parsed.intent || '').toString().toUpperCase();
        const intent = VALID_INTENTS.has(rawIntent)
            ? rawIntent
            : 'UNKNOWN';
        // 2. Interpretation validation
        if (!parsed.interpretation || typeof parsed.interpretation !== 'string') {
            errors.push('Field "interpretation" is required and must be a non-empty string');
        }
        // 3. Plan / Reasoning validation
        if (!parsed.plan && !parsed.reasoningSummary && !parsed.reasoningChain) {
            errors.push('Field "plan" or "reasoningSummary" is required');
        }
        // 4. Decision validation
        let decisionType = 'PROCEED';
        let riskLevel = 'LOW';
        let requiresApproval = false;
        let executionEligibility = true;
        let reasoning = '';
        if (parsed.decision && typeof parsed.decision === 'object') {
            if (VALID_DECISION_TYPES.has(parsed.decision.decisionType)) {
                decisionType = parsed.decision.decisionType;
            }
            if (VALID_RISK_LEVELS.has(parsed.decision.riskLevel)) {
                riskLevel = parsed.decision.riskLevel;
            }
            requiresApproval = Boolean(parsed.decision.requiresApproval);
            executionEligibility = Boolean(parsed.decision.executionEligibility ?? true);
            reasoning = String(parsed.decision.reasonSummary || parsed.decision.reasoning || '');
        }
        else {
            // If plan has estimatedRisk
            if (parsed.plan?.estimatedRisk && VALID_RISK_LEVELS.has(parsed.plan.estimatedRisk)) {
                riskLevel = parsed.plan.estimatedRisk;
            }
        }
        // High/Critical risk automatically requires approval
        if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
            requiresApproval = true;
        }
        // 5. Tool Proposals validation & sanitization
        const toolProposals = [];
        const rawTools = parsed.toolCandidates || parsed.toolProposals || parsed.plan?.steps || [];
        if (Array.isArray(rawTools)) {
            for (let i = 0; i < rawTools.length; i++) {
                const item = rawTools[i];
                if (!item || typeof item !== 'object')
                    continue;
                const toolName = String(item.toolName || item.action || '').trim();
                if (!toolName)
                    continue;
                const rawParams = item.parameters || item.toolArgs || {};
                const sanitizedParams = this.sanitizeParameters(rawParams, errors, `tool[${i}]`);
                toolProposals.push(Object.freeze({
                    toolName,
                    parameters: sanitizedParams,
                    rationale: String(item.rationale || item.validationCriteria || item.target || ''),
                    requiredCapability: String(item.requiredCapability || item.capability || 'standard_execution'),
                    estimatedRisk: VALID_RISK_LEVELS.has(item.estimatedRisk) ? item.estimatedRisk : riskLevel,
                }));
            }
        }
        if (errors.length > 0) {
            throw new CognitiveValidationError('Cognitive output failed schema validation', errors);
        }
        // 6. Confidence validation
        let confidenceScore = 0.8;
        let calibrationNote = 'Validated structured proposal';
        if (parsed.confidence && typeof parsed.confidence === 'object') {
            if (typeof parsed.confidence.score === 'number' && !isNaN(parsed.confidence.score)) {
                confidenceScore = Math.max(0.0, Math.min(1.0, parsed.confidence.score));
            }
            if (parsed.confidence.calibrationRationale) {
                calibrationNote = String(parsed.confidence.calibrationRationale);
            }
        }
        const reasoningChain = [];
        if (Array.isArray(parsed.reasoningChain)) {
            reasoningChain.push(...parsed.reasoningChain.map(String));
        }
        else if (parsed.reasoningSummary) {
            reasoningChain.push(String(parsed.reasoningSummary));
        }
        const proposalId = makeProposalId();
        const createdAt = new Date().toISOString();
        const provenanceHash = computeProposalProvenanceHash({
            proposalId,
            providerName: context.providerName,
            modelName: context.modelName,
            intent,
            createdAt,
        });
        return Object.freeze({
            proposalId,
            sourceTier: context.tier,
            providerName: context.providerName,
            modelName: context.modelName,
            intent,
            interpretation: String(parsed.interpretation),
            reasoningChain: Object.freeze(reasoningChain),
            toolProposals: Object.freeze(toolProposals),
            decision: Object.freeze({
                decisionType,
                riskLevel,
                requiresApproval,
                executionEligibility,
                reasoning,
            }),
            confidence: Object.freeze({
                score: confidenceScore,
                meetsThreshold: confidenceScore >= 0.7,
                calibrationNote,
            }),
            rawTextOutput: rawText,
            provenanceHash,
            createdAt,
        });
    }
    /**
     * Sanitizes parameter dictionaries defending against prototype pollution and invalid types.
     */
    static sanitizeParameters(raw, errors, path) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return Object.freeze({});
        }
        const sanitized = {};
        for (const [key, val] of Object.entries(raw)) {
            if (FORBIDDEN_KEYS.has(key)) {
                errors.push(`Illegal prototype key detected in ${path}: '${key}'`);
                continue;
            }
            // Deep sanitize nested objects
            if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                sanitized[key] = this.sanitizeParameters(val, errors, `${path}.${key}`);
            }
            else if (Array.isArray(val)) {
                sanitized[key] = Object.freeze([...val]);
            }
            else {
                sanitized[key] = val;
            }
        }
        return Object.freeze(sanitized);
    }
    /**
     * Extracts JSON block from model response text.
     */
    static extractJson(text) {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            return trimmed;
        }
        // Check markdown code blocks: ```json ... ```
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (codeBlockMatch && codeBlockMatch[1]) {
            const candidate = codeBlockMatch[1].trim();
            if (candidate.startsWith('{') && candidate.endsWith('}')) {
                return candidate;
            }
        }
        // Extract first outer curly braces
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            return text.substring(firstBrace, lastBrace + 1);
        }
        return trimmed;
    }
}
