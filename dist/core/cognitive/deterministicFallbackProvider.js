// src/core/cognitive/deterministicFallbackProvider.ts
// BOWCON V4.0 — MS-1.3.32: DETERMINISTIC LOCAL FALLBACK PROVIDER
//
// Invariants:
// NEVER_PRETEND_TO_BE_AN_LLM == TRUE
// PROVIDER_TYPE == 'deterministic-fallback'
// HONEST_METADATA == TRUE
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
import { PromptBuilder } from './promptBuilder.js';
import { IntentClassifier } from './intentClassifier.js';
import { makeCognitiveRequestId, makeCognitiveTraceId, makeCognitivePlanId, } from './cognitiveTypes.js';
export class DeterministicFallbackProvider {
    providerType = 'deterministic-fallback';
    providerName = 'deterministic-local-fallback';
    modelName = 'bowcon-rule-engine-v4';
    async healthCheck() {
        return {
            isAvailable: true,
            providerType: this.providerType,
            modelName: this.modelName,
            latencyMs: 0,
            details: {
                offlineCapable: true,
                deterministic: true,
                networkRequired: false,
            },
        };
    }
    async process(context, _options) {
        const startedAt = Date.now();
        const requestId = makeCognitiveRequestId();
        const traceId = makeCognitiveTraceId();
        const planId = makeCognitivePlanId();
        const stages = [];
        // Stage 1: Input Analysis & Intent Extraction
        const classStart = Date.now();
        const rawInput = context.userContext || '';
        const safeInput = PromptBuilder.sanitizeText(rawInput);
        const classification = IntentClassifier.classify(safeInput);
        stages.push({
            stage: 'intent_classification',
            startedAt: classStart,
            completedAt: Date.now(),
            durationMs: Date.now() - classStart,
        });
        // Stage 2: Tool proposal mapping based on deterministic rules
        const toolStart = Date.now();
        let toolName = 'brain_echo';
        let toolArgs = { input: safeInput };
        let capability = classification.recommendedCapability;
        let targetEntity = classification.targetEntity;
        // Parse target file from input if available (support quotes and Windows drive paths)
        const quotedMatch = safeInput.match(/["']([^"'\r\n]+\.(?:txt|md|json|log|ts|js))["']/i);
        const unquotedMatch = safeInput.match(/\b([a-zA-Z]:[\\/][^\s"']+\.(?:txt|md|json|log|ts|js)|[a-zA-Z0-9_\-./\\]+\.(?:txt|md|json|log|ts|js))\b/i);
        const resolvedPath = quotedMatch?.[1] || unquotedMatch?.[1] || targetEntity || 'bowcon-output.txt';
        // Parse content from input
        const quotedContent = safeInput.match(/(?:content|text|containing|with)[:\s]+["']([^"'\r\n]+)["']/i);
        const unquotedContent = safeInput.match(/(?:content|text|containing|with)[:\s]+([^"'\r\n]{2,})/i);
        const extractedContent = quotedContent?.[1] || unquotedContent?.[1];
        switch (classification.intent) {
            case 'WRITE': {
                toolName = 'brain_fs_write';
                capability = 'fs:write';
                toolArgs = {
                    path: resolvedPath,
                    content: extractedContent ?? `BOWCON Brain generated content at ${new Date().toISOString()}`,
                };
                break;
            }
            case 'APPEND':
            case 'UPDATE': {
                toolName = 'brain_fs_append';
                capability = 'fs:append';
                toolArgs = {
                    path: resolvedPath,
                    content: extractedContent ?? `Appended by BOWCON Brain at ${new Date().toISOString()}`,
                };
                break;
            }
            case 'READ': {
                toolName = 'brain_fs_read';
                capability = 'fs:read';
                toolArgs = { path: resolvedPath };
                break;
            }
            case 'SEARCH': {
                toolName = 'brain_fs_list';
                capability = 'fs:search';
                toolArgs = { directory: 'data/brain' };
                break;
            }
            case 'SYSTEM': {
                toolName = 'brain_echo';
                capability = 'sys:status';
                toolArgs = { input: safeInput };
                break;
            }
            case 'COMMUNICATE':
            case 'OBSERVE':
            case 'ANALYZE':
            case 'PLAN':
            case 'DECIDE':
            case 'QUERY':
            case 'UNKNOWN':
            default: {
                toolName = 'brain_echo';
                capability = 'comm:echo';
                toolArgs = { input: safeInput };
                break;
            }
        }
        stages.push({
            stage: 'tool_proposal_mapping',
            startedAt: toolStart,
            completedAt: Date.now(),
            durationMs: Date.now() - toolStart,
        });
        // Stage 3: Structured Plan Assembly
        const plan = {
            planId,
            steps: [
                {
                    stepIndex: 1,
                    action: `propose_${toolName}`,
                    target: resolvedPath,
                    parameters: toolArgs,
                    requiredCapability: capability,
                    validationCriteria: 'PDP authorization check passed',
                },
            ],
            summary: `Deterministic proposal to execute ${toolName} with capability ${capability}`,
            estimatedRisk: classification.riskLevel,
            requiredCapabilities: [capability],
        };
        // Stage 4: Decision Assembly
        const requiresApproval = classification.riskLevel === 'HIGH' ||
            classification.riskLevel === 'CRITICAL' ||
            safeInput.toLowerCase().includes('delete') ||
            safeInput.toLowerCase().includes('format');
        const decision = {
            decisionType: requiresApproval ? 'REQUIRE_APPROVAL' : 'PROCEED',
            riskLevel: classification.riskLevel,
            requiredCapabilities: [capability],
            requiresApproval,
            executionEligibility: classification.intent !== 'UNKNOWN',
            reasonSummary: `Deterministic rule engine matched intent ${classification.intent}. Tool candidate: ${toolName}.`,
        };
        // Stage 5: Calibrated Confidence
        const confidence = {
            score: classification.confidence,
            calibrationRationale: `Deterministic rule confidence based on intent match: ${classification.rationale}`,
            meetsExecutionThreshold: classification.confidence >= 0.7 && classification.intent !== 'UNKNOWN',
        };
        const toolCandidates = [
            {
                toolName,
                toolArgs,
                intent: classification.intent,
                capability,
            },
        ];
        return {
            requestId,
            provider: this.providerType,
            model: this.modelName,
            intent: classification.intent,
            interpretation: `Rule-based parse: intent=${classification.intent}, target=${resolvedPath}`,
            reasoningSummary: classification.rationale,
            plan,
            decision,
            confidence,
            requestedCapabilities: [capability],
            riskLevel: classification.riskLevel,
            toolCandidates,
            requiresApproval,
            createdAt: new Date().toISOString(),
            traceId,
            rawOutput: JSON.stringify({
                rule: 'deterministic-match',
                intent: classification.intent,
                tool: toolName,
                timestamp: new Date().toISOString(),
            }),
        };
    }
    async summarize(taskSummary) {
        return `Deterministic summary: Task ${taskSummary.taskId ?? 'unspecified'} completed with status: ${taskSummary.success ? 'SUCCESS' : 'FAILED'}.`;
    }
    async shutdown() {
        // In-memory rule engine, nothing to drain
    }
}
