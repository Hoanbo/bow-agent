// src/core/deployment/canaryVerificationEngine.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Governed canary verification engine capturing deterministic telemetry and evaluating SLO compliance.
// Động cơ xác minh canary có quản trị ghi nhận dữ liệu từ xa xác định và đánh giá sự tuân thủ SLO.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - CANARY_PASS != RELEASE_APPROVAL
// - CANARY_PASS != DEPLOYMENT_AUTHORIZATION
// - OBSERVATION != INTERPRETATION != AUTHORITY
// - NO FABRICATED MONITORING DATA.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type DeploymentId,
  type RolloutRingLevel,
  type CanaryMetricObservation,
  type CanaryObservationWindow,
  type CanaryVerificationRecord,
  type SloPolicyConfig,
  createCanaryVerificationId,
} from './deploymentTypes.js';
import { SloPolicyEngine, DEFAULT_PRODUCTION_SLO } from './sloPolicyEngine.js';

export class CanaryVerificationEngine {
  private readonly sloEngine: SloPolicyEngine;
  private verificationRecords = new Map<string, CanaryVerificationRecord[]>();

  constructor(sloEngine: SloPolicyEngine = new SloPolicyEngine()) {
    this.sloEngine = sloEngine;
  }

  /**
   * Aggregates raw observations into a deterministic CanaryObservationWindow.
   * Tổng hợp các quan sát thô thành một CanaryObservationWindow xác định.
   */
  public aggregateWindow(
    windowId: string,
    observations: readonly CanaryMetricObservation[],
    priorConsecutiveDegradations = 0
  ): CanaryObservationWindow {
    if (observations.length === 0) {
      const now = Date.now();
      return {
        windowId,
        startTime: now,
        endTime: now,
        observations: [],
        aggregateErrorRate: 1.0,
        aggregateLatencyP95Ms: 99999,
        aggregateAvailability: 0.0,
        totalSamples: 0,
        consecutiveDegradationCount: priorConsecutiveDegradations + 1,
      };
    }

    let totalSamples = 0;
    let totalErrors = 0;
    let totalLatency = 0;
    let totalAvailability = 0;
    let startTime = Number.POSITIVE_INFINITY;
    let endTime = Number.NEGATIVE_INFINITY;

    for (const obs of observations) {
      totalSamples += obs.sampleCount;
      totalErrors += obs.errorRate * obs.sampleCount;
      totalLatency += obs.latencyP95Ms * obs.sampleCount;
      totalAvailability += obs.availability * obs.sampleCount;

      if (obs.timestamp < startTime) startTime = obs.timestamp;
      if (obs.timestamp > endTime) endTime = obs.timestamp;
    }

    const aggregateErrorRate = totalSamples > 0 ? totalErrors / totalSamples : 0;
    const aggregateLatencyP95Ms = totalSamples > 0 ? totalLatency / totalSamples : 0;
    const aggregateAvailability = totalSamples > 0 ? totalAvailability / totalSamples : 1.0;

    return {
      windowId,
      startTime,
      endTime,
      observations,
      aggregateErrorRate,
      aggregateLatencyP95Ms,
      aggregateAvailability,
      totalSamples,
      consecutiveDegradationCount: priorConsecutiveDegradations,
    };
  }

  /**
   * Computes a deterministic SHA-256 evidence hash for a verification window and its result.
   * Tính toán mã băm bằng chứng SHA-256 xác định cho cửa sổ xác minh và kết quả của nó.
   */
  public computeEvidenceHash(
    deploymentId: DeploymentId,
    ringLevel: RolloutRingLevel,
    window: CanaryObservationWindow,
    isPassing: boolean,
    violations: readonly string[]
  ): string {
    const payload = JSON.stringify({
      deploymentId,
      ringLevel,
      windowId: window.windowId,
      startTime: window.startTime,
      endTime: window.endTime,
      totalSamples: window.totalSamples,
      aggregateErrorRate: window.aggregateErrorRate,
      aggregateLatencyP95Ms: window.aggregateLatencyP95Ms,
      aggregateAvailability: window.aggregateAvailability,
      isPassing,
      violations,
    });

    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Executes canary verification against the active SLO policy.
   * Thực hiện xác minh canary theo chính sách SLO đang hoạt động.
   */
  public verifyCanary(
    deploymentId: DeploymentId,
    ringLevel: RolloutRingLevel,
    observations: readonly CanaryMetricObservation[],
    policy: SloPolicyConfig = DEFAULT_PRODUCTION_SLO,
    priorConsecutiveDegradations = 0
  ): CanaryVerificationRecord {
    const windowId = `win_${deploymentId}_${ringLevel}_${Date.now()}`;
    const window = this.aggregateWindow(windowId, observations, priorConsecutiveDegradations);
    const evaluation = this.sloEngine.evaluateWindow(window, policy);

    const evidenceHash = this.computeEvidenceHash(
      deploymentId,
      ringLevel,
      window,
      evaluation.isPassing,
      evaluation.violations
    );

    const record: CanaryVerificationRecord = {
      verificationId: createCanaryVerificationId(`canary_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`),
      deploymentId,
      ringLevel,
      window: {
        ...window,
        consecutiveDegradationCount: evaluation.consecutiveDegradations,
      },
      isPassing: evaluation.isPassing,
      failureReasons: evaluation.violations,
      verifiedAt: evaluation.evaluatedAt,
      evidenceHash,
    };

    const records = this.verificationRecords.get(deploymentId) ?? [];
    records.push(record);
    this.verificationRecords.set(deploymentId, records);

    return record;
  }

  /**
   * Retrieves all canary verification records for a given deployment.
   * Lấy tất cả các bản ghi xác minh canary cho một đợt triển khai nhất định.
   */
  public getRecords(deploymentId: string): readonly CanaryVerificationRecord[] {
    return this.verificationRecords.get(deploymentId) ?? [];
  }
}
