// src/core/world-model/capabilityGroundedReasoningEngine.ts
// BOWCON V4.0 — MS-1.3.42: MASTER OWNER WORLD MODEL, SELF-AWARENESS & CAPABILITY-GROUNDED REASONING RUNTIME
//
// Capability-Grounded Reasoning & Plan Feasibility Engine.
// Enforces the 7-stage capability chain:
//   HOST -> DISCOVERED -> AVAILABLE -> GOVERNED -> AUTHORIZED -> EXECUTED -> VERIFIED
//
// Classifies plan feasibility into:
//   PLAN_POSSIBLE
//   PLAN_CONDITIONALLY_POSSIBLE
//   PLAN_BLOCKED
//   PLAN_UNKNOWN
//
// Provides transparent causal explanations; never assumes conceptual existence equals executable capability.
import { globalCapabilityDiscoveryBridge } from '../host/capabilityDiscoveryBridge.js';
export class CapabilityGroundedReasoningEngine {
    /**
     * Distinguishes the 7 stages of a capability lifecycle.
     */
    evaluateCapabilityStage(capabilityId, host, isDiscovered, isAvailableOnHost, isGovernedPermitted, hasAuthorizationToken, hasExecuted, isVerified) {
        if (!host || host.operatingSystem.status !== 'KNOWN') {
            return { stage: 'HOST', canExecuteNow: false, reason: 'Host environment is unmeasured or unknown.' };
        }
        if (!isDiscovered) {
            return { stage: 'DISCOVERED', canExecuteNow: false, reason: `Capability "${capabilityId}" is not discovered on host.` };
        }
        if (!isAvailableOnHost) {
            return { stage: 'AVAILABLE', canExecuteNow: false, reason: `Capability "${capabilityId}" is not currently available.` };
        }
        if (!isGovernedPermitted) {
            return { stage: 'GOVERNED', canExecuteNow: false, reason: `Capability "${capabilityId}" is blocked by governance policy.` };
        }
        if (!hasAuthorizationToken) {
            return { stage: 'GOVERNED', canExecuteNow: false, reason: `Capability "${capabilityId}" requires Master Owner authorization token.` };
        }
        if (!hasExecuted) {
            return { stage: 'AUTHORIZED', canExecuteNow: true, reason: `Capability "${capabilityId}" is fully authorized and ready for execution.` };
        }
        if (!isVerified) {
            return { stage: 'EXECUTED', canExecuteNow: false, reason: `Capability "${capabilityId}" has executed but outcome is unverified.` };
        }
        return { stage: 'VERIFIED', canExecuteNow: false, reason: `Capability "${capabilityId}" execution has been verified.` };
    }
    /**
     * Evaluates the feasibility of a proposed plan against discovered host capabilities.
     */
    evaluatePlanFeasibility(spec, host, activeTokens = []) {
        const reasons = [];
        const missingCapabilities = [];
        const requiredAuthorizations = [];
        const requiredOwnerActions = [];
        // Security invariant check: protected workspace
        if (spec.target && (spec.target.includes('shopofbow') || spec.target.includes('C:\\BOW\\shopofbow'))) {
            reasons.push('Plan targets protected workspace C:\\BOW\\shopofbow, which is strictly forbidden by policy.');
            return {
                planId: spec.planId,
                status: 'PLAN_BLOCKED',
                requiredCapabilities: spec.requiredCapabilities,
                availableCapabilities: [],
                missingCapabilities: [],
                requiredAuthorizations: [],
                requiredOwnerActions: [],
                reasons,
                executionAllowed: false,
                assessedAt: Date.now(),
            };
        }
        // Host readiness check
        if (host.operatingSystem.status === 'UNKNOWN') {
            reasons.push('Host environment operating system is UNKNOWN. Feasibility cannot be determined.');
            return {
                planId: spec.planId,
                status: 'PLAN_UNKNOWN',
                requiredCapabilities: spec.requiredCapabilities,
                availableCapabilities: [],
                missingCapabilities: spec.requiredCapabilities,
                requiredAuthorizations: [],
                requiredOwnerActions: ['Verify host environment connectivity and discovery.'],
                reasons,
                executionAllowed: false,
                assessedAt: Date.now(),
            };
        }
        // Capability availability check via bridge
        const discovered = globalCapabilityDiscoveryBridge.discoverAllCapabilities(host);
        const availableCapIds = discovered
            .filter((c) => c.feasibility === 'AVAILABLE')
            .map((c) => c.capabilityId);
        for (const reqCap of spec.requiredCapabilities) {
            const isAvailable = availableCapIds.includes(reqCap) ||
                availableCapIds.includes(`cap_${reqCap}`) ||
                availableCapIds.some((id) => id.endsWith(reqCap));
            if (!isAvailable) {
                missingCapabilities.push(reqCap);
                reasons.push(`Required capability "${reqCap}" is UNAVAILABLE on current host platform (${host.operatingSystem.platform}).`);
            }
        }
        if (missingCapabilities.length > 0) {
            return {
                planId: spec.planId,
                status: 'PLAN_BLOCKED',
                requiredCapabilities: spec.requiredCapabilities,
                availableCapabilities: availableCapIds,
                missingCapabilities,
                requiredAuthorizations,
                requiredOwnerActions: [`Install or enable missing capabilities: [${missingCapabilities.join(', ')}]`],
                reasons,
                executionAllowed: false,
                assessedAt: Date.now(),
            };
        }
        // Authorization evaluation (ELEVATED / HIGH / CRITICAL requires token)
        const requiresToken = spec.riskLevel === 'HIGH' ||
            spec.riskLevel === 'CRITICAL' ||
            spec.riskLevel === 'ELEVATED' ||
            spec.requiredCapabilities.some((c) => c.includes('write') || c.includes('delete') || c.includes('exec'));
        const hasToken = activeTokens.length > 0;
        if (requiresToken && !hasToken) {
            requiredAuthorizations.push(...spec.requiredCapabilities);
            requiredOwnerActions.push('Authorize plan execution via HumanGate cryptographic token.');
            reasons.push('Plan is viable, but requires Master Owner authorization before execution.');
            return {
                planId: spec.planId,
                status: 'PLAN_CONDITIONALLY_POSSIBLE',
                requiredCapabilities: spec.requiredCapabilities,
                availableCapabilities: availableCapIds,
                missingCapabilities: [],
                requiredAuthorizations,
                requiredOwnerActions,
                reasons,
                executionAllowed: false,
                assessedAt: Date.now(),
            };
        }
        // All clear
        reasons.push('All required capabilities are available and authorized.');
        return {
            planId: spec.planId,
            status: 'PLAN_POSSIBLE',
            requiredCapabilities: spec.requiredCapabilities,
            availableCapabilities: availableCapIds,
            missingCapabilities: [],
            requiredAuthorizations: [],
            requiredOwnerActions: [],
            reasons,
            executionAllowed: true,
            assessedAt: Date.now(),
        };
    }
}
export const globalCapabilityGroundedReasoningEngine = new CapabilityGroundedReasoningEngine();
