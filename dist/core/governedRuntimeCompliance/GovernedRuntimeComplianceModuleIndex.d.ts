import { RuntimeBehaviorObservationCollector, RawTelemetryInput, EmergencyStopProvider } from './RuntimeBehaviorObservationCollector.js';
import { ActivePolicySnapshotBindingResolver, PolicySnapshotProvider } from './ActivePolicySnapshotBindingResolver.js';
import { DeterministicPolicyComplianceEvaluator } from './DeterministicPolicyComplianceEvaluator.js';
import { ContinuousOperationalAssuranceScorer } from './ContinuousOperationalAssuranceScorer.js';
import { PolicyViolationDriftClassifier } from './PolicyViolationDriftClassifier.js';
import { GovernedAdaptiveSafetyController, LifecycleStateCoordinatorBridge, IncidentManagerBridge } from './GovernedAdaptiveSafetyController.js';
import { RuntimeComplianceEvidenceDossierEngine } from './RuntimeComplianceEvidenceDossierEngine.js';
import { RuntimeComplianceAuditLedger } from './RuntimeComplianceAuditLedger.js';
import { RuntimeBehavioralProfile, ActivePolicyBinding, ComplianceEvaluationRecord, OperationalAssuranceScore, PolicyViolationRecord, SafetyControlDecision, RuntimeComplianceEvidenceDossier } from './GovernedRuntimeComplianceTypes.js';
import type { CanonicalStrategicPolicy } from '../governedPolicyDecisionIngestion/GovernedPolicyDecisionIngestionTypes.js';
export interface GovernedRuntimeComplianceContainerConfig {
    readonly stopProvider?: EmergencyStopProvider;
    readonly snapshotProvider?: PolicySnapshotProvider;
    readonly lifecycleBridge?: LifecycleStateCoordinatorBridge;
    readonly incidentBridge?: IncidentManagerBridge;
    readonly baseStorageDir?: string;
}
export declare class GovernedRuntimeComplianceModuleIndex {
    readonly collector: RuntimeBehaviorObservationCollector;
    readonly bindingResolver: ActivePolicySnapshotBindingResolver;
    readonly evaluator: DeterministicPolicyComplianceEvaluator;
    readonly scorer: ContinuousOperationalAssuranceScorer;
    readonly classifier: PolicyViolationDriftClassifier;
    readonly safetyController: GovernedAdaptiveSafetyController;
    readonly dossierEngine: RuntimeComplianceEvidenceDossierEngine;
    readonly auditLedger: RuntimeComplianceAuditLedger;
    constructor(config?: GovernedRuntimeComplianceContainerConfig);
    processRuntimeTelemetry(rawTelemetry: RawTelemetryInput, policy: CanonicalStrategicPolicy): Promise<{
        profile: RuntimeBehavioralProfile;
        binding: ActivePolicyBinding;
        evaluation: ComplianceEvaluationRecord;
        violation: PolicyViolationRecord | null;
        assurance: OperationalAssuranceScore;
        safetyDecision: SafetyControlDecision;
        dossier: RuntimeComplianceEvidenceDossier;
    }>;
}
