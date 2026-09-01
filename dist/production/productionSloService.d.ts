import type { SloThresholds, ProductionSloReport, ProductionRequestMetric } from '../monitoring/analyticsTypes.js';
export declare const DEFAULT_SLO_THRESHOLDS: SloThresholds;
export declare function getSloThresholds(): SloThresholds;
export declare function evaluateProductionSlo(providedMetrics?: ProductionRequestMetric[], thresholds?: SloThresholds): ProductionSloReport;
