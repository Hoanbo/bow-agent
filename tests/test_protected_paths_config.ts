import assert from 'node:assert';
import { CONFIG, setProtectedPaths, getProtectedPaths, isPathProtected } from '../src/config.js';
import { SandboxPathGuard } from '../src/core/sandbox/sandboxPathGuard.js';

console.log('Testing Configurable Protected Paths Mechanism...');

const initialPaths = getProtectedPaths();
assert(isPathProtected('c:/bow/shopofbow'), 'Initial config protects shopofbow');

// 1. Remove shopofbow and set custom protected path
setProtectedPaths(['/custom/protected/area', 'secret_vault']);

assert(!isPathProtected('c:/bow/shopofbow'), 'shopofbow is no longer protected after removal from config');
assert(isPathProtected('/custom/protected/area/subfolder'), 'Custom path is protected');
assert(isPathProtected('secret_vault/keys'), 'secret_vault is protected');

// 2. Verify SandboxPathGuard allows shopofbow when not configured
let shopError: any = null;
try {
  SandboxPathGuard.assertNotProtectedWorkspace('c:/bow/shopofbow/somefile.txt');
} catch (e) {
  shopError = e;
}
assert(shopError === null, 'SandboxPathGuard does NOT block shopofbow when removed from config');

// 3. Verify SandboxPathGuard blocks the custom configured protected path
let customError: any = null;
try {
  SandboxPathGuard.assertNotProtectedWorkspace('/custom/protected/area/data');
} catch (e: any) {
  customError = e;
}
assert(customError !== null, 'SandboxPathGuard blocks custom path');
assert(customError.code === 'SECURITY_VIOLATION', 'Error code is SECURITY_VIOLATION');

// Restore original paths
setProtectedPaths(initialPaths);
assert(isPathProtected('c:/bow/shopofbow'), 'Default paths restored');

console.log('✅ Configurable protected paths test PASSED: 100% verified.');
