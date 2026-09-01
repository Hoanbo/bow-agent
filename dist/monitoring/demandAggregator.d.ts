import type { AgentAnalyticsEvent, DemandState } from './analyticsTypes.js';
export type { DemandState };
export type DomainCategory = 'video' | 'audio' | 'image' | 'design' | 'coding' | 'productivity' | 'education' | 'entertainment' | 'other';
export declare const VALID_DOMAINS: DomainCategory[];
export interface StateBreakdown {
    SUPPORTED: number;
    NEAR_MATCH: number;
    UNSUPPORTED: number;
    AMBIGUOUS: number;
}
export type GrowthLabel = 'New' | 'Stable' | 'Growing' | 'Declining';
export interface DemandAggregate {
    capability: string;
    domainCategory: DomainCategory;
    dominantState: DemandState;
    totalRequests: number;
    uniqueUsers: number;
    uniqueSessions: number;
    firstSeen: string;
    lastSeen: string;
    recentRequests: number;
    previousRequests: number;
    growthRate: number;
    growthLabel: GrowthLabel;
    priorityScore: number;
    stateBreakdown: StateBreakdown;
    sampleQueries: string[];
}
export interface DomainDistributionItem {
    domain: DomainCategory;
    count: number;
    percentage: number;
    uniqueUsers: number;
}
export interface StateDistributionItem {
    state: DemandState;
    count: number;
    percentage: number;
}
export interface SanitizedQueryItem {
    query: string;
    capability: string;
    domain: DomainCategory;
    state: DemandState;
    timestamp: string;
    sessionId?: string;
    userId?: string | null;
}
export interface DemandDiscoverySummary {
    totalDemandRequests: number;
    uniqueUsersCount: number;
    unmetDemandRequests: number;
    newDemandsCount: number;
    stateDistribution: StateDistributionItem[];
    domainDistribution: DomainDistributionItem[];
    topUnmetDemands: DemandAggregate[];
    trendingDemands: DemandAggregate[];
    allDemands: DemandAggregate[];
    recentQueries: SanitizedQueryItem[];
}
/**
 * Lọc và loại bỏ các dữ liệu nhạy cảm khỏi chuỗi câu hỏi hiển thị
 */
export declare function sanitizeQueryText(text?: string | null): string;
/**
 * Tổng hợp sự kiện Demand Discovery từ danh sách events
 */
export declare function aggregateDemandEvents(events: AgentAnalyticsEvent[], timeWindow?: {
    start: Date | null;
    end: Date | null;
}): DemandDiscoverySummary;
/**
 * Lọc và phân trang cho danh sách Demand
 */
export declare function filterAndPaginateDemands(demands: DemandAggregate[], options: {
    searchQuery?: string;
    stateFilter?: 'all' | DemandState;
    domainFilter?: 'all' | DomainCategory;
    sortBy?: 'priority' | 'requests' | 'users' | 'growth' | 'latest';
    page?: number;
    perPage?: number;
}): {
    items: DemandAggregate[];
    total: number;
    totalPages: number;
    page: number;
};
