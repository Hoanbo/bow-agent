// src/services/agent/monitoring/demandAggregator.ts
// Pure, deterministic demand discovery aggregator for BOW Agent V3.3 Market Insights
export const VALID_DOMAINS = [
    'video',
    'audio',
    'image',
    'design',
    'coding',
    'productivity',
    'education',
    'entertainment',
    'other',
];
/**
 * Lọc và loại bỏ các dữ liệu nhạy cảm khỏi chuỗi câu hỏi hiển thị
 */
export function sanitizeQueryText(text) {
    if (!text || typeof text !== 'string')
        return '';
    return text
        .replace(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/gi, '[EMAIL]')
        .replace(/(?:\+84|0)[1-9]\d{7,9}\b/g, '[PHONE]')
        .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[CARD]')
        .replace(/password\s*[:=]\s*\S+/gi, 'password: [REDACTED]')
        .replace(/token\s*[:=]\s*\S+/gi, 'token: [REDACTED]')
        .replace(/apikey\s*[:=]\s*\S+/gi, 'apikey: [REDACTED]')
        .replace(/[<>{}`\\;]/g, '')
        .slice(0, 200)
        .trim();
}
/**
 * Tổng hợp sự kiện Demand Discovery từ danh sách events
 */
export function aggregateDemandEvents(events, timeWindow) {
    const demandEventTypes = new Set(['DEMAND_DISCOVERED', 'DEMAND_MATCHED', 'CLARIFICATION_REQUESTED']);
    // 1. Lọc các sự kiện hợp lệ có normalizedCapability trong metadata
    const validEvents = [];
    for (const ev of events) {
        if (!ev || !demandEventTypes.has(ev.eventType))
            continue;
        const meta = ev.metadata;
        if (!meta || !meta.normalizedCapability)
            continue;
        const ts = ev.createdAt ? new Date(ev.createdAt) : new Date();
        validEvents.push({
            event: ev,
            meta,
            timestamp: ts,
        });
    }
    if (validEvents.length === 0) {
        return {
            totalDemandRequests: 0,
            uniqueUsersCount: 0,
            unmetDemandRequests: 0,
            newDemandsCount: 0,
            stateDistribution: [
                { state: 'SUPPORTED', count: 0, percentage: 0 },
                { state: 'NEAR_MATCH', count: 0, percentage: 0 },
                { state: 'UNSUPPORTED', count: 0, percentage: 0 },
                { state: 'AMBIGUOUS', count: 0, percentage: 0 },
            ],
            domainDistribution: VALID_DOMAINS.map((d) => ({ domain: d, count: 0, percentage: 0, uniqueUsers: 0 })),
            topUnmetDemands: [],
            trendingDemands: [],
            allDemands: [],
            recentQueries: [],
        };
    }
    // 2. Xác định mốc thời gian chia đôi (Recent Period vs Previous Period)
    const sortedByTime = [...validEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const minTime = timeWindow?.start ? timeWindow.start.getTime() : sortedByTime[0].timestamp.getTime();
    const maxTime = timeWindow?.end ? timeWindow.end.getTime() : sortedByTime[sortedByTime.length - 1].timestamp.getTime();
    const midTime = minTime + (maxTime - minTime) / 2;
    // 3. Gom nhóm theo Capability
    const capMap = new Map();
    // Global sets để tính unique users toàn hệ thống
    const globalAuthUsers = new Set();
    const globalGuestSessions = new Set();
    const globalStateCounts = {
        SUPPORTED: 0,
        NEAR_MATCH: 0,
        UNSUPPORTED: 0,
        AMBIGUOUS: 0,
    };
    const globalDomainMap = new Map();
    VALID_DOMAINS.forEach((d) => globalDomainMap.set(d, { count: 0, authUsers: new Set(), guestSessions: new Set() }));
    const recentQueriesList = [];
    for (const item of validEvents) {
        const { event, meta, timestamp } = item;
        const cap = meta.normalizedCapability.toLowerCase().trim();
        const domain = (VALID_DOMAINS.includes(meta.domainCategory) ? meta.domainCategory : 'other');
        const state = (['SUPPORTED', 'NEAR_MATCH', 'UNSUPPORTED', 'AMBIGUOUS'].includes(meta.demandState)
            ? meta.demandState
            : 'UNSUPPORTED');
        // Track global counts
        globalStateCounts[state]++;
        const domainEntry = globalDomainMap.get(domain);
        domainEntry.count++;
        if (event.userId) {
            globalAuthUsers.add(event.userId);
            domainEntry.authUsers.add(event.userId);
        }
        else if (event.sessionId) {
            globalGuestSessions.add(event.sessionId);
            domainEntry.guestSessions.add(event.sessionId);
        }
        // Capability entry
        let capEntry = capMap.get(cap);
        if (!capEntry) {
            capEntry = {
                capability: cap,
                domainCategory: domain,
                totalRequests: 0,
                authUsers: new Set(),
                guestSessions: new Set(),
                allSessions: new Set(),
                firstSeen: timestamp,
                lastSeen: timestamp,
                recentRequests: 0,
                previousRequests: 0,
                stateBreakdown: { SUPPORTED: 0, NEAR_MATCH: 0, UNSUPPORTED: 0, AMBIGUOUS: 0 },
                sampleQueries: new Set(),
            };
            capMap.set(cap, capEntry);
        }
        capEntry.totalRequests++;
        capEntry.stateBreakdown[state]++;
        if (event.userId) {
            capEntry.authUsers.add(event.userId);
        }
        else if (event.sessionId) {
            capEntry.guestSessions.add(event.sessionId);
        }
        if (event.sessionId) {
            capEntry.allSessions.add(event.sessionId);
        }
        if (timestamp < capEntry.firstSeen)
            capEntry.firstSeen = timestamp;
        if (timestamp > capEntry.lastSeen)
            capEntry.lastSeen = timestamp;
        if (timestamp.getTime() >= midTime) {
            capEntry.recentRequests++;
        }
        else {
            capEntry.previousRequests++;
        }
        const cleanQ = sanitizeQueryText(meta.rawQuery || event.metadata?.query);
        if (cleanQ && capEntry.sampleQueries.size < 5) {
            capEntry.sampleQueries.add(cleanQ);
        }
        recentQueriesList.push({
            query: cleanQ,
            capability: cap,
            domain,
            state,
            timestamp: timestamp.toISOString(),
            sessionId: event.sessionId || undefined,
            userId: event.userId,
        });
    }
    // 4. Chuyển đổi thành DemandAggregate records
    const allDemands = [];
    let newDemandsCount = 0;
    for (const entry of capMap.values()) {
        const uniqueUsers = entry.authUsers.size + entry.guestSessions.size;
        const uniqueSessions = Math.max(entry.allSessions.size, uniqueUsers);
        // Dominant State
        let dominantState = 'UNSUPPORTED';
        let maxStateCount = -1;
        for (const [st, cnt] of Object.entries(entry.stateBreakdown)) {
            if (cnt > maxStateCount) {
                maxStateCount = cnt;
                dominantState = st;
            }
        }
        // Growth Calculation
        let growthRate = 0;
        let growthLabel = 'Stable';
        if (entry.previousRequests === 0 && entry.recentRequests > 0) {
            growthLabel = 'New';
            growthRate = 100;
            newDemandsCount++;
        }
        else if (entry.previousRequests === 0 && entry.recentRequests === 0) {
            growthLabel = 'Stable';
            growthRate = 0;
        }
        else {
            growthRate = Math.round(((entry.recentRequests - entry.previousRequests) / entry.previousRequests) * 100);
            if (growthRate > 0)
                growthLabel = 'Growing';
            else if (growthRate < 0)
                growthLabel = 'Declining';
            else
                growthLabel = 'Stable';
        }
        // Priority Score Formula:
        // (uniqueUsers * 2 + weightedUnmetRequests)
        const weightedUnmet = entry.stateBreakdown.UNSUPPORTED * 1.5 +
            entry.stateBreakdown.NEAR_MATCH * 1.0 +
            entry.stateBreakdown.SUPPORTED * 0.2;
        const priorityScore = Math.round((uniqueUsers * 2 + weightedUnmet) * 10) / 10;
        allDemands.push({
            capability: entry.capability,
            domainCategory: entry.domainCategory,
            dominantState,
            totalRequests: entry.totalRequests,
            uniqueUsers,
            uniqueSessions,
            firstSeen: entry.firstSeen.toISOString(),
            lastSeen: entry.lastSeen.toISOString(),
            recentRequests: entry.recentRequests,
            previousRequests: entry.previousRequests,
            growthRate,
            growthLabel,
            priorityScore,
            stateBreakdown: entry.stateBreakdown,
            sampleQueries: Array.from(entry.sampleQueries),
        });
    }
    // 5. Top Unmet Demands: Có UNSUPPORTED hoặc NEAR_MATCH, loại bỏ AMBIGUOUS thuần túy, sắp xếp theo Priority
    const topUnmetDemands = allDemands
        .filter((d) => d.stateBreakdown.UNSUPPORTED > 0 || d.stateBreakdown.NEAR_MATCH > 0)
        .sort((a, b) => b.priorityScore - a.priorityScore);
    // 6. Trending Demands: Sort theo growthRate DESC
    const trendingDemands = [...allDemands]
        .filter((d) => d.growthLabel === 'New' || d.growthRate > 0)
        .sort((a, b) => {
        if (a.growthLabel === 'New' && b.growthLabel !== 'New')
            return -1;
        if (b.growthLabel === 'New' && a.growthLabel !== 'New')
            return 1;
        return b.growthRate - a.growthRate;
    });
    // 7. State & Domain Distributions
    const totalCount = validEvents.length;
    const stateDistribution = ['SUPPORTED', 'NEAR_MATCH', 'UNSUPPORTED', 'AMBIGUOUS'].map((st) => ({
        state: st,
        count: globalStateCounts[st],
        percentage: totalCount > 0 ? Math.round((globalStateCounts[st] / totalCount) * 1000) / 10 : 0,
    }));
    const domainDistribution = VALID_DOMAINS.map((dm) => {
        const info = globalDomainMap.get(dm);
        return {
            domain: dm,
            count: info.count,
            percentage: totalCount > 0 ? Math.round((info.count / totalCount) * 1000) / 10 : 0,
            uniqueUsers: info.authUsers.size + info.guestSessions.size,
        };
    }).sort((a, b) => b.count - a.count);
    const totalDemandRequests = totalCount;
    const uniqueUsersCount = globalAuthUsers.size + globalGuestSessions.size;
    const unmetDemandRequests = globalStateCounts.UNSUPPORTED + globalStateCounts.NEAR_MATCH;
    return {
        totalDemandRequests,
        uniqueUsersCount,
        unmetDemandRequests,
        newDemandsCount,
        stateDistribution,
        domainDistribution,
        topUnmetDemands,
        trendingDemands,
        allDemands,
        recentQueries: recentQueriesList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    };
}
/**
 * Lọc và phân trang cho danh sách Demand
 */
export function filterAndPaginateDemands(demands, options) {
    const { searchQuery = '', stateFilter = 'all', domainFilter = 'all', sortBy = 'priority', page = 1, perPage = 8, } = options;
    let filtered = [...demands];
    // 1. Search Query
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter((d) => d.capability.toLowerCase().includes(q) ||
            d.domainCategory.toLowerCase().includes(q) ||
            d.sampleQueries.some((sq) => sq.toLowerCase().includes(q)));
    }
    // 2. State Filter
    if (stateFilter !== 'all') {
        filtered = filtered.filter((d) => d.dominantState === stateFilter || d.stateBreakdown[stateFilter] > 0);
    }
    // 3. Domain Filter
    if (domainFilter !== 'all') {
        filtered = filtered.filter((d) => d.domainCategory === domainFilter);
    }
    // 4. Sorting
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'priority':
                return b.priorityScore - a.priorityScore;
            case 'requests':
                return b.totalRequests - a.totalRequests;
            case 'users':
                return b.uniqueUsers - a.uniqueUsers;
            case 'growth':
                return b.growthRate - a.growthRate;
            case 'latest':
                return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
            default:
                return b.priorityScore - a.priorityScore;
        }
    });
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIdx = (currentPage - 1) * perPage;
    const items = filtered.slice(startIdx, startIdx + perPage);
    return {
        items,
        total,
        totalPages,
        page: currentPage,
    };
}
