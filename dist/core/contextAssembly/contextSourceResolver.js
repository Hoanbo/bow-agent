// src/core/contextAssembly/contextSourceResolver.ts
// BOWCON V4.0 — MS-1.4.03: CONTEXT SOURCE RESOLVER & SANITIZATION
//
// Invariants:
// STRICT_TENANT_ISOLATION == TRUE
// CROSS_TENANT_ACCESS -> CrossTenantContextError
// STALE_TASK_VERSION -> StaleTaskContextError
// CORRUPTED_MANDATORY_SOURCE -> ContextSourceCorruptedError
// INERT_UNTRUSTED_INJECTIONS == TRUE
// ZERO_SECRET_LEAKAGE == TRUE
import path from 'node:path';
import { ContextTier, CrossTenantContextError, StaleTaskContextError, ContextSourceUnavailableError, ContextSourceCorruptedError, ContextValidationError, } from './contextTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { PromptBuilder } from '../cognitive/promptBuilder.js';
import { TokenBudgetManager } from './tokenBudgetManager.js';
export class ContextSourceResolver {
    taskRuntime;
    sanitizer;
    baseDir;
    budgetManager;
    constructor(options) {
        this.taskRuntime = options?.taskRuntime;
        this.sanitizer = options?.sanitizer ?? new DiagnosisSanitizer();
        this.baseDir = options?.baseDir ?? path.resolve(process.cwd(), 'data');
        this.budgetManager = new TokenBudgetManager();
    }
    /**
     * Resolves, categorizes, sanitizes, and returns an ordered list of context fragments.
     */
    async resolveSources(request) {
        // 1. Validate tenant identity against path traversal, null bytes, and reserved device names
        this.validateTenantId(request.tenantId);
        let task;
        // 2. Resolve AgentTask if taskId is provided
        if (request.taskId) {
            task = this.resolveTask(request.tenantId, request.taskId, request.expectedTaskVersion);
        }
        const fragments = [];
        // 3. Resolve Tier 1 Fragments (Critical: Safety, Governance, Active Task & Step)
        this.resolveTier1Fragments(request, task, fragments);
        // 4. Resolve Tier 2 Fragments (High: Previous Step Results, User Prompt, Constraints)
        this.resolveTier2Fragments(request, task, fragments);
        // 5. Resolve Tier 3 Fragments (Medium: Recent Turns, Historical Step Summaries)
        this.resolveTier3Fragments(request, task, fragments);
        // 6. Resolve Tier 4 Fragments (Low: Extended History, Capabilities, Custom)
        this.resolveTier4Fragments(request, task, fragments);
        // Sort fragments deterministically: Tier (ascending) then Priority (descending)
        fragments.sort((a, b) => {
            if (a.tier !== b.tier)
                return a.tier - b.tier;
            if (a.priority !== b.priority)
                return b.priority - a.priority;
            return a.fragmentId.localeCompare(b.fragmentId);
        });
        return { task, fragments };
    }
    validateTenantId(tenantId) {
        if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
            throw new ContextValidationError('tenantId is required');
        }
        // Verify using resolveUserPartition to catch null bytes, traversal, and Windows reserved device names
        try {
            resolveUserPartition(tenantId, this.baseDir);
        }
        catch (err) {
            throw new ContextValidationError(`Invalid tenantId '${tenantId}': ${err?.message}`);
        }
    }
    resolveTask(tenantId, taskId, expectedTaskVersion) {
        if (!this.taskRuntime) {
            throw new ContextSourceUnavailableError('AgentTaskRuntime', 'No task runtime configured');
        }
        // Check if taskId encodes another tenant's partition
        const safeTenant = tenantId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        const taskMatch = taskId.match(/^task_([a-zA-Z0-9_]+)_\d+_[a-f0-9]+$/);
        if (taskMatch && taskMatch[1] !== safeTenant) {
            throw new CrossTenantContextError(tenantId, taskMatch[1], { taskId });
        }
        let task;
        try {
            task = this.taskRuntime.getTask(tenantId, taskId);
        }
        catch (err) {
            if (err.name === 'TaskNotFoundError') {
                throw new ContextSourceUnavailableError(`AgentTask:${taskId}`, `Task '${taskId}' not found in tenant '${tenantId}'`);
            }
            throw err;
        }
        // Verify tenant ownership
        if (task.tenantId !== tenantId) {
            throw new CrossTenantContextError(tenantId, task.tenantId, { taskId });
        }
        // Verify task version freshness
        if (expectedTaskVersion !== undefined && task.version !== expectedTaskVersion) {
            throw new StaleTaskContextError(taskId, expectedTaskVersion, task.version);
        }
        // Integrity check on task state
        if (!task.taskId || !task.state || typeof task.version !== 'number') {
            throw new ContextSourceCorruptedError(`AgentTask:${taskId}`, 'Task missing essential schema properties');
        }
        return task;
    }
    resolveTier1Fragments(request, task, fragments) {
        // System Safety Directives
        const systemSafety = request.promptInputs.systemPrompt?.trim() ||
            'BOWCON V4.0 AUTHORITATIVE SAFETY: Enforce strict PDP clearance, zero-trust execution, and USER_STOP supremacy.';
        const sanitizedSys = this.sanitizer.sanitizeString(systemSafety);
        fragments.push(this.createFragment({
            fragmentId: 'tier1_system_safety',
            category: 'SYSTEM_SAFETY_DIRECTIVES',
            tier: ContextTier.TIER_1_CRITICAL,
            priority: 100,
            source: 'system',
            content: sanitizedSys,
            isMandatory: true,
            canTruncate: false,
            canDrop: false,
        }));
        // Governance Constraints
        const policyConstraints = request.promptInputs.policyConstraints?.trim() ||
            'GOVERNANCE INVARIANTS: LLM_OUTPUT != AUTHORITY, LLM_PROPOSAL != EXECUTION, COGNITION != TOOL_EXECUTION.';
        const sanitizedPolicy = this.sanitizer.sanitizeString(policyConstraints);
        fragments.push(this.createFragment({
            fragmentId: 'tier1_governance_constraints',
            category: 'GOVERNANCE_CONSTRAINTS',
            tier: ContextTier.TIER_1_CRITICAL,
            priority: 95,
            source: 'governance',
            content: sanitizedPolicy,
            isMandatory: true,
            canTruncate: false,
            canDrop: false,
        }));
        // Task Metadata & Intent
        if (task) {
            const taskMetaContent = `TASK ID: ${task.taskId}\nTENANT ID: ${task.tenantId}\nTITLE: ${task.title}\nINTENT: ${task.intent}\nSTATE: ${task.state}\nVERSION: ${task.version}\nRISK LEVEL: ${task.riskLevel}`;
            fragments.push(this.createFragment({
                fragmentId: 'tier1_task_metadata',
                category: 'TASK_METADATA',
                tier: ContextTier.TIER_1_CRITICAL,
                priority: 90,
                source: `task:${task.taskId}`,
                content: this.sanitizer.sanitizeString(taskMetaContent),
                isMandatory: true,
                canTruncate: false,
                canDrop: false,
            }));
            // Active Step definition
            if (task.steps.length > 0 && task.currentStepIndex < task.steps.length) {
                const activeStep = task.steps[task.currentStepIndex];
                const stepContent = `CURRENT STEP [${activeStep.stepIndex}]: ${activeStep.actionName}\nCAPABILITY: ${activeStep.capabilityId}\nDESCRIPTION: ${activeStep.description}\nSTATUS: ${activeStep.status}`;
                fragments.push(this.createFragment({
                    fragmentId: `tier1_active_step_${activeStep.stepIndex}`,
                    category: 'ACTIVE_STEP',
                    tier: ContextTier.TIER_1_CRITICAL,
                    priority: 85,
                    source: `task_step:${activeStep.stepId}`,
                    content: this.sanitizer.sanitizeString(stepContent),
                    isMandatory: true,
                    canTruncate: false,
                    canDrop: false,
                }));
            }
        }
    }
    resolveTier2Fragments(request, task, fragments) {
        // Sanitized User Prompt
        if (request.promptInputs.userContext) {
            const neutralizedUser = PromptBuilder.neutralizeInjection(request.promptInputs.userContext);
            const sanitizedUser = this.sanitizer.sanitizeString(neutralizedUser);
            fragments.push(this.createFragment({
                fragmentId: 'tier2_user_prompt',
                category: 'SANITIZED_USER_PROMPT',
                tier: ContextTier.TIER_2_HIGH,
                priority: 80,
                source: 'user_input',
                content: sanitizedUser,
                isMandatory: false,
                canTruncate: true,
                canDrop: false,
            }));
        }
        // Previous Step Result & Failure Telemetry (if available)
        if (task && task.currentStepIndex > 0) {
            const prevIndex = task.currentStepIndex - 1;
            const prevStep = task.steps[prevIndex];
            if (prevStep) {
                const outputStr = prevStep.executionResult ? JSON.stringify(prevStep.executionResult) : 'None';
                const prevContent = `PREVIOUS STEP [${prevStep.stepIndex}] RESULT: ${prevStep.status}\nACTION: ${prevStep.actionName}\nOUTPUT: ${outputStr}${prevStep.error ? `\nFAILURE REASON: ${prevStep.error}` : ''}`;
                fragments.push(this.createFragment({
                    fragmentId: `tier2_prev_step_${prevStep.stepIndex}`,
                    category: prevStep.error ? 'FAILURE_TELEMETRY' : 'PREVIOUS_STEP_RESULT',
                    tier: ContextTier.TIER_2_HIGH,
                    priority: 75,
                    source: `task_step:${prevStep.stepId}`,
                    content: this.sanitizer.sanitizeString(prevContent),
                    isMandatory: false,
                    canTruncate: true,
                    canDrop: false,
                }));
            }
        }
        // Explicit Task Context inputs
        if (request.promptInputs.taskContext) {
            const sanitizedTaskContext = this.sanitizer.sanitizeString(request.promptInputs.taskContext);
            fragments.push(this.createFragment({
                fragmentId: 'tier2_task_context_notes',
                category: 'EXPLICIT_USER_CONSTRAINTS',
                tier: ContextTier.TIER_2_HIGH,
                priority: 70,
                source: 'caller_task_context',
                content: sanitizedTaskContext,
                isMandatory: false,
                canTruncate: true,
                canDrop: false,
            }));
        }
    }
    resolveTier3Fragments(request, task, fragments) {
        // Recent Conversation Turns (last 3 turns)
        if (request.promptInputs.previousTurns && request.promptInputs.previousTurns.length > 0) {
            const turns = request.promptInputs.previousTurns;
            const recentTurns = turns.slice(-3);
            const turnsFormatted = recentTurns
                .map((t, idx) => `[${t.role.toUpperCase()}]: ${this.sanitizer.sanitizeString(t.content)}`)
                .join('\n');
            fragments.push(this.createFragment({
                fragmentId: 'tier3_recent_conversation_turns',
                category: 'RECENT_CONVERSATION_TURNS',
                tier: ContextTier.TIER_3_MEDIUM,
                priority: 60,
                source: 'session_recent_turns',
                content: turnsFormatted,
                isMandatory: false,
                canTruncate: true,
                canDrop: true,
            }));
        }
        // Historical Completed Steps Summary (indexes 0 to currentStepIndex - 2)
        if (task && task.currentStepIndex > 1) {
            const historicalSteps = task.steps.slice(0, task.currentStepIndex - 1);
            const stepsSummary = historicalSteps
                .map((s) => `Step [${s.stepIndex}] ${s.actionName}: ${s.status}`)
                .join('; ');
            fragments.push(this.createFragment({
                fragmentId: 'tier3_historical_steps_summary',
                category: 'HISTORICAL_COMPLETED_STEPS',
                tier: ContextTier.TIER_3_MEDIUM,
                priority: 50,
                source: `task_history:${task.taskId}`,
                content: this.sanitizer.sanitizeString(`Completed Steps Summary: ${stepsSummary}`),
                isMandatory: false,
                canTruncate: true,
                canDrop: true,
            }));
        }
    }
    resolveTier4Fragments(request, task, fragments) {
        // Extended Conversation Turns (> 3 turns ago)
        if (request.promptInputs.previousTurns && request.promptInputs.previousTurns.length > 3) {
            const olderTurns = request.promptInputs.previousTurns.slice(0, -3);
            const olderTurnsFormatted = olderTurns
                .map((t) => `[${t.role.toUpperCase()}]: ${this.sanitizer.sanitizeString(t.content)}`)
                .join('\n');
            fragments.push(this.createFragment({
                fragmentId: 'tier4_extended_conversation_turns',
                category: 'RECENT_CONVERSATION_TURNS',
                tier: ContextTier.TIER_4_LOW,
                priority: 30,
                source: 'session_older_turns',
                content: olderTurnsFormatted,
                isMandatory: false,
                canTruncate: true,
                canDrop: true,
            }));
        }
        // Capability Schemas / Declarations
        if (request.promptInputs.capabilitiesContext) {
            const sanitizedCap = this.sanitizer.sanitizeString(request.promptInputs.capabilitiesContext);
            fragments.push(this.createFragment({
                fragmentId: 'tier4_capability_schemas',
                category: 'CAPABILITY_SCHEMAS',
                tier: ContextTier.TIER_4_LOW,
                priority: 25,
                source: 'capabilities_registry',
                content: sanitizedCap,
                isMandatory: false,
                canTruncate: true,
                canDrop: true,
            }));
        }
        // Custom fragments from request
        if (request.promptInputs.customFragments) {
            for (const custom of request.promptInputs.customFragments) {
                fragments.push(this.createFragment({
                    fragmentId: `tier4_${custom.fragmentId}`,
                    category: custom.category || 'CUSTOM_FRAGMENT',
                    tier: ContextTier.TIER_4_LOW,
                    priority: 10,
                    source: custom.source || 'caller_custom',
                    content: this.sanitizer.sanitizeString(custom.content),
                    isMandatory: false,
                    canTruncate: true,
                    canDrop: true,
                }));
            }
        }
    }
    createFragment(params) {
        const tokenEstimate = this.budgetManager.estimateTokens(params.content);
        return Object.freeze({
            fragmentId: params.fragmentId,
            category: params.category,
            tier: params.tier,
            priority: params.priority,
            source: params.source,
            content: params.content,
            tokenEstimate,
            isMandatory: params.isMandatory,
            canTruncate: params.canTruncate,
            canDrop: params.canDrop,
        });
    }
}
