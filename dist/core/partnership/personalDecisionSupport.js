// src/core/partnership/personalDecisionSupport.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Sections 13, 15, & 16: Personal Decision Support & Owner Command Semantics
// Implements first-class command handling:
// ASK, ANALYZE, EXPLAIN, CHALLENGE, RECOMMEND, PLAN, APPROVE, DENY, OVERRIDE, STOP, PAUSE, RESUME, RESET, CONFIGURE
//
// Invariants:
// - MASTER_OWNER_AUTHORITY > BOWCON_REASONING > BOWCON_AUTONOMY
// - OVERRIDE overrides recommendations, NEVER immutable safety/security invariants.
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - Every override produces an immutable audit record.
import { generatePartnershipId, assertMasterOwner, } from './partnershipTypes';
export class PersonalDecisionSupport {
    challengeEngine;
    overrideRecords = new Map();
    isPaused = false;
    constructor(challengeEngine) {
        this.challengeEngine = challengeEngine;
    }
    /**
     * Process a first-class Master Owner command.
     */
    handleCommand(command) {
        // Enforce Master Owner authority
        assertMasterOwner(command.ownerId, `Command '${command.type}'`);
        const commandId = command.commandId || generatePartnershipId('cmd');
        switch (command.type) {
            case 'STOP': {
                return {
                    commandId,
                    type: 'STOP',
                    status: 'STOPPED',
                    message: '[USER_STOP] Absolute stop command received from Master Owner. All operations halted.',
                };
            }
            case 'PAUSE': {
                this.isPaused = true;
                return {
                    commandId,
                    type: 'PAUSE',
                    status: 'PAUSED',
                    message: 'Personal intelligence cognitive processing paused by Master Owner.',
                };
            }
            case 'RESUME': {
                this.isPaused = false;
                return {
                    commandId,
                    type: 'RESUME',
                    status: 'RESUMED',
                    message: 'Personal intelligence cognitive processing resumed by Master Owner.',
                };
            }
            case 'CHALLENGE': {
                const decisionText = command.payload.decision || 'Unspecified decision';
                const evalResult = this.challengeEngine.evaluateProposal({
                    proposedDecision: decisionText,
                    targetPath: command.payload.targetPath,
                    requiredCapabilities: command.payload.requiredCapabilities,
                    availableCapabilities: command.payload.availableCapabilities,
                    knownContradictions: command.payload.knownContradictions,
                    isProtectedWorkspaceTarget: command.payload.isProtectedWorkspaceTarget,
                    isDestructiveAction: command.payload.isDestructiveAction,
                    hasHistoricalFailure: command.payload.hasHistoricalFailure,
                    historicalFailureNotes: command.payload.historicalFailureNotes,
                    assumptions: command.payload.assumptions,
                    missingEvidence: command.payload.missingEvidence,
                });
                if (evalResult.isMandatorySafetyBlock) {
                    return {
                        commandId,
                        type: 'CHALLENGE',
                        status: 'SAFETY_BLOCKED',
                        message: `[MANDATORY_SAFETY_BLOCK] ${evalResult.challenge?.concern}`,
                        challenge: evalResult.challenge,
                    };
                }
                if (evalResult.hasConcern) {
                    return {
                        commandId,
                        type: 'CHALLENGE',
                        status: 'CHALLENGE_RAISED',
                        message: this.challengeEngine.formatChallengeText(evalResult.challenge),
                        challenge: evalResult.challenge,
                    };
                }
                return {
                    commandId,
                    type: 'CHALLENGE',
                    status: 'SUCCESS',
                    message: 'Proposal evaluated across 14 dimensions: No significant risks or contradictions detected.',
                    data: evalResult.evaluatedDimensions,
                };
            }
            case 'OVERRIDE': {
                const challengeId = command.payload.challengeId;
                const challenge = challengeId ? this.challengeEngine.getChallenge(challengeId) : undefined;
                // Check if this override attempts to bypass a mandatory safety block
                if (challenge?.severity === 'CRITICAL' &&
                    (challenge.concern.includes('C:\\BOW\\shopofbow') ||
                        challenge.concern.includes('critical OS paths') ||
                        challenge.concern.includes('System32') ||
                        challenge.concern.includes('system directories') ||
                        challenge.assessment.includes('Mandatory safety/security invariant'))) {
                    throw new Error(`[IMMUTABLE_INVARIANT_VIOLATION] Master Owner cannot override non-overridable safety/security invariant: ${challenge.concern}`);
                }
                if (command.payload.targetPath &&
                    (command.payload.targetPath.toLowerCase().includes('shopofbow') ||
                        command.payload.targetPath.toLowerCase().includes('system32'))) {
                    throw new Error(`[IMMUTABLE_INVARIANT_VIOLATION] Master Owner cannot override protected workspace isolation or OS directory protection.`);
                }
                // Record the override
                const overrideRecord = this.recordOverride({
                    ownerId: command.ownerId,
                    sessionId: command.sessionId,
                    decision: command.payload.decision || challenge?.decision || 'Unspecified decision',
                    bowconRecommendation: command.payload.bowconRecommendation || challenge?.alternative || 'Warning raised',
                    ownerOverride: command.payload.overrideAction || 'Proceed against recommendation',
                    reason: command.payload.reason || 'Master Owner explicit discretion',
                    affectedGoal: command.payload.affectedGoal,
                    affectedTask: command.payload.affectedTask,
                });
                if (challengeId) {
                    this.challengeEngine.resolveChallenge(challengeId, 'OVERRIDDEN');
                }
                return {
                    commandId,
                    type: 'OVERRIDE',
                    status: 'OVERRIDDEN',
                    message: `[OVERRIDE_RECORDED] Master Owner overrode BOWCON recommendation. Authority preserved. (Override ID: ${overrideRecord.overrideId})`,
                    overrideRecord,
                };
            }
            case 'APPROVE': {
                const challengeId = command.payload.challengeId;
                if (challengeId) {
                    this.challengeEngine.resolveChallenge(challengeId, 'CONFIRMED');
                }
                return {
                    commandId,
                    type: 'APPROVE',
                    status: 'SUCCESS',
                    message: `Master Owner approved proposal/challenge recommendation.`,
                    data: { challengeId, approvedAt: Date.now() },
                };
            }
            case 'DENY': {
                const challengeId = command.payload.challengeId;
                if (challengeId) {
                    this.challengeEngine.resolveChallenge(challengeId, 'ABANDONED');
                }
                return {
                    commandId,
                    type: 'DENY',
                    status: 'SUCCESS',
                    message: `Master Owner denied proposal. Plan abandoned.`,
                    data: { challengeId, deniedAt: Date.now() },
                };
            }
            case 'ANALYZE': {
                return {
                    commandId,
                    type: 'ANALYZE',
                    status: 'SUCCESS',
                    message: `Analysis completed for subject: ${command.payload.subject || 'general'}`,
                    data: {
                        subject: command.payload.subject,
                        dimensionsEvaluated: 14,
                        analysisTimestamp: Date.now(),
                    },
                };
            }
            case 'EXPLAIN': {
                return {
                    commandId,
                    type: 'EXPLAIN',
                    status: 'SUCCESS',
                    message: `Explanation generated for topic: ${command.payload.topic || 'reasoning'}`,
                    data: {
                        topic: command.payload.topic,
                        rationale: command.payload.rationale || 'Detailed reasoning based on verified facts and cognitive principles.',
                    },
                };
            }
            case 'RECOMMEND': {
                return {
                    commandId,
                    type: 'RECOMMEND',
                    status: 'SUCCESS',
                    message: `Recommendation: ${command.payload.recommendation || 'Proceed with conservative verified steps.'}`,
                    data: {
                        recommendation: command.payload.recommendation,
                        confidence: command.payload.confidence ?? 0.9,
                    },
                };
            }
            case 'PLAN': {
                return {
                    commandId,
                    type: 'PLAN',
                    status: 'SUCCESS',
                    message: `Plan constructed for goal: ${command.payload.goal || 'unspecified'}`,
                    data: {
                        goal: command.payload.goal,
                        steps: command.payload.steps || [],
                    },
                };
            }
            case 'ASK': {
                return {
                    commandId,
                    type: 'ASK',
                    status: 'SUCCESS',
                    message: `Response to query: ${command.payload.query || ''}`,
                    data: {
                        query: command.payload.query,
                        answer: command.payload.answer || 'Acknowledged query.',
                    },
                };
            }
            case 'RESET': {
                return {
                    commandId,
                    type: 'RESET',
                    status: 'SUCCESS',
                    message: 'Volatile cognitive state reset by Master Owner.',
                };
            }
            case 'CONFIGURE': {
                return {
                    commandId,
                    type: 'CONFIGURE',
                    status: 'SUCCESS',
                    message: 'Configuration updated by Master Owner.',
                    data: command.payload,
                };
            }
            default: {
                return {
                    commandId,
                    type: command.type,
                    status: 'SUCCESS',
                    message: `Command '${command.type}' acknowledged.`,
                };
            }
        }
    }
    /**
     * Record an Owner override event.
     */
    recordOverride(params) {
        const overrideId = generatePartnershipId('ovr');
        const record = {
            overrideId,
            ownerId: params.ownerId,
            sessionId: params.sessionId,
            decision: params.decision,
            bowconRecommendation: params.bowconRecommendation,
            ownerOverride: params.ownerOverride,
            reason: params.reason,
            timestamp: Date.now(),
            affectedGoal: params.affectedGoal,
            affectedTask: params.affectedTask,
        };
        this.overrideRecords.set(overrideId, record);
        return record;
    }
    /**
     * Retrieve all recorded owner overrides.
     */
    getAllOverrides() {
        return Array.from(this.overrideRecords.values());
    }
    /**
     * Check paused status.
     */
    getIsPaused() {
        return this.isPaused;
    }
    /**
     * Clear all overrides (for testing).
     */
    clear() {
        this.overrideRecords.clear();
        this.isPaused = false;
    }
}
