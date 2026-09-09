import type { ObservationSnapshot } from './supervisorTypes.js';
export declare class SupervisorObservationEngine {
    /**
     * Captures an authoritative observation snapshot directly from real runtime subsystems.
     */
    captureSnapshot(): ObservationSnapshot;
}
export declare const globalSupervisorObservation: SupervisorObservationEngine;
