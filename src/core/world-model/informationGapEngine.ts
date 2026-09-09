// src/core/world-model/informationGapEngine.ts
// BOWCON V4.0 — MS-1.3.42: MASTER OWNER WORLD MODEL, SELF-AWARENESS & CAPABILITY-GROUNDED REASONING RUNTIME
//
// Explicit Information Gap Engine.
// Tracks missing evidence and prevents collapsing:
//   UNKNOWN != FALSE
//   NOT_AVAILABLE != NOT_AUTHORIZED
//
// Never assumes a missing metric is false or a missing credential means a capability doesn't exist.

import crypto from 'node:crypto';
import type {
  InformationGap,
  GapCategory,
  BowconSelfModel,
} from './worldModelTypes.js';

export class InformationGapEngine {
  private readonly _gaps = new Map<string, InformationGap>();

  public registerGap(
    category: GapCategory,
    description: string,
    impact: string,
    resolutionRequirement: string,
    options?: {
      isUnknownNotFalse?: boolean;
      isNotAvailableNotUnauthorized?: boolean;
    }
  ): InformationGap {
    const gapId = `gap_${crypto.randomUUID().slice(0, 8)}`;
    const gap: InformationGap = {
      gapId,
      category,
      description,
      impact,
      isUnknownNotFalse: options?.isUnknownNotFalse ?? true,
      isNotAvailableNotUnauthorized: options?.isNotAvailableNotUnauthorized ?? true,
      detectedAt: Date.now(),
      resolutionRequirement,
      resolved: false,
    };
    this._gaps.set(gapId, gap);
    return gap;
  }

  /**
   * Evaluates self-model to discover implicit knowledge gaps.
   */
  public detectGapsFromSelfModel(selfModel: BowconSelfModel): InformationGap[] {
    const detected: InformationGap[] = [];

    // Check unmeasurable telemetry
    for (const [key, item] of selfModel.whatICannotMeasure) {
      if (!this._hasActiveGapFor(key)) {
        const gap = this.registerGap(
          'MISSING_TELEMETRY',
          `Host metric "${key}" could not be measured on current platform (${item.source || 'unsupported'}).`,
          `Decisions relying on ${key} must treat it as UNKNOWN rather than 0 or FALSE.`,
          `Measure via dedicated host probe or proceed with conservative constraints.`,
          { isUnknownNotFalse: true, isNotAvailableNotUnauthorized: false }
        );
        detected.push(gap);
      }
    }

    // Check unauthorized capabilities
    for (const [capId, item] of selfModel.whatIAmNotAuthorizedToExecute) {
      if (!this._hasActiveGapFor(capId)) {
        const gap = this.registerGap(
          'MISSING_OWNER_DECISION',
          `Capability "${capId}" exists on host but lacks human authorization (${item.source}).`,
          `Execution cannot proceed autonomously without explicit Owner token.`,
          `Request cryptographic authorization token from Master Owner.`,
          { isUnknownNotFalse: false, isNotAvailableNotUnauthorized: true }
        );
        detected.push(gap);
      }
    }

    // Check unverified action outputs
    for (const [actId, item] of selfModel.whatIHaveNotVerified) {
      if (!this._hasActiveGapFor(actId)) {
        const gap = this.registerGap(
          'MISSING_VERIFICATION_EVIDENCE',
          `Action "${actId}" has completed but its output has not been independently verified.`,
          `Output must be treated as INFERENCE rather than authoritative FACT.`,
          `Perform post-condition verification check or inspect verification hash.`,
          { isUnknownNotFalse: true, isNotAvailableNotUnauthorized: false }
        );
        detected.push(gap);
      }
    }

    return detected;
  }

  /**
   * Assesses information gaps for a proposed task or plan.
   */
  public detectGapsForPlan(
    planId: string,
    requiredCapabilities: string[],
    availableCapabilities: string[],
    authorizedCapabilities: string[]
  ): InformationGap[] {
    const detected: InformationGap[] = [];

    for (const reqCap of requiredCapabilities) {
      const isAvailable = availableCapabilities.includes(reqCap);
      const isAuthorized = authorizedCapabilities.includes(reqCap);

      if (!isAvailable) {
        const gap = this.registerGap(
          'MISSING_CAPABILITY',
          `Plan "${planId}" requires capability "${reqCap}" which is NOT available on host.`,
          `Plan is BLOCKED until host capability is discovered or installed.`,
          `Install or discover capability "${reqCap}" on host.`,
          { isUnknownNotFalse: false, isNotAvailableNotUnauthorized: true }
        );
        detected.push(gap);
      } else if (!isAuthorized) {
        const gap = this.registerGap(
          'MISSING_OWNER_DECISION',
          `Plan "${planId}" requires capability "${reqCap}" which is available but NOT authorized.`,
          `Plan is CONDITIONALLY_POSSIBLE awaiting Owner HumanGate authorization.`,
          `Submit plan to HumanGate for Master Owner authorization token.`,
          { isUnknownNotFalse: false, isNotAvailableNotUnauthorized: true }
        );
        detected.push(gap);
      }
    }

    return detected;
  }

  public resolveGap(gapId: string): boolean {
    const gap = this._gaps.get(gapId);
    if (gap) {
      gap.resolved = true;
      return true;
    }
    return false;
  }

  public getActiveGaps(): InformationGap[] {
    return Array.from(this._gaps.values()).filter((g) => !g.resolved);
  }

  public getAllGaps(): InformationGap[] {
    return Array.from(this._gaps.values());
  }

  public formatGapReport(): string {
    const active = this.getActiveGaps();
    if (active.length === 0) {
      return 'No active information gaps detected.';
    }

    const lines = [`ACTIVE INFORMATION GAPS (${active.length}):`];
    for (const g of active) {
      lines.push(
        `[${g.category}] ${g.description} | Impact: ${g.impact} | Required: ${g.resolutionRequirement}`
      );
    }
    return lines.join('\n');
  }

  public reset(): void {
    this._gaps.clear();
  }

  private _hasActiveGapFor(term: string): boolean {
    for (const g of this._gaps.values()) {
      if (!g.resolved && g.description.includes(term)) {
        return true;
      }
    }
    return false;
  }
}

export const globalInformationGapEngine = new InformationGapEngine();
