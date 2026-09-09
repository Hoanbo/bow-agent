import { CalibrationSignal, ConfidenceCalibrationRecord } from './cognitiveResilienceTypes.js';
export interface OutcomeDataPoint {
    subjectId: string;
    predictedConfidence: number;
    wasSuccessful: boolean;
    verifiedAt: number;
}
export declare class ConfidenceCalibrationEngine {
    private readonly _dataPoints;
    private readonly _calibrations;
    /**
     * Records a verified outcome for calibration purposes.
     * INVARIANT: This does NOT modify any historical confidence value.
     */
    recordOutcomeDataPoint(point: OutcomeDataPoint): void;
    /**
     * Produces a calibration signal comparing predicted confidence
     * against the observed verified success rate.
     * INVARIANT: historicalRecordsUnmodified is always true.
     */
    calibrate(subjectId: string, predictedConfidence: number): ConfidenceCalibrationRecord;
    /**
     * Aggregated calibration across all subjects.
     * Returns advisory summary — NOT an authorization signal.
     */
    getAggregateCalibration(): {
        totalDataPoints: number;
        globalSuccessRate: number;
        averagePredictedConfidence: number;
        overallSignal: CalibrationSignal;
        isBoundedToAdvisory: true;
    };
    getAllCalibrations(): ConfidenceCalibrationRecord[];
    getLatestCalibration(subjectId?: string): ConfidenceCalibrationRecord | undefined;
    getDataPointCount(): number;
    clear(): void;
}
export declare const globalConfidenceCalibrationEngine: ConfidenceCalibrationEngine;
