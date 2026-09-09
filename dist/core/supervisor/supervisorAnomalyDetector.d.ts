import type { Anomaly, ObservationSnapshot } from './supervisorTypes.js';
export declare class SupervisorAnomalyDetector {
    detectAnomalies(snapshot: ObservationSnapshot, context?: {
        sessionId?: string;
        deviceId?: string;
        explicitAnomalies?: Anomaly[];
    }): Anomaly[];
}
export declare const globalSupervisorAnomalyDetector: SupervisorAnomalyDetector;
