import type { AgentContext, ProductItemResult, PlanItemResult } from './types.js';
import type { StorageAdapter } from '../contracts/index.js';
import type { WalletProvider } from '../contracts/index.js';
import type { KnowledgeProvider } from '../contracts/index.js';
export type { ProductItemResult, PlanItemResult };
export type ProductPlanResult = PlanItemResult;
export interface ToolExecutionResult<T = any> {
    success: boolean;
    toolName: string;
    data?: T;
    message?: string;
}
/**
 * 1. Tool tra cứu danh mục & giá sản phẩm thực tế từ catalog/storage
 */
export declare function searchProducts(params: {
    keyword?: string;
    type?: string;
    categoryId?: string;
    productId?: string;
    limit?: number;
}, storage?: StorageAdapter): Promise<ToolExecutionResult<ProductItemResult[]>>;
/**
 * 2. Tool tra cứu đơn hàng của chính khách hàng hiện tại
 */
export declare function getMyOrders(params: {
    paymentCode?: string;
    status?: string;
    productName?: string;
    limit?: number;
}, context: AgentContext, storage?: StorageAdapter): Promise<ToolExecutionResult<any[]>>;
/**
 * 3. Tool tra cứu chính sách bảo hành
 */
export declare function checkWarrantyPolicy(params: {
    productName?: string;
}): Promise<ToolExecutionResult<any>>;
/**
 * 4. Tool tra cứu thư viện Prompt AI
 */
export declare function searchPromptsLibrary(params: {
    query?: string;
    category?: string;
}, storage?: StorageAdapter): Promise<ToolExecutionResult<any[]>>;
/**
 * 5. Tool tra cứu mã giảm giá đang kích hoạt
 */
export declare function getActiveCoupons(storage?: StorageAdapter): Promise<ToolExecutionResult<any[]>>;
/**
 * 6. Tool tra cứu số dư ví của khách hàng
 */
export declare function getMyWalletBalance(context: AgentContext, wallet?: WalletProvider): Promise<ToolExecutionResult<{
    balance: number;
    formatted: string;
}>>;
/**
 * 7. Tool tra cứu FAQs & Hướng dẫn sử dụng
 */
export declare function getFaqsAndGuides(params: {
    query?: string;
}, knowledge?: KnowledgeProvider): Promise<ToolExecutionResult<any[]>>;
/**
 * 8. Tool tra cứu thông tin hỗ trợ trực tiếp
 */
export declare function getSupportChannels(storage?: StorageAdapter): Promise<ToolExecutionResult<any>>;
/**
 * 9. Tool tra cứu Phiếu hỗ trợ (Ticket) của khách hàng
 */
export declare function getMyTickets(params: {
    status?: string;
    limit?: number;
}, context: AgentContext, storage?: StorageAdapter): Promise<ToolExecutionResult<any[]>>;
