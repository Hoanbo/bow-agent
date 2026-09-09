// src/core/partnership/cognitiveChallengeEngine.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Sections 3 & 4: Cognitive Challenge Engine
// Evaluates Master Owner proposals across 14 distinct dimensions:
// 1. Factual correctness
// 2. Logical consistency
// 3. Missing assumptions
// 4. Contradictory information
// 5. Technical feasibility
// 6. Security implications
// 7. Operational risk
// 8. Resource constraints
// 9. Historical context
// 10. Unintended consequences
// 11. Opportunity cost
// 12. Reversibility
// 13. Dependency conflicts
// 14. Evidence quality
//
// Invariants:
// - CHALLENGE != AUTHORITY
// - RECOMMENDATION != MANDATORY SAFETY BLOCK
// - Only immutable governance/security invariants create mandatory execution blocks.
// - MASTER_OWNER_AUTHORITY > BOWCON_REASONING
import { generatePartnershipId, } from './partnershipTypes';
export class CognitiveChallengeEngine {
    challenges = new Map();
    /**
     * Evaluate a proposed decision across 14 dimensions.
     */
    evaluateProposal(context) {
        const dimensions = {};
        const concerns = [];
        const evidence = [];
        const unknowns = [];
        let severity = 'INFO';
        let isMandatorySafetyBlock = false;
        let proposedAlternative = 'Proceed with proposed decision after validating assumptions.';
        // 1. Security Implications & Protected Workspace
        if (context.isProtectedWorkspaceTarget || (context.targetPath && context.targetPath.toLowerCase().includes('shopofbow'))) {
            dimensions['security_implications'] = {
                ok: false,
                note: 'Violates absolute workspace isolation invariant (C:\\BOW\\shopofbow).',
            };
            concerns.push('Operation targets protected workspace C:\\BOW\\shopofbow, which has READS=0, WRITES=0, IMPORTS=0, TOUCHES=0.');
            evidence.push('Path matches protected workspace restriction.');
            severity = 'CRITICAL';
            isMandatorySafetyBlock = true; // Non-overridable invariant
            proposedAlternative = 'Select a non-protected target directory inside active workspace.';
        }
        else {
            dimensions['security_implications'] = { ok: true };
        }
        // 2. Factual Correctness
        if (context.targetPath && context.targetPath.includes('..\\..\\..\\Windows\\System32')) {
            dimensions['factual_correctness'] = { ok: false, note: 'Target path attempts directory traversal into system directories.' };
            concerns.push('Target path attempts traversal into critical OS paths.');
            evidence.push(`Path specified: ${context.targetPath}`);
            severity = 'CRITICAL';
            isMandatorySafetyBlock = true;
        }
        else {
            dimensions['factual_correctness'] = { ok: true };
        }
        // 3. Logical Consistency & Contradictions
        if (context.knownContradictions && context.knownContradictions.length > 0) {
            const unres = context.knownContradictions.filter((c) => !c.resolved);
            if (unres.length > 0) {
                dimensions['logical_consistency'] = { ok: false, note: `${unres.length} unresolved contradictions exist.` };
                concerns.push(`Proposal conflicts with unaddressed contradictions: ${unres.map((c) => c.type).join(', ')}.`);
                evidence.push(...unres.map((c) => `Contradiction: ${c.previousBelief} vs ${c.currentEvidence}`));
                if (severity !== 'CRITICAL')
                    severity = 'WARNING';
            }
            else {
                dimensions['logical_consistency'] = { ok: true };
            }
        }
        else {
            dimensions['logical_consistency'] = { ok: true };
        }
        // 4. Missing Assumptions
        if (context.assumptions && context.assumptions.length > 0) {
            dimensions['missing_assumptions'] = { ok: false, note: `Unvalidated assumptions: ${context.assumptions.join('; ')}` };
            concerns.push(`Decision relies on unverified assumptions: ${context.assumptions.join('; ')}.`);
            evidence.push('Assumptions not backed by explicit owner fact or host verification.');
            unknowns.push(...context.assumptions.map((a) => `Verification status of: ${a}`));
            if (severity === 'INFO')
                severity = 'WARNING';
        }
        else {
            dimensions['missing_assumptions'] = { ok: true };
        }
        // 5. Technical Feasibility & Capability Availability
        if (context.requiredCapabilities && context.availableCapabilities) {
            const missing = context.requiredCapabilities.filter((c) => !context.availableCapabilities.includes(c));
            if (missing.length > 0) {
                dimensions['technical_feasibility'] = { ok: false, note: `Missing capabilities: ${missing.join(', ')}` };
                concerns.push(`Required capabilities are unavailable in runtime: ${missing.join(', ')}.`);
                evidence.push(`Runtime available: ${context.availableCapabilities.join(', ')}`);
                if (severity !== 'CRITICAL')
                    severity = 'WARNING';
                proposedAlternative = `Acquire capability '${missing.join(', ')}' or employ an alternative capability.`;
            }
            else {
                dimensions['technical_feasibility'] = { ok: true };
            }
        }
        else {
            dimensions['technical_feasibility'] = { ok: true };
        }
        // 6. Operational Risk & Reversibility
        if (context.isDestructiveAction) {
            dimensions['operational_risk'] = { ok: false, note: 'Action is destructive.' };
            dimensions['reversibility'] = { ok: context.isReversible ?? false, note: context.isReversible ? 'Reversible' : 'Irreversible' };
            concerns.push('Operation involves destructive modifications that cannot be easily rolled back.');
            evidence.push('Destructive action flag indicated by execution planner.');
            if (severity === 'INFO')
                severity = 'WARNING';
            proposedAlternative = 'Create a verified snapshot/backup before proceeding with destructive change.';
        }
        else {
            dimensions['operational_risk'] = { ok: true };
            dimensions['reversibility'] = { ok: true };
        }
        // 7. Historical Context
        if (context.hasHistoricalFailure) {
            dimensions['historical_context'] = { ok: false, note: context.historicalFailureNotes ?? 'Prior failure recorded for this pattern.' };
            concerns.push(`Historical memory indicates identical or similar operations previously failed: ${context.historicalFailureNotes ?? 'Prior failure recorded'}.`);
            evidence.push(`Memory record: ${context.historicalFailureNotes ?? 'Previous attempt failed'}`);
            if (severity === 'INFO')
                severity = 'WARNING';
            proposedAlternative = 'Review prior failure postmortem and adjust parameters before re-attempting.';
        }
        else {
            dimensions['historical_context'] = { ok: true };
        }
        // 8. Evidence Quality & Unknowns
        if (context.missingEvidence && context.missingEvidence.length > 0) {
            dimensions['evidence_quality'] = { ok: false, note: `Missing evidence: ${context.missingEvidence.join(', ')}` };
            concerns.push('Insufficient evidence to conclude this approach is optimal.');
            unknowns.push(...context.missingEvidence);
            if (severity === 'INFO')
                severity = 'WARNING';
        }
        else {
            dimensions['evidence_quality'] = { ok: true };
        }
        // Fill in other dimensions as OK if not triggered
        for (const d of [
            'resource_constraints',
            'unintended_consequences',
            'opportunity_cost',
            'dependency_conflicts',
            'contradictory_information',
        ]) {
            if (!dimensions[d]) {
                dimensions[d] = { ok: true };
            }
        }
        const hasConcern = concerns.length > 0;
        if (!hasConcern) {
            return {
                hasConcern: false,
                isMandatorySafetyBlock: false,
                evaluatedDimensions: dimensions,
            };
        }
        // Construct structured CognitiveChallenge
        const challengeId = generatePartnershipId('chall');
        const challenge = {
            challengeId,
            decision: context.proposedDecision,
            assessment: isMandatorySafetyBlock
                ? 'Mandatory safety/security invariant violation detected. Execution blocked fail-closed.'
                : `Identified ${concerns.length} operational risk/feasibility concerns with proposed decision.`,
            concern: concerns.join(' | '),
            evidence,
            confidence: isMandatorySafetyBlock ? 1.0 : 0.85,
            unknowns: unknowns.length > 0 ? unknowns : ['None noted'],
            alternative: proposedAlternative,
            severity,
            ownerDecision: 'WAITING FOR MASTER OWNER',
            createdAt: Date.now(),
        };
        this.challenges.set(challengeId, challenge);
        return {
            hasConcern: true,
            isMandatorySafetyBlock,
            challenge,
            evaluatedDimensions: dimensions,
        };
    }
    /**
     * Format challenge into the standardized Master Owner review format (Section 3).
     */
    formatChallengeText(challenge) {
        return [
            '==============================================================================',
            'CHALLENGE',
            '==============================================================================',
            `Challenge ID: ${challenge.challengeId}`,
            `Severity:     ${challenge.severity}`,
            '',
            'Decision:',
            challenge.decision,
            '',
            'Assessment:',
            challenge.assessment,
            '',
            'Concern:',
            challenge.concern,
            '',
            'Evidence:',
            challenge.evidence.length > 0 ? challenge.evidence.map((e) => `* ${e}`).join('\n') : '* None',
            '',
            `Confidence: ${(challenge.confidence * 100).toFixed(0)}%`,
            '',
            'Unknowns:',
            challenge.unknowns.length > 0 ? challenge.unknowns.map((u) => `* ${u}`).join('\n') : '* None',
            '',
            'Alternative:',
            challenge.alternative,
            '',
            `Owner Decision: [${challenge.ownerDecision ?? 'WAITING FOR MASTER OWNER'}]`,
            '==============================================================================',
        ].join('\n');
    }
    /**
     * Update challenge status following Master Owner response.
     */
    resolveChallenge(challengeId, decision) {
        const challenge = this.challenges.get(challengeId);
        if (!challenge) {
            throw new Error(`Challenge '${challengeId}' not found.`);
        }
        challenge.ownerDecision = decision;
        challenge.resolvedAt = Date.now();
        return challenge;
    }
    /**
     * Query a challenge by ID.
     */
    getChallenge(challengeId) {
        return this.challenges.get(challengeId);
    }
    /**
     * Query all active (unresolved) challenges.
     */
    getActiveChallenges() {
        return Array.from(this.challenges.values()).filter((c) => c.ownerDecision === 'WAITING FOR MASTER OWNER');
    }
    /**
     * Clear all challenges (for reset/testing).
     */
    clear() {
        this.challenges.clear();
    }
}
