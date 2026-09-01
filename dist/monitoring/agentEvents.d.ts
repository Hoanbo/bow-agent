import type { AgentAnalyticsEvent } from './analyticsTypes.js';
import type { AnalyticsProvider } from '../contracts/index.js';
export declare function insertAnalyticsEvent(event: AgentAnalyticsEvent, analyticsProvider?: AnalyticsProvider): Promise<void>;
