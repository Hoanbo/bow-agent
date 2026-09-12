// src/core/policyEvidence/policyEvidenceIntegrityVerifier.ts
// BOWCON V4.0 — MS-1.3.63: GOVERNED POLICY EVIDENCE QUERY,
// AUDIT CORRELATION & INTEGRITY VERIFICATION LAYER
//
// Governed Policy Evidence Integrity Verifier (Component 726).
// Independently verifies cryptographic provenance, chronological consistency,
// ring transition monotonicity, tenant isolation, and audit references.
// Strictly read-only: never auto-repairs, never rewrites corrupted records.
//
// Trình xác minh tính toàn vẹn bằng chứng chính sách có quản trị (Thành phần 726).
// Xác minh độc lập nguồn gốc mật mã, tính nhất quán niên đại,
// tính đơn điệu của chuyển đổi vòng, cô lập người thuê và tham chiếu kiểm toán.
// Hoàn toàn chỉ đọc: không bao giờ tự sửa chữa, không bao giờ ghi đè các bản ghi bị hỏng.
//
// Authority Invariants:
// - Level 0 Read-Only Independent Verification
// - VERIFICATION != RECOVERY
// - NO_AUTO_REPAIR: Never modifies or rewrites evidence on integrity failure
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_AUTONOMOUS_PROMOTION
// - USER_STOP > ALL_VERIFICATION_OPERATIONS
// - STRICT_TENANT_ISOLATION

import crypto from 'node:crypto';
import path from 'node:path';
import {
  type IntegrityVerificationId,
  type IntegrityVerificationResult,
  type IntegrityCheckDetail,
  type EvidenceIntegrityStatus,
  createIntegrityVerificationId,
} from './policyEvidenceQueryTypes.js';
import type {
  PolicyCandidateId,
  PolicyRing,
} from '../policyCanary/policyCanaryTypes.js';
import type { PolicyEvidenceRecord } from '../policyObservability/policyObservabilityTypes.js';
import { PolicyCanaryProvenanceEngine, globalPolicyCanaryProvenanceEngine } from '../policyCanary/policyCanaryProvenanceEngine.js';
import { PolicyEvidenceCollector, globalPolicyEvidenceCollector } from '../policyObservability/policyEvidenceCollector.js';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

const RING_NUMERIC_MAP: Record<PolicyRing, number> = {
  RING_0: 0,
  RING_1: 1,
  RING_2: 2,
  RING_3: 3,
  RING_4: 4,
};

export interface PolicyEvidenceIntegrityVerifierOptions {
  readonly provenanceEngine?: PolicyCanaryProvenanceEngine;
  readonly evidenceCollector?: PolicyEvidenceCollector;
  readonly auditLedger?: AuditLedger;
  readonly sanitizer?: DiagnosisSanitizer;
  readonly isUserStopActive?: () => boolean;
}

export class PolicyEvidenceIntegrityVerifier {
  private readonly provenanceEngine: PolicyCanaryProvenanceEngine;
  private readonly evidenceCollector: PolicyEvidenceCollector;
  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyEvidenceIntegrityVerifierOptions) {
    this.provenanceEngine = options?.provenanceEngine ?? globalPolicyCanaryProvenanceEngine;
    this.evidenceCollector = options?.evidenceCollector ?? globalPolicyEvidenceCollector;
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Integrity verification suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('INTEGRITY_VERIFICATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), path.resolve(process.cwd(), 'data', 'partitions'));
  }

  /**
   * Independently verifies the end-to-end evidence and provenance integrity for a candidate.
   * Does NOT mutate state. Does NOT repair data. Strictly reports findings.
   *
   * Xác minh độc lập tính toàn vẹn của bằng chứng và nguồn gốc đầu-cuối cho một ứng viên.
   * KHÔNG làm đột biến trạng thái. KHÔNG sửa chữa dữ liệu. Hoàn toàn báo cáo các phát hiện.
   */
  public verifyIntegrity(
    tenantPartition: string,
    candidateId: PolicyCandidateId
  ): IntegrityVerificationResult {
    // 1. Fail-closed on USER_STOP
    this.assertUserStopInactive();

    // 2. Strict tenant isolation
    this.validateTenant(tenantPartition);

    if (!candidateId || typeof candidateId !== 'string' || candidateId.trim().length === 0) {
      throw new Error('INVALID_CANDIDATE_ID: candidateId must be a non-empty string');
    }

    const checkDetails: IntegrityCheckDetail[] = [];
    const failureReasons: string[] = [];

    // ------------------------------------------------------------------------
    // Check 1: Cryptographic Provenance Hash Chain
    // Kiểm tra 1: Chuỗi băm nguồn gốc mật mã
    // ------------------------------------------------------------------------
    const provenanceResult = this.provenanceEngine.verifyChain(candidateId);
    let provenanceValid = provenanceResult.valid;
    let provenanceRecordCount = provenanceResult.recordCount;
    let provenanceHeadHash = provenanceResult.headHash;
    let provenanceTampered = false;

    if (!provenanceValid) {
      const sanitizedReason = this.sanitizer.sanitizeString(
        provenanceResult.reason ?? 'Provenance chain validation failed'
      );
      checkDetails.push({
        checkName: 'PROVENANCE_HASH_CHAIN',
        passed: false,
        reason: sanitizedReason,
      });
      if (provenanceRecordCount > 0) {
        provenanceTampered = true;
        failureReasons.push(`PROVENANCE_CHAIN_FAILURE: ${sanitizedReason}`);
      }
    } else {
      checkDetails.push({
        checkName: 'PROVENANCE_HASH_CHAIN',
        passed: true,
      });
    }

    // ------------------------------------------------------------------------
    // Check 2: Tenant Isolation Consistency
    // Kiểm tra 2: Tính nhất quán của cô lập người thuê
    // ------------------------------------------------------------------------
    const tenantRecords = this.evidenceCollector.getAll(tenantPartition);
    const candidateEvidence = tenantRecords.filter(r => {
      if ('candidateId' in r && r.candidateId) {
        return r.candidateId === candidateId;
      }
      return false;
    });

    const provenanceRecords = this.provenanceEngine.getChain(candidateId);
    let tenantConsistent = true;

    for (const prov of provenanceRecords) {
      if (prov.tenantPartition !== tenantPartition) {
        tenantConsistent = false;
        const msg = `Cross-tenant provenance detected: record ${prov.provenanceId} belongs to '${prov.tenantPartition}', expected '${tenantPartition}'`;
        checkDetails.push({
          checkName: 'TENANT_ISOLATION_CONSISTENCY',
          passed: false,
          reason: msg,
        });
        failureReasons.push(`TENANT_ISOLATION_FAILURE: ${msg}`);
        break;
      }
    }

    if (tenantConsistent) {
      checkDetails.push({
        checkName: 'TENANT_ISOLATION_CONSISTENCY',
        passed: true,
      });
    }

    // ------------------------------------------------------------------------
    // Check 3: Candidate Policy Version Consistency
    // Kiểm tra 3: Tính nhất quán phiên bản chính sách ứng viên
    // ------------------------------------------------------------------------
    let detectedVersion = '';
    let versionConsistent = true;

    for (const prov of provenanceRecords) {
      if (!detectedVersion && prov.candidatePolicyVersion) {
        detectedVersion = prov.candidatePolicyVersion;
      } else if (detectedVersion && prov.candidatePolicyVersion && prov.candidatePolicyVersion !== detectedVersion) {
        versionConsistent = false;
        const msg = `Policy version mismatch in provenance: found '${prov.candidatePolicyVersion}', expected '${detectedVersion}'`;
        checkDetails.push({
          checkName: 'POLICY_VERSION_CONSISTENCY',
          passed: false,
          reason: msg,
        });
        failureReasons.push(`POLICY_VERSION_FAILURE: ${msg}`);
        break;
      }
    }

    for (const ev of candidateEvidence) {
      if ('candidatePolicyVersion' in ev && ev.candidatePolicyVersion) {
        if (!detectedVersion) {
          detectedVersion = ev.candidatePolicyVersion;
        } else if (ev.candidatePolicyVersion !== detectedVersion) {
          versionConsistent = false;
          const msg = `Policy version mismatch in evidence: found '${ev.candidatePolicyVersion}', expected '${detectedVersion}'`;
          checkDetails.push({
            checkName: 'POLICY_VERSION_CONSISTENCY',
            passed: false,
            reason: msg,
          });
          failureReasons.push(`POLICY_VERSION_FAILURE: ${msg}`);
          break;
        }
      }
    }

    if (versionConsistent) {
      checkDetails.push({
        checkName: 'POLICY_VERSION_CONSISTENCY',
        passed: true,
      });
    }

    // ------------------------------------------------------------------------
    // Check 4: Ring Transition Monotonicity
    // Kiểm tra 4: Tính đơn điệu chuyển đổi vòng
    // ------------------------------------------------------------------------
    let ringMonotonic = true;
    let highestRingSeen = 0;
    let rollbackSeen = false;

    // Sort candidate evidence and provenance chronologically
    type CombinedEvent = { timestamp: string; ring: PolicyRing; isRollback: boolean; id: string };
    const combinedEvents: CombinedEvent[] = [];

    for (const prov of provenanceRecords) {
      combinedEvents.push({
        timestamp: prov.timestamp,
        ring: prov.ring,
        isRollback: prov.eventType === 'ROLLBACK',
        id: prov.provenanceId,
      });
    }
    for (const ev of candidateEvidence) {
      let ring: PolicyRing | undefined;
      if ('currentRing' in ev && ev.currentRing) ring = ev.currentRing;
      if ('rolledBackRing' in ev && ev.rolledBackRing) ring = ev.rolledBackRing;
      if ('targetRing' in ev && ev.targetRing) ring = ev.targetRing;

      if (ring) {
        combinedEvents.push({
          timestamp: ev.timestamp,
          ring,
          isRollback: ev.eventType === 'ROLLBACK',
          id: ev.evidenceId,
        });
      }
    }

    combinedEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    for (const evt of combinedEvents) {
      const ringNum = RING_NUMERIC_MAP[evt.ring] ?? 0;
      if (evt.isRollback) {
        rollbackSeen = true;
        continue;
      }
      if (!rollbackSeen && ringNum < highestRingSeen) {
        ringMonotonic = false;
        const msg = `Non-monotonic ring transition: transitioned to ring '${evt.ring}' (${ringNum}) without prior rollback (highest was ${highestRingSeen})`;
        checkDetails.push({
          checkName: 'RING_TRANSITION_MONOTONICITY',
          passed: false,
          reason: msg,
        });
        failureReasons.push(`RING_TRANSITION_FAILURE: ${msg}`);
        break;
      }
      if (ringNum > highestRingSeen) {
        highestRingSeen = ringNum;
      }
    }

    if (ringMonotonic) {
      checkDetails.push({
        checkName: 'RING_TRANSITION_MONOTONICITY',
        passed: true,
      });
    }

    // ------------------------------------------------------------------------
    // Check 5: Chronological Order Consistency
    // Kiểm tra 5: Tính nhất quán thứ tự thời gian
    // ------------------------------------------------------------------------
    let chronologicalValid = true;
    for (let i = 1; i < provenanceRecords.length; i++) {
      const prev = provenanceRecords[i - 1];
      const curr = provenanceRecords[i];
      if (curr.timestamp < prev.timestamp) {
        chronologicalValid = false;
        const msg = `Provenance timestamps travel backward: record ${curr.provenanceId} (${curr.timestamp}) is earlier than ${prev.provenanceId} (${prev.timestamp})`;
        checkDetails.push({
          checkName: 'CHRONOLOGICAL_CONSISTENCY',
          passed: false,
          reason: msg,
        });
        failureReasons.push(`CHRONOLOGICAL_ORDER_FAILURE: ${msg}`);
        break;
      }
    }

    if (chronologicalValid) {
      checkDetails.push({
        checkName: 'CHRONOLOGICAL_CONSISTENCY',
        passed: true,
      });
    }

    // ------------------------------------------------------------------------
    // Check 6: Audit References & Audit Ledger Chain Integrity
    // Kiểm tra 6: Tham chiếu kiểm toán & tính toàn vẹn chuỗi AuditLedger
    // ------------------------------------------------------------------------
    const auditIntegrity = this.auditLedger.verifyChainIntegrity();
    let auditReferencesValid = auditIntegrity;

    if (!auditIntegrity) {
      const msg = 'AuditLedger cryptographic hash chain integrity check failed';
      checkDetails.push({
        checkName: 'AUDIT_LEDGER_CHAIN_INTEGRITY',
        passed: false,
        reason: msg,
      });
      failureReasons.push(`AUDIT_INTEGRITY_FAILURE: ${msg}`);
    } else {
      checkDetails.push({
        checkName: 'AUDIT_LEDGER_CHAIN_INTEGRITY',
        passed: true,
      });
    }

    // ------------------------------------------------------------------------
    // Final Status Determination
    // Xác định trạng thái cuối cùng
    // ------------------------------------------------------------------------
    let status: EvidenceIntegrityStatus = 'VALID';

    const hasCriticalFailures =
      provenanceTampered ||
      !tenantConsistent ||
      !versionConsistent ||
      !ringMonotonic ||
      !chronologicalValid ||
      !auditReferencesValid;

    if (hasCriticalFailures) {
      status = 'INVALID';
    } else if (provenanceRecordCount === 0 && candidateEvidence.length === 0) {
      status = 'MISSING';
    } else if (provenanceRecordCount === 0 && candidateEvidence.length > 0) {
      // Evidence exists but provenance chain is missing -> DEGRADED
      status = 'DEGRADED';
      failureReasons.push('EVIDENCE_DEGRADED: Evidence records exist but provenance chain is unrecorded');
    }

    return Object.freeze({
      verificationId: createIntegrityVerificationId(
        `vfy_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
      ),
      tenantPartition,
      candidateId,
      candidatePolicyVersion: detectedVersion || 'UNKNOWN',
      status,
      provenanceValid,
      provenanceRecordCount,
      provenanceHeadHash,
      chronologicalOrderValid: chronologicalValid,
      ringTransitionsMonotonic: ringMonotonic,
      tenantIsolationConsistent: tenantConsistent,
      policyVersionConsistent: versionConsistent,
      auditReferencesValid,
      checkDetails: Object.freeze(checkDetails),
      failureReasons: Object.freeze(failureReasons),
      verifiedAt: new Date().toISOString(),
    });
  }
}

export const globalPolicyEvidenceIntegrityVerifier = new PolicyEvidenceIntegrityVerifier();
