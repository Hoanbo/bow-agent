import type { RecoveryPlan, Diagnosis, EscalationRecord, RecoveryAttempt } from './supervisorTypes.js';
export declare class SupervisorEscalationManager {
    private attempts;
    private escalations;
    recordAttempt(planId: string, attempt: RecoveryAttempt): void;
    getAttempts(planId: string): readonly RecoveryAttempt[];
    shouldEscalate(plan: RecoveryPlan): boolean;
    escalate(plan: RecoveryPlan, diagnosis: Diagnosis, reason: string): EscalationRecord;
    getAllEscalations(): readonly EscalationRecord[];
    clear(): void;
}
export declare const globalSupervisorEscalation: SupervisorEscalationManager;
