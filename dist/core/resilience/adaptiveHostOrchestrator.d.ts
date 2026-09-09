import type { HostEnvironment } from '../host/hostEnvironmentTypes.js';
import type { PlanRequirementSpec } from '../world-model/capabilityGroundedReasoningEngine.js';
import type { CapabilityPlanFeasibility } from '../world-model/worldModelTypes.js';
import { HostAdaptationEvent } from './cognitiveResilienceTypes.js';
export interface TrackedPlan {
    spec: PlanRequirementSpec;
    lastFeasibility: CapabilityPlanFeasibility;
    trackedAt: number;
}
export declare class AdaptiveHostOrchestrator {
    private _lastKnownHost;
    private readonly _adaptationHistory;
    private readonly _trackedPlans;
    /**
     * Captures the current host environment baseline.
     * Must be called before change detection is meaningful.
     */
    captureHostBaseline(): HostEnvironment;
    /**
     * Detects changes in host environment compared to the last known baseline.
     * Returns an array of detected host adaptation events.
     */
    detectHostChanges(): HostAdaptationEvent[];
    private _buildAdaptationEvent;
    /**
     * Registers a plan for adaptive re-evaluation when host conditions change.
     * A changed plan produces a new RECOMMENDATION, NOT execution authorization.
     */
    trackPlan(spec: PlanRequirementSpec, currentFeasibility: CapabilityPlanFeasibility): void;
    /**
     * Re-evaluates a specific plan against current host conditions.
     * Returns new feasibility WITHOUT authorizing execution.
     */
    reEvaluatePlan(planId: string): {
        plan: TrackedPlan | null;
        newFeasibility: CapabilityPlanFeasibility | null;
        changed: boolean;
        notes: string;
    };
    getCurrentHost(): HostEnvironment | null;
    getAdaptationHistory(): HostAdaptationEvent[];
    getTrackedPlans(): TrackedPlan[];
    clear(): void;
}
export declare const globalAdaptiveHostOrchestrator: AdaptiveHostOrchestrator;
