import { ResourceTelemetry } from './personalOsTypes';
export declare class PersonalResourceMonitor {
    /**
     * Sample current real-world host telemetry.
     */
    sampleTelemetry(options?: {
        activeCapabilities?: string[];
        activeLocks?: string[];
    }): ResourceTelemetry;
}
