import type { AgentAction, AgentContext, ProductItemResult, PlanItemResult } from './types.js';
/**
 * Lập kế hoạch mở CheckoutModal mua nhanh 1 sản phẩm & plan cụ thể
 */
export declare function planCheckoutAction(product: ProductItemResult, plan: PlanItemResult | undefined, context: AgentContext): AgentAction | null;
/**
 * Lập kế hoạch sinh ra nhiều Checkout Action Cards cho từng gói
 */
export declare function planMultipleCheckoutActions(product: ProductItemResult, plans: PlanItemResult[], context: AgentContext): AgentAction[];
/**
 * Lập kế hoạch mở Modal xem chi tiết đơn hàng
 */
export declare function planOrderDetailAction(order: any, context: AgentContext): AgentAction | null;
/**
 * Lập kế hoạch mở Popup gia hạn đơn hàng cũ
 */
export declare function planRenewalAction(order: any, context: AgentContext): AgentAction | null;
/**
 * Tập hợp các trạng thái đơn hàng đủ điều kiện áp dụng chính sách bảo hành
 */
export declare const WARRANTY_ELIGIBLE_STATUSES: Set<string>;
/**
 * Kiểm tra xem đơn hàng có đủ điều kiện bảo hành không (không cancelled, không refunded, không pending_payment)
 */
export declare function isOrderWarrantyEligible(order: any): boolean;
/**
 * Lập kế hoạch mở Popup gửi yêu cầu hỗ trợ lỗi / bảo hành đơn hàng
 * Guard V3.3 Phase 4.3 & 4.7: Chỉ cho phép bảo hành đơn hàng hợp lệ (không cancelled, không refunded, không pending_payment)
 */
export declare function planSupportTicketAction(order: any, issueDescription: string, context: AgentContext): AgentAction | null;
/**
 * Tìm đơn hàng phù hợp nhất để bảo hành từ danh sách đơn hàng của user
 * Hỗ trợ tra theo payment code (vd: BOW-12345), tên sản phẩm, hoặc đơn gần nhất.
 * V3.3 Phase 4.7: Luôn lọc trạng thái hợp lệ trước khi fallback, không để đơn hủy/chưa thanh toán chặn đơn hợp lệ.
 */
export declare function findRelevantWarrantyOrder(orders: any[], queryText: string, lastMentionedOrder?: any): any | null;
/**
 * Lập kế hoạch kích hoạt mã giảm giá vào phiên thanh toán
 */
export declare function planApplyCouponAction(couponCode: string, discountLabel: string, context: AgentContext): AgentAction | null;
/**
 * Lập kế hoạch mở nạp tiền ví theo số tiền chỉ định hoặc mở popup nạp tiền
 */
export declare function planDepositAction(amount: number | undefined, context: AgentContext): AgentAction | null;
/**
 * Lập kế hoạch mở chi tiết Ticket trao đổi hỗ trợ
 */
export declare function planTicketDetailAction(ticket: any, context: AgentContext): AgentAction | null;
/**
 * Lập kế hoạch mở Modal tạo Ticket hỗ trợ mới
 */
export declare function planCreateTicketAction(context: AgentContext): AgentAction | null;
