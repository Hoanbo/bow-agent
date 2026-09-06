// src/core/policyDecisionPoint.ts
// BOWCON V4.0 — CENTRAL POLICY DECISION POINT (PDP), APPROVAL LEDGER & AUDIT TRAIL
//
// Compliant with ISO/IEC 42001, ISO/IEC 23894, and NIST AI RMF:
// 1. Single Policy Decision Point before every tool / side-effect execution (Default Deny).
// 2. Action Classification: OBSERVE, RECOMMEND, REVERSIBLE, HIGH_IMPACT, FORBIDDEN.
// 3. One-Time Execution Token for High Impact Actions with Human Approval.
// 4. Idempotency Key Validation (Zero Duplicate Side-Effects).
// 5. Append-Only Cryptographic Audit Ledger.
// 6. Global & Per-Domain Kill Switches (emergency stop).

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  globalApprovalService,
  ApprovalService,
  ApprovalRecord,
  ApprovalStatus,
} from './approvalService.js';
import {
  globalIdempotencyStore,
  IdempotencyStore,
  IdempotencyEntry,
} from './idempotencyStore.js';
import {
  globalAuditLedger,
  AuditLedger,
  AuditEvent,
} from './auditLedger.js';

export * from './approvalService.js';
export * from './idempotencyStore.js';
export * from './auditLedger.js';

export type ActionClassification =
  | 'OBSERVE'
  | 'RECOMMEND'
  | 'REVERSIBLE'
  | 'HIGH_IMPACT'
  | 'FORBIDDEN';

export interface PolicyDecision {
  allowed: boolean;
  classification: ActionClassification;
  requiresApproval: boolean;
  reason: string;
  approvalId?: string;
  decisionTimestamp: string;
}


// ---------------------------------------------------------------------------
// 1. ACTION CLASSIFICATION REGISTRY
// ---------------------------------------------------------------------------

const ACTION_CLASSIFICATIONS: Record<string, ActionClassification> = {
  // 1. OBSERVE (Read-only, no side effects)
  'get_sales_report': 'OBSERVE',
  'get_profit_margin_report': 'OBSERVE',
  'get_inventory_health': 'OBSERVE',
  'get_pending_fulfillment_queue': 'OBSERVE',
  'inspect_screen_notifications': 'OBSERVE',
  'desktop_capture_screenshot': 'OBSERVE',
  'get_user_wallet': 'OBSERVE',
  'get_user_orders': 'OBSERVE',
  'search_products': 'OBSERVE',
  'get_product_detail': 'OBSERVE',
  'get_warranty_policy': 'OBSERVE',
  'boss_recall_memory': 'OBSERVE',
  'get_morning_briefing': 'OBSERVE',

  // 2. RECOMMEND (Inference without state change)
  'inspect_order_dispute': 'RECOMMEND',
  'evaluate_restock_needs': 'RECOMMEND',
  'recommend_voucher_campaign': 'RECOMMEND',

  // 3. REVERSIBLE (Low-impact, reversible actions)
  'boss_remember_fact': 'REVERSIBLE',
  'teach_boss_rule': 'REVERSIBLE',
  'desktop_smarthome_control': 'REVERSIBLE',
  'desktop_launch_app': 'REVERSIBLE',
  'desktop_send_keys': 'REVERSIBLE',
  'desktop_mouse_action': 'REVERSIBLE',
  'robot_aim_head': 'REVERSIBLE',
  'robot_track_sound_source': 'REVERSIBLE',
  'send_telegram_briefing_to_boss': 'REVERSIBLE',

  // 4. HIGH_IMPACT (Irreversible side effects -> require approval token)
  'fulfill_order_handover': 'HIGH_IMPACT',
  'manage_shop_vouchers': 'HIGH_IMPACT',
  'desktop_reply_message': 'HIGH_IMPACT',
  'desktop_execute_code': 'HIGH_IMPACT',
  'delegate_subagent_task': 'HIGH_IMPACT',

  // 5. FORBIDDEN (Strictly forbidden actions)
  'transfer_funds': 'FORBIDDEN',
  'delete_database': 'FORBIDDEN',
  'bypass_robot_interlocks': 'FORBIDDEN',
  'execute_untrusted_host_script': 'FORBIDDEN',
};

// ---------------------------------------------------------------------------
// 2. CENTRAL POLICY DECISION POINT & LEDGER CLASS
// ---------------------------------------------------------------------------

export class PolicyDecisionPoint {
  private approvalService: ApprovalService;
  private idempotencyStore: IdempotencyStore;
  private auditLedger: AuditLedger;

  // Domain Kill Switches
  private globalKillSwitch = false;
  private domainKillSwitches = {
    shop: false,
    desktop: false,
    robot: false,
    dynamic_code: false,
  };

  constructor(
    customAuditPath?: string,
    approvalService?: ApprovalService,
    idempotencyStore?: IdempotencyStore,
    auditLedger?: AuditLedger
  ) {
    if (customAuditPath) {
      this.auditLedger = auditLedger || new AuditLedger(customAuditPath);
      this.approvalService = approvalService || new ApprovalService();
      this.idempotencyStore = idempotencyStore || new IdempotencyStore();
    } else {
      this.approvalService = approvalService || globalApprovalService;
      this.idempotencyStore = idempotencyStore || globalIdempotencyStore;
      this.auditLedger = auditLedger || globalAuditLedger;
    }
  }

  // --- Kill Switch Controls ---
  public setGlobalKillSwitch(active: boolean): void {
    this.globalKillSwitch = active;
  }

  public setDomainKillSwitch(domain: 'shop' | 'desktop' | 'robot' | 'dynamic_code', active: boolean): void {
    this.domainKillSwitches[domain] = active;
  }

  public isEmergencyStopped(domain?: 'shop' | 'desktop' | 'robot' | 'dynamic_code'): boolean {
    if (this.globalKillSwitch) return true;
    if (domain && this.domainKillSwitches[domain]) return true;
    return false;
  }

  public getKillSwitchStatus() {
    return {
      global: this.globalKillSwitch,
      domains: { ...this.domainKillSwitches },
    };
  }

  // --- Action Classification ---
  public getActionClassification(toolName: string): ActionClassification {
    return ACTION_CLASSIFICATIONS[toolName] || 'HIGH_IMPACT'; // Default to HIGH_IMPACT if unknown
  }

  public registerActionPolicy(toolName: string, classification: ActionClassification): void {
    ACTION_CLASSIFICATIONS[toolName] = classification;
  }

  // --- Policy Decision Evaluation ---
  public evaluate(params: {
    toolName: string;
    args: Record<string, any>;
    actor: { userId?: string; role?: string; channel?: string; isOwner?: boolean };
    executionToken?: string;
    idempotencyKey?: string;
    consumeToken?: boolean;
  }): PolicyDecision {
    const timestamp = new Date().toISOString();
    const classification = this.getActionClassification(params.toolName);

    // 1. Check Global and Domain Kill Switches
    const domain = this.resolveDomain(params.toolName);
    if (this.isEmergencyStopped(domain)) {
      return {
        allowed: false,
        classification,
        requiresApproval: false,
        reason: `EMERGENCY_STOP_ACTIVE: Domain ${domain} or Global Kill Switch is engaged.`,
        decisionTimestamp: timestamp,
      };
    }

    // 2. Check Forbidden Actions
    if (classification === 'FORBIDDEN') {
      return {
        allowed: false,
        classification: 'FORBIDDEN',
        requiresApproval: false,
        reason: `POLICY_VIOLATION: Action '${params.toolName}' is strictly FORBIDDEN by Autonomy Charter.`,
        decisionTimestamp: timestamp,
      };
    }

    // 3. Observe Actions -> Auto-allow
    if (classification === 'OBSERVE') {
      return {
        allowed: true,
        classification,
        requiresApproval: false,
        reason: 'Read-only observation permitted by policy.',
        decisionTimestamp: timestamp,
      };
    }

    // 4. Recommend Actions -> Auto-allow without side effect
    if (classification === 'RECOMMEND') {
      return {
        allowed: true,
        classification,
        requiresApproval: false,
        reason: 'Recommendation generation permitted by policy.',
        decisionTimestamp: timestamp,
      };
    }

    // 5. Reversible Actions -> Require Owner or Authorized Context
    const isOwner = params.actor.role === 'owner' || params.actor.isOwner === true;
    if (classification === 'REVERSIBLE') {
      if (!isOwner && params.actor.role !== 'admin' && params.actor.role !== 'desktop_agent') {
        return {
          allowed: false,
          classification,
          requiresApproval: false,
          reason: 'FORBIDDEN_ACCESS: Reversible action requires owner/admin authorization.',
          decisionTimestamp: timestamp,
        };
      }
      return {
        allowed: true,
        classification,
        requiresApproval: false,
        reason: 'Reversible side-effect authorized for owner/authorized channel.',
        decisionTimestamp: timestamp,
      };
    }

    // 6. High-Impact Actions -> Require Owner Approval Token
    if (classification === 'HIGH_IMPACT') {
      // If executionToken is provided, validate (and optionally consume) via authoritative ApprovalService
      if (params.executionToken) {
        const tokenValidation = params.consumeToken === false
          ? this.approvalService.validateToken(
              params.executionToken,
              params.toolName,
              params.args,
              params.actor?.userId
            )
          : this.approvalService.validateAndConsumeToken(
              params.executionToken,
              params.toolName,
              params.args,
              params.actor?.userId
            );

        if (tokenValidation.valid) {
          return {
            allowed: true,
            classification,
            requiresApproval: false,
            approvalId: tokenValidation.record?.id,
            reason: params.consumeToken === false
              ? 'High-impact execution token validated.'
              : 'High-impact execution token validated and consumed.',
            decisionTimestamp: timestamp,
          };
        }
        return {
          allowed: false,
          classification,
          requiresApproval: true,
          reason: `INVALID_APPROVAL_TOKEN: ${tokenValidation.reason}`,
          decisionTimestamp: timestamp,
        };
      }

      // Otherwise, reject and demand explicit human approval
      const approvalRecord = this.approvalService.requestApproval({
        actionName: params.toolName,
        targetDomain: domain,
        arguments: params.args,
        requestedBy: params.actor.userId || 'agent_autonomous',
        userId: params.actor.userId,
      });
      return {
        allowed: false,
        classification,
        requiresApproval: true,
        approvalId: approvalRecord.id,
        reason: `HIGH_IMPACT_APPROVAL_REQUIRED: Action requires explicit confirmation from Ngài. Approval ID: ${approvalRecord.id}`,
        decisionTimestamp: timestamp,
      };
    }

    return {
      allowed: false,
      classification: 'HIGH_IMPACT',
      requiresApproval: true,
      reason: 'DEFAULT_DENY: No policy rule permits this execution.',
      decisionTimestamp: timestamp,
    };
  }

  // --- Approval Management (Authoritative Delegation) ---
  public requestApproval(params: {
    actionName: string;
    targetDomain: 'shop' | 'desktop' | 'robot' | 'system' | 'dynamic_code';
    arguments: Record<string, any>;
    requestedBy: string;
    userId?: string;
    correlationId?: string;
    ttlSeconds?: number;
  }): ApprovalRecord {
    return this.approvalService.requestApproval(params);
  }

  public grantApproval(
    approvalId: string,
    approver: string,
    userId?: string
  ): { success: boolean; executionToken?: string; error?: string } {
    return this.approvalService.grantApproval(approvalId, approver, userId);
  }

  public rejectApproval(approvalId: string, rejector: string, userId?: string): boolean {
    return this.approvalService.rejectApproval(approvalId, rejector, userId);
  }

  public revokeApproval(approvalId: string, reason?: string, userId?: string): boolean {
    return this.approvalService.revokeApproval(approvalId, reason, userId);
  }

  public getApproval(approvalId: string, userId?: string): ApprovalRecord | undefined {
    return this.approvalService.getApproval(approvalId, userId);
  }

  public getAllApprovals(userId?: string): ApprovalRecord[] {
    return this.approvalService.getAllApprovals(userId);
  }

  // --- Idempotency Store (Authoritative Delegation) ---
  public checkIdempotency(
    key?: string,
    payload?: any,
    userId?: string
  ): { isDuplicate: boolean; cachedResult?: any; reason?: string; conflict?: boolean; inProgress?: boolean } {
    return this.idempotencyStore.check(key, payload, userId);
  }

  public recordIdempotency(key: string, result: any, payload?: any, ttlMs?: number, userId?: string): void {
    this.idempotencyStore.record(key, result, payload, ttlMs, userId);
  }

  // --- Append-Only Cryptographic Audit Ledger (Authoritative Delegation) ---
  public recordAuditEvent(eventData: Omit<AuditEvent, 'eventId' | 'previousHash' | 'signature'>): AuditEvent {
    return this.auditLedger.record(eventData);
  }

  public verifyAuditLedgerIntegrity(): boolean {
    return this.auditLedger.verifyChainIntegrity();
  }

  public getAuditTrail(): AuditEvent[] {
    return this.auditLedger.getAuditTrail();
  }

  public getApprovalService(): ApprovalService {
    return this.approvalService;
  }

  public getIdempotencyStore(): IdempotencyStore {
    return this.idempotencyStore;
  }

  public getAuditLedger(): AuditLedger {
    return this.auditLedger;
  }

  public resolveDomain(toolName: string): 'shop' | 'desktop' | 'robot' | 'dynamic_code' {
    if (toolName.startsWith('desktop_')) return 'desktop';
    if (toolName.startsWith('robot_')) return 'robot';
    if (toolName.includes('skill') || toolName.includes('code')) return 'dynamic_code';
    return 'shop';
  }
}

export const globalPDP = new PolicyDecisionPoint();
