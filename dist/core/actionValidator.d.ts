import type { AgentAction, AgentContext } from './types.js';
/**
 * Sinh ID duy nhất cho mỗi Action (VD: act_9f82c1) để tracking và chống duplicate click
 */
export declare function generateActionId(): string;
/**
 * Kiểm tra tính hợp lệ và quyền sở hữu trước khi phát hành Action
 */
export declare function validateAndFinalizeAction(action: Omit<AgentAction, 'id'>, context: AgentContext): AgentAction | null;
/**
 * Aliases for backward compatibility and QA test harness adapters
 */
export declare const validateAgentAction: typeof validateAndFinalizeAction;
export declare const validateAction: typeof validateAndFinalizeAction;
