export type AgentRole = 'owner' | 'admin' | 'ctv' | 'user' | 'guest' | 'customer';
export interface AgentContext {
    userId?: string | null;
    email?: string | null;
    fullName?: string | null;
    role: AgentRole;
    balance?: number;
    isAuthenticated: boolean;
    sessionId?: string;
    channel?: 'WEB' | 'ROBOT' | 'DESKTOP' | 'SYSTEM' | string;
    authToken?: string;
    userText?: string;
}
export type AgentIntent = 'GREETING' | 'SMALL_TALK' | 'CAPABILITY_DISCOVERY' | 'CLARIFICATION' | 'CATALOG' | 'VIEW_CATEGORY' | 'PRODUCT_SEARCH' | 'BUY' | 'EXPIRING_SOON' | 'ORDER_QUERY' | 'RENEW' | 'WARRANTY' | 'TICKET' | 'COUPON' | 'WALLET' | 'FAQ' | 'EXECUTIVE_REPORT' | 'GENERAL';
export type AgentActionType = 'NAVIGATE_CHECKOUT' | 'NAVIGATE_ORDER_DETAIL' | 'NAVIGATE_RENEWAL' | 'NAVIGATE_SUPPORT' | 'NAVIGATE_TICKET_DETAIL' | 'APPLY_COUPON' | 'OPEN_DEPOSIT';
export interface AgentActionPayload {
    productId?: string;
    productSlug?: string;
    productName?: string;
    planId?: string;
    planLabel?: string;
    displayPrice?: number;
    orderId?: string;
    paymentCode?: string;
    couponCode?: string;
    ticketId?: string;
    ticketTitle?: string;
    supportTitle?: string;
    amount?: number;
    issueDescription?: string;
}
export interface AgentAction {
    id: string;
    type: AgentActionType;
    label: string;
    icon?: string;
    payload: AgentActionPayload;
    requiresConfirmation?: boolean;
    createdAt?: number;
    expiresAt?: number;
}
export interface CategoryInfo {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    sortOrder?: number;
}
export interface CategoryResolution {
    matched: boolean;
    category?: CategoryInfo;
}
export type CategoryItemResult = CategoryInfo;
export type OrderItemResult = any;
export type FaqItemResult = any;
export type NegativePolicyItemResult = any;
export interface PlanItemResult {
    id: string;
    name: string;
    duration: string;
    price: number;
    originalPrice?: number | null;
    isHighlight: boolean;
    shortDescription?: string | null;
}
export interface ProductItemResult {
    id: string;
    name: string;
    slug: string;
    type: 'ai-tool' | 'premium-app' | 'product';
    categoryId?: string | null;
    categoryName?: string | null;
    badge?: string | null;
    tagline?: string | null;
    description?: string | null;
    logoUrl?: string | null;
    startingPrice: number;
    plans: PlanItemResult[];
    features?: string[];
    warranty: string;
    searchAliases?: string[];
}
export interface DeferredContext {
    intent: AgentIntent;
    productName?: string;
    duration?: string;
    rawQuery?: string;
}
export interface MultiIntentResult {
    primaryIntent: AgentIntent;
    secondaryIntents: AgentIntent[];
    deferredContext?: DeferredContext;
}
export interface SessionContext {
    lastMentionedProduct?: ProductItemResult;
    lastMentionedPlan?: PlanItemResult;
    productSlug?: string;
    planContext?: PlanItemResult | null;
    lastRecommendedCandidates?: ProductItemResult[];
    lastMentionedOrder?: any;
    lastMentionedCategory?: CategoryInfo;
    lastActiveAction?: AgentAction;
    deferredContext?: DeferredContext;
    updatedAt: number;
}
export interface AgentMessage {
    id: string;
    sender: 'user' | 'agent';
    content: string;
    timestamp: string;
    data?: any;
    suggestions?: string[];
    action?: AgentAction;
    actions?: AgentAction[];
}
