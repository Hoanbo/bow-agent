import { type SloPolicyConfig, type SloEvaluationResult, type CanaryObservationWindow } from './deploymentTypes.js';
export declare const DEFAULT_PRODUCTION_SLO: SloPolicyConfig;
export declare class SloPolicyEngine {
    /**
     * Evaluates a canary observation window against the active SLO policy config.
     * Đánh giá cửa sổ quan sát canary theo cấu hình chính sách SLO đang hoạt động.
     */
    evaluateWindow(window: CanaryObservationWindow, policy?: SloPolicyConfig): SloEvaluationResult;
}
