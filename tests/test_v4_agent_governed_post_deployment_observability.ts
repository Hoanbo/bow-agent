// tests/test_v4_agent_governed_post_deployment_observability.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Reality Gate verifying post-deployment autonomous verification, drift detection, and observability mesh.
// Cổng Thực tế xác minh việc xác minh tự động sau triển khai, phát hiện sai lệch và lưới đo từ xa quan sát.
//
// Categories A through AB:
// A. Canonical types & branded IDs
// B. Observation ingestion & metrics normalization
// C. Deterministic telemetry & evidence hashing
// D. Telemetry aggregation & rolling windows
// E. Invariant evaluation
// F. Healthy state classification
// G. Degraded state classification
// H. Unknown state classification
// I. Critical state classification
// J. Filesystem drift detection
// K. Configuration drift detection
// L. Manifest drift detection
// M. Hash mismatch detection
// N. Provenance mismatch detection
// O. Unexpected mutation detection
// P. Multi-agent contradiction handling
// Q. Alert generation & deduplication
// R. Supervisor health report generation
// S. Cryptographic provenance chain hashing
// T. Secret scrubbing from evidence and audits
// U. USER_STOP supremacy
// V. REVOCATION supremacy
// W. Protected workspace isolation
// X. No majority voting
// Y. No authority escalation
// Z. Canonical AuditLedger integration
// AA. Observability adapter model
// AB. Baseline comparison & degradation trends
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
  ObservabilityRuntime,
  TelemetryObservationEngine,
  TelemetryAggregationEngine,
  InvariantVerificationEngine,
  DriftDetectionEngine,
  ObservabilityHealthEngine,
  ObservabilityAlertEngine,
  ObservabilityContradictionEngine,
  SupervisorHealthReportEngine,
  ObservabilityProvenanceEngine,
  LocalProcessProbeAdapter,
  SyntheticHttpProbeAdapter,
  FilesystemObserverAdapter,
  createObservationId,
  createTelemetrySampleId,
  createHealthCheckId,
  createDriftDetectionId,
  createDriftEventId,
  createInvariantCheckId,
  createHealthReportId,
  createObservabilitySessionId,
  createObservabilityAlertId,
  type ObservabilityAgentAssertion,
  type FilesystemManifestEntry,
} from '../src/core/observability/index.js';
import { globalAuditLedger } from '../src/core/auditLedger.js';

const TEST_SCRATCH_DIR = path.join(process.cwd(), 'scratch', 'test_ms_1_3_53_observability');

function setupTestEnvironment(): void {
  if (fs.existsSync(TEST_SCRATCH_DIR)) {
    fs.rmSync(TEST_SCRATCH_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_SCRATCH_DIR, { recursive: true });
}

function teardownTestEnvironment(): void {
  if (fs.existsSync(TEST_SCRATCH_DIR)) {
    fs.rmSync(TEST_SCRATCH_DIR, { recursive: true, force: true });
  }
}

async function runRealityGate(): Promise<void> {
  console.log('======================================================================');
  console.log('STARTING REALITY GATE: MS-1.3.53 GOVERNED OBSERVABILITY TELEMETRY MESH');
  console.log('======================================================================\n');

  setupTestEnvironment();

  try {
    const runtime = new ObservabilityRuntime();

    // -------------------------------------------------------------------------
    // CATEGORY A: CANONICAL TYPES & BRANDED IDENTIFIERS
    // -------------------------------------------------------------------------
    {
      const obsId = createObservationId('obs_123');
      const sampleId = createTelemetrySampleId('sample_123');
      const healthId = createHealthCheckId('health_123');
      const driftDetectId = createDriftDetectionId('drift_detect_123');
      const driftEvtId = createDriftEventId('drift_evt_123');
      const invId = createInvariantCheckId('inv_123');
      const reportId = createHealthReportId('report_123');
      const sessId = createObservabilitySessionId('sess_123');
      const alertId = createObservabilityAlertId('alert_123');

      assert.strictEqual(obsId, 'obs_123');
      assert.strictEqual(sampleId, 'sample_123');
      assert.strictEqual(healthId, 'health_123');
      assert.strictEqual(driftDetectId, 'drift_detect_123');
      assert.strictEqual(driftEvtId, 'drift_evt_123');
      assert.strictEqual(invId, 'inv_123');
      assert.strictEqual(reportId, 'report_123');
      assert.strictEqual(sessId, 'sess_123');
      assert.strictEqual(alertId, 'alert_123');

      console.log('  ✓ A. Canonical types & branded identifiers verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY B: OBSERVATION INGESTION & METRICS NORMALIZATION
    // -------------------------------------------------------------------------
    {
      const sessionA = runtime.startSession({
        targetId: 'prod-cluster-01',
        deploymentId: 'dep-v1.0.0',
        deploymentVersion: '1.0.0',
      });

      const sample = runtime.ingestTelemetry(sessionA, {
        targetId: 'prod-cluster-01',
        sourceId: 'node-probe-1',
        availability: 1.5, // should clamp to 1.0
        errorRate: -0.2, // should clamp to 0.0
        latencyP95Ms: 120,
        latencyP99Ms: 250,
        healthProbesPassing: 5,
        totalHealthProbes: 5,
        deploymentVersion: '1.0.0',
        runtimeStatus: 'running',
      });

      assert.strictEqual(sample.metrics.availability, 1.0);
      assert.strictEqual(sample.metrics.errorRate, 0.0);
      assert.strictEqual(sample.metrics.latencyP95Ms, 120);
      assert.strictEqual(sample.metrics.latencyP99Ms, 250);
      assert.strictEqual(sample.metrics.runtimeStatus, 'RUNNING');
      assert.ok(sample.provenanceHash.length === 64);

      console.log('  ✓ B. Observation ingestion and metrics normalization verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY C: DETERMINISTIC TELEMETRY & EVIDENCE HASHING
    // -------------------------------------------------------------------------
    {
      const engine = new TelemetryObservationEngine();
      const normA = engine.normalizeMetrics({
        targetId: 't1',
        sourceId: 's1',
        availability: 0.999,
        errorRate: 0.001,
        latencyP95Ms: 45,
      });

      const hash1 = engine.computeEvidenceHash('t1', 's1', 1700000000000, normA);
      const hash2 = engine.computeEvidenceHash('t1', 's1', 1700000000000, normA);
      assert.strictEqual(hash1, hash2);
      assert.strictEqual(hash1.length, 64);

      console.log('  ✓ C. Deterministic telemetry and evidence hashing verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY D: TELEMETRY AGGREGATION & ROLLING WINDOWS
    // -------------------------------------------------------------------------
    {
      const sessionD = runtime.startSession({
        targetId: 'prod-srv-02',
        deploymentId: 'dep-v1.0.1',
        deploymentVersion: '1.0.1',
      });

      const now = Date.now();
      runtime.ingestTelemetry(sessionD, {
        targetId: 'prod-srv-02',
        sourceId: 'probe-1',
        timestamp: now - 10000,
        availability: 0.99,
        errorRate: 0.01,
        latencyP95Ms: 100,
        sampleCount: 10,
      });

      runtime.ingestTelemetry(sessionD, {
        targetId: 'prod-srv-02',
        sourceId: 'probe-1',
        timestamp: now - 5000,
        availability: 0.97,
        errorRate: 0.03,
        latencyP95Ms: 200,
        sampleCount: 10,
      });

      const window = runtime.aggregateTelemetry(sessionD, 'prod-srv-02');
      assert.strictEqual(window.totalSamples, 20);
      assert.ok(Math.abs(window.aggregateAvailability - 0.98) < 0.001);
      assert.ok(Math.abs(window.aggregateErrorRate - 0.02) < 0.001);
      assert.strictEqual(window.aggregateLatencyP95Ms, 150);

      console.log('  ✓ D. Telemetry aggregation and rolling windows verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY E: INVARIANT EVALUATION
    // -------------------------------------------------------------------------
    {
      const sessionE = runtime.startSession({
        targetId: 'prod-srv-03',
        deploymentId: 'dep-v1.0.2',
        deploymentVersion: '1.0.2',
      });

      const checkPass = runtime.checkInvariant(
        sessionE,
        'prod-srv-03',
        'MANIFEST',
        'Manifest Integrity Check',
        'manifest-hash-v1',
        'manifest-hash-v1'
      );
      assert.strictEqual(checkPass.status, 'SATISFIED');

      const checkFail = runtime.checkInvariant(
        sessionE,
        'prod-srv-03',
        'CONFIGURATION',
        'Config Signature Check',
        'cfg-v1',
        'cfg-v2-tampered'
      );
      assert.strictEqual(checkFail.status, 'VIOLATED');
      assert.ok(checkFail.reason?.includes('does not match observed'));

      console.log('  ✓ E. Invariant evaluation verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY F: HEALTHY STATE CLASSIFICATION
    // -------------------------------------------------------------------------
    {
      const healthEngine = new ObservabilityHealthEngine();
      const healthyResult = healthEngine.evaluateHealth({
        metrics: {
          availability: 0.999,
          errorRate: 0.001,
          latencyP95Ms: 80,
          latencyP99Ms: 150,
          healthProbesPassing: 3,
          totalHealthProbes: 3,
          deploymentVersion: '1.0.0',
          configurationFingerprint: 'cfg-good',
          manifestFingerprint: 'mnf-good',
          runtimeStatus: 'RUNNING',
          sampleCount: 100,
        },
      });

      assert.strictEqual(healthyResult.healthState, 'HEALTHY');
      assert.ok(healthyResult.healthScore >= 95);

      console.log('  ✓ F. Healthy state classification verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY G: DEGRADED STATE CLASSIFICATION
    // -------------------------------------------------------------------------
    {
      const healthEngine = new ObservabilityHealthEngine();
      const degradedResult = healthEngine.evaluateHealth({
        metrics: {
          availability: 0.999, // nominal
          errorRate: 0.03, // above 0.02 (-15)
          latencyP95Ms: 450, // above 400 (-10)
          latencyP99Ms: 800,
          healthProbesPassing: 2,
          totalHealthProbes: 2,
          deploymentVersion: '1.0.0',
          configurationFingerprint: 'cfg-good',
          manifestFingerprint: 'mnf-good',
          runtimeStatus: 'RUNNING',
          sampleCount: 50,
        },
      });

      assert.strictEqual(degradedResult.healthState, 'DEGRADED');
      assert.ok(degradedResult.healthScore < 85 && degradedResult.healthScore >= 70);

      const unstableResult = healthEngine.evaluateHealth({
        metrics: {
          availability: 0.985, // below 0.99 (-15)
          errorRate: 0.03, // above 0.02 (-15)
          latencyP95Ms: 450, // above 400 (-10)
          latencyP99Ms: 800,
          healthProbesPassing: 2,
          totalHealthProbes: 2,
          deploymentVersion: '1.0.0',
          configurationFingerprint: 'cfg-good',
          manifestFingerprint: 'mnf-good',
          runtimeStatus: 'RUNNING',
          sampleCount: 50,
        },
      });
      assert.strictEqual(unstableResult.healthState, 'UNSTABLE');
      assert.ok(unstableResult.healthScore < 70 && unstableResult.healthScore >= 40);

      console.log('  ✓ G. Degraded and Unstable state classifications verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY H: UNKNOWN STATE CLASSIFICATION
    // -------------------------------------------------------------------------
    {
      const healthEngine = new ObservabilityHealthEngine();
      const unknownResult = healthEngine.evaluateHealth({});

      assert.strictEqual(unknownResult.healthState, 'UNKNOWN');
      assert.strictEqual(unknownResult.healthScore, 50);

      console.log('  ✓ H. Unknown state classification verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY I: CRITICAL STATE CLASSIFICATION
    // -------------------------------------------------------------------------
    {
      const healthEngine = new ObservabilityHealthEngine();
      const criticalResult = healthEngine.evaluateHealth({
        metrics: {
          availability: 0.85,
          errorRate: 0.25,
          latencyP95Ms: 1500,
          latencyP99Ms: 2500,
          healthProbesPassing: 0,
          totalHealthProbes: 3,
          deploymentVersion: '1.0.0',
          configurationFingerprint: 'cfg-bad',
          manifestFingerprint: 'mnf-bad',
          runtimeStatus: 'FAILING',
          sampleCount: 50,
        },
      });

      assert.strictEqual(criticalResult.healthState, 'CRITICAL');
      assert.ok(criticalResult.healthScore < 40);

      console.log('  ✓ I. Critical state classification verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY J: FILESYSTEM DRIFT DETECTION
    // -------------------------------------------------------------------------
    {
      const sessionJ = runtime.startSession({
        targetId: 'prod-srv-fs',
        deploymentId: 'dep-v1.0.3',
        deploymentVersion: '1.0.3',
      });

      const expected: FilesystemManifestEntry[] = [
        { relativePath: 'app.js', sha256: 'hash_app_v1' },
        { relativePath: 'config.json', sha256: 'hash_cfg_v1' },
      ];

      const observed: FilesystemManifestEntry[] = [
        { relativePath: 'app.js', sha256: 'hash_app_v1_tampered' },
        { relativePath: 'config.json', sha256: 'hash_cfg_v1' },
      ];

      const drifts = runtime.checkFilesystemDrift(sessionJ, 'prod-srv-fs', expected, observed);
      assert.strictEqual(drifts.length, 1);
      assert.strictEqual(drifts[0].driftType, 'HASH_MISMATCH');
      assert.strictEqual(drifts[0].classification, 'CRITICAL_DRIFT');

      console.log('  ✓ J. Filesystem drift detection verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY K: CONFIGURATION DRIFT DETECTION
    // -------------------------------------------------------------------------
    {
      const sessionK = runtime.startSession({
        targetId: 'prod-srv-cfg',
        deploymentId: 'dep-v1.0.4',
        deploymentVersion: '1.0.4',
      });

      const drift = runtime.detectDrift(
        sessionK,
        'prod-srv-cfg',
        'CONFIGURATION',
        'sha256:env_production_v1',
        'sha256:env_production_v2_unauthorized'
      );

      assert.strictEqual(drift.driftType, 'CONFIGURATION');
      assert.strictEqual(drift.classification, 'UNKNOWN_DRIFT');
      assert.ok(drift.diffSummary.includes('Divergence detected in CONFIGURATION'));

      console.log('  ✓ K. Configuration drift detection verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY L: MANIFEST DRIFT DETECTION
    // -------------------------------------------------------------------------
    {
      const sessionL = runtime.startSession({
        targetId: 'prod-srv-manifest',
        deploymentId: 'dep-v1.0.5',
        deploymentVersion: '1.0.5',
      });

      const expected: FilesystemManifestEntry[] = [
        { relativePath: 'main.bundle.js', sha256: 'hash_main' },
        { relativePath: 'styles.css', sha256: 'hash_css' },
      ];

      // Missing styles.css in observed
      const observed: FilesystemManifestEntry[] = [
        { relativePath: 'main.bundle.js', sha256: 'hash_main' },
      ];

      const drifts = runtime.checkFilesystemDrift(sessionL, 'prod-srv-manifest', expected, observed);
      assert.strictEqual(drifts.length, 1);
      assert.strictEqual(drifts[0].driftType, 'FILESYSTEM');
      assert.strictEqual(drifts[0].observedState, 'FILE_DELETED');

      console.log('  ✓ L. Manifest drift detection verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY M: HASH MISMATCH DETECTION
    // -------------------------------------------------------------------------
    {
      const driftEngine = new DriftDetectionEngine();
      const classification = driftEngine.classifyDrift('HASH_MISMATCH', 'hashA', 'hashB');
      assert.strictEqual(classification, 'CRITICAL_DRIFT');

      console.log('  ✓ M. Hash mismatch detection verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY N: PROVENANCE MISMATCH DETECTION
    // -------------------------------------------------------------------------
    {
      const driftEngine = new DriftDetectionEngine();
      const classification = driftEngine.classifyDrift('PROVENANCE_MISMATCH', 'provA', 'provB');
      assert.strictEqual(classification, 'CRITICAL_DRIFT');

      console.log('  ✓ N. Provenance mismatch detection verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY O: UNEXPECTED MUTATION DETECTION
    // -------------------------------------------------------------------------
    {
      const sessionO = runtime.startSession({
        targetId: 'prod-srv-mutation',
        deploymentId: 'dep-v1.0.6',
        deploymentVersion: '1.0.6',
      });

      const expected: FilesystemManifestEntry[] = [
        { relativePath: 'index.js', sha256: 'hash_idx' },
      ];

      // Unexpected script backdoor.js added
      const observed: FilesystemManifestEntry[] = [
        { relativePath: 'index.js', sha256: 'hash_idx' },
        { relativePath: 'backdoor.js', sha256: 'hash_backdoor' },
      ];

      const drifts = runtime.checkFilesystemDrift(sessionO, 'prod-srv-mutation', expected, observed);
      assert.strictEqual(drifts.length, 1);
      assert.strictEqual(drifts[0].driftType, 'UNAUTHORIZED_MUTATION');
      assert.strictEqual(drifts[0].classification, 'CRITICAL_DRIFT');
      assert.ok(drifts[0].observedState.includes('FILE_CREATED:hash_backdoor'));

      console.log('  ✓ O. Unexpected mutation detection verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY P: MULTI-AGENT CONTRADICTION HANDLING
    // -------------------------------------------------------------------------
    {
      const sessionP = runtime.startSession({
        targetId: 'prod-srv-multi',
        deploymentId: 'dep-v1.0.7',
        deploymentVersion: '1.0.7',
      });

      const assertions: ObservabilityAgentAssertion[] = [
        {
          agentId: 'agent-alpha',
          targetId: 'prod-srv-multi',
          timestamp: Date.now(),
          reportedHealthState: 'HEALTHY',
          reportedHealthScore: 95,
          reportedDriftClassification: 'NO_DRIFT',
          evidenceHash: 'hash_alpha',
        },
        {
          agentId: 'agent-beta',
          targetId: 'prod-srv-multi',
          timestamp: Date.now(),
          reportedHealthState: 'CRITICAL',
          reportedHealthScore: 20,
          reportedDriftClassification: 'CRITICAL_DRIFT',
          evidenceHash: 'hash_beta',
        },
      ];

      const contradiction = runtime.evaluateMultiAgentAssertions(sessionP, 'prod-srv-multi', assertions);
      assert.ok(contradiction !== null);
      assert.strictEqual(contradiction.status, 'CONFLICT_ESCALATED');
      assert.strictEqual(contradiction.escalatedToSupervisor, true);
      assert.ok(contradiction.conflictingFields.includes('reportedHealthState'));
      assert.ok(contradiction.conflictingFields.includes('reportedHealthScore'));
      assert.ok(contradiction.conflictingFields.includes('reportedDriftClassification'));

      console.log('  ✓ P. Multi-agent contradiction handling verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY Q: ALERT GENERATION & DEDUPLICATION
    // -------------------------------------------------------------------------
    {
      const sessionQ = runtime.startSession({
        targetId: 'prod-srv-alert',
        deploymentId: 'dep-v1.0.8',
        deploymentVersion: '1.0.8',
      });

      const alertEngine = new ObservabilityAlertEngine();
      const alert1 = alertEngine.createAlert({
        sessionId: sessionQ,
        severity: 'HIGH',
        targetId: 'prod-srv-alert',
        reason: 'Error rate spiked above threshold',
      });

      const alert2 = alertEngine.createAlert({
        sessionId: sessionQ,
        severity: 'HIGH',
        targetId: 'prod-srv-alert',
        reason: 'Error rate spiked above threshold',
      });

      assert.strictEqual(alert1.fingerprint, alert2.fingerprint);
      assert.strictEqual(alert1.severity, 'HIGH');
      assert.strictEqual(alert1.targetId, 'prod-srv-alert');

      console.log('  ✓ Q. Alert generation & deduplication verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY R: SUPERVISOR HEALTH REPORT GENERATION
    // -------------------------------------------------------------------------
    {
      const sessionR = runtime.startSession({
        targetId: 'prod-srv-report',
        deploymentId: 'dep-v1.0.9',
        deploymentVersion: '1.0.9',
      });

      runtime.ingestTelemetry(sessionR, {
        targetId: 'prod-srv-report',
        sourceId: 'probe-r',
        availability: 0.999,
        errorRate: 0.001,
        latencyP95Ms: 50,
      });

      const report = runtime.generateSupervisorHealthReport(sessionR);
      assert.strictEqual(report.deploymentId, 'dep-v1.0.9');
      assert.strictEqual(report.deploymentVersion, '1.0.9');
      assert.strictEqual(report.healthState, 'HEALTHY');
      assert.ok(report.reportHash.length === 64);
      assert.ok(report.recommendedNextAction.includes('Continue monitoring') || report.recommendedNextAction.includes('monitoring'));

      const directReport = runtime.reportEngine.generateReport({
        sessionId: sessionR,
        deploymentId: 'dep-v1.0.9',
        deploymentVersion: '1.0.9',
        targetId: 'prod-srv-report',
        healthState: 'HEALTHY',
        healthScore: 100,
        recentTelemetrySummary: {
          sampleCount: 1,
          availability: 1.0,
          errorRate: 0.0,
          latencyP95Ms: 50,
          consecutiveDegradations: 0,
        },
        activeAlerts: [],
        detectedDrifts: [],
        invariantChecks: [],
        contradictions: [],
      });
      assert.ok(directReport.recommendedNextAction.includes('Continuous post-deployment observation'));

      console.log('  ✓ R. Supervisor health report generation verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY S: CRYPTOGRAPHIC PROVENANCE CHAIN HASHING
    // -------------------------------------------------------------------------
    {
      const sessionS = runtime.startSession({
        targetId: 'prod-srv-prov',
        deploymentId: 'dep-v1.0.10',
        deploymentVersion: '1.0.10',
        taskId: 'task-verified-42',
        agentId: 'bowcon-agent-7',
        delegationId: 'del-lease-99',
      });

      runtime.ingestTelemetry(sessionS, {
        targetId: 'prod-srv-prov',
        sourceId: 'prov-probe',
        availability: 0.999,
      });

      const { chain, chainHash } = runtime.buildProvenanceChain(sessionS);
      assert.strictEqual(chain.taskId, 'task-verified-42');
      assert.strictEqual(chain.agentId, 'bowcon-agent-7');
      assert.strictEqual(chain.delegationId, 'del-lease-99');
      assert.strictEqual(chain.deploymentId, 'dep-v1.0.10');
      assert.ok(chain.telemetrySampleHashes.length > 0);
      assert.strictEqual(chainHash.length, 64);

      console.log('  ✓ S. Cryptographic provenance chain hashing verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY T: SECRET SCRUBBING FROM EVIDENCE AND AUDITS
    // -------------------------------------------------------------------------
    {
      const provEngine = new ObservabilityProvenanceEngine();
      const payloadWithSecrets = {
        userId: 'admin',
        token: 'secret_token_12345',
        password: 'SuperSecretPassword!',
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz',
        safeMetric: 42,
      };

      const sanitized = provEngine.sanitizeSecrets(payloadWithSecrets);
      assert.strictEqual(sanitized.token, '[REDACTED]');
      assert.strictEqual(sanitized.password, '[REDACTED]');
      assert.strictEqual(sanitized.authorization, '[REDACTED]');
      assert.strictEqual(sanitized.safeMetric, 42);

      console.log('  ✓ T. Secret scrubbing from evidence and audits verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY U: USER_STOP SUPREMACY
    // -------------------------------------------------------------------------
    {
      const stopRuntime = new ObservabilityRuntime();
      const sessionU = stopRuntime.startSession({
        targetId: 'prod-srv-stop',
        deploymentId: 'dep-stop',
        deploymentVersion: '1.0.0',
      });

      stopRuntime.triggerUserStop('Emergency owner halt requested');

      assert.strictEqual(stopRuntime.getSessionState(sessionU), 'BLOCKED');

      assert.throws(
        () => {
          stopRuntime.ingestTelemetry(sessionU, {
            targetId: 'prod-srv-stop',
            sourceId: 'probe-stop',
          });
        },
        /USER_STOP_ACTIVE/
      );

      console.log('  ✓ U. USER_STOP supremacy verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY V: REVOCATION SUPREMACY
    // -------------------------------------------------------------------------
    {
      const revRuntime = new ObservabilityRuntime();
      const sessionV = revRuntime.startSession({
        targetId: 'prod-srv-rev',
        deploymentId: 'dep-rev',
        deploymentVersion: '1.0.0',
      });

      revRuntime.triggerRevocation('Master Owner revoked authority lease');

      assert.strictEqual(revRuntime.getSessionState(sessionV), 'REVOKED');

      assert.throws(
        () => {
          revRuntime.ingestTelemetry(sessionV, {
            targetId: 'prod-srv-rev',
            sourceId: 'probe-rev',
          });
        },
        /REVOKED/
      );

      console.log('  ✓ V. REVOCATION supremacy verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY W: PROTECTED WORKSPACE ISOLATION
    // -------------------------------------------------------------------------
    {
      const invEngine = new InvariantVerificationEngine();

      assert.throws(
        () => {
          invEngine.verifyWorkspaceIsolation('C:\\BOW\\shopofbow\\secret.env');
        },
        /PROTECTED_WORKSPACE_VIOLATION/
      );

      assert.throws(
        () => {
          invEngine.verifyWorkspaceIsolation('c:/bow/shopofbow/package.json');
        },
        /PROTECTED_WORKSPACE_VIOLATION/
      );

      const safeResult = invEngine.verifyWorkspaceIsolation('c:/other/project/file.ts');
      assert.strictEqual(safeResult.valid, true);

      console.log('  ✓ W. Protected workspace isolation verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY X: NO MAJORITY VOTING
    // -------------------------------------------------------------------------
    {
      const sessionX = runtime.startSession({
        targetId: 'prod-srv-voting',
        deploymentId: 'dep-v1.0.11',
        deploymentVersion: '1.0.11',
      });

      // 3 agents: 2 say HEALTHY, 1 says CRITICAL. Under majority voting this would be HEALTHY.
      // Under BOWCON governance: AGENT_COUNT != AUTHORITY_COUNT; disagreement must be preserved!
      const assertions: ObservabilityAgentAssertion[] = [
        {
          agentId: 'agent-1',
          targetId: 'prod-srv-voting',
          timestamp: Date.now(),
          reportedHealthState: 'HEALTHY',
          reportedHealthScore: 98,
          reportedDriftClassification: 'NO_DRIFT',
          evidenceHash: 'h1',
        },
        {
          agentId: 'agent-2',
          targetId: 'prod-srv-voting',
          timestamp: Date.now(),
          reportedHealthState: 'HEALTHY',
          reportedHealthScore: 95,
          reportedDriftClassification: 'NO_DRIFT',
          evidenceHash: 'h2',
        },
        {
          agentId: 'agent-3',
          targetId: 'prod-srv-voting',
          timestamp: Date.now(),
          reportedHealthState: 'CRITICAL',
          reportedHealthScore: 25,
          reportedDriftClassification: 'CRITICAL_DRIFT',
          evidenceHash: 'h3',
        },
      ];

      const contradiction = runtime.evaluateMultiAgentAssertions(sessionX, 'prod-srv-voting', assertions);
      assert.ok(contradiction !== null);
      assert.strictEqual(contradiction.status, 'CONFLICT_ESCALATED');
      assert.strictEqual(contradiction.assertions.length, 3);

      console.log('  ✓ X. Majority voting rejection verified (minority dissent preserved and escalated)');
    }

    // -------------------------------------------------------------------------
    // CATEGORY Y: NO AUTHORITY ESCALATION
    // -------------------------------------------------------------------------
    {
      const sessionY = runtime.startSession({
        targetId: 'prod-srv-escalation',
        deploymentId: 'dep-v1.0.12',
        deploymentVersion: '1.0.12',
      });

      // Ingest severe critical failures
      runtime.ingestTelemetry(sessionY, {
        targetId: 'prod-srv-escalation',
        sourceId: 'probe-crit',
        availability: 0.1,
        errorRate: 0.9,
        latencyP95Ms: 5000,
      });

      const report = runtime.generateSupervisorHealthReport(sessionY);
      assert.strictEqual(report.healthState, 'CRITICAL');

      // Invariant: Report must be purely advisory. No execution or mutation methods exist.
      assert.ok(!('executeRollback' in report));
      assert.ok(!('approveRelease' in report));
      assert.ok(!('mutateProduction' in report));
      assert.ok(report.recommendedNextAction.includes('CRITICAL'));

      console.log('  ✓ Y. No authority escalation verified (CRITICAL health does not authorize mutations)');
    }

    // -------------------------------------------------------------------------
    // CATEGORY Z: CANONICAL AUDIT LEDGER INTEGRATION
    // -------------------------------------------------------------------------
    {
      const auditEntries = globalAuditLedger.getAuditTrail();
      assert.ok(auditEntries.length > 0, 'Audit entries must be recorded');

      const obsAudits = auditEntries.filter(e => e.domain === 'OBSERVABILITY_GOVERNANCE');
      assert.ok(obsAudits.length >= 5, 'Multiple observability domain audits must be recorded');

      const toolNames = obsAudits.map(e => e.toolName);
      assert.ok(toolNames.includes('OBSERVATION_SESSION_STARTED'));
      assert.ok(toolNames.includes('OBSERVATION_RECEIVED'));
      assert.ok(toolNames.includes('TELEMETRY_AGGREGATED'));

      console.log('  ✓ Z. Canonical AuditLedger integration verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY AA: OBSERVABILITY ADAPTER MODEL
    // -------------------------------------------------------------------------
    {
      const localAdapter = new LocalProcessProbeAdapter('RUNNING', 0.001, 15);
      const httpAdapter = new SyntheticHttpProbeAdapter('https://shopofbow-api.internal/health', 200, 25);
      const fsAdapter = new FilesystemObserverAdapter(() => [
        { relativePath: 'index.html', sha256: 'sha-html' },
      ]);

      const localSample = await localAdapter.sample('target-local');
      assert.strictEqual(localSample.runtimeStatus, 'RUNNING');
      assert.strictEqual(localSample.latencyP95Ms, 15);

      const httpSample = await httpAdapter.sample('target-http');
      assert.strictEqual(httpSample.runtimeStatus, 'UP');
      assert.strictEqual(httpSample.availability, 1.0);

      const fsSample = await fsAdapter.sample('target-fs');
      assert.strictEqual(fsSample.manifestFingerprint, 'fs-1-entries');

      console.log('  ✓ AA. Observability adapter model verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY AB: BASELINE COMPARISON & DEGRADATION TRENDS
    // -------------------------------------------------------------------------
    {
      const aggEngine = new TelemetryAggregationEngine();
      const baseSession = createObservabilitySessionId('sess_baseline');
      const obsEngine = new TelemetryObservationEngine();

      const sample1 = obsEngine.ingestSample(baseSession, {
        targetId: 'target-base',
        sourceId: 'probe-base',
        timestamp: 1000,
        availability: 0.999,
        errorRate: 0.005,
        latencyP95Ms: 50,
        sampleCount: 10,
      });

      const sample2 = obsEngine.ingestSample(baseSession, {
        targetId: 'target-base',
        sourceId: 'probe-base',
        timestamp: 2000,
        availability: 0.98,
        errorRate: 0.04, // high error rate spike
        latencyP95Ms: 160, // high latency spike
        sampleCount: 10,
      });

      const window = aggEngine.aggregateWindow(baseSession, 'target-base', [sample1, sample2], {
        baselineErrorRate: 0.001,
        baselineLatencyP95Ms: 40,
        degradationErrorThreshold: 0.01,
        degradationLatencyThresholdMs: 30,
      });

      assert.ok(window.baselineComparison !== undefined);
      assert.strictEqual(window.baselineComparison.isDegradedAgainstBaseline, true);
      assert.ok(window.baselineComparison.errorRateDelta > 0.01);
      assert.ok(window.baselineComparison.latencyDeltaMs > 30);

      console.log('  ✓ AB. Baseline comparison and degradation trends verified');
    }

    // -------------------------------------------------------------------------
    // CATEGORY AC: ZERO RESTRICTED SHELL PRIMITIVES IN RUNTIME CODE
    // -------------------------------------------------------------------------
    {
      const runtimeFiles = [
        path.join(process.cwd(), 'src', 'core', 'observability', 'observabilityTypes.ts'),
        path.join(process.cwd(), 'src', 'core', 'observability', 'telemetryObservationEngine.ts'),
        path.join(process.cwd(), 'src', 'core', 'observability', 'telemetryAggregationEngine.ts'),
        path.join(process.cwd(), 'src', 'core', 'observability', 'invariantVerificationEngine.ts'),
        path.join(process.cwd(), 'src', 'core', 'observability', 'driftDetectionEngine.ts'),
        path.join(process.cwd(), 'src', 'core', 'observability', 'observabilityHealthEngine.ts'),
        path.join(process.cwd(), 'src', 'core', 'observability', 'observabilityAlertEngine.ts'),
        path.join(process.cwd(), 'src', 'core', 'observability', 'observabilityContradictionEngine.ts'),
        path.join(process.cwd(), 'src', 'core', 'observability', 'supervisorHealthReportEngine.ts'),
        path.join(process.cwd(), 'src', 'core', 'observability', 'observabilityProvenanceEngine.ts'),
        path.join(process.cwd(), 'src', 'core', 'observability', 'observabilityAdapters.ts'),
        path.join(process.cwd(), 'src', 'core', 'observability', 'observabilityRuntime.ts'),
        path.join(process.cwd(), 'src', 'core', 'observability', 'index.ts'),
      ];

      const forbiddenKeywords = ['child_process', 'execSync', 'spawn(', 'fork(', 'eval(', 'new Function'];

      for (const filePath of runtimeFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Ignore comments and docstrings
          if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('ZERO SHELL')) {
            continue;
          }
          for (const kw of forbiddenKeywords) {
            assert.ok(
              !line.includes(kw),
              `Forbidden shell primitive '${kw}' found in ${filePath} at line ${i + 1}: ${line}`
            );
          }
        }
      }

      console.log('  ✓ AC. Zero restricted shell primitives verified in all runtime code');
    }

    console.log('\n======================================================================');
    console.log('REALITY GATE COMPLETE: 29 passed, 0 failed across Categories A through AC');
    console.log('REALITY GATE PASS: 29');
    console.log('======================================================================\n');
  } finally {
    teardownTestEnvironment();
  }
}

runRealityGate().catch((err) => {
  console.error('Reality Gate failed:', err);
  process.exit(1);
});
