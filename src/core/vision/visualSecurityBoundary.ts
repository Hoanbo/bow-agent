// src/core/vision/visualSecurityBoundary.ts
// BOWCON V4.0 — MS-1.5.06: VISUAL SECURITY BOUNDARY
// Component 1035 — REAL
//
// EN: Enforces screenshot prompt-injection containment, credential sanitization,
//     quarantine envelopes, multi-tenant isolation, and synchronous USER_STOP assertion.
// VI: Thực thi cách ly prompt-injection từ ảnh chụp màn hình, khử trùng thông tin xác thực,
//     phong bì cách ly, cô lập đa khách thuê và kiểm tra USER_STOP đồng bộ.

import crypto from 'node:crypto';
import {
  type VisualElement,
  type VisualSecurityAlert,
  VisionUserStopError,
  CrossTenantVisionError,
  VisionPromptInjectionError,
} from './visionTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalDiagnosisSanitizer, type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { CloudEscalationSanitizer } from '../cognitive/cloudEscalationSanitizer.js';

export const INJECTION_SIGNATURES = Object.freeze([
  'ignore previous instructions',
  'system prompt',
  'you are now',
  'developer message',
  'override instructions',
  'dan mode',
  'reveal secrets',
  'send password',
  'execute command',
  'bypass governance',
  'disregard security',
  'elevate privilege',
]);

export interface VisualQuarantineEnvelope {
  readonly visualContent: {
    readonly rawObservedText: string;
    readonly isExecutionInstruction: false; // Invariant: screen text is NEVER an instruction
    readonly containsSuspiciousTokens: boolean;
  };
  readonly securityAlerts: readonly VisualSecurityAlert[];
  readonly sanitizedText: string;
}

export interface SecurityBoundaryOptions {
  readonly sanitizer?: DiagnosisSanitizer;
  readonly userStopProvider?: () => boolean;
}

export class VisualSecurityBoundary {
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly userStopProvider: () => boolean;

  constructor(options?: SecurityBoundaryOptions) {
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.userStopProvider =
      options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Synchronously asserts USER_STOP preemption before any visual mutation.
   * VI: Kiểm tra đồng bộ quyền ưu tiên USER_STOP trước mọi đột biến thị giác.
   */
  public assertUserStopNotActive(checkpoint: string): void {
    if (this.userStopProvider()) {
      throw new VisionUserStopError(checkpoint);
    }
  }

  /**
   * EN: Asserts tenant isolation. Throws CrossTenantVisionError on mismatch.
   * VI: Khẳng định sự cô lập khách thuê. Báo lỗi CrossTenantVisionError nếu không khớp.
   */
  public assertTenantIsolation(requestedTenant: string, activeTenant: string): void {
    if (requestedTenant.trim() !== activeTenant.trim()) {
      throw new CrossTenantVisionError(requestedTenant, activeTenant);
    }
  }

  /**
   * EN: Inspects screen text and wraps it in a non-executable quarantine envelope.
   * VI: Kiểm tra văn bản màn hình và đóng gói vào phong bì cách ly không thể thực thi.
   */
  public quarantineScreenText(
    frameId: string,
    rawText: string
  ): VisualQuarantineEnvelope {
    this.assertUserStopNotActive('quarantine_screen_text');

    const sanitized = this.sanitizeText(rawText);
    const lower = sanitized.toLowerCase();
    const alerts: VisualSecurityAlert[] = [];

    let isSuspicious = false;
    for (const sig of INJECTION_SIGNATURES) {
      if (lower.includes(sig)) {
        isSuspicious = true;
        alerts.push({
          alertId: `alert_${crypto.randomBytes(6).toString('hex')}`,
          frameId,
          severity: 'HIGH',
          alertType: 'PROMPT_INJECTION_SUSPECTED',
          details: `Adversarial pattern '${sig}' detected in screen OCR text`,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return Object.freeze({
      visualContent: Object.freeze({
        rawObservedText: `[UNTRUSTED_SCREEN_CONTENT: ${sanitized}]`,
        isExecutionInstruction: false as const,
        containsSuspiciousTokens: isSuspicious,
      }),
      securityAlerts: Object.freeze(alerts),
      sanitizedText: sanitized,
    });
  }

  /**
   * EN: Deep-sanitizes visual elements, removing raw credentials and flagging injections.
   * VI: Khử trùng sâu các phần tử thị giác, loại bỏ thông tin xác thực và gắn cờ prompt-injection.
   */
  public sanitizeVisualElements(
    elements: readonly VisualElement[]
  ): { sanitizedElements: readonly VisualElement[]; alerts: readonly VisualSecurityAlert[] } {
    this.assertUserStopNotActive('sanitize_visual_elements');

    const sanitizedElements: VisualElement[] = [];
    const allAlerts: VisualSecurityAlert[] = [];

    for (const el of elements) {
      if (!el.detectedText) {
        sanitizedElements.push(el);
        continue;
      }

      const quarantine = this.quarantineScreenText(el.frameId, el.detectedText);
      if (quarantine.securityAlerts.length > 0) {
        allAlerts.push(...quarantine.securityAlerts);
      }

      const updated = Object.freeze({
        ...el,
        detectedText: quarantine.sanitizedText,
      });
      sanitizedElements.push(updated);
    }

    return {
      sanitizedElements: Object.freeze(sanitizedElements),
      alerts: Object.freeze(allAlerts),
    };
  }

  /**
   * EN: Secret sanitization reusing DiagnosisSanitizer and CloudEscalationSanitizer.
   * VI: Khử trùng bí mật tái sử dụng DiagnosisSanitizer và CloudEscalationSanitizer.
   */
  public sanitizeText(raw: string): string {
    const s1 = this.sanitizer.sanitizeString(raw || '');
    const s2 = CloudEscalationSanitizer.sanitizeString(s1).sanitized;
    return s2
      .replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]')
      .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]')
      .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
      .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[REDACTED_ANTHROPIC_KEY]')
      .replace(/ghp_[A-Za-z0-9]{30,}/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/(?:password|passwd|pwd)\s*=\s*[^\s,;]+/gi, '[REDACTED_PASSWORD]')
      .replace(/[A-Za-z]:\\\\BOW\\\\shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
      .replace(/[A-Za-z]:[\\/]BOW[\\/]shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
      .replace(/shopofbow/gi, '[REDACTED_PROTECTED_WORKSPACE]')
      .trim();
  }
}

export const globalVisualSecurityBoundary = new VisualSecurityBoundary();
