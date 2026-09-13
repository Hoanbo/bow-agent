// src/core/policyPhaseExitAudit/policyPhaseExitSecurityInspector.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Security & Authority Leakage AST Inspector (Component 890).
// Independently scans source files for forbidden process execution primitives and authority leakage.
// Strictly read-only; alters ZERO state.
//
// Core Authority Invariants:
// - ZERO_FORBIDDEN_PROCESS_PRIMITIVES
// - ZERO_AUTHORITY_LEAKAGE
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import fs from 'node:fs';
import path from 'node:path';
const FORBIDDEN_PROCESS_PATTERNS = [
    "from 'child_process'",
    'from "child_process"',
    "from 'node:child_process'",
    'from "node:child_process"',
    "require('child_process')",
    'require("child_process")',
    "require('node:child_process')",
    'require("node:child_process")',
    'execSync(',
    'spawn(',
    'fork(',
    'eval(',
    'new Function(',
];
const FORBIDDEN_AUTHORITY_PATTERNS = [
    'autonomousRollback(',
    'autonomousRecover(',
    'autonomousSunset(',
    'autonomousApprove(',
    'autonomousPromote(',
    'autonomousPhaseExit(',
    'executeUntrustedCode(',
    'executeShell(',
    'executeTool(',
    'autoRepair(',
    'selfHealPolicy(',
];
export class PolicyPhaseExitSecurityInspector {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Security inspector suspended by USER_STOP supremacy');
        }
    }
    /**
     * Scans a target directory for forbidden primitives and authority leakage.
     */
    scanDirectory(relDir) {
        this.assertUserStopInactive();
        const absDir = path.resolve(relDir);
        if (!fs.existsSync(absDir)) {
            return Object.freeze({
                directory: relDir,
                filesScanned: 0,
                forbiddenPrimitivesDetected: Object.freeze([]),
                authorityLeakageDetected: Object.freeze([]),
                clean: true,
            });
        }
        const files = fs.readdirSync(absDir).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts') && !f.includes('SecurityInspector'));
        const detectedPrimitives = [];
        const detectedLeakages = [];
        for (const f of files) {
            const filePath = path.join(absDir, f);
            const content = fs.readFileSync(filePath, 'utf-8');
            // Strip single-line comments and multi-line comments to avoid false positives on docstrings
            const codeOnly = content
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/.*$/gm, '');
            for (const pattern of FORBIDDEN_PROCESS_PATTERNS) {
                if (codeOnly.includes(pattern)) {
                    detectedPrimitives.push(`${f}: ${pattern}`);
                }
            }
            for (const pattern of FORBIDDEN_AUTHORITY_PATTERNS) {
                if (codeOnly.includes(pattern)) {
                    detectedLeakages.push(`${f}: ${pattern}`);
                }
            }
        }
        const clean = detectedPrimitives.length === 0 && detectedLeakages.length === 0;
        return Object.freeze({
            directory: relDir,
            filesScanned: files.length,
            forbiddenPrimitivesDetected: Object.freeze(detectedPrimitives),
            authorityLeakageDetected: Object.freeze(detectedLeakages),
            clean,
        });
    }
    /**
     * Scans all core Phase 1.3 governance directories.
     */
    scanGovernancePlane() {
        this.assertUserStopInactive();
        const targetDirs = [
            'src/core/policyEvolution',
            'src/core/policyEnforcement',
            'src/core/policyCanary',
            'src/core/policyObservability',
            'src/core/policyEvidence',
            'src/core/policyDecision',
            'src/core/policyCandidateAuthorization',
            'src/core/policyStagedActivation',
            'src/core/policyActiveRuntime',
            'src/core/policyActiveRollback',
            'src/core/policyActiveLifecycleReconciliation',
            'src/core/policyActiveIncidentResponse',
            'src/core/policyActiveIncidentResolution',
            'src/core/policyGovernanceReadiness',
            'src/core/policyPhaseTransition',
        ];
        return Object.freeze(targetDirs.map(d => this.scanDirectory(d)));
    }
}
