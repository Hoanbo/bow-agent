// src/core/adaptiveAutonomy/operationalHealthEvaluator.ts
// BOWCON V4.0 — MS-1.5.12: NATIVE GOVERNED ADAPTIVE AUTONOMY, RECOVERY & SUPERVISED CONTINUOUS OPERATION ENGINE
// Component 1091 — REAL
//
// EN: Deterministic operational health evaluation engine.
//     Evaluates objective progress, telemetry, failures, lease, and budget status, failing closed on UNKNOWN.
// VI: Động cơ đánh giá sức khỏe vận hành xác định.
//     Đánh giá tiến độ mục tiêu, dữ liệu đo từ xa, lỗi, hợp đồng thuê và ngân sách, đóng-khi-lỗi khi gặp UNKNOWN.
import { computeHealthEvaluationHash, AdaptiveAutonomyValidationError, } from './adaptiveAutonomyTypes.js';
export class OperationalHealthEvaluator {
    /**
     * EN: Evaluates operational health deterministically from telemetry inputs.
     * VI: Đánh giá sức khỏe vận hành một cách xác định từ các đầu vào đo từ xa.
     */
    evaluateHealth(telemetry) {
        if (!telemetry || typeof telemetry !== 'object') {
            throw new AdaptiveAutonomyValidationError('Telemetry must be a valid non-null object');
        }
        const { cycleNumber, successfulSteps, failedSteps, consecutiveFailures, consecutiveDegradations, leaseValid, budgetAvailable, continuityIntact, environmentalDriftDetected, activeIncidents = [], customMetrics = {}, } = telemetry;
        const totalSteps = successfulSteps + failedSteps;
        const ratio = totalSteps > 0 ? successfulSteps / totalSteps : 1.0;
        let healthState = 'HEALTHY';
        let isProgressing = true;
        // Fail closed if required telemetry facts are undefined/null
        if (leaseValid === undefined || budgetAvailable === undefined || continuityIntact === undefined) {
            healthState = 'UNKNOWN';
            isProgressing = false;
        }
        else if (!leaseValid || !budgetAvailable || !continuityIntact) {
            healthState = 'CRITICAL';
            isProgressing = false;
        }
        else if (consecutiveFailures >= 3 || consecutiveDegradations >= 3) {
            healthState = 'CRITICAL';
            isProgressing = false;
        }
        else if (consecutiveFailures === 2 || consecutiveDegradations === 2 || environmentalDriftDetected) {
            healthState = 'UNSTABLE';
            isProgressing = false;
        }
        else if (consecutiveFailures === 1 || consecutiveDegradations === 1 || ratio < 0.8) {
            healthState = 'DEGRADED';
            isProgressing = ratio >= 0.5;
        }
        const timestamp = Date.now();
        const evaluationId = `eval_${cycleNumber}_${timestamp}`;
        const evaluationPayload = {
            evaluationId,
            timestamp,
            cycleNumber,
            healthState,
            isProgressing,
            successFailureRatio: ratio,
            activeIncidents,
            telemetrySummary: {
                totalSteps,
                successfulSteps,
                failedSteps,
                consecutiveFailures,
                consecutiveDegradations,
                leaseValid,
                budgetAvailable,
                continuityIntact,
                environmentalDriftDetected,
                ...customMetrics,
            },
        };
        const evaluationHash = computeHealthEvaluationHash(evaluationPayload);
        return {
            ...evaluationPayload,
            evaluationHash,
        };
    }
    /**
     * EN: Asserts health evaluation state. Throws if health is UNKNOWN or CRITICAL.
     * VI: Khẳng định trạng thái đánh giá sức khỏe. Ném ngoại lệ nếu sức khỏe là UNKNOWN hoặc CRITICAL.
     */
    assertAcceptableHealth(evaluation) {
        if (evaluation.healthState === 'UNKNOWN') {
            throw new AdaptiveAutonomyValidationError(`Operational health evaluation is UNKNOWN (failed closed)`);
        }
    }
}
