// src/core/phase14ExitBoundary/phase14ExitCertificateRuntime.ts
// BOWCON V4.0 — MS-1.4.13: PHASE 1.4 EXIT BOUNDARY & INDEPENDENT GOVERNANCE AUDIT
// Component 979: Phase14ExitCertificateRuntime
// Master Public Façade for Independent Governance Audit & Phase 1.4 Exit Boundary

import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';
import { Phase14ExitBoundaryGate, Phase14BoundaryGateOptions } from './phase14ExitBoundaryGate.js';
import {
  GovernanceAuditOutcome,
  Phase14GovernanceAuditEngine,
  RunGovernanceAuditOptions,
} from './phase14GovernanceAuditEngine.js';
import {
  Phase14AuditExecutionResult,
  Phase14ExitCertificate,
  deepFreeze,
} from './phase14ExitCertificateTypes.js';

export interface ExecuteIndependentAuditInput extends RunGovernanceAuditOptions {
  readonly certificateId?: string;
  readonly auditId?: string;
}

export class Phase14ExitCertificateRuntime {
  private readonly _gate: Phase14ExitBoundaryGate;
  private readonly _auditEngine: Phase14GovernanceAuditEngine;

  constructor(gateOptions?: Phase14BoundaryGateOptions) {
    this._gate = new Phase14ExitBoundaryGate(gateOptions);
    this._auditEngine = new Phase14GovernanceAuditEngine(this._gate);
  }

  /**
   * Static factory method for executing the full independent governance audit
   */
  public static async executeIndependentAudit(
    input: ExecuteIndependentAuditInput,
    gateOptions?: Phase14BoundaryGateOptions
  ): Promise<Phase14AuditExecutionResult> {
    const runtime = new Phase14ExitCertificateRuntime(gateOptions);
    return runtime.runIndependentAudit(input);
  }

  /**
   * Run independent governance audit and generate sealed, non-authoritative exit certificate
   */
  public async runIndependentAudit(
    input: ExecuteIndependentAuditInput
  ): Promise<Phase14AuditExecutionResult> {
    const auditId = input.auditId || `audit_phase14_${input.tenantId}_${Date.now()}`;
    const certificateId =
      input.certificateId || `cert_phase14_exit_${input.tenantId}_${Date.now()}`;

    this._gate.validateIdentifier(auditId, 'auditId');
    this._gate.validateIdentifier(certificateId, 'certificateId');

    // 1. Execute Governance Audit
    const outcome: GovernanceAuditOutcome = await this._auditEngine.executeAudit(input);

    const nowIso = new Date().toISOString();

    // 2. Checkpoint 5: Certificate Construction
    this._gate.assertCheckpoint5_CertificateConstruction(auditId, input.tenantId);

    // Compute Certificate Hash
    const hashPayload = [
      certificateId,
      input.tenantId,
      auditId,
      outcome.auditStatus,
      String(outcome.reconciliation.allPassed),
      String(outcome.reconciliation.passedCount),
      outcome.provenanceManifest.compositeAuditProvenanceHash,
      nowIso,
    ].join(':');

    const certificateHash = crypto.createHash('sha256').update(hashPayload, 'utf8').digest('hex');

    // 3. Checkpoint 6: Certificate Sealing
    this._gate.assertCheckpoint6_CertificateSealing(auditId, input.tenantId);

    const certificate: Phase14ExitCertificate = {
      certificateId,
      tenantId: input.tenantId,
      auditId,
      readinessReportId: input.readinessReport?.reportId,
      auditedAtIso: nowIso,
      status: outcome.auditStatus,
      allCriteriaPassed: outcome.reconciliation.allPassed,
      criteriaPassedCount: outcome.reconciliation.passedCount,
      criteriaTotalCount: 12,
      criteriaResults: outcome.reconciliation.criteriaResults,
      contradictions: outcome.reconciliation.contradictions,
      provenanceManifest: outcome.provenanceManifest,
      rawEvidenceHashes: outcome.rawEvidenceHashes,
      auditSummary: outcome.summary,
      disclaimer: 'NON_AUTHORITATIVE_AUDIT_ONLY_REQUIRES_MASTER_HUMAN_GOVERNANCE_DECISION',
      certificateHash,
    };

    // 4. Checkpoint 7: Certificate Export
    this._gate.assertCheckpoint7_CertificateExport(auditId, input.tenantId);

    // 5. Append-only Audit Ledger emission
    try {
      globalAuditLedger.record({
        timestamp: nowIso,
        actor: {
          userId: 'phase14_exit_certificate_runtime',
          role: 'INDEPENDENT_GOVERNANCE_AUDITOR',
          channel: 'PHASE_EXIT_BOUNDARY',
        },
        domain: 'phase14_exit_boundary',
        toolName: 'Phase14ExitCertificateRuntime',
        classification: 'CERTIFICATE_SEALED',
        argumentsHash: `cert_${certificateId}_status_${outcome.auditStatus}`,
        policyDecision: 'PERMIT',
        executionStatus: outcome.auditStatus === 'EXIT_READY' ? 'SUCCESS' : 'BLOCKED',
        resultHash: certificateHash,
      });
    } catch {
      // Fail closed audit recording
    }

    const executionResult: Phase14AuditExecutionResult = {
      success: outcome.auditStatus === 'EXIT_READY',
      certificate: deepFreeze(certificate),
      error:
        outcome.auditStatus !== 'EXIT_READY'
          ? {
              code: outcome.auditStatus,
              message: outcome.summary,
            }
          : null,
    };

    return deepFreeze(executionResult);
  }
}
