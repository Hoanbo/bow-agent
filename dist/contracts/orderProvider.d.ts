export interface AgentOrderSummary {
    id: string;
    userId: string;
    productName: string;
    planLabel?: string;
    price: number;
    status: string;
    paymentCode?: string;
    notes?: string;
    createdAt: string;
    warrantyExpiresAt?: string;
}
export interface WarrantyStatusResult {
    orderId: string;
    isEligible: boolean;
    reason?: string;
    ticketCount: number;
    status: string;
}
export interface OrderProvider {
    getOrder(orderIdOrCode: string): Promise<AgentOrderSummary | null>;
    getUserOrders(userId: string, limit?: number): Promise<AgentOrderSummary[]>;
    getWarrantyStatus(orderId: string): Promise<WarrantyStatusResult>;
}
