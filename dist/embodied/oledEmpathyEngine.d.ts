import type { RobotEmotion } from '../adapters/robotAdapter.js';
export interface EmpathyExpressionState {
    emotion: RobotEmotion;
    intensity: 'subtle' | 'normal' | 'vibrant';
    blinkRatePerMinute: number;
    reason: string;
}
export declare class OledEmpathyEngine {
    private currentExpression;
    /**
     * Tự động tính toán biểu cảm mắt phù hợp theo ngữ cảnh cuộc trò chuyện
     */
    deduceExpressionFromContext(userText: string, agentReply: string, isBossChannel?: boolean): EmpathyExpressionState;
    getCurrentExpression(): EmpathyExpressionState;
}
export declare const globalOledEmpathy: OledEmpathyEngine;
