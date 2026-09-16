// src/core/governedPolicyDecisionIngestion/AuthoritativePolicyRatificationEngine.ts
// Component 1171: AuthoritativePolicyRatificationEngine (REAL)
//
// Authoritative PDP ratification gate. Converts verified handoff packages into legally binding
// ratified policy records. Enforces constitutional invariants and version OCC/CAS.
// Cổng chuẩn phê chuẩn chính sách PDP có thẩm quyền. Chuyển đổi các gói bàn giao đã xác minh thành
// bản ghi chính sách đã được phê chuẩn có tính ràng buộc; thực thi nguyên tắc hiến pháp và OCC/CAS.

import { createHmac } from 'crypto';
import type { PolicyDelta, PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import {
  AuthoritativePolicyRatificationError,
  PolicyVersionOCCConflictError,
  PolicyIngestionInterlockActiveError,
  computeRatificationRecordHash,
  type AuthoritativeRatificationRecord,
} from './GovernedPolicyDecisionIngestionTypes.js';
import type { ValidatedIntakeRecord } from './PdpPolicyHandoffIntakeGateway.js';
import type { GovernanceKeyProvider, HumanVerificationResult } from './HumanDecisionTokenVerificationEngine.js';

export const SUPREME_FORBIDDEN_MODIFICATIONS = Object.freeze([
  'transfer_funds',
  'delete_database',
  'bypass_robot_interlocks',
  'execute_untrusted_host_script',
  'disable_audit_ledger',
  'expand_autonomy_lease_indefinitely',
  'bypass_human_approval',
]);

export interface AuthoritativePolicyRatificationEngineOptions {
  ratificationSecret?: string;
  keyProvider?: GovernanceKeyProvider;
  keyId?: string;
  isUserStopActive?: (tenantId?: string) => boolean;
  isEmergencyStopActive?: (domain?: string) => boolean;
}

export class AuthoritativePolicyRatificationEngine {
  private readonly ratificationRecords = new Map<string, AuthoritativeRatificationRecord>();
  private readonly activeVersionMap = new Map<string, number>(); // tenantId:policyDomain -> version
  private readonly pdpAuthorityId = 'PDP_MASTER_AUTHORITY_V4';
  private readonly ratificationSecret: string;
  private readonly isUserStopActiveFn?: (tenantId?: string) => boolean;
  private readonly isEmergencyStopActiveFn?: (domain?: string) => boolean;

  constructor(options?: AuthoritativePolicyRatificationEngineOptions) {
    let secret: string | undefined;
    if (options?.keyProvider) {
      secret = options.keyProvider.resolveKey(options.keyId ?? 'bow-pdp-rat-v1');
    } else if (options?.ratificationSecret) {
      secret = options.ratificationSecret;
    } else if (process.env.BOW_GOVERNANCE_HMAC_SECRET) {
      secret = process.env.BOW_GOVERNANCE_HMAC_SECRET;
    }

    if (!secret || typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') !== 32) {
      throw new AuthoritativePolicyRatificationError(
        'RATIFICATION_KEY_UNAVAILABLE: Valid 256-bit ratification key must be provisioned via KeyProvider or configuration.'
      );
    }
    this.ratificationSecret = secret;
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.isEmergencyStopActiveFn = options?.isEmergencyStopActive;
  }

  /**
   * Authoritatively ratify a validated handoff package into a canonical ratified policy record.
   * Phê chuẩn có thẩm quyền gói bàn giao đã được xác minh thành bản ghi chính sách chuẩn.
   */
  public ratifyPolicy(
    intake: ValidatedIntakeRecord,
    humanVerification: HumanVerificationResult,
    deltas: PolicyDelta[],
    expectedBaseVersion: number
  ): AuthoritativeRatificationRecord {
    // 1. Interlock Check: EMERGENCY_STOP > USER_STOP
    if (!this.isEmergencyStopActiveFn) throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: ratification fails closed.');
    let emergencyStopActive: boolean;
    try { emergencyStopActive = this.isEmergencyStopActiveFn(intake.policyDomain); }
    catch { throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: ratification fails closed.'); }
    if (typeof emergencyStopActive !== 'boolean') throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_PROVIDER_INVALID: ratification fails closed.');
    if (emergencyStopActive) {
      throw new PolicyIngestionInterlockActiveError(
        `EMERGENCY_STOP_ACTIVE: Ingestion & ratification blocked by supreme emergency stop for domain '${intake.policyDomain}'.`
      );
    }
    if (this.isUserStopActiveFn?.(intake.tenantId)) {
      throw new PolicyIngestionInterlockActiveError(
        `USER_STOP_ACTIVE: Ingestion & ratification blocked by active user stop for tenant '${intake.tenantId}'.`
      );
    }

    if (!humanVerification.verified) {
      throw new AuthoritativePolicyRatificationError('UNVERIFIED_HUMAN_DECISION: PDP ratification requires cryptographically verified sole-human evidence.');
    }
    if (humanVerification.proposalId !== intake.proposalId || humanVerification.policyDeltaHash !== intake.policyDeltaHash) {
      throw new AuthoritativePolicyRatificationError(
        `PROPOSAL_MISMATCH: Verification proposal '${humanVerification.proposalId}' does not match intake '${intake.proposalId}'.`
      );
    }

    // 3. Supreme Constitutional Invariant Evaluation
    this.assertConstitutionalInvariants(deltas);

    // 4. Version Monotonicity & OCC/CAS Check
    const key = `${intake.tenantId}:${intake.policyDomain}`;
    const currentVersion = this.activeVersionMap.get(key) || 0;

    if (expectedBaseVersion !== currentVersion) {
      throw new PolicyVersionOCCConflictError(
        `OCC_VERSION_CONFLICT: Expected base version ${expectedBaseVersion} does not match current version ${currentVersion} for domain '${intake.policyDomain}'.`
      );
    }

    const newVersion = currentVersion + 1;
    const ratificationId = `rat_${intake.tenantId}_v${newVersion}_${Date.now()}`;
    const ratifiedAt = Date.now();

    // 5. Compute Ratification Record and PDP Signature
    const rawRecord: Omit<AuthoritativeRatificationRecord, 'ratificationSignature'> = {
      ratificationId,
      handoffId: intake.handoffId,
      proposalId: intake.proposalId,
      tenantId: intake.tenantId,
      policyDomain: intake.policyDomain as PolicyDomain,
      policyVersion: newVersion,
      parentVersion: currentVersion,
      canonicalPolicyHash: intake.intakeHash,
      dossierProvenanceHash: intake.dossierProvenanceHash,
      humanSignatures: [humanVerification.tokenHash],
      ratifiedBy: this.pdpAuthorityId,
      ratifiedAt,
      status: 'RATIFIED',
    };

    const signaturePayload = `${ratificationId}:${intake.tenantId}:${intake.policyDomain}:${newVersion}:${ratifiedAt}`;
    const ratificationSignature = createHmac('sha256', this.ratificationSecret).update(signaturePayload).digest('hex');

    const finalizedRecord: AuthoritativeRatificationRecord = {
      ...rawRecord,
      ratificationSignature,
    };

    // Update active version mapping and persist in memory
    this.activeVersionMap.set(key, newVersion);
    this.ratificationRecords.set(ratificationId, finalizedRecord);

    return Object.freeze(finalizedRecord);
  }

  public getRatificationRecord(ratificationId: string): AuthoritativeRatificationRecord | undefined {
    return this.ratificationRecords.get(ratificationId);
  }

  public getCurrentVersion(tenantId: string, policyDomain: string): number {
    return this.activeVersionMap.get(`${tenantId}:${policyDomain}`) || 0;
  }

  // --- Constitutional Invariant Subroutine ---
  private assertConstitutionalInvariants(deltas: PolicyDelta[]): void {
    for (const delta of deltas) {
      // Check if target is a supreme forbidden action
      const pathLower = delta.fieldPath.toLowerCase();
      for (const forbidden of SUPREME_FORBIDDEN_MODIFICATIONS) {
        if (pathLower.includes(forbidden)) {
          throw new AuthoritativePolicyRatificationError(
            `CONSTITUTIONAL_VIOLATION: Policy delta for '${delta.fieldPath}' attempts to alter supreme forbidden invariant '${forbidden}'.`
          );
        }
      }

      // Check if trying to turn FORBIDDEN into ALLOW directly
      const proposedStr = String(delta.proposedValue);
      const currentStr = String(delta.currentValue);
      if (proposedStr === 'ALLOW' && (currentStr === 'FORBIDDEN' || pathLower.includes('forbidden'))) {
        throw new AuthoritativePolicyRatificationError(
          `HARD_FORBIDDEN_EROSION: Cannot relax FORBIDDEN classification for '${delta.fieldPath}' to ALLOW.`
        );
      }
    }
  }
}
