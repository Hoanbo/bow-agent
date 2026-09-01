import type { AgentContext, AgentRole } from './types.js';
export type { AgentContext, AgentRole };
export type UserRole = AgentRole;
export type AgentToolName = 'searchProducts' | 'getMyOrders' | 'getMyTickets' | 'checkWarrantyPolicy' | 'searchPromptsLibrary' | 'getActiveCoupons' | 'getMyWalletBalance' | 'getFaqsAndGuides' | 'getSupportChannels';
/**
 * Kiểm tra xem người dùng hiện tại có đủ quyền gọi tool không
 */
export declare function checkToolPermission(toolName: AgentToolName, context: AgentContext): {
    allowed: boolean;
    reason?: string;
};
