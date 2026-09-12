// src/core/observability/telemetryObservationEngine.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Deterministic telemetry observation engine normalizing runtime signals into verifiable evidence.
// Động cơ quan sát đo từ xa xác định chuẩn hóa các tín hiệu thời gian chạy thành bằng chứng có thể xác minh.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - OBSERVATION != INTERPRETATION != AUTHORITY
// - TELEMETRY != AUTHORIZATION
// - AUTOMATION != OWNER_WILL
// - Secrets scrubbed prior to hash computation.
// - Zero shell execution or native process manipulation.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type ObservabilitySessionId,
  type TelemetrySampleId,
  type TelemetrySample,
  type MetricObservation,
  createTelemetrySampleId,
} from './observabilityTypes.js';

export interface RawTelemetryInput {
  readonly targetId: string;
  readonly sourceId: string;
  readonly timestamp?: number;
  readonly availability?: number;
  readonly errorRate?: number;
  readonly latencyP95Ms?: number;
  readonly latencyP99Ms?: number;
  readonly healthProbesPassing?: number;
  readonly totalHealthProbes?: number;
  readonly deploymentVersion?: string;
  readonly configurationFingerprint?: string;
  readonly manifestFingerprint?: string;
  readonly runtimeStatus?: string;
  readonly sampleCount?: number;
  readonly customMetrics?: Record<string, number | string | boolean>;
}

export class TelemetryObservationEngine {
  private samples = new Map<string, TelemetrySample[]>();

  /**
   * Sanitizes confidential values from records to prevent secret leakage into evidence.
   * Làm sạch các giá trị bảo mật khỏi bản ghi để ngăn rò rỉ bí mật vào bằng chứng.
   */
  public sanitizeSecrets<T>(data: T): T {
    const raw = JSON.stringify(data);
    const scrubbed = raw
      .replace(/"(token|secret|password|key|authorization|apiKey)"\s*:\s*"[^"]+"/gi, '"$1":"[REDACTED]"')
      .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]');
    return JSON.parse(scrubbed) as T;
  }

  /**
   * Normalizes raw metrics into a strictly bounded, deterministic MetricObservation.
   * Chuẩn hóa các chỉ số thô thành một MetricObservation xác định, có giới hạn nghiêm ngặt.
   */
  public normalizeMetrics(raw: RawTelemetryInput): MetricObservation {
    const sanitizedCustom = raw.customMetrics
      ? (this.sanitizeSecrets(raw.customMetrics) as Record<string, number | string | boolean>)
      : undefined;

    const availability = Math.max(0, Math.min(1, typeof raw.availability === 'number' ? raw.availability : 1.0));
    const errorRate = Math.max(0, Math.min(1, typeof raw.errorRate === 'number' ? raw.errorRate : 0.0));
    const latencyP95Ms = Math.max(0, typeof raw.latencyP95Ms === 'number' ? raw.latencyP95Ms : 0);
    const latencyP99Ms = Math.max(latencyP95Ms, typeof raw.latencyP99Ms === 'number' ? raw.latencyP99Ms : latencyP95Ms);
    const healthProbesPassing = Math.max(0, typeof raw.healthProbesPassing === 'number' ? raw.healthProbesPassing : 1);
    const totalHealthProbes = Math.max(healthProbesPassing, typeof raw.totalHealthProbes === 'number' ? raw.totalHealthProbes : 1);
    const sampleCount = Math.max(1, typeof raw.sampleCount === 'number' ? raw.sampleCount : 1);

    return {
      availability,
      errorRate,
      latencyP95Ms,
      latencyP99Ms,
      healthProbesPassing,
      totalHealthProbes,
      deploymentVersion: (raw.deploymentVersion ?? '1.0.0').trim(),
      configurationFingerprint: (raw.configurationFingerprint ?? 'default-cfg').trim(),
      manifestFingerprint: (raw.manifestFingerprint ?? 'default-manifest').trim(),
      runtimeStatus: (raw.runtimeStatus ?? 'RUNNING').trim().toUpperCase(),
      sampleCount,
      customMetrics: sanitizedCustom,
    };
  }

  /**
   * Computes a deterministic SHA-256 evidence hash for a telemetry sample.
   * Tính toán mã băm bằng chứng SHA-256 xác định cho mẫu đo từ xa.
   */
  public computeEvidenceHash(
    targetId: string,
    sourceId: string,
    timestamp: number,
    metrics: MetricObservation
  ): string {
    const payload = {
      targetId,
      sourceId,
      timestamp,
      metrics,
    };
    const sanitized = this.sanitizeSecrets(payload);
    const serialized = JSON.stringify(sanitized, Object.keys(sanitized).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Ingests and registers an immutable telemetry sample for an observability session.
   * Thu nạp và ghi nhận một mẫu đo từ xa bất biến cho phiên quan sát.
   */
  public ingestSample(
    sessionId: ObservabilitySessionId,
    raw: RawTelemetryInput
  ): TelemetrySample {
    const timestamp = raw.timestamp ?? Date.now();
    const metrics = this.normalizeMetrics(raw);
    const provenanceHash = this.computeEvidenceHash(raw.targetId, raw.sourceId, timestamp, metrics);
    const sampleId: TelemetrySampleId = createTelemetrySampleId(
      `telemetry_${timestamp}_${crypto.randomBytes(4).toString('hex')}`
    );

    const sample: TelemetrySample = {
      sampleId,
      sessionId,
      targetId: raw.targetId,
      sourceId: raw.sourceId,
      timestamp,
      metrics,
      provenanceHash,
    };

    const existing = this.samples.get(sessionId) ?? [];
    existing.push(sample);
    this.samples.set(sessionId, existing);

    return sample;
  }

  /**
   * Retrieves all ingested samples for a given session.
   * Lấy tất cả các mẫu đã thu nạp cho một phiên đã cho.
   */
  public getSamples(sessionId: ObservabilitySessionId): readonly TelemetrySample[] {
    return this.samples.get(sessionId) ?? [];
  }

  /**
   * Clears in-memory samples for session teardown or test resets.
   * Xóa các mẫu trong bộ nhớ để dọn dẹp phiên hoặc đặt lại kiểm thử.
   */
  public clear(sessionId?: ObservabilitySessionId): void {
    if (sessionId) {
      this.samples.delete(sessionId);
    } else {
      this.samples.clear();
    }
  }
}
