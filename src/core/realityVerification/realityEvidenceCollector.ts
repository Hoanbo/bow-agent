// src/core/realityVerification/realityEvidenceCollector.ts
// BOWCON V4.0 — MS-1.4.07: REALITY EVIDENCE COLLECTOR
//
// EN:
// Normalizes, validates, sanitizes, and binds empirical evidence from tool adapter output,
// read-after-write probes, and external context snapshots.
// Defends against prototype pollution, null bytes, payload size abuse, cross-tenant leakage,
// and evidence replay.
//
// VI:
// Chuẩn hóa, xác thực, khử trùng và ràng buộc bằng chứng thực nghiệm từ kết quả adapter công cụ,
// đầu dò đọc-sau-khi-ghi và ảnh chụp nhanh ngữ cảnh bên ngoài.
// Phòng thủ chống ô nhiễm prototype, byte null, lạm dụng kích thước tải trọng, rò rỉ đa người thuê
// và phát lại bằng chứng.

import crypto from 'node:crypto';
import type { ToolAdapterResult } from '../toolAdapter/toolAdapterTypes.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import {
  type RealityEvidence,
  type RealityEvidenceSource,
  MAX_EVIDENCE_PAYLOAD_BYTES,
  MAX_EVIDENCE_DEPTH,
  DEFAULT_MAX_EVIDENCE_AGE_MS,
  VerificationSecurityViolationError,
  VerificationValidationError,
  CrossTenantVerificationError,
  ContradictoryEvidenceError,
} from './realityVerificationTypes.js';

export interface RealityEvidenceCollectorOptions {
  readonly sanitizer?: DiagnosisSanitizer;
  readonly maxEvidenceAgeMs?: number;
}

export class RealityEvidenceCollector {
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly maxEvidenceAgeMs: number;
  private readonly observedEvidenceHashes = new Set<string>();

  constructor(options?: RealityEvidenceCollectorOptions) {
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.maxEvidenceAgeMs = options?.maxEvidenceAgeMs ?? DEFAULT_MAX_EVIDENCE_AGE_MS;
  }

  /**
   * Collects, validates, and normalizes evidence items from an execution result and optional external observations.
   */
  public collectEvidence(
    result: ToolAdapterResult,
    externalEvidence?: readonly RealityEvidence[],
    currentTimeMs?: number
  ): readonly RealityEvidence[] {
    const now = currentTimeMs ?? Date.now();
    const collected: RealityEvidence[] = [];

    // 1. Extract and sanitize primary observation from ToolAdapterResult
    if (result.sanitizedOutput !== null && result.sanitizedOutput !== undefined) {
      this.defensivelyValidatePayload(result.sanitizedOutput);
      const sanitizedPayload = this.sanitizer.sanitize(result.sanitizedOutput);
      this.defensivelyValidatePayload(sanitizedPayload);

      // Create primary evidence item
      const primaryEvidence = this.createEvidenceItem({
        source: 'ADAPTER_OBSERVATION',
        path: 'output',
        observedValue: sanitizedPayload,
        timestamp: result.executedAt || new Date(now).toISOString(),
        confidence: 0.9,
        tenantId: result.tenantId,
        taskId: result.taskId,
        executionId: result.executionId,
      });

      collected.push(primaryEvidence);

      // Also flatten top-level properties if object for direct postcondition path resolution
      if (typeof sanitizedPayload === 'object' && !Array.isArray(sanitizedPayload)) {
        for (const [key, val] of Object.entries(sanitizedPayload as Record<string, unknown>)) {
          if (key === 'output') continue;
          collected.push(
            this.createEvidenceItem({
              source: 'ADAPTER_OBSERVATION',
              path: key,
              observedValue: val,
              timestamp: result.executedAt || new Date(now).toISOString(),
              confidence: 0.9,
              tenantId: result.tenantId,
              taskId: result.taskId,
              executionId: result.executionId,
            })
          );
        }
      }
    }

    // 2. Validate, sanitize, and bind external evidence items if provided
    if (externalEvidence && Array.isArray(externalEvidence)) {
      for (const item of externalEvidence) {
        this.validateExternalEvidenceItem(item, result, now);

        this.defensivelyValidatePayload(item.observedValue);
        const sanitizedValue = this.sanitizer.sanitize(item.observedValue);
        this.defensivelyValidatePayload(sanitizedValue);

        const evidenceHash = this.calculateEvidenceHash({
          source: item.source,
          path: item.path,
          observedValue: sanitizedValue,
          timestamp: item.timestamp,
          executionId: result.executionId,
        });

        if (this.observedEvidenceHashes.has(evidenceHash)) {
          throw new VerificationValidationError(
            `REPLAYED_EVIDENCE: Evidence item with hash "${evidenceHash}" has already been processed.`
          );
        }
        this.observedEvidenceHashes.add(evidenceHash);

        const normalizedItem: RealityEvidence = {
          ...item,
          observedValue: sanitizedValue,
          tenantId: result.tenantId,
          taskId: result.taskId,
          executionId: result.executionId,
          evidenceHash,
        };

        collected.push(Object.freeze(normalizedItem));
      }
    }

    // 3. Detect contradictory evidence
    this.detectContradictions(collected);

    return Object.freeze(collected);
  }

  /**
   * Validates an external evidence item against tenant, task, freshness, and bounds.
   */
  public validateExternalEvidenceItem(
    item: RealityEvidence,
    result: ToolAdapterResult,
    now: number
  ): void {
    if (!item || typeof item !== 'object') {
      throw new VerificationValidationError('MALFORMED_EVIDENCE: Evidence item must be a non-null object.');
    }

    if (!item.evidenceId || typeof item.evidenceId !== 'string') {
      throw new VerificationValidationError('INVALID_EVIDENCE_ID: Evidence item must have a valid evidenceId.');
    }

    if (!item.path || typeof item.path !== 'string') {
      throw new VerificationValidationError('INVALID_PATH: Evidence path must be a non-empty string.');
    }

    if (item.tenantId && item.tenantId !== result.tenantId) {
      throw new CrossTenantVerificationError(
        `CROSS_TENANT_EVIDENCE: Evidence tenant "${item.tenantId}" does not match execution tenant "${result.tenantId}".`
      );
    }

    if (item.taskId && item.taskId !== result.taskId) {
      throw new VerificationValidationError(
        `TASK_ID_MISMATCH: Evidence taskId "${item.taskId}" does not match execution taskId "${result.taskId}".`
      );
    }

    if (item.executionId && item.executionId !== result.executionId) {
      throw new VerificationValidationError(
        `EXECUTION_ID_MISMATCH: Evidence executionId "${item.executionId}" does not match result executionId "${result.executionId}".`
      );
    }

    if (typeof item.confidence !== 'number' || item.confidence < 0 || item.confidence > 1) {
      throw new VerificationValidationError(
        `INVALID_CONFIDENCE: Evidence confidence must be a number between 0.0 and 1.0 (received: ${item.confidence}).`
      );
    }

    // Freshness check
    const timestampMs = Date.parse(item.timestamp);
    if (Number.isNaN(timestampMs)) {
      throw new VerificationValidationError(`INVALID_TIMESTAMP: Evidence timestamp "${item.timestamp}" is invalid.`);
    }

    if (now - timestampMs > this.maxEvidenceAgeMs) {
      throw new VerificationValidationError(
        `STALE_EVIDENCE: Evidence is older than maximum age limit of ${this.maxEvidenceAgeMs}ms.`
      );
    }
  }

  /**
   * Scans for contradictory evidence across multiple sources for the same target path.
   */
  public detectContradictions(evidenceList: readonly RealityEvidence[]): void {
    const pathMap = new Map<string, RealityEvidence>();

    for (const ev of evidenceList) {
      const existing = pathMap.get(ev.path);
      if (existing) {
        // If two authoritative sources observe the same path with fundamentally differing values
        const valA = JSON.stringify(existing.observedValue);
        const valB = JSON.stringify(ev.observedValue);

        if (valA !== valB) {
          throw new ContradictoryEvidenceError(
            `CONTRADICTORY_EVIDENCE: Sources "${existing.source}" and "${ev.source}" report conflicting values for path "${ev.path}".`
          );
        }
      } else {
        pathMap.set(ev.path, ev);
      }
    }
  }

  /**
   * Constructs an authoritative RealityEvidence item.
   */
  public createEvidenceItem(params: {
    source: RealityEvidenceSource;
    path: string;
    observedValue: unknown;
    expectedValue?: unknown;
    timestamp: string;
    confidence: number;
    tenantId: string;
    taskId: string;
    executionId: string;
  }): RealityEvidence {
    const evidenceHash = this.calculateEvidenceHash({
      source: params.source,
      path: params.path,
      observedValue: params.observedValue,
      timestamp: params.timestamp,
      executionId: params.executionId,
    });

    const evidenceId = `ev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const matched =
      params.expectedValue !== undefined
        ? JSON.stringify(params.observedValue) === JSON.stringify(params.expectedValue)
        : true;

    return Object.freeze({
      evidenceId,
      source: params.source,
      path: params.path,
      observedValue: params.observedValue,
      expectedValue: params.expectedValue,
      matched,
      timestamp: params.timestamp,
      confidence: params.confidence,
      tenantId: params.tenantId,
      taskId: params.taskId,
      executionId: params.executionId,
      evidenceHash,
    });
  }

  /**
   * Computes deterministic SHA-256 evidence digest.
   */
  public calculateEvidenceHash(params: {
    source: string;
    path: string;
    observedValue: unknown;
    timestamp: string;
    executionId: string;
  }): string {
    const raw = [
      params.source,
      params.path,
      JSON.stringify(params.observedValue ?? ''),
      params.timestamp,
      params.executionId,
    ].join('|');

    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  /**
   * Defensively inspects payload for size, depth, prototype pollution, and null bytes.
   */
  public defensivelyValidatePayload(payload: unknown): void {
    let serialized: string;
    try {
      serialized = JSON.stringify(payload);
    } catch {
      throw new VerificationSecurityViolationError('UNSERIALIZABLE_EVIDENCE: Evidence payload cannot be serialized.');
    }

    const byteLength = Buffer.byteLength(serialized, 'utf8');
    if (byteLength > MAX_EVIDENCE_PAYLOAD_BYTES) {
      throw new VerificationSecurityViolationError(
        `PAYLOAD_SIZE_EXCEEDED: Evidence payload size (${byteLength} bytes) exceeds limit of ${MAX_EVIDENCE_PAYLOAD_BYTES} bytes.`
      );
    }

    if (/(?:__proto__|constructor|prototype)\s*":/i.test(serialized) || serialized.includes('"__proto__"')) {
      throw new VerificationSecurityViolationError(
        'PROTOTYPE_POLLUTION_KEY: Forbidden prototype pollution key detected in evidence payload.'
      );
    }

    this.scanRecursive(payload, 0);
  }

  private scanRecursive(val: unknown, currentDepth: number): void {
    if (currentDepth > MAX_EVIDENCE_DEPTH) {
      throw new VerificationSecurityViolationError(
        `MAX_DEPTH_EXCEEDED: Evidence recursion depth exceeds limit of ${MAX_EVIDENCE_DEPTH}.`
      );
    }

    if (val === null || val === undefined) return;

    if (typeof val === 'string') {
      if (val.includes('\0')) {
        throw new VerificationSecurityViolationError('NULL_BYTE_DETECTED: Evidence contains forbidden null byte (\\0).');
      }
      return;
    }

    if (Array.isArray(val)) {
      for (const item of val) {
        this.scanRecursive(item, currentDepth + 1);
      }
      return;
    }

    if (typeof val === 'object') {
      const proto = Object.getPrototypeOf(val);
      if (proto !== null && proto !== Object.prototype && proto !== Array.prototype) {
        throw new VerificationSecurityViolationError(
          'PROTOTYPE_POLLUTION_KEY: Abnormal prototype hierarchy detected in evidence.'
        );
      }

      if (
        Object.prototype.hasOwnProperty.call(val, '__proto__') ||
        Object.prototype.hasOwnProperty.call(val, 'prototype') ||
        (Object.prototype.hasOwnProperty.call(val, 'constructor') && typeof (val as any).constructor !== 'function')
      ) {
        throw new VerificationSecurityViolationError(
          'PROTOTYPE_POLLUTION_KEY: Forbidden prototype pollution property in evidence.'
        );
      }

      for (const key of Object.keys(val)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          throw new VerificationSecurityViolationError(
            `PROTOTYPE_POLLUTION_KEY: Forbidden prototype pollution key "${key}" in evidence.`
          );
        }

        if (key.includes('\0')) {
          throw new VerificationSecurityViolationError('NULL_BYTE_DETECTED: Evidence key contains null byte (\\0).');
        }

        this.scanRecursive((val as Record<string, unknown>)[key], currentDepth + 1);
      }
    }
  }

  /**
   * Resets replay tracking (for testing purposes).
   */
  public resetReplayTracker(): void {
    this.observedEvidenceHashes.clear();
  }
}

export const globalRealityEvidenceCollector = new RealityEvidenceCollector();
