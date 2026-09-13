export interface Phase14GateOptions {
    readonly isUserStopActive?: () => boolean;
    readonly getUserStopReason?: () => string | null;
}
export declare class Phase14ExecutionGate {
    private readonly _isUserStopActive;
    private readonly _getUserStopReason;
    constructor(options?: Phase14GateOptions);
    private assertUserStop;
    validateIdentifier(value: string, fieldName: string): void;
    validatePayload(payload: unknown, depth?: number): void;
    /**
     * Checkpoint 1: Assessment Intake
     */
    assertCheckpoint1_AssessmentIntake(tenantId: string): void;
    /**
     * Checkpoint 2: Chaos Scenario Execution
     */
    assertCheckpoint2_ChaosScenario(scenarioId: string, tenantId: string): void;
    /**
     * Checkpoint 3: Exit Criteria Evaluation
     */
    assertCheckpoint3_CriteriaEvaluation(criterionId: string, tenantId: string): void;
    /**
     * Checkpoint 4: Provenance Manifest Calculation
     */
    assertCheckpoint4_ProvenanceCalculation(tenantId: string): void;
    /**
     * Checkpoint 5: Readiness Report Sealing
     */
    assertCheckpoint5_ReportSealing(reportId: string, tenantId: string): void;
    /**
     * Checkpoint 6: Result Export
     */
    assertCheckpoint6_ResultExport(reportId: string, tenantId: string): void;
}
