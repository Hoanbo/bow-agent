import type { Anomaly, Diagnosis } from './supervisorTypes.js';
export declare class SupervisorDiagnosisEngine {
    diagnose(anomaly: Anomaly): Diagnosis;
}
export declare const globalSupervisorDiagnosis: SupervisorDiagnosisEngine;
