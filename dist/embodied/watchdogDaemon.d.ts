export interface WatchdogHealthReport {
    timestamp: string;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    metrics: {
        memoryUsageMb: number;
        uptimeSeconds: number;
        activeChannels: string[];
        criticalAnomaliesCount: number;
    };
    alarmTriggered: boolean;
    alertMessage?: string;
}
export declare class AutonomousWatchdogDaemon {
    private isRunning;
    private criticalAlertCount;
    /**
     * Run instant health inspection
     */
    runHealthCheck(): WatchdogHealthReport;
    /**
     * Trigger critical incident alert to wake up Boss
     */
    triggerEmergencyAlert(issueDescription: string): WatchdogHealthReport;
}
export declare const watchdogDaemon: AutonomousWatchdogDaemon;
