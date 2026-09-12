// tests/test_v4_agent_governed_self_diagnosis_decision_support.ts
// BOWCON V4.0 — MS-1.3.54: GOVERNED AUTONOMOUS SELF-DIAGNOSIS, INCIDENT CLASSIFICATION & SUPERVISOR DECISION-SUPPORT SYNTHESIS
//
// Reality Gate verifying autonomous self-diagnosis, deterministic hypothesis formulation,
// anti-majority dissent preservation, decision-support synthesis, and strict advisory boundaries.
// Cổng Thực tế xác minh việc tự chẩn đoán có quản trị, xây dựng giả thuyết xác định,
// bảo toàn dị ý chống bỏ phiếu đa số, tổng hợp hỗ trợ quyết định và ranh giới khuyến nghị nghiêm ngặt.
//
// Categories A through N:
// A. Branded IDs / immutable contracts
// B. Temporal & topological evidence correlation
// C. Deterministic hypothesis formulation & pattern matching
// D. Confidence & uncertainty bounds (C <= 0.95, C + U === 1.0)
// E. Deterministic incident severity & blast-radius classification
// F. Strict differentiation between UNKNOWN and CONFLICTED
// G. Rejection of majority voting & verbatim dissent preservation
// H. Decision-support package completeness & immutable boundary markers
// I. JSON and Markdown serialization fidelity
// J. Secret and credential scrubbing from all diagnostic artifacts
// K. Cryptographic SHA-256 provenance chain & tamper detection
// L. Authority non-bypass & zero autonomous repair
// M. Protected workspace isolation (C:\BOW\shopofbow untouched)
// N. Prohibited primitive detection (zero child_process / execSync / spawn / fork)
//
// Critical Security Guarantees:
// 1. globalWorldActionAuth.issueToken() CALL COUNT === 0
// 2. SupervisorHumanGate.approve() CALL COUNT === 0
// 3. ProposedRemediationAction: requiresHumanApproval === true, isAutomatedExecutionPermitted === false
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  createIncidentId,
  createHypothesisId,
  createDecisionPackageId,
  createEvidenceClusterId,
  globalDiagnosisSanitizer,
  DiagnosisSanitizer,
  EvidenceCorrelationEngine,
  RootCauseHypothesisEngine,
  IncidentClassificationEngine,
  DiagnosisContradictionEngine,
  DiagnosisProvenanceEngine,
  DecisionSupportSynthesizer,
  DiagnosisRuntime,
  type CorrelatedEvidenceCluster,
  type RootCauseHypothesis,
  type IncidentClassification,
  type AgentDiagnosticAssertion,
} from '../src/core/diagnosis/index.js';
import {
  createObservabilitySessionId,
  createInvariantCheckId,
  createDriftEventId,
  createObservabilityAlertId,
  type InvariantCheck,
  type DriftEvent,
  type ObservabilityAlert,
} from '../src/core/observability/observabilityTypes.js';
import { globalWorldActionAuth } from '../src/core/world-action/worldActionAuthorization.js';
import { globalSupervisorHumanGate } from '../src/core/supervisor/supervisorHumanGate.js';
import { SandboxPathGuard } from '../src/core/sandbox/sandboxPathGuard.js';
import { globalAuditLedger } from '../src/core/auditLedger.js';

let passedAssertions = 0;
function pass(category: string, name: string): void {
  passedAssertions++;
  console.log(`  ✓ [${category}] ${name}`);
}

async function runRealityGate(): Promise<void> {
  console.log('\n======================================================================');
  console.log('BOWCON V4.0 — MS-1.3.54 REALITY GATE');
  console.log('GOVERNED AUTONOMOUS SELF-DIAGNOSIS & DECISION-SUPPORT SYNTHESIS');
  console.log('======================================================================\n');

  // Spy tracking for critical security invariants
  let issueTokenCallCount = 0;
  const originalIssueToken = globalWorldActionAuth.issueToken.bind(globalWorldActionAuth);
  globalWorldActionAuth.issueToken = (request: any) => {
    issueTokenCallCount++;
    return originalIssueToken(request);
  };

  let approveCallCount = 0;
  const originalApprove = globalSupervisorHumanGate.approve.bind(globalSupervisorHumanGate);
  globalSupervisorHumanGate.approve = (requestId: string, operatorId: string, context?: any) => {
    approveCallCount++;
    return originalApprove(requestId, operatorId, context);
  };

  try {
    const sessionId = createObservabilitySessionId('test_obs_session_54');
    const targetId = 'service_payment_api';
    const now = Date.now();

    // -------------------------------------------------------------------------
    // CATEGORY A: Canonical Branded IDs & Immutable Contracts (2 assertions)
    // -------------------------------------------------------------------------
    console.log('Category A: Canonical Branded IDs & Immutable Contracts');
    {
      const incId = createIncidentId('inc_123');
      const hypId = createHypothesisId('hyp_123');
      const pkgId = createDecisionPackageId('pkg_123');
      const cluId = createEvidenceClusterId('clu_123');

      assert.strictEqual(typeof incId, 'string');
      assert.strictEqual(typeof hypId, 'string');
      assert.strictEqual(typeof pkgId, 'string');
      assert.strictEqual(typeof cluId, 'string');
      pass('A', 'Branded ID creators construct strictly typed identifier strings');

      const sanitizer = new DiagnosisSanitizer();
      const inputObj = { apiKey: 'secret_key_12345', target: 'api' };
      const outputObj = sanitizer.sanitize(inputObj);
      assert.notStrictEqual(inputObj, outputObj, 'Sanitizer must return a fresh copy');
      assert.strictEqual(inputObj.apiKey, 'secret_key_12345', 'Original object must not be mutated');
      assert.strictEqual(outputObj.apiKey, '[REDACTED]', 'Sanitized copy must redact secret');
      pass('A', 'Deep immutability preserved during object sanitization');
    }

    // -------------------------------------------------------------------------
    // CATEGORY B: Temporal & Topological Evidence Correlation (3 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory B: Temporal & Topological Evidence Correlation');
    const correlationEngine = new EvidenceCorrelationEngine();
    let cluster: CorrelatedEvidenceCluster;
    {
      const invariantCheck: InvariantCheck = {
        invariantId: createInvariantCheckId('inv_cpu_probe'),
        sessionId,
        targetId,
        name: 'CPU_MAX_THRESHOLD',
        category: 'PROBE',
        expectedValue: '<85%',
        observedValue: '98%',
        status: 'VIOLATED',
        reason: 'Host CPU threshold breached at 98%',
        evaluatedAt: now - 10_000,
        evidenceHash: 'hash_inv_cpu_probe',
      };

      const driftEvent: DriftEvent = {
        eventId: createDriftEventId('drift_config_1'),
        detectionId: 'det_1' as any,
        sessionId,
        targetId,
        driftType: 'CONFIGURATION',
        classification: 'CRITICAL_DRIFT',
        expectedState: 'pool_size=50',
        observedState: 'pool_size=10',
        diffSummary: 'Connection pool shrunk unexpectedly',
        detectedAt: now - 5_000,
        evidenceHash: 'hash_drift_config_1',
      };

      const alert: ObservabilityAlert = {
        alertId: createObservabilityAlertId('alert_err_rate'),
        sessionId,
        severity: 'WARNING',
        targetId,
        reason: 'Error rate slightly elevated to 2.5%',
        observationRefs: ['sample_1'],
        evidenceRefs: ['evidence_1'],
        timestamp: now - 2_000,
        fingerprint: 'fp_err_rate_25',
        provenance: 'prov_err_rate',
        recommendedEscalation: 'NOTIFY_SUPERVISOR',
      };

      // Item outside window (should be excluded)
      const oldAlert: ObservabilityAlert = {
        alertId: createObservabilityAlertId('alert_old'),
        sessionId,
        severity: 'HIGH',
        targetId,
        reason: 'Old alert outside window',
        observationRefs: [],
        evidenceRefs: [],
        timestamp: now - 120_000, // 2 minutes ago (outside 60s window)
        fingerprint: 'fp_old',
        provenance: 'prov_old',
        recommendedEscalation: 'NONE',
      };

      cluster = correlationEngine.correlate({
        sessionId,
        targetId,
        referenceTime: now,
        windowDurationMs: 60_000,
        invariantChecks: [invariantCheck],
        driftEvents: [driftEvent],
        alerts: [alert, oldAlert],
      });

      assert.strictEqual(cluster.items.length, 3, 'Old alert outside window must be excluded');
      pass('B', 'Temporal window bounds correctly filter out-of-window signals');

      // Check evidence weighting
      assert.ok(cluster.totalWeight > 1.0, 'Total weight must reflect aggregated evidence importance');
      pass('B', 'Evidence weights aggregated deterministically');

      // Check reproducible clusterHash
      const cluster2 = correlationEngine.correlate({
        sessionId,
        targetId,
        referenceTime: now,
        windowDurationMs: 60_000,
        invariantChecks: [invariantCheck],
        driftEvents: [driftEvent],
        alerts: [alert, oldAlert],
      });
      assert.strictEqual(cluster.clusterHash, cluster2.clusterHash, 'Cluster hash must be deterministic for identical inputs');
      pass('B', 'Cluster SHA-256 hash is deterministic and reproducible');
    }

    // -------------------------------------------------------------------------
    // CATEGORY C: Deterministic Hypothesis Formulation & Patterns (3 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory C: Deterministic Hypothesis Formulation & Pattern Matching');
    const hypothesisEngine = new RootCauseHypothesisEngine();
    let hypotheses: readonly RootCauseHypothesis[];
    {
      hypotheses = hypothesisEngine.evaluateHypotheses(cluster);

      assert.ok(hypotheses.length >= 2, 'Should match multiple failure patterns (CONFIGURATION_DRIFT & RESOURCE_EXHAUSTION)');
      pass('C', 'Preserves multiple matching hypotheses without collapsing into a single fact');

      const primary = hypotheses[0];
      assert.strictEqual(primary.isPrimary, true, 'Top ranked hypothesis must be marked primary');
      assert.strictEqual(hypotheses[1].isPrimary, false, 'Alternative hypothesis must not be marked primary');
      pass('C', 'Primary vs alternative hypotheses accurately differentiated');

      assert.ok(
        hypotheses.some((h) => h.category === 'CONFIGURATION_DRIFT') &&
        hypotheses.some((h) => h.category === 'RESOURCE_EXHAUSTION'),
        'Identifies both configuration drift and resource exhaustion'
      );
      pass('C', 'Topological pattern matcher accurately maps correlated evidence');
    }

    // -------------------------------------------------------------------------
    // CATEGORY D: Confidence & Uncertainty Bounds (3 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory D: Confidence & Uncertainty Mathematical Bounds');
    {
      for (const h of hypotheses) {
        assert.ok(h.confidenceScore <= 0.95, `Confidence ${h.confidenceScore} must never exceed 0.95 ceiling`);
        assert.ok(h.confidenceScore >= 0.05, `Confidence ${h.confidenceScore} must never fall below 0.05 floor`);
        pass('D', `Hypothesis [${h.category}] confidence score bounded in [0.05, 0.95]`);

        // Floating point precision check: C + U === 1.0
        const sum = Number((h.confidenceScore + h.uncertaintyScore).toFixed(4));
        assert.strictEqual(sum, 1.0, `Confidence (${h.confidenceScore}) + Uncertainty (${h.uncertaintyScore}) must equal 1.0`);
        pass('D', `Hypothesis [${h.category}] satisfies C + U === 1.0 epistemic equality`);
      }

      // Test extreme corroboration (can never breach 0.95)
      const massiveCluster: CorrelatedEvidenceCluster = {
        ...cluster,
        items: Array.from({ length: 50 }, (_, i) => ({
          evidenceId: `ev_${i}`,
          source: 'INVARIANT',
          category: 'PROBE',
          timestamp: now,
          severity: 'HIGH',
          description: 'High CPU violation',
          evidenceHash: `hash_${i}`,
          weight: 1.0,
        })),
      };
      const hyperHypotheses = hypothesisEngine.evaluateHypotheses(massiveCluster);
      assert.ok(hyperHypotheses[0].confidenceScore <= 0.95, 'Even 50 supporting items cannot breach 0.95 confidence ceiling');
      pass('D', 'Hypothesis confidence ceiling of 0.95 holds under extreme corroboration');
    }

    // -------------------------------------------------------------------------
    // CATEGORY E: Deterministic Severity & Blast Radius (3 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory E: Deterministic Incident Severity & Blast-Radius Classification');
    const classificationEngine = new IncidentClassificationEngine();
    let classification: IncidentClassification;
    {
      classification = classificationEngine.classify({
        cluster,
        hypotheses,
        currentHealth: 'DEGRADED',
        telemetrySampleCount: 20,
      });

      assert.strictEqual(classification.severity, 'MEDIUM', 'Multi-metric drift and non-critical invariant yields MEDIUM severity');
      pass('E', 'Deterministic severity rules classify multi-metric drift as MEDIUM');

      assert.ok(classification.blastRadius === 'SUBSYSTEM' || classification.blastRadius === 'SYSTEM_WIDE');
      pass('E', 'Multi-subsystem impact correctly scales blast radius beyond single COMPONENT');

      // Test CRITICAL escalation rule
      const criticalCluster: CorrelatedEvidenceCluster = {
        ...cluster,
        items: [
          ...cluster.items,
          {
            evidenceId: 'inv_protected_viol',
            source: 'INVARIANT',
            category: 'PROTECTED_WORKSPACE',
            timestamp: now,
            severity: 'CRITICAL',
            description: 'Protected workspace touch attempted',
            evidenceHash: 'hash_pw',
            weight: 1.0,
          },
        ],
      };
      const criticalClass = classificationEngine.classify({
        cluster: criticalCluster,
        hypotheses,
        currentHealth: 'DEGRADED',
      });
      assert.strictEqual(criticalClass.severity, 'CRITICAL', 'Protected workspace invariant breach must force CRITICAL severity');
      assert.strictEqual(criticalClass.blastRadius, 'SYSTEM_WIDE', 'CRITICAL severity forces SYSTEM_WIDE blast radius');
      pass('E', 'Boundary invariant breach immediately forces CRITICAL severity and SYSTEM_WIDE blast radius');
    }

    // -------------------------------------------------------------------------
    // CATEGORY F: Strict Differentiation: UNKNOWN vs CONFLICTED (2 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory F: Strict Differentiation between UNKNOWN and CONFLICTED');
    {
      // UNKNOWN: Insufficient sample count
      const unknownClass = classificationEngine.classify({
        cluster,
        hypotheses,
        currentHealth: 'UNKNOWN',
        telemetrySampleCount: 1, // Below minimum 3
      });
      assert.strictEqual(unknownClass.severity, 'UNKNOWN', 'Sample count < 3 must classify as UNKNOWN');
      pass('F', 'Insufficient telemetry samples deterministic classification is UNKNOWN');

      // CONFLICTED: Disagreement flag active
      const conflictedClass = classificationEngine.classify({
        cluster,
        hypotheses,
        currentHealth: 'HEALTHY',
        telemetrySampleCount: 20,
        isConflicted: true,
      });
      assert.strictEqual(conflictedClass.severity, 'CONFLICTED', 'Conflicted flag must classify as CONFLICTED');
      pass('F', 'Multi-agent assertion conflict deterministic classification is CONFLICTED');
    }

    // -------------------------------------------------------------------------
    // CATEGORY G: Rejection of Majority Voting & Dissent Preservation (3 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory G: Rejection of Majority Voting & Verbatim Dissent Preservation');
    const contradictionEngine = new DiagnosisContradictionEngine();
    {
      // 3 agents assert DB failure, 1 agent dissents with Network partition
      const assertions: AgentDiagnosticAssertion[] = [
        {
          agentId: 'agent_alpha',
          targetId,
          timestamp: now,
          assertedCategory: 'DATABASE_DEGRADATION',
          assertedSeverity: 'HIGH',
          assertedHealthState: 'UNSTABLE',
          confidenceScore: 0.85,
          evidenceHash: 'hash_a',
          reasoning: 'Database connection pool exhausted',
        },
        {
          agentId: 'agent_beta',
          targetId,
          timestamp: now,
          assertedCategory: 'DATABASE_DEGRADATION',
          assertedSeverity: 'HIGH',
          assertedHealthState: 'UNSTABLE',
          confidenceScore: 0.80,
          evidenceHash: 'hash_b',
          reasoning: 'DB slow query log saturation',
        },
        {
          agentId: 'agent_gamma',
          targetId,
          timestamp: now,
          assertedCategory: 'DATABASE_DEGRADATION',
          assertedSeverity: 'HIGH',
          assertedHealthState: 'UNSTABLE',
          confidenceScore: 0.75,
          evidenceHash: 'hash_c',
          reasoning: 'Replication lag exceeded 5000ms',
        },
        {
          agentId: 'agent_dissent',
          targetId,
          timestamp: now,
          assertedCategory: 'NETWORK_PARTITION', // Minority dissent!
          assertedSeverity: 'CRITICAL',
          assertedHealthState: 'CRITICAL',
          confidenceScore: 0.90,
          evidenceHash: 'hash_d',
          reasoning: 'TCP SYN timeouts to DB subnet indicate routing blackhole',
        },
      ];

      const contradictionResult = contradictionEngine.evaluateAssertions(assertions);
      assert.strictEqual(contradictionResult.hasContradiction, true);
      assert.strictEqual(contradictionResult.isConflicted, true);
      pass('G', '3-to-1 majority does NOT eliminate contradiction (Majority voting rejected)');

      assert.strictEqual(contradictionResult.dissentingViews.length, 4, 'All 4 agent viewpoints preserved verbatim');
      assert.ok(
        contradictionResult.dissentingViews.some((d) => d.agentId === 'agent_dissent' && d.assertedCause.includes('NETWORK_PARTITION')),
        'Minority dissenting view preserved with full evidence and reasoning'
      );
      pass('G', 'Minority dissent preserved verbatim without suppression');

      assert.ok(contradictionResult.confidenceCap <= 0.40, 'Contradiction enforces maximum confidence cap of 0.40');
      pass('G', 'Contradictory assertions degrade confidence ceiling to <= 0.40');
    }

    // -------------------------------------------------------------------------
    // CATEGORY H: Decision-Support Package Completeness & Boundary Markers (2 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory H: Decision-Support Package Completeness & Boundary Markers');
    const synthesizer = new DecisionSupportSynthesizer();
    let decisionPackage = synthesizer.synthesize({
      classification,
      cluster,
      hypotheses,
      currentHealth: 'DEGRADED',
      telemetrySampleHashes: ['sample_hash_1', 'sample_hash_2'],
      invariantEvidenceHashes: ['inv_hash_1'],
      driftEvidenceHashes: ['drift_hash_1'],
      alertFingerprints: ['alert_fp_1'],
    });
    {
      assert.strictEqual(
        decisionPackage.autonomousExecutionBoundary,
        'STRICT_NO_AUTONOMOUS_EXECUTION_ENFORCED',
        'Autonomous execution boundary marker must be strictly present'
      );
      assert.ok(decisionPackage.packageId.startsWith('pkg_inc_'));
      assert.ok(decisionPackage.evidenceHash.length === 64);
      assert.ok(decisionPackage.packageHash.length === 64);
      assert.ok(decisionPackage.provenanceSignature.length === 64);
      pass('H', 'Decision-support package contains all mandatory cryptographic and identity fields');

      // Proposed actions verification
      assert.ok(decisionPackage.recommendedActions.length > 0, 'Must provide at least one recommended action');
      for (const action of decisionPackage.recommendedActions) {
        assert.strictEqual(action.requiresHumanApproval, true, 'requiresHumanApproval must be hardcoded true');
        assert.strictEqual(action.isAutomatedExecutionPermitted, false, 'isAutomatedExecutionPermitted must be hardcoded false');
        assert.ok(action.riskScore >= 1 && action.riskScore <= 10, 'Risk score must be bounded in [1, 10]');
      }
      pass('H', 'All proposed remediation actions are strictly inert DTOs with isAutomatedExecutionPermitted: false');
    }

    // -------------------------------------------------------------------------
    // CATEGORY I: JSON and Markdown Serialization Fidelity (2 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory I: JSON and Markdown Serialization Fidelity');
    {
      const jsonOutput = decisionPackage.toJSON();
      assert.strictEqual(typeof jsonOutput, 'object');
      assert.strictEqual(jsonOutput.packageId, decisionPackage.packageId);
      assert.strictEqual(jsonOutput.autonomousExecutionBoundary, 'STRICT_NO_AUTONOMOUS_EXECUTION_ENFORCED');
      // Verify no functions exist in JSON object
      for (const [k, v] of Object.entries(jsonOutput)) {
        assert.notStrictEqual(typeof v, 'function', `Key ${k} must not serialize to a function`);
      }
      pass('I', 'toJSON() returns pure serialized dictionary free of executable functions');

      const markdownOutput = decisionPackage.toMarkdownSummary();
      assert.ok(markdownOutput.includes('# SUPERVISOR DECISION-SUPPORT PACKAGE'));
      assert.ok(markdownOutput.includes('STRICT_NO_AUTONOMOUS_EXECUTION_ENFORCED'));
      assert.ok(markdownOutput.includes('1. Ranked Root-Cause Hypotheses'));
      assert.ok(markdownOutput.includes('3. Recommended Remediation Options (Human Review Only)'));
      pass('I', 'toMarkdownSummary() produces comprehensive, human-readable supervisor briefing');
    }

    // -------------------------------------------------------------------------
    // CATEGORY J: Secret and Credential Scrubbing (2 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory J: Secret and Credential Scrubbing from Diagnostic Artifacts');
    {
      const sensitiveEvidence = {
        title: 'Crash with authorization header',
        authHeader: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive_payload.signature',
        dbConnectionString: 'postgres://admin:super_secret_pw@db.internal:5432/orders',
        apiKey: 'AIzaSyD-unauthorized-credential-12345',
        details: 'Failed request with token abcdef1234567890 in URL',
      };

      const sanitized = globalDiagnosisSanitizer.sanitize(sensitiveEvidence);
      assert.strictEqual(sanitized.authHeader, '[REDACTED]');
      assert.strictEqual(sanitized.apiKey, '[REDACTED]');
      assert.ok(!JSON.stringify(sanitized).includes('super_secret_pw'), 'Password in connection string must be redacted');
      assert.ok(!JSON.stringify(sanitized).includes('AIzaSyD'), 'API key must be redacted');
      pass('J', 'In-memory sanitizer deeply redacts tokens, headers, connection strings, and keys');

      const sanitizedStr = globalDiagnosisSanitizer.sanitizeString('Bearer my_secret_token_123');
      assert.strictEqual(sanitizedStr, 'Bearer [REDACTED]');
      pass('J', 'String-level pattern replacement reliably redacts inline bearer tokens');
    }

    // -------------------------------------------------------------------------
    // CATEGORY K: Cryptographic SHA-256 Provenance & Tamper Detection (2 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory K: Cryptographic SHA-256 Provenance & Tamper Detection');
    const provenanceEngine = new DiagnosisProvenanceEngine();
    {
      const prov1 = provenanceEngine.buildProvenance({
        packageId: decisionPackage.packageId,
        incidentId: decisionPackage.incidentId,
        sessionId: decisionPackage.sessionId,
        evidenceCluster: cluster,
        hypotheses,
        telemetrySampleHashes: ['hash_1', 'hash_2'],
        alertFingerprints: ['fp_1'],
        timestamp: 1_700_000_000_000,
      });

      const prov2 = provenanceEngine.buildProvenance({
        packageId: decisionPackage.packageId,
        incidentId: decisionPackage.incidentId,
        sessionId: decisionPackage.sessionId,
        evidenceCluster: cluster,
        hypotheses,
        telemetrySampleHashes: ['hash_2', 'hash_1'], // Reversed order
        alertFingerprints: ['fp_1'],
        timestamp: 1_700_000_000_000,
      });

      assert.strictEqual(prov1.signature, prov2.signature, 'Signatures must match regardless of input array ordering');
      pass('K', 'Deterministic sorting ensures reproducible SHA-256 provenance signatures');

      // Tamper simulation: changing an evidence hash changes signature
      const provTampered = provenanceEngine.buildProvenance({
        packageId: decisionPackage.packageId,
        incidentId: decisionPackage.incidentId,
        sessionId: decisionPackage.sessionId,
        evidenceCluster: cluster,
        hypotheses,
        telemetrySampleHashes: ['hash_1', 'hash_tampered'],
        alertFingerprints: ['fp_1'],
        timestamp: 1_700_000_000_000,
      });
      assert.notStrictEqual(prov1.signature, provTampered.signature, 'Tampered evidence hashes must yield different signature');
      pass('K', 'Tamper-evident verification detects modified evidence digests in provenance chain');
    }

    // -------------------------------------------------------------------------
    // CATEGORY L: Authority Non-Bypass & Zero Autonomous Repair (2 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory L: Authority Non-Bypass & Zero Autonomous Repair');
    const runtime = new DiagnosisRuntime();
    {
      // Run complete diagnosis workflow
      const fullDiagnosis = runtime.diagnoseIncident({
        sessionId,
        targetId,
        referenceTime: now,
        invariantChecks: cluster.items.filter((i) => i.source === 'INVARIANT') as any,
        driftEvents: cluster.items.filter((i) => i.source === 'DRIFT') as any,
        alerts: cluster.items.filter((i) => i.source === 'ALERT') as any,
        currentHealth: 'DEGRADED',
      });

      assert.strictEqual(typeof fullDiagnosis.incidentId, 'string');
      assert.ok(fullDiagnosis.confidenceScore <= 0.95);

      // Submit to SupervisorHumanGate
      const gateSubmission = runtime.submitToSupervisorGate(fullDiagnosis);
      assert.ok(gateSubmission.requestId.startsWith('gate_'));
      assert.strictEqual(gateSubmission.status, 'PENDING');
      pass('L', 'Full diagnosis workflow executes strictly in advisory plane and submits PENDING request');

      // CRITICAL SECURITY ASSERTION: issueToken() and approve() must be 0!
      assert.strictEqual(issueTokenCallCount, 0, 'CRITICAL SECURITY: issueToken() MUST NEVER be called during diagnosis');
      assert.strictEqual(approveCallCount, 0, 'CRITICAL SECURITY: SupervisorHumanGate.approve() MUST NEVER be called by diagnosis runtime');
      pass('L', 'Zero token issuance and zero gate auto-approval strictly verified at runtime (issueToken=0, approve=0)');
    }

    // -------------------------------------------------------------------------
    // CATEGORY M: Protected Workspace Isolation (C:\BOW\shopofbow) (2 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory M: Protected Workspace Isolation (C:\\BOW\\shopofbow)');
    {
      const forbiddenPaths = [
        'C:\\BOW\\shopofbow',
        'c:/bow/shopofbow',
        'c:\\bow\\shopofbow\\config.json',
        '/bow/shopofbow/src',
        'shopofbow',
      ];

      for (const forbidden of forbiddenPaths) {
        assert.throws(
          () => SandboxPathGuard.assertNotProtectedWorkspace(forbidden),
          (err: any) => err.code === 'SECURITY_VIOLATION' || err.message.includes('permanently forbidden')
        );
      }
      pass('M', 'SandboxPathGuard rejects all variants of protected workspace C:\\BOW\\shopofbow');

      // Verify diagnosisRuntime rejects protected path target
      assert.throws(
        () =>
          runtime.diagnoseIncident({
            sessionId,
            targetId: 'service_shop',
            targetPath: 'C:\\BOW\\shopofbow\\src',
          }),
        (err: any) => err.code === 'SECURITY_VIOLATION' || err.message.includes('permanently forbidden')
      );
      pass('M', 'DiagnosisRuntime fails closed with SECURITY_VIOLATION if protected path is referenced');
    }

    // -------------------------------------------------------------------------
    // CATEGORY N: Prohibited Primitive Verification (2 assertions)
    // -------------------------------------------------------------------------
    console.log('\nCategory N: Prohibited Primitive Verification (Zero Shell Imports)');
    {
      const diagnosisDir = path.resolve(process.cwd(), 'src', 'core', 'diagnosis');
      const files = fs.readdirSync(diagnosisDir).filter((f) => f.endsWith('.ts'));

      const forbiddenKeywords = [
        'child_process',
        'execSync',
        'spawn(',
        'fork(',
        'exec(',
      ];

      for (const file of files) {
        const filePath = path.join(diagnosisDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            continue;
          }
          for (const kw of forbiddenKeywords) {
            assert.ok(
              !line.includes(kw),
              `Forbidden primitive '${kw}' detected in ${filePath} at line ${i + 1}: ${line}`
            );
          }
        }
      }
      pass('N', 'Zero shell execution primitives (child_process, execSync, spawn, fork) in all diagnosis files');

      // Verify AuditLedger recorded all events under domain 'INCIDENT_DIAGNOSIS'
      const auditTrail = globalAuditLedger.getTrail({ domain: 'INCIDENT_DIAGNOSIS' });
      assert.ok(auditTrail.length >= 5, 'Diagnosis lifecycle events must be recorded to canonical AuditLedger');
      for (const ev of auditTrail) {
        assert.strictEqual(ev.domain, 'INCIDENT_DIAGNOSIS');
      }
      pass('N', 'All diagnostic lifecycle actions successfully committed to canonical AuditLedger');
    }

    console.log('\n======================================================================');
    console.log(`REALITY GATE COMPLETE: ${passedAssertions} passed, 0 failed across Categories A through N`);
    console.log(`REALITY GATE PASS: ${passedAssertions}`);
    console.log('======================================================================\n');
  } finally {
    globalWorldActionAuth.issueToken = originalIssueToken;
    globalSupervisorHumanGate.approve = originalApprove;
  }
}

runRealityGate().catch((err) => {
  console.error('Reality Gate failed:', err);
  process.exit(1);
});
