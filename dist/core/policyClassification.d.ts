import { isPushToTalkEnabled } from '../security/pushToTalkManager.js';
import type { RiskLevel } from './bodyProtocol/types.js';
import type { ActionClassification } from './policyDecisionPoint.js';
export { isPushToTalkEnabled };
/**
 * Xác định RiskLevel cho capability của Body khi đăng ký vào BodyRegistry.
 */
export declare function getAudioCapabilityRiskLevel(capabilityName: string): RiskLevel;
/**
 * Phân loại hành động (ActionClassification) cho PDP khi đánh giá Tool Execution.
 */
export declare function getAudioActionClassification(toolName: string): ActionClassification;
