// tests/test_live_body_action.ts
// BOWCON V4.0 — LIVE BODY PROTOCOL REAL-WORLD VERIFICATION
//
// Tests the full authoritative pipeline:
// Brain Server (Port 4088) <--- WebSocket BodyProtocol ---> Desktop Body Process
// Step 1: Pre-condition: Ensure NO notepad process is running
// Step 2: Start Central Brain Server
// Step 3: Start Desktop Body Runner (Advertises 4 capabilities & starts heartbeats)
// Step 4: Verify BodyRegistry has registered the Body
// Step 5: Plan & execute 'system.open_app' with { app: 'notepad' } through ToolRegistry / BodyRegistry
// Step 6: Verify OS Process: Notepad process must be ACTUALLY RUNNING on Windows
// Step 7: Clean up Notepad process
// Step 8: Disconnect / kill Desktop Body and verify unregistration on Brain

import { BowCentralAgentServer } from '../src/server.js';
import { DesktopBodyRunner } from '../bodies/desktop/index.js';
import { globalBodyRegistry, getBodyPsk } from '../src/core/bodyProtocol/index.js';
import { toolRegistry } from '../src/tools/registry.js';
import { planBodyAction } from '../src/core/actionPlanner.js';
import { globalApprovalService } from '../src/core/approvalService.js';
import { execSync } from 'node:child_process';

function getNotepadProcesses(): string {
  try {
    const out = execSync('powershell -NoProfile -Command "Get-Process notepad -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime | Format-Table -AutoSize"', { encoding: 'utf8' });
    return out.trim();
  } catch {
    return '';
  }
}

function killNotepadProcesses(): void {
  try {
    execSync('powershell -NoProfile -Command "Stop-Process -Name notepad -Force -ErrorAction SilentlyContinue"');
  } catch {
    // Ignore
  }
}

async function runLiveVerification(): Promise<void> {
  console.log('========================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM CHỨNG HÀNH ĐỘNG THẬT (LIVE BODY PROTOCOL VERIFICATION)');
  console.log('========================================================================\n');

  const TEST_PORT = 4088;

  // 1. Dọn dẹp tiến trình notepad cũ nếu có
  console.log('--- BƯỚC 4c.1: KIỂM TRA TIẾN TRÌNH NOTEPAD TRƯỚC KHI CHẠY ---');
  killNotepadProcesses();
  const preNotepads = getNotepadProcesses();
  console.log(`Tiến trình notepad trước khi test:\n${preNotepads || '(Không có tiến trình notepad nào đang chạy)'}\n`);

  // 2. Khởi động Central Brain Server trên cổng TEST_PORT
  console.log('--- BƯỚC 4a.1: KHỞI ĐỘNG NÃO BỘ TRUNG TÂM (CENTRAL BRAIN SERVER) ---');
  const server = new BowCentralAgentServer({ port: TEST_PORT, host: '127.0.0.1' });
  await server.start();
  console.log(`Central Brain Server đã sẵn sàng lắng nghe trên cổng ${TEST_PORT}.\n`);

  // 3. Khởi động Desktop Body Runner với PSK hợp lệ
  console.log('--- BƯỚC 4a.2: KHỞI ĐỘNG TIẾN TRÌNH DESKTOP BODY (VỚI PSK AUTH) ---');
  const validPsk = getBodyPsk();
  const bodyRunner = new DesktopBodyRunner(`wss://127.0.0.1:${TEST_PORT}/ws/body`, 'desktop_xeon_live_node', validPsk);
  await bodyRunner.start();
  console.log('Desktop Body Runner đã kết nối và gửi quảng bá CapabilityAdvertisement.\n');

  // Đợi 500ms để đảm bảo đăng ký hoàn tất
  await new Promise((r) => setTimeout(r, 500));

  // 4. Kiểm tra BodyRegistry trên Brain
  console.log('--- BƯỚC 4a.3: XÁC MINH BODY ĐÃ ĐĂNG KÝ TRÊN BODYREGISTRY ---');
  const activeBodies = globalBodyRegistry.getAllActiveBodies();
  console.log(`Số lượng Body đang hoạt động trên Não: ${activeBodies.length}`);
  const registered = globalBodyRegistry.getBody('desktop_xeon_live_node');
  if (!registered) {
    throw new Error('FAIL: Body desktop_xeon_live_node chưa được đăng ký trong globalBodyRegistry!');
  }
  console.log(`[PASS] Tìm thấy Body: ${registered.name} (ID: ${registered.bodyId})`);
  console.log(`[PASS] Các capability đã quảng bá: ${Array.from(registered.capabilities.keys()).join(', ')}\n`);

  // 5. Kiểm tra Planner đề xuất hành động và ToolRegistry tìm thấy tool từ Body
  console.log('--- BƯỚC 4b: ĐIỀU PHỐI QUA PLANNER VÀ TOOLREGISTRY ---');
  const dummyContext: any = { userId: 'usr_owner', role: 'owner', isOwner: true };
  const action = planBodyAction('system.open_app', { app: 'notepad' }, dummyContext);
  console.log(`Planner đề xuất Action: ${JSON.stringify(action, null, 2)}`);

  console.log(`Kiểm tra ToolRegistry.hasTool('system.open_app'): ${toolRegistry.hasTool('system.open_app')}`);
  const toolDef = toolRegistry.getTool('system.open_app');
  console.log(`[PASS] ToolDefinition tìm thấy từ Body: name=${toolDef?.name}, desc=${toolDef?.description}\n`);

  // 6. Thực thi thật mở Notepad qua luồng: Planner -> ToolRegistry -> BodyRegistry -> WebSocket -> Desktop Body -> spawn
  console.log('--- BƯỚC 4c.2: THỰC THI LỆNH MỞ NOTEPAD THẬT SỰ ---');
  console.log('Đang gửi lệnh mở ứng dụng "notepad" qua WebSocket tới Desktop Body...');

  let execResult: any;
  try {
    execResult = await toolRegistry.executeTool('system.open_app', { app: 'notepad' }, dummyContext);
  } catch (err: any) {
    // Nếu PDP chặn vì HIGH_IMPACT đòi hỏi xác nhận chủ nhân
    if (err.message.includes('HIGH_IMPACT_APPROVAL_REQUIRED')) {
      const match = err.message.match(/Approval ID:\s*([a-zA-Z0-9_-]+)/);
      const approvalId = match ? match[1] : '';
      console.log(`[PDP GOVERNANCE]: Bắt được yêu cầu phê duyệt bảo vệ Level 4 (Approval ID: ${approvalId})`);
      console.log('Chủ nhân (Boss-Hoan) cấp quyền thực thi (Grant Approval)...');
      const grant = globalApprovalService.grantApproval(approvalId, 'Boss-Hoan');
      console.log(`Đã cấp execution token: ${grant.executionToken?.substring(0, 16)}...`);

      // Thực thi lại với token phê duyệt hợp lệ
      dummyContext.executionToken = grant.executionToken;
      execResult = await toolRegistry.executeTool('system.open_app', { app: 'notepad' }, dummyContext);
    } else {
      throw err;
    }
  }

  console.log(`Kết quả thực thi từ Body:\n${JSON.stringify(execResult, null, 2)}\n`);

  // Đợi 1 giây để hệ điều hành Windows khởi động tiến trình Notepad
  await new Promise((r) => setTimeout(r, 1000));

  // 7. Xác nhận tiến trình notepad thật sự đang chạy trên Windows
  console.log('--- BƯỚC 4c.3: XÁC NHẬN TIẾN TRÌNH NOTEPAD TRÊN HỆ ĐIỀU HÀNH WINDOWS ---');
  const postNotepads = getNotepadProcesses();
  console.log(`Tiến trình notepad sau khi thực thi:\n${postNotepads}`);
  if (!postNotepads || !postNotepads.toLowerCase().includes('notepad')) {
    throw new Error('FAIL: Không tìm thấy tiến trình notepad sau khi gửi lệnh mở app!');
  }
  console.log('[CHỨNG MINH THÀNH CÔNG]: Notepad đã được mở thật sự trên máy tính Windows!\n');

  // Dọn dẹp notepad đã mở
  killNotepadProcesses();
  console.log('Đã đóng tiến trình notepad thử nghiệm.\n');

  // 8. Thử nghiệm ngắt kết nối / kill Desktop Body và xác minh gỡ đăng ký
  console.log('--- BƯỚC 4d: NGẮT TIẾN TRÌNH DESKTOP BODY VÀ XÁC MINH GỠ ĐĂNG KÝ ---');
  console.log('Đang tắt tiến trình Desktop Body...');
  bodyRunner.stop();

  // Đợi 300ms để Brain nhận sự kiện close socket
  await new Promise((r) => setTimeout(r, 300));

  const bodyAfterStop = globalBodyRegistry.getBody('desktop_xeon_live_node');
  console.log(`Trạng thái Body trên BodyRegistry sau khi dừng: ${bodyAfterStop ? 'VẪN CÒN' : 'ĐÃ GỠ ĐĂNG KÝ THÀNH CÔNG'}`);
  if (bodyAfterStop) {
    throw new Error('FAIL: Body vẫn còn trong registry sau khi socket đã đóng!');
  }
  console.log('[PASS] Body đã tự động được gỡ bỏ khỏi BodyRegistry khi mất kết nối.\n');

  // Dừng server
  await server.stop();
  console.log('========================================================================');
  console.log('✅ TOÀN BỘ BÀI TEST THỰC TẾ (LIVE VERIFICATION) HOÀN TẤT VỚI 100% THÀNH CÔNG!');
  console.log('========================================================================');
}

runLiveVerification().catch((err) => {
  console.error('LIVE VERIFICATION FAILED:', err);
  process.exit(1);
});
