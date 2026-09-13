// src/core/phase14ExitBoundary/independentEvidenceCollector.ts
// BOWCON V4.0 — MS-1.4.13: PHASE 1.4 EXIT BOUNDARY & INDEPENDENT GOVERNANCE AUDIT
// Component 975: IndependentEvidenceCollector
// Read-Only Collector of Independent Repository & Subsystem Evidence

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { Phase14ExitBoundaryGate } from './phase14ExitBoundaryGate.js';
import {
  Phase14EvidenceItem,
  Phase14EvidenceSource,
  deepFreeze,
} from './phase14ExitCertificateTypes.js';

export interface EvidenceCollectionOptions {
  readonly tenantId: string;
  readonly auditLedgerPath?: string;
  readonly protectedWorkspacePath?: string;
  readonly overrideFilesystemCheck?: () => boolean;
  readonly rawEvidenceOverrides?: readonly Phase14EvidenceItem[];
}

export class IndependentEvidenceCollector {
  private readonly _gate: Phase14ExitBoundaryGate;

  constructor(gate: Phase14ExitBoundaryGate) {
    this._gate = gate;
  }

  private hashData(data: Record<string, unknown>): string {
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
  }

  /**
   * Collect all independent evidence streams across repository and runtime artifacts
   */
  public async collectEvidence(
    options: EvidenceCollectionOptions
  ): Promise<readonly Phase14EvidenceItem[]> {
    this._gate.assertCheckpoint2_EvidenceCollection(options.tenantId);

    const evidence: Phase14EvidenceItem[] = [];
    const nowIso = new Date().toISOString();

    // 1. Filesystem Probe for Protected Workspace C:\BOW\shopofbow
    const protectedPath = options.protectedWorkspacePath || 'C:\\BOW\\shopofbow';
    let shopExists = false;
    if (options.overrideFilesystemCheck) {
      shopExists = options.overrideFilesystemCheck();
    } else {
      try {
        shopExists = fs.existsSync(protectedPath);
      } catch {
        shopExists = false;
      }
    }

    const fsData = {
      path: protectedPath,
      exists: shopExists,
      verifiedUntouched: !shopExists,
    };
    evidence.push({
      source: 'FILESYSTEM_PROBE',
      evidenceId: `ev_fs_${options.tenantId}_${Date.now()}`,
      tenantId: options.tenantId,
      observedAtIso: nowIso,
      payloadHash: this.hashData(fsData),
      data: fsData,
    });

    // 2. Audit Ledger Inspection
    let ledgerLinesCount = 0;
    let corrupted = false;
    let unauthorizedToolsFound = 0;
    const ledgerFile = options.auditLedgerPath || path.resolve(process.cwd(), 'data/audit_ledger.jsonl');

    if (fs.existsSync(ledgerFile)) {
      try {
        const content = fs.readFileSync(ledgerFile, 'utf8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        ledgerLinesCount = lines.length;

        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            // Check for unpermitted tool dispatch
            if (event.domain === 'tool_execution' && event.policyDecision !== 'PERMIT') {
              unauthorizedToolsFound++;
            }
          } catch {
            corrupted = true;
          }
        }
      } catch {
        corrupted = true;
      }
    }

    const corruptionStatus = globalAuditLedger.getCorruptionStatus();
    if (corruptionStatus.hasCorruption) {
      corrupted = true;
    }

    const auditData = {
      ledgerFile,
      recordsCount: ledgerLinesCount,
      hasCorruption: corrupted,
      unauthorizedToolsCount: unauthorizedToolsFound,
    };
    evidence.push({
      source: 'AUDIT_LEDGER',
      evidenceId: `ev_audit_${options.tenantId}_${Date.now()}`,
      tenantId: options.tenantId,
      observedAtIso: nowIso,
      payloadHash: this.hashData(auditData),
      data: auditData,
    });

    // 3. Regression Record Inspection (Verify 93/93 suites baseline)
    const runnerPath = path.resolve(process.cwd(), 'scratch/run_full_regression.mjs');
    let totalRegisteredSuites = 0;
    let runnerExists = false;

    if (fs.existsSync(runnerPath)) {
      runnerExists = true;
      try {
        const runnerContent = fs.readFileSync(runnerPath, 'utf8');
        const match = runnerContent.match(/const suites = \[([\s\S]*?)\];/);
        if (match && match[1]) {
          const rawItems = match[1]
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.startsWith("'") || s.startsWith('"'));
          totalRegisteredSuites = rawItems.length;
        }
      } catch {
        // Ignored
      }
    }

    const regData = {
      runnerPath,
      runnerExists,
      totalRegisteredSuites,
      expectedBaselineSuites: 93,
      baselineSatisfied: totalRegisteredSuites >= 93,
    };
    evidence.push({
      source: 'REGRESSION_RECORD',
      evidenceId: `ev_regression_${options.tenantId}_${Date.now()}`,
      tenantId: options.tenantId,
      observedAtIso: nowIso,
      payloadHash: this.hashData(regData),
      data: regData,
    });

    // 4. Secret Sanitization Scan
    const samplePayload = {
      token: 'test_token_sample',
      apiKey: 'test_api_key_sample',
      safeMetric: 100,
    };
    const sanitizedSample = globalDiagnosisSanitizer.sanitize(samplePayload);
    const sanitizationEffective =
      (sanitizedSample as any).token === '[REDACTED]' &&
      (sanitizedSample as any).apiKey === '[REDACTED]';

    const sanityData = {
      sanitizationEffective,
      sanitizerClass: 'DiagnosisSanitizer',
    };
    evidence.push({
      source: 'SANITY_SCAN',
      evidenceId: `ev_sanity_${options.tenantId}_${Date.now()}`,
      tenantId: options.tenantId,
      observedAtIso: nowIso,
      payloadHash: this.hashData(sanityData),
      data: sanityData,
    });

    // Append custom overrides if passed in
    if (options.rawEvidenceOverrides) {
      for (const override of options.rawEvidenceOverrides) {
        evidence.push(override);
      }
    }

    return deepFreeze(evidence);
  }
}
