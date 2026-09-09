// src/core/resilience/adaptiveHostOrchestrator.ts
// BOWCON V4.0 — MS-1.3.43: ADAPTIVE HOST ORCHESTRATION
//
// Detects changes in host environment and triggers plan re-evaluation
// when host conditions change (CPU, RAM, storage, OS capability, architecture,
// permissions, network, process constraints, runtime limitations).
//
// Does NOT hardcode any platform, CPU, GPU, RAM amount, shell, or OS version.
// All telemetry that cannot be measured defaults to UNKNOWN / UNAVAILABLE.
//
// INVARIANTS:
// - Changed plan is a NEW RECOMMENDATION, not execution authorization.
// - Execution still requires the canonical authorization pipeline.
// - PLAN_CHANGED != PLAN_AUTHORIZED
// - Never silently execute a changed plan.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import type { HostEnvironment } from '../host/hostEnvironmentTypes.js';
import { globalHostDiscovery } from '../host/hostDiscoveryEngine.js';
import { globalCapabilityGroundedReasoningEngine } from '../world-model/capabilityGroundedReasoningEngine.js';
import type { PlanRequirementSpec } from '../world-model/capabilityGroundedReasoningEngine.js';
import type { CapabilityPlanFeasibility } from '../world-model/worldModelTypes.js';
import { generateResilienceId, HostAdaptationEvent } from './cognitiveResilienceTypes.js';
import { MASTER_OWNER_ID } from '../architecture/masterArchitectureIdentity.js';

export interface TrackedPlan {
  spec: PlanRequirementSpec;
  lastFeasibility: CapabilityPlanFeasibility;
  trackedAt: number;
}

export class AdaptiveHostOrchestrator {
  private _lastKnownHost: HostEnvironment | null = null;
  private readonly _adaptationHistory: HostAdaptationEvent[] = [];
  private readonly _trackedPlans: Map<string, TrackedPlan> = new Map();

  /**
   * Captures the current host environment baseline.
   * Must be called before change detection is meaningful.
   */
  public captureHostBaseline(): HostEnvironment {
    this._lastKnownHost = globalHostDiscovery.discoverHost();
    return this._lastKnownHost;
  }

  /**
   * Detects changes in host environment compared to the last known baseline.
   * Returns an array of detected host adaptation events.
   */
  public detectHostChanges(): HostAdaptationEvent[] {
    const currentHost = globalHostDiscovery.discoverHost();
    const events: HostAdaptationEvent[] = [];

    if (!this._lastKnownHost) {
      this._lastKnownHost = currentHost;
      return events;
    }

    const prev = this._lastKnownHost;

    // Detect OS platform change
    if (prev.operatingSystem.platform !== currentHost.operatingSystem.platform) {
      events.push(this._buildAdaptationEvent(
        'operatingSystem.platform',
        String(prev.operatingSystem.platform),
        String(currentHost.operatingSystem.platform)
      ));
    }

    // Detect architecture change
    if (prev.architecture.arch !== currentHost.architecture.arch) {
      events.push(this._buildAdaptationEvent(
        'architecture.arch',
        String(prev.architecture.arch),
        String(currentHost.architecture.arch)
      ));
    }

    // Detect CPU core count change (could be number or 'UNKNOWN')
    const prevCores = String(prev.cpu.cores);
    const currCores = String(currentHost.cpu.cores);
    if (prevCores !== currCores) {
      events.push(this._buildAdaptationEvent('cpu.cores', prevCores, currCores));
    }

    // Detect memory change (only if both values are numeric)
    const prevMem = prev.memory.totalBytes;
    const currMem = currentHost.memory.totalBytes;
    if (prevMem !== currMem && typeof prevMem === 'number' && typeof currMem === 'number') {
      const prevMb = Math.round((prevMem as number) / 1024 / 1024);
      const currMb = Math.round((currMem as number) / 1024 / 1024);
      if (Math.abs(prevMb - currMb) > 50) { // threshold: 50MB
        events.push(this._buildAdaptationEvent(
          'memory.totalBytes',
          `${prevMb}MB`,
          `${currMb}MB`
        ));
      }
    }

    // Detect GPU status change
    const prevGpuStatus = prev.gpu?.status;
    const currGpuStatus = currentHost.gpu?.status;
    if (prevGpuStatus !== currGpuStatus) {
      events.push(this._buildAdaptationEvent(
        'gpu.status',
        String(prevGpuStatus ?? 'UNKNOWN'),
        String(currGpuStatus ?? 'UNKNOWN')
      ));
    }

    // Detect OS status change (KNOWN vs UNKNOWN)
    if (prev.operatingSystem.status !== currentHost.operatingSystem.status) {
      events.push(this._buildAdaptationEvent(
        'operatingSystem.status',
        String(prev.operatingSystem.status),
        String(currentHost.operatingSystem.status)
      ));
    }

    if (events.length > 0) {
      // Re-evaluate all tracked plans if host changed
      for (const [planId, tracked] of this._trackedPlans.entries()) {
        const newFeasibility = globalCapabilityGroundedReasoningEngine.evaluatePlanFeasibility(
          tracked.spec,
          currentHost,
          []
        );
        if (newFeasibility.status !== tracked.lastFeasibility.status) {
          // Update the impacted plans list on each event
          for (const evt of events) {
            (evt.impactedPlans as string[]).push(planId);
            (evt as any).planReEvaluationRequired = true;
            (evt as any).newFeasibilityStatus = newFeasibility.status;
          }
          // Update tracked plan with new feasibility
          this._trackedPlans.set(planId, {
            ...tracked,
            lastFeasibility: newFeasibility,
          });
        }
      }

      this._adaptationHistory.push(...events);
      this._lastKnownHost = currentHost;
    }

    return events;
  }

  private _buildAdaptationEvent(changedAspect: string, previousValue: string, newValue: string): HostAdaptationEvent {
    return {
      adaptationId: generateResilienceId('adapt'),
      detectedAt: Date.now(),
      changedAspect,
      previousValue,
      newValue,
      impactedPlans: [],
      planReEvaluationRequired: false,
    };
  }

  /**
   * Registers a plan for adaptive re-evaluation when host conditions change.
   * A changed plan produces a new RECOMMENDATION, NOT execution authorization.
   */
  public trackPlan(spec: PlanRequirementSpec, currentFeasibility: CapabilityPlanFeasibility): void {
    this._trackedPlans.set(spec.planId, {
      spec,
      lastFeasibility: currentFeasibility,
      trackedAt: Date.now(),
    });
  }

  /**
   * Re-evaluates a specific plan against current host conditions.
   * Returns new feasibility WITHOUT authorizing execution.
   */
  public reEvaluatePlan(planId: string): {
    plan: TrackedPlan | null;
    newFeasibility: CapabilityPlanFeasibility | null;
    changed: boolean;
    notes: string;
  } {
    const tracked = this._trackedPlans.get(planId);
    if (!tracked) {
      return { plan: null, newFeasibility: null, changed: false, notes: `Plan '${planId}' is not tracked.` };
    }

    const currentHost = globalHostDiscovery.discoverHost();
    const newFeasibility = globalCapabilityGroundedReasoningEngine.evaluatePlanFeasibility(
      tracked.spec,
      currentHost,
      []
    );

    const changed = newFeasibility.status !== tracked.lastFeasibility.status;

    if (changed) {
      this._trackedPlans.set(planId, { ...tracked, lastFeasibility: newFeasibility });
    }

    // INVARIANT: changed plan is a new recommendation, not authorization
    const notes = changed
      ? `Plan '${planId}' feasibility changed from ${tracked.lastFeasibility.status} to ${newFeasibility.status}. ` +
        `This is a NEW RECOMMENDATION, not execution authorization. Execution requires canonical authorization pipeline.`
      : `Plan '${planId}' feasibility unchanged (${newFeasibility.status}).`;

    return { plan: tracked, newFeasibility, changed, notes };
  }

  public getCurrentHost(): HostEnvironment | null {
    return this._lastKnownHost;
  }

  public getAdaptationHistory(): HostAdaptationEvent[] {
    return [...this._adaptationHistory];
  }

  public getTrackedPlans(): TrackedPlan[] {
    return Array.from(this._trackedPlans.values());
  }

  public clear(): void {
    this._lastKnownHost = null;
    this._adaptationHistory.length = 0;
    this._trackedPlans.clear();
  }
}

export const globalAdaptiveHostOrchestrator = new AdaptiveHostOrchestrator();
