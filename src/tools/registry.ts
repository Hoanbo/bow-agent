// src/tools/registry.ts
// BOW AGENT V3.3 — EXTENSIBLE TOOL REGISTRY & SCHEMA VALIDATION
// BOWCON V4.0 — CENTRAL TOOL REGISTRY & AUTHORITATIVE GOVERNANCE ENFORCEMENT
// Enforces: Auth/Context -> Atomic Idempotency Check -> PDP Policy Evaluation -> Approval Verification -> Execution -> Idempotency Store -> Audit Ledger

import crypto from 'node:crypto';
import { globalPDP, ActionClassification } from '../core/policyDecisionPoint.js';
import { globalIdempotencyStore } from '../core/idempotencyStore.js';
import { globalAuditLedger } from '../core/auditLedger.js';
import { GovernedPolicyEnforcementPoint, globalGovernedPEP } from '../core/policyEnforcement/index.js';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any, context?: any) => Promise<any>;
}

export interface ToolExecutionContext {
  userId?: string;
  role?: string;
  channel?: string;
  isOwner?: boolean;
  correlationId?: string;
  idempotencyKey?: string;
  executionToken?: string;
  authToken?: string;
  requestedApprovalTimeoutMs?: number;
  retryAttempt?: number;
  actor?: {
    userId?: string;
    role?: string;
    channel?: string;
    isOwner?: boolean;
  };
  [key: string]: any;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private pep: GovernedPolicyEnforcementPoint;

  constructor(pep?: GovernedPolicyEnforcementPoint) {
    this.pep = pep ?? globalGovernedPEP;
  }

  public getPEP(): GovernedPolicyEnforcementPoint {
    return this.pep;
  }

  public register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public hasTool(name: string): boolean {
    return this.tools.has(name);
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
  public async executeTool(name: string, args?: Record<string, any>, context?: ToolExecutionContext): Promise<any> {
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
    } catch (err: any) {
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
    } finally {
      this.pep.releaseLease(decision.leaseId);
    }
  }

  private resolveDomain(toolName: string): 'shop' | 'desktop' | 'robot' | 'dynamic_code' {
    if (toolName.startsWith('desktop_')) return 'desktop';
    if (toolName.startsWith('robot_')) return 'robot';
    if (toolName.includes('skill') || toolName.includes('code')) return 'dynamic_code';
    return 'shop';
  }
}

export const toolRegistry = new ToolRegistry();
