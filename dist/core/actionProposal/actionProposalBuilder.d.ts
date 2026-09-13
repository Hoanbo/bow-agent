import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import type { GovernedCandidatePlan } from '../planning/governedPlanningTypes.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type ActionProposal } from './actionProposalTypes.js';
export declare const FORBIDDEN_PROTOTYPE_KEYS: readonly ["__proto__", "prototype", "constructor"];
export declare const FORBIDDEN_SHELL_PATTERNS: readonly ["cmd.exe", "powershell.exe", "/bin/sh", "/bin/bash", "execSync", "child_process", "eval(", "new Function", "spawn(", "fork("];
export declare const MAX_ARGUMENT_PAYLOAD_BYTES = 65536;
export interface ActionProposalBuilderOptions {
    readonly sanitizer?: DiagnosisSanitizer;
    readonly deterministicTimestamp?: string;
}
export declare class ActionProposalBuilder {
    private readonly sanitizer;
    private readonly deterministicTimestamp?;
    constructor(options?: ActionProposalBuilderOptions);
    /**
     * Deterministically canonicalizes a JSON structure for hashing.
     */
    static canonicalJson(obj: unknown): string;
    /**
     * Calculates the deterministic SHA-256 provenance hash for an ActionProposal.
     */
    static calculateProposalHash(params: {
        candidateProvenanceHash: string;
        taskId: string;
        tenantId: string;
        taskVersion: number;
        stepId: string;
        actionType: string;
        sanitizedArgs: Record<string, unknown>;
    }): string;
    /**
     * Extracts and builds an ActionProposal from a candidate plan and step.
     */
    buildProposal(params: {
        candidatePlan: GovernedCandidatePlan;
        stepId: string;
        authoritativeTask: AgentTask;
        completedStepIds?: readonly string[];
    }): ActionProposal;
    /**
     * Verifies that all prerequisites of the candidate step are already resolved.
     */
    private verifyDependencies;
    /**
     * Enforces argument payload size bounds, prototype safety, and forbidden shell commands.
     */
    private assertSecurityBounds;
    /**
     * Recursively verifies that forbidden prototype pollution keys do not exist.
     */
    private checkPrototypePollution;
    /**
     * Verifies that raw parameters do not contain forbidden host shell patterns.
     */
    private checkForbiddenShellExecution;
    /**
     * Removes any self-authorized or bypass attributes injected by an untrusted source.
     */
    private scrubAuthorityBypassFields;
}
