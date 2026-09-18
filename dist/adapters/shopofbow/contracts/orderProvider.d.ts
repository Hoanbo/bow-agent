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
    /**
     * Retrieve a specific order by ID or payment code
     */
    getOrder(orderIdOrCode: string): Promise<AgentOrderSummary | null>;
    /**
     * Retrieve order history for a specific customer
     */
    getUserOrders(userId: string, limit?: number): Promise<AgentOrderSummary[]>;
    /**
     * Check warranty eligibility for an order (e.g. active warranty period, cancelled status)
     */
    getWarrantyStatus(orderId: string): Promise<WarrantyStatusResult>;
}
