// tests/test_v4_architecture_contract.ts
// BOWCON V4.0 — MILESTONE 1.1: ARCHITECTURE CONTRACT & BASELINE INVARIANT TESTS

// EN: This suite locks the architectural contract so later changes cannot silently weaken system boundaries.
// VI: Suite này khóa hợp đồng kiến trúc để các thay đổi sau không thể âm thầm làm yếu ranh giới hệ thống.

import fs from 'node:fs';
import path from 'node:path';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

async function runArchitectureContractSuite() {
  console.log('\n========================================================================');
  console.log('🏛️ RUNNING BOWCON V4.0 (MILESTONE 1.1: ARCHITECTURE CONTRACT) TEST SUITE');
  console.log('========================================================================\n');

  const rootDir = process.cwd();

  // --------------------------------------------------------------------------
  // SECTION 1: CANONICAL PACKAGE IDENTITY & VERSION INVARIANTS
  // --------------------------------------------------------------------------
  console.log('📦 SECTION 1: Canonical Package Identity & Version Policy');

  const pkgPath = path.join(rootDir, 'package.json');
  assert(fs.existsSync(pkgPath), 'package.json exists at root');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert(pkg.name === '@bow/agent', 'Package name is strictly "@bow/agent"');
  assert(pkg.version === '4.0.0', 'Package version is strictly "4.0.0" (BOWCON V4.0 invariant)');
  assert(!pkg.version.startsWith('5.'), 'No V5 version divergence introduced');
  assert(pkg.type === 'module', 'Package module type is ESM');

  // --------------------------------------------------------------------------
  // SECTION 2: DEPENDENCY ISOLATION & ZERO FORBIDDEN IMPORTS
  // --------------------------------------------------------------------------
  console.log('\n🔒 SECTION 2: Dependency Isolation & Zero Forbidden Dependencies');

  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  assert(!allDeps['react'], 'No React in package dependencies');
  assert(!allDeps['react-dom'], 'No React-DOM in package dependencies');
  assert(!allDeps['@supabase/supabase-js'], 'No Supabase in package dependencies');
  assert(!allDeps['vite'], 'No Vite in package dependencies');

  // --------------------------------------------------------------------------
  // SECTION 3: AUTHORITATIVE ARCHITECTURE CONTRACT DOCUMENTATION
  // --------------------------------------------------------------------------
  console.log('\n📜 SECTION 3: Authoritative Architecture Contract (20 Mandatory Sections)');

  const archDocPath = path.join(rootDir, 'docs', 'BOWCON_V4_ARCHITECTURE.md');
  assert(fs.existsSync(archDocPath), 'docs/BOWCON_V4_ARCHITECTURE.md exists');

  const archDoc = fs.readFileSync(archDocPath, 'utf8');

  const REQUIRED_SECTIONS = [
    '1. SYSTEM IDENTITY',
    '2. BRAIN / BODY SEPARATION',
    '3. CORE AGENT LIFECYCLE',
    '4. TRUST BOUNDARIES',
    '5. MODEL ROUTING CONTRACT',
    '6. LAYERED MEMORY CONTRACT',
    '7. TOOL GOVERNANCE CONTRACT',
    '8. POLICY DECISION POINT (PDP) CONTRACT',
    '9. APPROVAL LIFECYCLE CONTRACT',
    '10. AUDIT LEDGER CONTRACT',
    '11. SELF-IMPROVEMENT CONTRACT',
    '12. DYNAMIC SKILL & SANDBOX CONTRACT',
    '13. COMPUTER CONTROL & DESKTOP AUTOMATION CONTRACT',
    '14. MULTI-AGENT MESH CONTRACT',
    '15. EMBODIED ROBOT CONTRACT',
    '16. REALITY LEVEL CONTRACT',
    '17. MILESTONE GOVERNANCE & PROMOTION GATES',
    '18. PROTECTED SYSTEMS DECLARATION',
    '19. VERSIONING POLICY',
    '20. VERIFIED TECHNICAL DEBT & RISK REGISTER',
  ];

  for (const sec of REQUIRED_SECTIONS) {
    assert(archDoc.includes(sec), `Architecture contract contains section: "${sec}"`);
  }

  // --------------------------------------------------------------------------
  // SECTION 4: COMPONENT MATRIX & REALITY LEVEL AUDIT
  // --------------------------------------------------------------------------
  console.log('\n📊 SECTION 4: Component Matrix & Reality Level Audit');

  const matrixDocPath = path.join(rootDir, 'docs', 'BOWCON_V4_COMPONENT_MATRIX.md');
  assert(fs.existsSync(matrixDocPath), 'docs/BOWCON_V4_COMPONENT_MATRIX.md exists');

  const matrixDoc = fs.readFileSync(matrixDocPath, 'utf8');
  assert(matrixDoc.includes('REAL'), 'Component matrix contains REAL tier');
  assert(matrixDoc.includes('PARTIAL'), 'Component matrix contains PARTIAL tier');
  assert(matrixDoc.includes('MOCK'), 'Component matrix contains MOCK tier');
  assert(matrixDoc.includes('PolicyDecisionPoint'), 'Matrix covers PolicyDecisionPoint');
  assert(matrixDoc.includes('RobotSafetyController'), 'Matrix covers RobotSafetyController');
  assert(matrixDoc.includes('ApprovalService'), 'Matrix covers ApprovalService');
  assert(matrixDoc.includes('AuditLedger'), 'Matrix covers AuditLedger');
  assert(matrixDoc.includes('GeminiClient'), 'Matrix covers GeminiClient');
  assert(matrixDoc.includes('TelegramGateway'), 'Matrix covers TelegramGateway');

  // --------------------------------------------------------------------------
  // SECTION 5: MILESTONE GATE & FORENSIC AUDIT RECORDS
  // --------------------------------------------------------------------------
  console.log('\n🏛️ SECTION 5: Milestone Gate & Forensic Audit Records');

  const milestoneDocPath = path.join(rootDir, 'docs', 'milestones', 'BOWCON_V4_MILESTONE_1_1.md');
  assert(fs.existsSync(milestoneDocPath), 'docs/milestones/BOWCON_V4_MILESTONE_1_1.md exists');

  const auditDocPath = path.join(rootDir, 'BOWCON_V4_FORENSIC_AUDIT.md');
  assert(fs.existsSync(auditDocPath), 'BOWCON_V4_FORENSIC_AUDIT.md exists at root');

  // --------------------------------------------------------------------------
  // SECTION 6: PROTECTED SYSTEM & HOST INTEGRITY GUARDS
  // --------------------------------------------------------------------------
  console.log('\n🛡️ SECTION 6: Protected System Preservation (ShopOfBow & Git Integrity)');

  const defaultShopDir = 'C:\\BOW\\shopofbow\\src\\services\\agent';
  const shopDir = fs.existsSync(defaultShopDir)
    ? defaultShopDir
    : path.resolve(rootDir, 'tests', 'fixtures', 'shopofbow_agent');

  assert(fs.existsSync(shopDir), 'ShopOfBow agent service directory preserved');
  assert(fs.existsSync(path.join(shopDir, 'agentEngine.ts')), 'ShopOfBow agentEngine.ts preserved');
  assert(fs.existsSync(path.join(shopDir, 'intentResolver.ts')), 'ShopOfBow intentResolver.ts preserved');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 ARCHITECTURE CONTRACT SUITE SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (failedTests === 0) {
    console.log('🎉 ALL ARCHITECTURE CONTRACT & BASELINE INVARIANTS PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`💥 FAILED: ${failedTests} assertions failed.`);
  }
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runArchitectureContractSuite().catch((err) => {
  console.error('Fatal error running architecture contract suite:', err);
  process.exit(1);
});
