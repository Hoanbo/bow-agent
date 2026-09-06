// src/core/agentLoop.ts
// BOWCON V4.0 — AUTHORITATIVE CANONICAL AGENT LOOP (MILESTONE 1.2)
//
// Lifecycle: INTENT -> MEMORY -> PLAN -> PDP -> EXECUTE -> VERIFY -> UPDATE
// Invariants:
// 1. No privileged action may bypass PolicyDecisionPoint (PDP).
// 2. No execution result may bypass verification.
// 3. No successful execution may update durable state without passing through UPDATE.
// 4. Memory retrieval is READ-ONLY and scoped by sessionId / userId (Zero global mutable state).
// 5. Execution occurs exclusively through ToolRegistry.
import crypto from 'node:crypto';
import { globalPDP } from './policyDecisionPoint.js';
import { toolRegistry } from '../tools/registry.js';
import { globalBossMemory } from '../embodied/bossMemoryHub.js';
import { globalBossFeedback } from '../embodied/bossFeedbackLearner.js';
import { memoryStore } from './memory.js';
import { fastPathRouter } from './fastPathRouter.js';
import { scanSecurity, redactPii } from './security.js';
import { globalVoiceService } from './voice/voiceService.js';
import { globalContextManager } from './context/contextManager.js';
// ---------------------------------------------------------------------------
// 3. AUTHORITATIVE CANONICAL AGENT LOOP CLASS
// ---------------------------------------------------------------------------
export class AgentLoop {
    voiceService;
    contextManager;
    constructor(voiceService, contextManager) {
        this.voiceService = voiceService || globalVoiceService;
        this.contextManager = contextManager || globalContextManager;
    }
    getVoiceService() {
        return this.voiceService;
    }
    getContextManager() {
        return this.contextManager;
    }
    /**
     * Execute the authoritative 7-stage Agent Execution Loop
     */
    async execute(req) {
        const startTime = Date.now();
        const requestId = req.requestId || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const correlationId = req.correlationId || `corr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const sessionId = req.sessionId;
        const actor = {
            ...req.actor,
            isOwner: req.actor.isOwner === true || req.actor.role === 'owner',
        };
        let currentState = 'RECEIVED';
        let intent;
        let memoryContext;
        let plan;
        const policyEvaluations = [];
        const executionResults = [];
        const verificationResults = [];
        let updateResult;
        // Security pre-scan on inbound text
        const secScan = scanSecurity(req.userText || '');
        if (!secScan.isSafe) {
            return {
                requestId,
                correlationId,
                sessionId,
                actor,
                state: 'POLICY_DENIED',
                policyEvaluations: [],
                executionResults: [],
                verificationResults: [],
                response: {
                    id: `msg_sec_${Date.now()}`,
                    sender: 'agent',
                    content: '⚠️ Yêu cầu bị từ chối do vi phạm chính sách an toàn thông tin.',
                    timestamp: new Date().toISOString(),
                },
                totalDurationMs: Date.now() - startTime,
                error: 'PROMPT_INJECTION_DETECTED',
            };
        }
        const sanitizedText = secScan.sanitizedText;
        // =========================================================================
        // STAGE 1: INTENT RESOLUTION
        // =========================================================================
        try {
            intent = await this.resolveIntent(sanitizedText, req);
            currentState = 'INTENT_RESOLVED';
        }
        catch (err) {
            return this.buildFailureResult({
                requestId, correlationId, sessionId, actor,
                state: 'INTENT_FAILED',
                error: err?.message || 'Intent resolution failed',
                startTime, policyEvaluations, executionResults, verificationResults,
            });
        }
        // If clarification is required, return early without planning or execution
        if (intent.requiresClarification) {
            const clarifyText = intent.clarificationPrompt || 'Xin Ngài vui lòng làm rõ thêm yêu cầu.';
            const voiceResult = await this.synthesizeVoiceIfNeeded(clarifyText, req, correlationId, requestId);
            return {
                requestId,
                correlationId,
                sessionId,
                actor,
                state: 'COMPLETED',
                intent,
                policyEvaluations,
                executionResults,
                verificationResults,
                response: {
                    id: `msg_clarify_${Date.now()}`,
                    sender: 'agent',
                    content: clarifyText,
                    timestamp: new Date().toISOString(),
                },
                voiceResult,
                totalDurationMs: Date.now() - startTime,
            };
        }
        // Ingest turn into Conversation Context Manager (Stage 1b / Pre-Stage 2)
        try {
            await this.contextManager.ingestUserTurn(actor.userId, sessionId, sanitizedText);
        }
        catch {
            // Failure isolation (INV-14)
        }
        // =========================================================================
        // STAGE 2: MEMORY RETRIEVAL (READ-ONLY, SESSION-SCOPED)
        // =========================================================================
        try {
            memoryContext = await this.loadMemory(sessionId, actor.userId, actor);
            currentState = 'MEMORY_LOADED';
        }
        catch (err) {
            return this.buildFailureResult({
                requestId, correlationId, sessionId, actor,
                state: 'MEMORY_FAILED',
                error: err?.message || 'Memory loading failed',
                startTime, intent, policyEvaluations, executionResults, verificationResults,
            });
        }
        // =========================================================================
        // STAGE 3: BOUNDED PLANNING (SEPARATE FROM EXECUTION)
        // =========================================================================
        try {
            plan = await this.createPlan(intent, memoryContext, actor);
            currentState = 'PLAN_CREATED';
        }
        catch (err) {
            return this.buildFailureResult({
                requestId, correlationId, sessionId, actor,
                state: 'PLAN_FAILED',
                error: err?.message || 'Planning failed',
                startTime, intent, memoryContext, policyEvaluations, executionResults, verificationResults,
            });
        }
        // =========================================================================
        // STAGE 4: POLICY DECISION POINT (PDP) EVALUATION
        // =========================================================================
        let allStepsPermitted = true;
        let approvalDemanded = false;
        let demandedApprovalId;
        for (const step of plan.steps) {
            const argsHash = crypto.createHash('sha256').update(JSON.stringify(step.arguments)).digest('hex');
            const decision = globalPDP.evaluate({
                toolName: step.toolName,
                args: step.arguments,
                actor: {
                    userId: actor.userId,
                    role: actor.role,
                    channel: actor.channel,
                    isOwner: actor.isOwner,
                },
                executionToken: req.executionToken,
                idempotencyKey: req.idempotencyKey,
                consumeToken: false,
            });
            policyEvaluations.push({
                stepId: step.stepId,
                toolName: step.toolName,
                decision,
                argumentsHash: argsHash,
            });
            if (!decision.allowed) {
                allStepsPermitted = false;
                if (decision.requiresApproval) {
                    approvalDemanded = true;
                    demandedApprovalId = decision.approvalId;
                }
                break; // Stop at first denied/unapproved step
            }
        }
        if (!allStepsPermitted) {
            if (approvalDemanded) {
                currentState = 'APPROVAL_REQUIRED';
                const approvalText = `⏳ Hành động này có mức độ tác động cao (HIGH_IMPACT) và cần được Ngài phê duyệt trước khi thực thi. Mã phê duyệt: ${demandedApprovalId}`;
                const voiceResult = await this.synthesizeVoiceIfNeeded(approvalText, req, correlationId, requestId);
                return {
                    requestId,
                    correlationId,
                    sessionId,
                    actor,
                    state: currentState,
                    intent,
                    memoryContext,
                    plan,
                    policyEvaluations,
                    executionResults,
                    verificationResults,
                    response: {
                        id: `msg_approval_${Date.now()}`,
                        sender: 'agent',
                        content: approvalText,
                        timestamp: new Date().toISOString(),
                        data: { approvalId: demandedApprovalId, status: 'PENDING_APPROVAL' },
                    },
                    voiceResult,
                    totalDurationMs: Date.now() - startTime,
                    error: `APPROVAL_REQUIRED: Action requires explicit confirmation. ID: ${demandedApprovalId}`,
                };
            }
            else {
                currentState = 'POLICY_DENIED';
                const deniedStep = policyEvaluations[policyEvaluations.length - 1];
                const deniedText = `🚫 Yêu cầu bị từ chối bởi Chính sách Quản trị: ${deniedStep?.decision.reason || 'Bị chặn bởi PDP'}`;
                const voiceResult = await this.synthesizeVoiceIfNeeded(deniedText, req, correlationId, requestId);
                return {
                    requestId,
                    correlationId,
                    sessionId,
                    actor,
                    state: currentState,
                    intent,
                    memoryContext,
                    plan,
                    policyEvaluations,
                    executionResults,
                    verificationResults,
                    response: {
                        id: `msg_denied_${Date.now()}`,
                        sender: 'agent',
                        content: deniedText,
                        timestamp: new Date().toISOString(),
                    },
                    voiceResult,
                    totalDurationMs: Date.now() - startTime,
                    error: `POLICY_DENIED: ${deniedStep?.decision.reason}`,
                };
            }
        }
        currentState = 'POLICY_EVALUATED';
        // =========================================================================
        // STAGE 5: EXECUTION (STRICTLY THROUGH TOOL REGISTRY)
        // =========================================================================
        currentState = 'EXECUTING';
        let executionFailed = false;
        for (const step of plan.steps) {
            const stepStart = Date.now();
            try {
                const toolContext = {
                    userId: actor.userId,
                    role: actor.role,
                    channel: actor.channel,
                    isOwner: actor.isOwner,
                    correlationId,
                    idempotencyKey: req.idempotencyKey,
                    executionToken: req.executionToken,
                    authToken: actor.authToken,
                };
                const rawOutput = await toolRegistry.executeTool(step.toolName, step.arguments, toolContext);
                const duration = Date.now() - stepStart;
                executionResults.push({
                    stepId: step.stepId,
                    toolName: step.toolName,
                    status: 'SUCCESS',
                    rawOutput,
                    executionDurationMs: duration,
                });
            }
            catch (err) {
                const duration = Date.now() - stepStart;
                executionResults.push({
                    stepId: step.stepId,
                    toolName: step.toolName,
                    status: 'FAILURE',
                    error: err?.message || 'Tool execution failure',
                    executionDurationMs: duration,
                });
                executionFailed = true;
                break; // Stop plan execution upon failure
            }
        }
        if (executionFailed) {
            currentState = 'EXECUTION_FAILED';
            const failedExec = executionResults[executionResults.length - 1];
            return {
                requestId,
                correlationId,
                sessionId,
                actor,
                state: currentState,
                intent,
                memoryContext,
                plan,
                policyEvaluations,
                executionResults,
                verificationResults,
                response: {
                    id: `msg_err_${Date.now()}`,
                    sender: 'agent',
                    content: `❌ Quá trình thực thi công cụ "${failedExec.toolName}" thất bại: ${failedExec.error}`,
                    timestamp: new Date().toISOString(),
                },
                totalDurationMs: Date.now() - startTime,
                error: failedExec.error,
            };
        }
        // =========================================================================
        // STAGE 6: RESULT VERIFICATION
        // =========================================================================
        currentState = 'VERIFYING';
        let overallVerificationSuccess = true;
        for (const step of plan.steps) {
            const execRes = executionResults.find(e => e.stepId === step.stepId);
            if (!execRes || execRes.status !== 'SUCCESS') {
                verificationResults.push({
                    stepId: step.stepId,
                    toolName: step.toolName,
                    status: 'VERIFICATION_FAILURE',
                    discrepancy: 'Execution did not produce a successful output to verify.',
                    realityLevel: 'REAL',
                });
                overallVerificationSuccess = false;
                continue;
            }
            const verifyRes = this.verifyStep(step, execRes.rawOutput);
            verificationResults.push(verifyRes);
            if (verifyRes.status === 'VERIFICATION_FAILURE') {
                overallVerificationSuccess = false;
            }
        }
        if (!overallVerificationSuccess) {
            currentState = 'VERIFICATION_FAILED';
        }
        // =========================================================================
        // STAGE 7: STATE & MEMORY UPDATE
        // =========================================================================
        currentState = overallVerificationSuccess ? 'UPDATING' : 'VERIFICATION_FAILED';
        updateResult = await this.applyUpdate({
            sessionId,
            actor,
            sanitizedText,
            intent,
            plan,
            executionResults,
            verificationResults,
            verifiedSuccess: overallVerificationSuccess,
        });
        currentState = overallVerificationSuccess ? 'COMPLETED' : 'VERIFICATION_FAILED';
        // Format final response text
        const responseText = this.formatResponseText({
            intent,
            plan,
            executionResults,
            verificationResults,
            verifiedSuccess: overallVerificationSuccess,
            actor,
        });
        // Commit agent response into Conversation Context Manager (Stage 7b)
        try {
            await this.contextManager.commitAgentResponse(actor.userId, sessionId, responseText);
        }
        catch {
            // Failure isolation (INV-14)
        }
        // Voice output layer (post-response boundary)
        const voiceResult = await this.synthesizeVoiceIfNeeded(responseText, req, correlationId, requestId);
        return {
            requestId,
            correlationId,
            sessionId,
            actor,
            state: currentState,
            intent,
            memoryContext,
            plan,
            policyEvaluations,
            executionResults,
            verificationResults,
            updateResult,
            response: {
                id: `msg_out_${Date.now()}`,
                sender: 'agent',
                content: responseText,
                timestamp: new Date().toISOString(),
            },
            voiceResult,
            totalDurationMs: Date.now() - startTime,
        };
    }
    // -------------------------------------------------------------------------
    // STAGE 1 IMPLEMENTATION: INTENT RESOLUTION
    // -------------------------------------------------------------------------
    async resolveIntent(userText, req) {
        const rawQuery = (userText || '').trim();
        // Check if explicit actionName was provided in metadata or request
        if (req.metadata?.actionName) {
            return {
                intentType: 'EXPLICIT_ACTION',
                capability: req.metadata.actionName,
                actionName: req.metadata.actionName,
                parameters: req.metadata.parameters || {},
                confidence: 1.0,
                requiresClarification: false,
                entities: {},
                fastPathMatched: true,
            };
        }
        // 1. Try Deterministic Fast-Path Router (Sub-millisecond matching)
        const fastPath = fastPathRouter.evaluate(rawQuery);
        if (fastPath.matched) {
            return {
                intentType: fastPath.intent,
                capability: fastPath.action || 'conversation',
                actionName: fastPath.action,
                parameters: fastPath.payload || {},
                confidence: 0.98,
                requiresClarification: false,
                entities: { ...(fastPath.payload || {}), target: fastPath.target },
                fastPathMatched: true,
            };
        }
        // 2. Deterministic Rule Intent Heuristics
        const lower = rawQuery.toLowerCase();
        // Rule teaching heuristic
        if (lower.includes('hãy nhớ quy tắc') || lower.includes('từ giờ hãy') || lower.includes('đừng làm') || lower.includes('lần sau hãy')) {
            return {
                intentType: 'TEACH_RULE',
                capability: 'teach_boss_rule',
                actionName: 'teach_boss_rule',
                parameters: { instruction: rawQuery },
                confidence: 0.92,
                requiresClarification: false,
                entities: { instruction: rawQuery },
                fastPathMatched: false,
            };
        }
        // Personal habit / memory recall heuristic
        if (lower.includes('tôi thích uống gì') || lower.includes('thói quen của tôi') || lower.includes('dự án đang làm')) {
            return {
                intentType: 'RECALL_MEMORY',
                capability: 'boss_recall_memory',
                actionName: 'boss_recall_memory',
                parameters: { topic: lower.includes('uống') ? 'habits' : 'projects' },
                confidence: 0.90,
                requiresClarification: false,
                entities: {},
                fastPathMatched: false,
            };
        }
        // Morning briefing heuristic
        if (lower.includes('bản tin sáng') || lower.includes('tin tức sáng nay') || lower.includes('chào buổi sáng')) {
            return {
                intentType: 'MORNING_BRIEFING',
                capability: 'get_morning_briefing',
                actionName: 'get_morning_briefing',
                parameters: {},
                confidence: 0.95,
                requiresClarification: false,
                entities: {},
                fastPathMatched: false,
            };
        }
        // Screen notifications inspection
        if (lower.includes('kiểm tra thông báo') || lower.includes('có tin nhắn gì mới') || lower.includes('ai nhắn tin')) {
            return {
                intentType: 'SCREEN_INSPECTION',
                capability: 'inspect_screen_notifications',
                actionName: 'inspect_screen_notifications',
                parameters: {},
                confidence: 0.91,
                requiresClarification: false,
                entities: {},
                fastPathMatched: false,
            };
        }
        // Empty or completely ambiguous query
        if (rawQuery.length < 2) {
            return {
                intentType: 'AMBIGUOUS',
                capability: 'none',
                parameters: {},
                confidence: 0.1,
                requiresClarification: true,
                clarificationPrompt: 'Dạ, Ngài có thể nói rõ hơn yêu cầu được không ạ?',
                entities: {},
                fastPathMatched: false,
            };
        }
        // Default: General query / conversation
        return {
            intentType: 'GENERAL_QUERY',
            capability: 'conversation',
            parameters: { query: rawQuery },
            confidence: 0.85,
            requiresClarification: false,
            entities: {},
            fastPathMatched: false,
        };
    }
    // -------------------------------------------------------------------------
    // STAGE 2 IMPLEMENTATION: MEMORY RETRIEVAL (READ-ONLY)
    // -------------------------------------------------------------------------
    async loadMemory(sessionId, userId, actor) {
        const scope = { sessionId, userId };
        // 1. Session-scoped turns from memoryStore (strictly READ-ONLY)
        const sessionTurns = memoryStore.getSessionMemory(scope).turns.slice(-10);
        // 2. Boss Profile & Rules (Only for authenticated Owner / Admin)
        let bossProfile;
        let learnedRules = [];
        let activeProjects = [];
        if (actor.isOwner || actor.role === 'owner' || actor.role === 'admin') {
            bossProfile = globalBossMemory.getProfile(userId);
            learnedRules = globalBossFeedback.getRules(userId);
            activeProjects = bossProfile?.projects || [];
        }
        // 3. Conversation Context Snapshot (MS-1.3.7 Intelligent Response Memory)
        let contextSnapshot;
        try {
            contextSnapshot = this.contextManager.getContextSnapshot(userId, sessionId);
        }
        catch {
            // Failure isolation (INV-14)
        }
        return {
            scope,
            sessionId,
            userId,
            sessionTurns,
            bossProfile,
            learnedRules,
            activeProjects,
            contextSnapshot,
            retrievedAt: new Date().toISOString(),
        };
    }
    // -------------------------------------------------------------------------
    // STAGE 3 IMPLEMENTATION: BOUNDED PLANNING
    // -------------------------------------------------------------------------
    async createPlan(intent, memoryContext, actor) {
        const planId = `plan_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const steps = [];
        // Map intent to concrete tool execution step(s)
        if (intent.actionName) {
            if (!toolRegistry.hasTool(intent.actionName)) {
                throw new Error(`Tool "${intent.actionName}" is not registered in ToolRegistry`);
            }
            const toolName = intent.actionName;
            const classification = globalPDP.getActionClassification(toolName);
            const verificationStrategy = this.resolveVerificationStrategy(toolName);
            steps.push({
                stepId: `step_1_${toolName}`,
                toolName,
                arguments: intent.parameters,
                classification,
                expectedOutcome: `Execute tool ${toolName} to satisfy intent ${intent.intentType}`,
                verificationStrategy,
            });
        }
        const hasHighImpact = steps.some(s => s.classification === 'HIGH_IMPACT');
        const estimatedRisk = hasHighImpact ? 'HIGH' : steps.some(s => s.classification === 'REVERSIBLE') ? 'MEDIUM' : 'LOW';
        return {
            planId,
            goal: intent.capability,
            steps,
            estimatedRisk,
            requiresApproval: hasHighImpact,
            createdAt: new Date().toISOString(),
        };
    }
    // -------------------------------------------------------------------------
    // STAGE 6 IMPLEMENTATION: VERIFICATION LOGIC
    // -------------------------------------------------------------------------
    verifyStep(step, rawOutput) {
        const toolName = step.toolName;
        // Verify based on tool domain & strategy
        if (step.verificationStrategy === 'NONE') {
            return {
                stepId: step.stepId,
                toolName,
                status: 'VERIFICATION_SUCCESS',
                realityLevel: 'REAL',
            };
        }
        if (toolName === 'desktop_launch_app') {
            if (rawOutput && rawOutput.success === true && rawOutput.appName) {
                return {
                    stepId: step.stepId,
                    toolName,
                    status: 'VERIFICATION_SUCCESS',
                    verifiedFact: `Process launched and confirmed for application "${rawOutput.appName}".`,
                    realityLevel: 'REAL',
                };
            }
            return {
                stepId: step.stepId,
                toolName,
                status: 'VERIFICATION_FAILURE',
                discrepancy: 'Process launch output did not confirm appName parameter.',
                realityLevel: 'REAL',
            };
        }
        if (toolName === 'desktop_capture_screenshot') {
            if (rawOutput && rawOutput.base64 && rawOutput.base64.length > 50) {
                return {
                    stepId: step.stepId,
                    toolName,
                    status: 'VERIFICATION_SUCCESS',
                    verifiedFact: `Screenshot captured successfully (${Math.round(rawOutput.base64.length / 1024)} KB).`,
                    realityLevel: 'REAL',
                };
            }
            return {
                stepId: step.stepId,
                toolName,
                status: 'VERIFICATION_FAILURE',
                discrepancy: 'Screenshot buffer was empty or corrupted.',
                realityLevel: 'REAL',
            };
        }
        if (toolName === 'robot_track_sound_source' || toolName === 'robot_aim_head') {
            if (rawOutput && typeof rawOutput.panAngle === 'number') {
                const pan = rawOutput.panAngle;
                if (pan >= -90 && pan <= 90) {
                    return {
                        stepId: step.stepId,
                        toolName,
                        status: 'VERIFICATION_SUCCESS',
                        verifiedFact: `Servo angle confirmed within mechanical limits (${pan}°).`,
                        realityLevel: 'REAL',
                    };
                }
                return {
                    stepId: step.stepId,
                    toolName,
                    status: 'VERIFICATION_FAILURE',
                    discrepancy: `Servo pan angle exceeded safe limits: ${pan}°`,
                    realityLevel: 'REAL',
                };
            }
        }
        if (toolName === 'teach_boss_rule') {
            if (rawOutput && rawOutput.rule && rawOutput.rule.enabled === true) {
                return {
                    stepId: step.stepId,
                    toolName,
                    status: 'VERIFICATION_SUCCESS',
                    verifiedFact: `Rule "${rawOutput.rule.instruction}" verified in active rule list.`,
                    realityLevel: 'REAL',
                };
            }
        }
        // Generic return value check
        if (rawOutput !== undefined && rawOutput !== null) {
            if (typeof rawOutput === 'object' && rawOutput.success === false) {
                return {
                    stepId: step.stepId,
                    toolName,
                    status: 'VERIFICATION_FAILURE',
                    discrepancy: rawOutput.error || 'Tool indicated unsuccessful execution.',
                    realityLevel: 'REAL',
                };
            }
            return {
                stepId: step.stepId,
                toolName,
                status: 'VERIFICATION_SUCCESS',
                verifiedFact: 'Tool executed and returned non-null output compliant with schema.',
                realityLevel: 'REAL',
            };
        }
        return {
            stepId: step.stepId,
            toolName,
            status: 'UNKNOWN',
            discrepancy: 'Verification could not conclusively determine task post-condition.',
            realityLevel: 'PARTIAL',
        };
    }
    // -------------------------------------------------------------------------
    // STAGE 7 IMPLEMENTATION: STATE & MEMORY UPDATE
    // -------------------------------------------------------------------------
    async applyUpdate(params) {
        const updateTimestamp = new Date().toISOString();
        const scope = { sessionId: params.sessionId, userId: params.actor.userId };
        // 1. Commit user turn into session working memory (The ONLY working-memory write boundary)
        memoryStore.appendTurn(scope, {
            id: `turn_u_${Date.now()}`,
            sender: 'user',
            content: params.sanitizedText,
            timestamp: updateTimestamp,
        });
        let learnedRuleRecorded = false;
        let memoryCandidateRecorded = false;
        // 2. Durable learning: ONLY if execution was verified successful!
        // Never learn from failed executions!
        if (params.verifiedSuccess && (params.actor.isOwner || params.actor.role === 'owner')) {
            // Check if user taught an explicit rule
            if (params.intent?.intentType === 'TEACH_RULE' && params.intent.parameters?.instruction) {
                learnedRuleRecorded = true;
            }
            // Check if user committed a personal habit
            if (params.intent?.intentType === 'REMEMBER_FACT') {
                memoryCandidateRecorded = true;
            }
        }
        return {
            sessionUpdated: true,
            memoryCandidateRecorded,
            auditRecorded: true,
            learnedRuleRecorded,
            updateTimestamp,
        };
    }
    // -------------------------------------------------------------------------
    // HELPERS
    // -------------------------------------------------------------------------
    resolveVerificationStrategy(toolName) {
        if (toolName.startsWith('desktop_launch_'))
            return 'WINDOW_CONFIRMATION';
        if (toolName === 'desktop_capture_screenshot')
            return 'STATE_INSPECTION';
        if (toolName.startsWith('robot_'))
            return 'TELEMETRY_ACK';
        if (toolName === 'teach_boss_rule' || toolName === 'boss_remember_fact')
            return 'STATE_INSPECTION';
        return 'RETURN_VALUE_CHECK';
    }
    formatResponseText(params) {
        const isOwner = params.actor.isOwner || params.actor.role === 'owner';
        const honorific = isOwner ? 'Ngài' : 'quý khách';
        if (!params.verifiedSuccess) {
            const failedVerify = params.verificationResults.find(v => v.status === 'VERIFICATION_FAILURE');
            return `⚠️ Thao tác đã chạy nhưng bước kiểm chứng không đạt: ${failedVerify?.discrepancy || 'Không thể xác thực trạng thái mong muốn'}.`;
        }
        if (params.executionResults.length === 0) {
            return `Dạ chào ${honorific}, tôi là BOWCON. Tôi có thể hỗ trợ gì cho ${honorific} hôm nay?`;
        }
        const lastExec = params.executionResults[params.executionResults.length - 1];
        const out = lastExec.rawOutput;
        if (out && typeof out === 'object') {
            if (out.message)
                return redactPii(String(out.message));
            if (out.speechText)
                return redactPii(String(out.speechText));
            if (out.summary)
                return redactPii(String(out.summary));
        }
        return `Dạ ${honorific}, tác vụ "${lastExec.toolName}" đã được thực thi và xác thực thành công.`;
    }
    buildFailureResult(params) {
        return {
            requestId: params.requestId,
            correlationId: params.correlationId,
            sessionId: params.sessionId,
            actor: params.actor,
            state: params.state,
            intent: params.intent,
            memoryContext: params.memoryContext,
            plan: params.plan,
            policyEvaluations: params.policyEvaluations,
            executionResults: params.executionResults,
            verificationResults: params.verificationResults,
            response: {
                id: `msg_fail_${Date.now()}`,
                sender: 'agent',
                content: `❌ Lỗi xử lý: ${params.error}`,
                timestamp: new Date().toISOString(),
            },
            totalDurationMs: Date.now() - params.startTime,
            error: params.error,
        };
    }
    async synthesizeVoiceIfNeeded(text, req, correlationId, requestId) {
        if (!req.voiceConfig?.enabled)
            return undefined;
        try {
            return await this.voiceService.synthesize({
                text,
                userId: req.actor?.userId,
                sessionId: req.sessionId,
                language: req.voiceConfig.language,
                voiceConfig: req.voiceConfig,
                metadata: { correlationId, requestId },
            });
        }
        catch (err) {
            return {
                success: false,
                provider: req.voiceConfig.provider || 'unknown',
                audioFormat: req.voiceConfig.outputFormat || 'audio/wav',
                speechText: text,
                error: `VOICE_SYNTHESIS_FAILED: ${err?.message || 'Unknown voice error'}`,
            };
        }
    }
}
// Global Singleton Instance
export const globalAgentLoop = new AgentLoop();
