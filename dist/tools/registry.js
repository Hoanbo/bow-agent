// src/tools/registry.ts
// BOW AGENT V3.3 — EXTENSIBLE TOOL REGISTRY & SCHEMA VALIDATION
// BOWCON V4.0 — CENTRAL TOOL REGISTRY & AUTHORITATIVE GOVERNANCE ENFORCEMENT
// Enforces: Auth/Context -> Atomic Idempotency Check -> PDP Policy Evaluation -> Approval Verification -> Execution -> Idempotency Store -> Audit Ledger
import crypto from 'node:crypto';
import { globalIdempotencyStore } from '../core/idempotencyStore.js';
import { globalAuditLedger } from '../core/auditLedger.js';
import { globalGovernedPEP } from '../core/policyEnforcement/index.js';
import { globalBodyRegistry } from '../core/bodyProtocol/index.js';
export class ToolRegistry {
    tools = new Map();
    pep;
    bodyRegistry;
    constructor(pep, bodyRegistry) {
        this.pep = pep ?? globalGovernedPEP;
        this.bodyRegistry = bodyRegistry ?? globalBodyRegistry;
    }
    getPEP() {
        return this.pep;
    }
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    getTool(name) {
        // 1. Kiểm tra static tools đã đăng ký trực tiếp
        const staticTool = this.tools.get(name);
        if (staticTool)
            return staticTool;
        // 2. Tra cứu động từ các Body đang kết nối thông qua BodyRegistry
        const matchingBodies = this.bodyRegistry.findBodiesWithCapability(name);
        if (matchingBodies.length > 0) {
            const candidateBody = matchingBodies[0];
            const descriptor = candidateBody.capabilities.get(name);
            return {
                name,
                description: descriptor?.description || `Body capability provided by ${candidateBody.name}`,
                parameters: descriptor?.parameters || { type: 'object', properties: {} },
                execute: async (args, context) => {
                    const res = await this.bodyRegistry.executeBodyCommand({
                        commandId: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        bodyId: candidateBody.bodyId,
                        capability: name,
                        params: args || {},
                        correlationId: context?.correlationId,
                    });
                    if (!res.success) {
                        throw new Error(`BODY_COMMAND_FAILED: ${res.error || 'Execution failed on body'}`);
                    }
                    return res.data;
                },
            };
        }
        return undefined;
    }
    getAllTools() {
        const combined = new Map(this.tools);
        // Bổ sung các capability từ tất cả các Body đang hoạt động
        for (const body of this.bodyRegistry.getAllActiveBodies()) {
            for (const [capName, descriptor] of body.capabilities.entries()) {
                if (!combined.has(capName)) {
                    combined.set(capName, {
                        name: capName,
                        description: descriptor.description || `Body capability provided by ${body.name}`,
                        parameters: descriptor.parameters || { type: 'object', properties: {} },
                        execute: async (args, context) => {
                            const res = await this.bodyRegistry.executeBodyCommand({
                                commandId: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                                bodyId: body.bodyId,
                                capability: capName,
                                params: args || {},
                                correlationId: context?.correlationId,
                            });
                            if (!res.success) {
                                throw new Error(`BODY_COMMAND_FAILED: ${res.error || 'Execution failed on body'}`);
                            }
                            return res.data;
                        },
                    });
                }
            }
        }
        return Array.from(combined.values());
    }
    hasTool(name) {
        if (this.tools.has(name))
            return true;
        return this.bodyRegistry.findBodiesWithCapability(name).length > 0;
    }
    /**
     * Execute tool with authoritative Level 4 governance boundary:
     * 1. Auth/Context Resolution
     * 2. Atomic Idempotency Check
     * 3. Governed Policy Enforcement Point (PEP) Verification
     * 4. Approval Verification
     * 5. Execution
     * 6. Idempotency Store Commit
     * 7. Append-Only Audit Ledger
     */
    async executeTool(name, args, context) {
        // 1. Tool existence check
        const tool = this.getTool(name);
        if (!tool) {
            throw new Error(`TOOL_NOT_FOUND: Tool "${name}" is not registered in the tool registry.`);
        }
        // 2. Resolve Actor and Context
        const actorUserId = context?.userId || context?.actor?.userId;
        const actorRole = context?.role || context?.actor?.role || 'user';
        const actorChannel = context?.channel || context?.actor?.channel || 'direct';
        const isOwner = context?.isOwner ?? context?.actor?.isOwner ?? (actorRole === 'owner');
        const actor = {
            userId: actorUserId || 'anonymous',
            role: actorRole,
            channel: actorChannel,
            isOwner,
        };
        const correlationId = context?.correlationId || `corr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const idempotencyKey = context?.idempotencyKey || args?.idempotencyKey;
        const executionToken = context?.executionToken || args?.executionToken;
        const domain = this.resolveDomain(name);
        const argsHash = crypto.createHash('sha256').update(JSON.stringify(args || {})).digest('hex');
        const classification = this.pep.getActiveActionClassification(name, actorUserId);
        // 3. Atomic Idempotency Pre-Check
        if (idempotencyKey) {
            const idemCheck = globalIdempotencyStore.check(idempotencyKey, args, actorUserId);
            if (idemCheck.isDuplicate) {
                if (idemCheck.conflict) {
                    globalAuditLedger.record({
                        timestamp: new Date().toISOString(),
                        actor,
                        domain,
                        toolName: name,
                        classification,
                        argumentsHash: argsHash,
                        idempotencyKey,
                        policyDecision: 'DENY',
                        executionStatus: 'BLOCKED',
                    });
                    throw new Error(idemCheck.reason || 'IDEMPOTENCY_CONFLICT: Key reused with conflicting payload');
                }
                // Return cached result without re-executing side effects
                return idemCheck.cachedResult;
            }
        }
        // 4. Governed Policy Enforcement Point (PEP) Verification
        // Precedence: HARD-CODED SAFETY FLOOR > ACTIVE AUTHORIZED POLICY > DEFAULT POLICY
        const decision = this.pep.enforce({
            toolName: name,
            args: args || {},
            actor,
            executionToken,
            idempotencyKey,
            correlationId,
            requestedApprovalTimeoutMs: context?.requestedApprovalTimeoutMs,
            retryAttempt: context?.retryAttempt,
        });
        if (!decision.allowed) {
            // Audit log the denial
            globalAuditLedger.record({
                timestamp: new Date().toISOString(),
                actor,
                domain,
                toolName: name,
                classification: decision.classification,
                argumentsHash: argsHash,
                idempotencyKey,
                policyDecision: 'DENY',
                approvalId: decision.approvalId,
                executionStatus: 'BLOCKED',
            });
            throw new Error(`PDP_REJECTED: ${decision.reason}`);
        }
        // 5. Execute Tool
        try {
            const result = await tool.execute(args, context);
            // 6. Record in Idempotency Store
            if (idempotencyKey) {
                globalIdempotencyStore.record(idempotencyKey, result, args, undefined, actorUserId);
            }
            // 7. Record in Append-Only Audit Ledger
            const resultHash = crypto.createHash('sha256').update(JSON.stringify(result || '')).digest('hex');
            globalAuditLedger.record({
                timestamp: new Date().toISOString(),
                actor,
                domain,
                toolName: name,
                classification: decision.classification,
                argumentsHash: argsHash,
                idempotencyKey,
                policyDecision: 'PERMIT',
                approvalId: decision.approvalId,
                executionStatus: 'SUCCESS',
                resultHash,
            });
            return result;
        }
        catch (err) {
            // Record Execution Failure in Audit Ledger
            globalAuditLedger.record({
                timestamp: new Date().toISOString(),
                actor,
                domain,
                toolName: name,
                classification: decision.classification,
                argumentsHash: argsHash,
                idempotencyKey,
                policyDecision: 'PERMIT',
                approvalId: decision.approvalId,
                executionStatus: 'FAILURE',
            });
            throw err;
        }
        finally {
            this.pep.releaseLease(decision.leaseId);
        }
    }
    resolveDomain(toolName) {
        if (toolName.startsWith('desktop_'))
            return 'desktop';
        if (toolName.startsWith('robot_'))
            return 'robot';
        if (toolName.includes('skill') || toolName.includes('code'))
            return 'dynamic_code';
        return 'shop';
    }
}
export const toolRegistry = new ToolRegistry();
