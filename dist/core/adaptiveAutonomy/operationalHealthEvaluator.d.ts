import { HealthEvaluation, OperationalIncident } from './adaptiveAutonomyTypes.js';
export interface HealthEvaluationTelemetry {
    readonly cycleNumber: number;
    readonly completedCycles: number;
    readonly totalStepsExecuted: number;
    readonly successfulSteps: number;
    readonly failedSteps: number;
    readonly consecutiveFailures: number;
    readonly consecutiveDegradations: number;
    readonly leaseValid: boolean;
    readonly budgetAvailable: boolean;
    readonly continuityIntact: boolean;
    readonly environmentalDriftDetected: boolean;
    readonly activeIncidents: readonly OperationalIncident[];
    readonly customMetrics?: Record<string, unknown>;
}
export declare class OperationalHealthEvaluator {
    /**
     * EN: Evaluates operational health deterministically from telemetry inputs.
     * VI: Đánh giá sức khỏe vận hành một cách xác định từ các đầu vào đo từ xa.
     */
    evaluateHealth(telemetry: HealthEvaluationTelemetry): HealthEvaluation;
    /**
     * EN: Asserts health evaluation state. Throws if health is UNKNOWN or CRITICAL.
     * VI: Khẳng định trạng thái đánh giá sức khỏe. Ném ngoại lệ nếu sức khỏe là UNKNOWN hoặc CRITICAL.
     */
    assertAcceptableHealth(evaluation: HealthEvaluation): void;
}
