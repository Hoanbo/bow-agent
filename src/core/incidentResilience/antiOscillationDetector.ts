// src/core/incidentResilience/antiOscillationDetector.ts
// BOWCON V4.0 — MS-1.3.56: GOVERNED POST-REMEDIATION RESILIENCE, RECOVERY OUTCOME ANALYSIS & INCIDENT LIFECYCLE CLOSURE PIPELINE
//
// Governed Anti-Oscillation & Flapping Recurrence Detector.
// Tracks recurring incident patterns within a bounded sliding window to detect flapping failure/remediation loops.
// Emits advisory suppression and human escalation recommendations.
// Động cơ phát hiện dao động & lặp lại flapping có quản trị.
// Theo dõi các mẫu sự cố tái diễn trong một cửa sổ trượt có giới hạn để phát hiện các vòng lặp lỗi/khắc phục dao động.
// Phát ra các khuyến nghị có tính tư vấn về ngăn chặn và leo thang cho con người.
//
// STRICT GOVERNANCE INVARIANTS / CÁC BẤT BIẾN QUẢN TRỊ NGHIÊM NGẶT:
// - ADVISORY ONLY: Generates recommendations; NEVER revokes authorization or alters PDP policies.
// - NEVER SUPPRESS HUMAN AUTHORITY: Does not override explicit human decisions or commands.
// - ESCALATION ON FLAPPING: N >= 3 recurrences within sliding window MUST recommend human escalation.
// - DETERMINISTIC SIGNATURE: Pattern identity computed purely from targetId, category, and failure topology.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import type { FailureCategory } from '../diagnosis/diagnosisTypes.js';
import {
  type OscillationPattern,
  type FlappingRiskLevel,
  createOscillationEventId,
} from './incidentResilienceTypes.js';

export interface RecordedIncidentEvent {
  readonly incidentId: string;
  readonly targetId: string;
  readonly category: FailureCategory | string;
  readonly primarySubsystem?: string;
  readonly timestamp: number;
}

export interface AntiOscillationOptions {
  readonly slidingWindowMs?: number; // Default: 300,000ms (5 minutes)
  readonly flappingThreshold?: number; // Default: 3 recurrences
}

export class AntiOscillationDetector {
  private readonly history: RecordedIncidentEvent[] = [];
  private readonly slidingWindowMs: number;
  private readonly flappingThreshold: number;

  constructor(options?: AntiOscillationOptions) {
    this.slidingWindowMs = options?.slidingWindowMs ?? 300000;
    this.flappingThreshold = options?.flappingThreshold ?? 3;
  }

  /**
   * Derives a deterministic incident fingerprint signature.
   * Tạo chữ ký đặc trưng sự cố xác định.
   */
  public computeSignature(targetId: string, category: string, primarySubsystem?: string): string {
    const raw = `${targetId.trim()}::${category.trim()}::${(primarySubsystem ?? 'unknown').trim()}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
  }

  /**
   * Ingests an incident occurrence and evaluates whether the target is experiencing flapping oscillation.
   * Thu nạp một lần xảy ra sự cố và đánh giá xem mục tiêu có đang trải qua hiện tượng dao động flapping hay không.
   */
  public recordAndEvaluate(
    event: RecordedIncidentEvent,
    now: number = Date.now()
  ): OscillationPattern {
    // 1. Ingest event
    // 1. Thu nạp sự kiện
    this.history.push(event);

    // 2. Prune events outside sliding window
    // 2. Cắt tỉa các sự kiện nằm ngoài cửa sổ trượt
    const windowStartMs = now - this.slidingWindowMs;
    const activeEvents = this.history.filter(e => e.timestamp >= windowStartMs);

    // 3. Match identical signature within active window
    // 3. Khớp chữ ký đồng nhất trong cửa sổ hoạt động
    const signature = this.computeSignature(event.targetId, event.category, event.primarySubsystem);
    const matchingEvents = activeEvents.filter(e => {
      const sig = this.computeSignature(e.targetId, e.category, e.primarySubsystem);
      return sig === signature;
    });

    const recurrenceCount = matchingEvents.length;
    const isFlapping = recurrenceCount >= this.flappingThreshold;

    // 4. Classify risk level
    // 4. Phân loại mức độ rủi ro
    let riskLevel: FlappingRiskLevel = 'NONE';
    if (recurrenceCount === 2) {
      riskLevel = 'LOW';
    } else if (recurrenceCount === 3) {
      riskLevel = 'MEDIUM';
    } else if (recurrenceCount === 4) {
      riskLevel = 'HIGH';
    } else if (recurrenceCount >= 5) {
      riskLevel = 'CRITICAL';
    }

    // 5. Formulate advisory recommendation
    // 5. Đưa ra khuyến nghị tư vấn
    let advisoryRecommendation = 'Nominal incident frequency; proceed with standard governed workflow.';
    let requiresHumanEscalation = false;

    if (isFlapping) {
      requiresHumanEscalation = true;
      advisoryRecommendation = `FLAPPING_DETECTED: Target ${event.targetId} experienced ${recurrenceCount} recurring incidents (${event.category}) within ${this.slidingWindowMs / 1000}s. Automated remediation loops should be suppressed; escalate to Master Human Authority.`;
    } else if (recurrenceCount === 2) {
      advisoryRecommendation = `RECURRENCE_WARNING: Target ${event.targetId} experienced second failure within window. Monitor for oscillation.`;
    }

    const patternId = createOscillationEventId(`osc_${now}_${crypto.randomBytes(4).toString('hex')}`);

    return Object.freeze({
      patternId,
      signature,
      targetId: event.targetId,
      recurrenceCount,
      windowStartMs,
      windowEndMs: now,
      isFlapping,
      riskLevel,
      advisoryRecommendation,
      requiresHumanEscalation,
    });
  }

  /**
   * Clears internal history (used in test setup or session resets).
   * Xóa lịch sử nội bộ (dùng trong thiết lập kiểm thử hoặc đặt lại phiên).
   */
  public clearHistory(): void {
    this.history.length = 0;
  }
}
