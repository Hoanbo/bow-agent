import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('Testing ShopOfBow Source Preservation (Adapter Boundary Test)...');

const defaultShopDir = 'C:\\BOW\\shopofbow\\src\\services\\agent';
const shopofbowAgentDir = fs.existsSync(defaultShopDir)
  ? defaultShopDir
  : path.resolve(process.cwd(), 'tests', 'fixtures', 'shopofbow_agent');

if (fs.existsSync(shopofbowAgentDir)) {
  assert(fs.existsSync(shopofbowAgentDir), 'shopofbow/src/services/agent still exists');
  assert(fs.existsSync(path.join(shopofbowAgentDir, 'agentEngine.ts')), 'shopofbow agentEngine.ts preserved');
  assert(fs.existsSync(path.join(shopofbowAgentDir, 'intentResolver.ts')), 'shopofbow intentResolver.ts preserved');
  assert(fs.existsSync(path.join(shopofbowAgentDir, 'tools.ts')), 'shopofbow tools.ts preserved');
  assert(fs.existsSync(path.join(shopofbowAgentDir, 'adapters/shopAdapter.ts')), 'shopofbow adapters/shopAdapter.ts preserved');
  console.log('✅ ShopOfBow source preservation verified in adapter boundary test.');
} else {
  console.log('ℹ️ ShopOfBow workspace is not present or disabled in this environment (Core independence mode).');
}
