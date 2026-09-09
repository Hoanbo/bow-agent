// src/core/resilience/confidenceCalibrationEngine.ts
// BOWCON V4.0 — MS-1.3.43: OUTCOME-BASED CONFIDENCE CALIBRATION
//
// Compares predicted confidence against verified outcomes.
// Detects: OVERCONFIDENT | UNDERCONFIDENT | CALIBRATED | INSUFFICIENT_DATA
//
// INVARIANTS:
// - Calibration improves FUTURE reasoning without modifying HISTORICAL records.
// - Historical confidence values are NEVER rewritten.
// - Calibration is advisory only — it is NOT authorization.
// - CALIBRATION != AUTHORIZATION
// - CALIBRATION != EXECUTION
// - CONFIDENCE_ADJUSTMENT != AUTHORITY

import {
  generateResilienceId,
  CalibrationSignal,
  ConfidenceCalibrationRecord,
} from './cognitiveResilienceTypes.js';

// How close predicted confidence must be to verified success rate to be "CALIBRATED"
const CALIBRATION_TOLERANCE = 0.15;
// Minimum number of verified outcomes to produce a meaningful calibration signal
const MIN_SAMPLE_SIZE = 3;

export interface OutcomeDataPoint {
  subjectId: string;
  predictedConfidence: number;    // 0.0–1.0
  wasSuccessful: boolean;         // verified outcome
  verifiedAt: number;
}

export class ConfidenceCalibrationEngine {
  private readonly _dataPoints: OutcomeDataPoint[] = [];
  private readonly _calibrations: ConfidenceCalibrationRecord[] = [];

  /**
   * Records a verified outcome for calibration purposes.
   * INVARIANT: This does NOT modify any historical confidence value.
   */
  public recordOutcomeDataPoint(point: OutcomeDataPoint): void {
    this._dataPoints.push({ ...point });
  }

  /**
   * Produces a calibration signal comparing predicted confidence
   * against the observed verified success rate.
   * INVARIANT: historicalRecordsUnmodified is always true.
   */
  public calibrate(subjectId: string, predictedConfidence: number): ConfidenceCalibrationRecord {
    const relevant = this._dataPoints.filter((d) => d.subjectId === subjectId);

    if (relevant.length < MIN_SAMPLE_SIZE) {
      const record: ConfidenceCalibrationRecord = {
        calibrationId: generateResilienceId('cal'),
        calibratedAt: Date.now(),
        subjectId,
        predictedConfidence,
        verifiedOutcomeSuccessRate: 0,
        signal: 'INSUFFICIENT_DATA',
        sampleSize: relevant.length,
        confidenceAdjustmentSignal: 0,
        historicalRecordsUnmodified: true,
        notes: `Insufficient data (${relevant.length}/${MIN_SAMPLE_SIZE} required). Cannot produce meaningful calibration.`,
      };
      this._calibrations.push(record);
      return record;
    }

    const successCount = relevant.filter((d) => d.wasSuccessful).length;
    const successRate = successCount / relevant.length;
    const delta = predictedConfidence - successRate;

    let signal: CalibrationSignal;
    if (Math.abs(delta) <= CALIBRATION_TOLERANCE) {
      signal = 'CALIBRATED';
    } else if (delta > 0) {
      signal = 'OVERCONFIDENT';
    } else {
      signal = 'UNDERCONFIDENT';
    }

    // Advisory delta signal (suggestion, not mandate)
    const adjustmentSignal = -delta; // Positive = increase confidence; Negative = decrease

    const notes = [
      `Predicted: ${(predictedConfidence * 100).toFixed(1)}%`,
      `Verified success rate: ${(successRate * 100).toFixed(1)}%`,
      `Signal: ${signal}`,
      `Adjustment suggestion: ${adjustmentSignal >= 0 ? '+' : ''}${(adjustmentSignal * 100).toFixed(1)}%`,
      `Based on ${relevant.length} verified outcome(s).`,
      `INVARIANT: No historical records were modified. This is an advisory calibration signal only.`,
    ].join(' | ');

    const record: ConfidenceCalibrationRecord = {
      calibrationId: generateResilienceId('cal'),
      calibratedAt: Date.now(),
      subjectId,
      predictedConfidence,
      verifiedOutcomeSuccessRate: successRate,
      signal,
      sampleSize: relevant.length,
      confidenceAdjustmentSignal: Number(adjustmentSignal.toFixed(4)),
      historicalRecordsUnmodified: true,
      notes,
    };

    this._calibrations.push(record);
    return record;
  }

  /**
   * Aggregated calibration across all subjects.
   * Returns advisory summary — NOT an authorization signal.
   */
  public getAggregateCalibration(): {
    totalDataPoints: number;
    globalSuccessRate: number;
    averagePredictedConfidence: number;
    overallSignal: CalibrationSignal;
    isBoundedToAdvisory: true;
  } {
    if (this._dataPoints.length < MIN_SAMPLE_SIZE) {
      return {
        totalDataPoints: this._dataPoints.length,
        globalSuccessRate: 0,
        averagePredictedConfidence: 0,
        overallSignal: 'INSUFFICIENT_DATA',
        isBoundedToAdvisory: true,
      };
    }

    const successRate = this._dataPoints.filter((d) => d.wasSuccessful).length / this._dataPoints.length;
    const avgPredicted = this._dataPoints.reduce((sum, d) => sum + d.predictedConfidence, 0) / this._dataPoints.length;
    const delta = avgPredicted - successRate;

    let overallSignal: CalibrationSignal;
    if (Math.abs(delta) <= CALIBRATION_TOLERANCE) {
      overallSignal = 'CALIBRATED';
    } else if (delta > 0) {
      overallSignal = 'OVERCONFIDENT';
    } else {
      overallSignal = 'UNDERCONFIDENT';
    }

    return {
      totalDataPoints: this._dataPoints.length,
      globalSuccessRate: Number(successRate.toFixed(4)),
      averagePredictedConfidence: Number(avgPredicted.toFixed(4)),
      overallSignal,
      isBoundedToAdvisory: true,
    };
  }

  public getAllCalibrations(): ConfidenceCalibrationRecord[] {
    return [...this._calibrations];
  }

  public getLatestCalibration(subjectId?: string): ConfidenceCalibrationRecord | undefined {
    const filtered = subjectId
      ? this._calibrations.filter((c) => c.subjectId === subjectId)
      : this._calibrations;
    return filtered[filtered.length - 1];
  }

  public getDataPointCount(): number {
    return this._dataPoints.length;
  }

  public clear(): void {
    this._dataPoints.length = 0;
    this._calibrations.length = 0;
  }
}

export const globalConfidenceCalibrationEngine = new ConfidenceCalibrationEngine();
