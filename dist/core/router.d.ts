import type { AgentIntent, AgentContext } from './types.js';
import type { ChannelType } from './security.js';
export interface RouteTarget {
    channel: ChannelType;
    primaryIntent: AgentIntent;
    secondaryIntents: AgentIntent[];
    isAmbiguous: boolean;
    isPluralDiscovery: boolean;
    routeDomain: 'SHOP' | 'ROBOT' | 'DESKTOP' | 'KNOWLEDGE' | 'GENERAL';
}
export declare function classifyChannel(context: AgentContext, defaultChannel?: ChannelType): ChannelType;
export declare function routeMessage(userText: string, context: AgentContext): RouteTarget;
