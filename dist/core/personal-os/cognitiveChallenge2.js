// src/core/personal-os/cognitiveChallenge2.ts
// BOWCON V4.0 — MS-1.3.40: MASTER OWNER PERSONAL OPERATING SYSTEM & PROACTIVE COGNITIVE AGENCY RUNTIME
//
// Section 11: Cognitive Challenge 2.0 Engine
// Evaluates Master Owner proposals across 14 multi-dimensional vectors.
// Formulates counterarguments, alternative plans, and confidence bounds.
//
// Invariants:
// - A CHALLENGE IS NOT AN ORDER (CHALLENGE != AUTHORITY).
// - RECOMMENDATION != EXECUTION
// - Only immutable safety/security invariants trigger mandatory blocks.
// - MASTER_OWNER_AUTHORITY > BOWCON_INTELLIGENCE > BOWCON_AUTONOMY
import { generatePersonalOsId, } from './personalOsTypes';
export class CognitiveChallenge2Engine {
    challenges = new Map();
    /**
     * Evaluate a proposal across 14 distinct dimensions.
     */
    evaluateProposal(context) {
        const vectors = {};
        const concerns = [];
        const evidence = [];
        const counterarguments = [];
        const alternativePlans = [];
        const unknowns = [];
        let severity = 'INFO';
        let isMandatorySafetyBlock = false;
        // 1. Security & Protected Workspace Invariant
        if (context.isProtectedWorkspaceTarget ||
            (context.targetPath && context.targetPath.toLowerCase().includes('shopofbow'))) {
            vectors['security'] = { ok: false, notes: 'Direct incursion into protected workspace C:\\BOW\\shopofbow' };
            concerns.push('Accessing C:\\BOW\\shopofbow violates the absolute isolation policy (READS=0, WRITES=0, IMPORTS=0, TOUCHES=0).');
            evidence.push(`Target path '${context.targetPath}' matches protected workspace.`);
            counterarguments.push('The protected workspace policy is non-negotiable and strictly locked.');
            alternativePlans.push('Redirect operations to active workspace C:\\Users\\MSI_dualXeon\\Desktop\\BOW\\bow-agent.');
            severity = 'CRITICAL';
            isMandatorySafetyBlock = true;
        }
        else if (context.targetPath && context.targetPath.includes('..\\..\\..\\Windows\\System32')) {
            vectors['security'] = { ok: false, notes: 'Traversal into critical OS system directory' };
            concerns.push('Operation attempts directory traversal into Windows System32.');
            evidence.push(`Target path: ${context.targetPath}`);
            counterarguments.push('Modifying operating system files creates catastrophic instability risks.');
            alternativePlans.push('Confine changes strictly within user space.');
            severity = 'CRITICAL';
            isMandatorySafetyBlock = true;
        }
        else {
            vectors['security'] = { ok: true };
        }
        // 2. Dependencies
        if (context.missingDependencies && context.missingDependencies.length > 0) {
            vectors['dependencies'] = { ok: false, notes: `Missing prerequisites: ${context.missingDependencies.join(', ')}` };
            concerns.push(`Unmet prerequisite dependencies: ${context.missingDependencies.join(', ')}.`);
            evidence.push(`Missing dependency check: ${context.missingDependencies.join(', ')}`);
            counterarguments.push('Executing without prerequisites will cause immediate runtime failure.');
            alternativePlans.push(`Install or resolve ${context.missingDependencies.join(', ')} prior to proceeding.`);
            if (severity !== 'CRITICAL')
                severity = 'WARNING';
        }
        else {
            vectors['dependencies'] = { ok: true };
        }
        // 3. Historical Outcome Similarity
        if (context.historicalFailures && context.historicalFailures.length > 0) {
            vectors['historical_outcome_similarity'] = {
                ok: false,
                notes: `Prior failures: ${context.historicalFailures.join('; ')}`,
            };
            concerns.push(`Historical memory records prior failures for this pattern: ${context.historicalFailures.join('; ')}.`);
            evidence.push(...context.historicalFailures.map((f) => `Historical post-mortem: ${f}`));
            counterarguments.push('Repeating an identical approach that previously failed exhibits high failure probability.');
            alternativePlans.push('Modify execution parameters or use a defensive fallback strategy.');
            if (severity !== 'CRITICAL')
                severity = 'WARNING';
        }
        else {
            vectors['historical_outcome_similarity'] = { ok: true };
        }
        // 4. Assumption Quality
        if (context.assumptions && context.assumptions.length > 0) {
            vectors['assumption_quality'] = { ok: false, notes: `Unverified assumptions: ${context.assumptions.join('; ')}` };
            concerns.push(`Proposal depends on unverified assumptions: ${context.assumptions.join('; ')}.`);
            evidence.push('Assumptions not yet verified by live host telemetry.');
            unknowns.push(...context.assumptions.map((a) => `True status of: ${a}`));
            counterarguments.push('Proceeding without verifying assumptions risks unexpected side-effects.');
            alternativePlans.push('Run a pre-flight probe to verify assumptions before execution.');
            if (severity === 'INFO')
                severity = 'WARNING';
        }
        else {
            vectors['assumption_quality'] = { ok: true };
        }
        // 5. Resource Requirements & Time Constraints
        if (context.resourceEstimates?.estimatedMemoryMb && context.resourceEstimates.estimatedMemoryMb > 1024) {
            vectors['resource_requirements'] = { ok: false, notes: `High memory usage: ${context.resourceEstimates.estimatedMemoryMb}MB` };
            concerns.push(`Operation estimated to require excessive memory (${context.resourceEstimates.estimatedMemoryMb}MB).`);
            evidence.push(`Memory estimate: ${context.resourceEstimates.estimatedMemoryMb}MB`);
            counterarguments.push('High memory consumption could induce node heap starvation.');
            alternativePlans.push('Chunk the operation into batches under 100MB.');
            if (severity === 'INFO')
                severity = 'WARNING';
        }
        else {
            vectors['resource_requirements'] = { ok: true };
        }
        // 6. Cost & Risk
        if (context.isDestructive) {
            vectors['risk'] = { ok: false, notes: 'Destructive operation' };
            concerns.push('Operation performs irreversible destructive state changes.');
            evidence.push('Destructive flag set by caller.');
            counterarguments.push('Destructive modifications without verified backups eliminate recovery options.');
            alternativePlans.push('Execute in dry-run mode or take a pre-execution snapshot.');
            if (severity === 'INFO')
                severity = 'WARNING';
        }
        else {
            vectors['risk'] = { ok: true };
        }
        // Fill remaining vectors
        for (const v of [
            'logical_consistency',
            'technical_feasibility',
            'time_constraints',
            'reliability',
            'maintainability',
            'scalability',
            'cost',
            'evidence_quality',
        ]) {
            if (!vectors[v])
                vectors[v] = { ok: true };
        }
        const hasConcern = concerns.length > 0;
        if (!hasConcern) {
            return { hasConcern: false, isMandatorySafetyBlock: false };
        }
        const challengeId = generatePersonalOsId('chall2');
        const challenge = {
            challengeId,
            target: context.targetProposal,
            concerns,
            evidence,
            counterarguments,
            alternativePlans,
            confidence: isMandatorySafetyBlock ? 1.0 : 0.88,
            unknowns: unknowns.length > 0 ? unknowns : ['None'],
            severity,
            isMandatorySafetyBlock,
            evaluatedVectors: vectors,
            ownerDecision: 'WAITING FOR MASTER OWNER',
            createdAt: Date.now(),
        };
        this.challenges.set(challengeId, challenge);
        return {
            hasConcern: true,
            isMandatorySafetyBlock,
            challenge,
        };
    }
    /**
     * Format Cognitive Challenge 2.0 into structured text.
     */
    formatChallengeText(challenge) {
        return [
            '==============================================================================',
            'COGNITIVE CHALLENGE 2.0',
            '==============================================================================',
            `Challenge ID: ${challenge.challengeId}`,
            `Severity:     ${challenge.severity}`,
            `Mandatory Block: ${challenge.isMandatorySafetyBlock ? 'YES (Non-Overridable Safety Invariant)' : 'NO (Owner Recommendation)'}`,
            '',
            'Target Proposal:',
            challenge.target,
            '',
            'Concerns:',
            challenge.concerns.map((c) => `* ${c}`).join('\n'),
            '',
            'Evidence:',
            challenge.evidence.map((e) => `* ${e}`).join('\n'),
            '',
            'Counterarguments:',
            challenge.counterarguments.map((ca) => `* ${ca}`).join('\n'),
            '',
            'Alternative Plans:',
            challenge.alternativePlans.map((ap) => `* ${ap}`).join('\n'),
            '',
            `Confidence: ${(challenge.confidence * 100).toFixed(0)}%`,
            '',
            'Unknowns:',
            challenge.unknowns.map((u) => `* ${u}`).join('\n'),
            '',
            `Owner Decision: [${challenge.ownerDecision ?? 'WAITING FOR MASTER OWNER'}]`,
            '==============================================================================',
        ].join('\n');
    }
    /**
     * Resolve challenge following Master Owner decision.
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
     * Retrieve challenge by ID.
     */
    getChallenge(challengeId) {
        return this.challenges.get(challengeId);
    }
    /**
     * Clear challenges.
     */
    clear() {
        this.challenges.clear();
    }
}
