// src/tools/desktopTools.ts
// BOW AGENT V3.3 — DESKTOP AUTOMATION & COMPUTER CONTROL TOOLS (bow-remote-agent)

import { toolRegistry } from './registry.js';
import { verifyChannelAccess } from '../core/security.js';

export interface DesktopActionResult {
  success: boolean;
  action: string;
  payload?: any;
  message?: string;
  error?: string;
}

// 1. Launch Application Tool
toolRegistry.register({
  name: 'desktop_launch_app',
  description: 'Mở một ứng dụng trên máy tính (VD: chrome, notepad, calculator, cmd).',
  parameters: {
    type: 'object',
    properties: {
      appName: { type: 'string', description: 'Tên hoặc đường dẫn ứng dụng cần mở' },
      args: { type: 'array', items: { type: 'string' }, description: 'Tham số khởi chạy' },
    },
    required: ['appName'],
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    if (!verifyChannelAccess(context || { channel: 'DESKTOP' }, 'DESKTOP_EXEC')) {
      return { success: false, action: 'desktop_launch_app', error: 'UNAUTHORIZED: Desktop execution token invalid or missing.' };
    }

    return {
      success: true,
      action: 'desktop_launch_app',
      payload: { appName: args.appName, args: args.args || [] },
      message: `Đã gửi lệnh mở ứng dụng ${args.appName} tới desktop agent.`,
    };
  },
});

// 2. Keystroke & Typing Tool
toolRegistry.register({
  name: 'desktop_send_keys',
  description: 'Nhập văn bản hoặc gửi phím bấm/tổ hợp phím tới cửa sổ đang active.',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Chuỗi văn bản cần gõ' },
      keyCombo: { type: 'string', description: 'Tổ hợp phím đặc biệt (VD: enter, tab, ctrl+c, alt+f4)' },
    },
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    if (!verifyChannelAccess(context || { channel: 'DESKTOP' }, 'DESKTOP_EXEC')) {
      return { success: false, action: 'desktop_send_keys', error: 'UNAUTHORIZED: Desktop execution token invalid or missing.' };
    }

    return {
      success: true,
      action: 'desktop_send_keys',
      payload: { text: args.text, keyCombo: args.keyCombo },
      message: `Đã gửi lệnh phím bấm tới desktop agent.`,
    };
  },
});

// 3. Mouse Click & Move Tool
toolRegistry.register({
  name: 'desktop_mouse_action',
  description: 'Thực hiện thao tác chuột (click, double-click, chuột phải, di chuyển) tại tọa độ x, y.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['click', 'double_click', 'right_click', 'move'] },
      x: { type: 'number', description: 'Tọa độ X trên màn hình' },
      y: { type: 'number', description: 'Tọa độ Y trên màn hình' },
    },
    required: ['action', 'x', 'y'],
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    if (!verifyChannelAccess(context || { channel: 'DESKTOP' }, 'DESKTOP_EXEC')) {
      return { success: false, action: 'desktop_mouse_action', error: 'UNAUTHORIZED: Desktop execution token invalid or missing.' };
    }

    return {
      success: true,
      action: 'desktop_mouse_action',
      payload: { mouseAction: args.action, x: args.x, y: args.y },
      message: `Đã gửi thao tác chuột ${args.action} tại (${args.x}, ${args.y}) tới desktop agent.`,
    };
  },
});

// 4. Capture Screenshot Tool
toolRegistry.register({
  name: 'desktop_capture_screenshot',
  description: 'Chụp ảnh màn hình desktop hiện tại để gửi về Agent phân tích thị giác.',
  parameters: {
    type: 'object',
    properties: {
      screenIndex: { type: 'number', description: 'Chỉ số màn hình (mặc định màn hình chính: 0)' },
    },
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    if (!verifyChannelAccess(context || { channel: 'DESKTOP' }, 'DESKTOP_EXEC')) {
      return { success: false, action: 'desktop_capture_screenshot', error: 'UNAUTHORIZED: Desktop execution token invalid or missing.' };
    }

    return {
      success: true,
      action: 'desktop_capture_screenshot',
      payload: { screenIndex: args?.screenIndex ?? 0 },
      message: 'Đã gửi yêu cầu chụp ảnh màn hình tới desktop agent.',
    };
  },
});

// 5. Inspect Screen Notifications Tool (Mắt Thần Màn Hình for Boss)
toolRegistry.register({
  name: 'inspect_screen_notifications',
  description: 'Chụp ảnh màn hình desktop và sử dụng Gemini Vision để phân tích xem ai vừa nhắn tin Facebook, Zalo, Telegram và tóm tắt nội dung tin nhắn cho Sếp.',
  parameters: {
    type: 'object',
    properties: {
      userQuery: { type: 'string', description: 'Câu hỏi hoặc ứng dụng cần tập trung (vd: "Ai vừa nhắn tin Facebook?")' },
      focusApp: { type: 'string', description: 'Ứng dụng cần ưu tiên kiểm tra (vd: "Facebook", "Zalo", "Telegram")' },
    },
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const isAuthorized = context?.role === 'owner' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
    if (!isAuthorized) {
      return {
        success: false,
        action: 'inspect_screen_notifications',
        error: 'FORBIDDEN_ACCESS: Bạn không có quyền truy cập thị giác màn hình của Sếp.',
      };
    }

    const { screenVisionService } = await import('../desktop/screenVisionService.js');
    const result = await screenVisionService.inspectScreenForNotifications({
      userQuery: args?.userQuery,
      focusApp: args?.focusApp,
    });

    return {
      success: result.success,
      action: 'inspect_screen_notifications',
      payload: result,
      message: result.summary,
    };
  },
});

// 6. Voice-to-Chat Reply Message Tool (Reply to Facebook/Zalo/Telegram by Voice)
toolRegistry.register({
  name: 'desktop_reply_message',
  description: 'Tự động nhập và gửi tin nhắn trả lời trên cửa sổ chat Facebook, Zalo, hoặc Telegram đang hoạt động theo lệnh giọng nói của Sếp.',
  parameters: {
    type: 'object',
    properties: {
      replyText: { type: 'string', description: 'Nội dung tin nhắn cần gửi' },
      targetApp: { type: 'string', description: 'Ứng dụng cần gửi: "Facebook", "Zalo", "Telegram", hoặc "Browser"' },
      recipientName: { type: 'string', description: 'Tên người nhận tin nhắn' },
    },
    required: ['replyText'],
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const isAuthorized = context?.role === 'owner' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
    if (!isAuthorized) {
      return {
        success: false,
        action: 'desktop_reply_message',
        error: 'FORBIDDEN_ACCESS: Bạn không có quyền gửi tin nhắn từ máy tính của Sếp.',
      };
    }

    const { chatReplyService } = await import('../desktop/chatReplyService.js');
    const result = await chatReplyService.sendChatReply({
      replyText: args.replyText,
      targetApp: args.targetApp,
      recipientName: args.recipientName,
    });

    return {
      success: result.success,
      action: 'desktop_reply_message',
      payload: result,
      message: result.message,
    };
  },
});

// 7. Universal Code Interpreter Tool (Execute Dynamic Code in Sandbox)
toolRegistry.register({
  name: 'desktop_execute_code',
  description: 'Thực thi mã JavaScript/TypeScript động trong môi trường Sandbox an toàn để tính toán, xử lý dữ liệu phức tạp, lọc số liệu hoặc tạo kết quả theo bất kỳ yêu cầu mới nào của Sếp.',
  parameters: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Đoạn mã JavaScript/TypeScript cần thực thi' },
      language: { type: 'string', enum: ['javascript', 'typescript', 'js', 'ts'], description: 'Ngôn ngữ lập trình' },
      description: { type: 'string', description: 'Mô tả mục đích của đoạn mã' },
    },
    required: ['code'],
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const isAuthorized = context?.role === 'owner' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
    if (!isAuthorized) {
      return {
        success: false,
        action: 'desktop_execute_code',
        error: 'FORBIDDEN_ACCESS: Bạn không có quyền thực thi mã trong Code Sandbox.',
      };
    }

    const { codeSandboxService } = await import('../desktop/codeSandboxService.js');
    const result = await codeSandboxService.executeCode({
      code: args.code,
      language: args.language || 'javascript',
    });

    return {
      success: result.success,
      action: 'desktop_execute_code',
      payload: result,
      message: result.success
        ? `Đã thực thi mã thành công trong ${result.executionTimeMs}ms. Kết quả: ${JSON.stringify(result.result)}`
        : `Thực thi mã thất bại: ${result.error}`,
      error: result.error,
    };
  },
});

// 8. Embodied Smart Home & IoT Automation Tool
toolRegistry.register({
  name: 'desktop_smarthome_control',
  description: 'Điều khiển các thiết bị nhà thông minh và văn phòng của Sếp (bật/tắt đèn bàn, đèn trần, chỉnh nhiệt độ điều hòa, quạt, ổ cắm thông minh).',
  parameters: {
    type: 'object',
    properties: {
      device: { type: 'string', description: 'Tên hoặc loại thiết bị (vd: "desk_light", "air_conditioner", "main_light", "smart_plug")' },
      action: { type: 'string', enum: ['turn_on', 'turn_off', 'set_temperature', 'set_brightness', 'get_status'], description: 'Thao tác điều khiển' },
      value: { type: 'number', description: 'Giá trị cần chỉnh (vd: 25 độ C hoặc 80% độ sáng)' },
    },
    required: ['device', 'action'],
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const isAuthorized = context?.role === 'owner' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
    if (!isAuthorized) {
      return {
        success: false,
        action: 'desktop_smarthome_control',
        error: 'FORBIDDEN_ACCESS: Bạn không có quyền điều khiển thiết bị nhà thông minh của Sếp.',
      };
    }

    const { smartHomeService } = await import('../embodied/smartHomeService.js');
    const result = await smartHomeService.executeCommand({
      device: args.device,
      action: args.action as any,
      value: args.value,
    });


    return {
      success: result.success,
      action: 'desktop_smarthome_control',
      payload: result,
      message: result.message,
    };
  },
});





// ============================================================================
// BOW CON V4.0 — BOSS LIFE COMPANION & EPISODIC MEMORY TOOLS
// ============================================================================

// 9. Boss Remember Fact Tool
toolRegistry.register({
  name: 'boss_remember_fact',
  description: 'Ghi nhớ sở thích, thói quen sinh hoạt, hoặc dự án công nghệ mới do Sếp chia sẻ.',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['habits', 'projects', 'health', 'preferences'],
        description: 'Phân loại thông tin cần ghi nhớ',
      },
      key: { type: 'string', description: 'Tên trường hoặc tên dự án/thói quen' },
      value: { type: 'string', description: 'Chi tiết nội dung cần nhớ' },
    },
    required: ['category', 'key', 'value'],
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
    if (!isAuthorized) {
      return { success: false, action: 'boss_remember_fact', error: 'FORBIDDEN: Chỉ Sếp mới có quyền dạy AI ghi nhớ thông tin cá nhân.' };
    }

    const { globalBossMemory } = await import('../embodied/bossMemoryHub.js');
    if (args.category === 'habits') {
      globalBossMemory.rememberHabit(args.key as any, args.value);
    } else if (args.category === 'projects') {
      globalBossMemory.addOrUpdateProject({
        id: 'proj_' + Date.now(),
        name: args.key,
        description: args.value,
        techStack: ['Chưa xác định'],
        status: 'active',
      });
    } else if (args.category === 'health') {
      globalBossMemory.addHealthNote(args.value);
    }

    return {
      success: true,
      action: 'boss_remember_fact',
      payload: { category: args.category, key: args.key, value: args.value },
      message: `Dạ con đã ghi nhớ thành công: "${args.key} - ${args.value}" vào bộ nhớ dài hạn rồi ạ!`,
    };
  },
});

// 10. Boss Recall Memory Tool
toolRegistry.register({
  name: 'boss_recall_memory',
  description: 'Truy xuất các thông tin ghi nhớ về thói quen, dự án hoặc sức khỏe của Sếp.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Từ khóa hoặc chủ đề cần tra cứu trong trí nhớ' },
    },
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const { globalBossMemory } = await import('../embodied/bossMemoryHub.js');
    const profile = globalBossMemory.getProfile();

    return {
      success: true,
      action: 'boss_recall_memory',
      payload: profile,
      message: `Dạ con đã tìm thấy hồ sơ của Sếp: ${profile.name}. Đang theo đuổi ${profile.projects.length} dự án.`,
    };
  },
});

// 11. Morning Executive Briefing Tool
toolRegistry.register({
  name: 'get_morning_briefing',
  description: 'Lấy bản tin chào buổi sáng tổng hợp tin tức công nghệ AI/Robotics và số liệu Shop hôm qua.',
  parameters: {
    type: 'object',
    properties: {
      forceRefresh: { type: 'boolean', description: 'Có bắt buộc quét mới lại không' },
    },
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const { globalMorningBriefing } = await import('../embodied/morningBriefingService.js');
    const res = await globalMorningBriefing.executeMorningBriefing();

    return {
      success: true,
      action: 'get_morning_briefing',
      payload: res,
      message: res.speechText,
    };
  },
});

// 12. Teach Boss Rule Tool
toolRegistry.register({
  name: 'teach_boss_rule',
  description: 'Ghi nhận một quy tắc ứng xử hoặc hướng dẫn mới do Sếp trực tiếp chỉ dạy.',
  parameters: {
    type: 'object',
    properties: {
      instruction: { type: 'string', description: 'Nội dung quy tắc Sếp dạy' },
      category: {
        type: 'string',
        enum: ['addressing', 'policy', 'behavior', 'shop_knowledge'],
        description: 'Phân loại quy tắc',
      },
    },
    required: ['instruction'],
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
    if (!isAuthorized) {
      return { success: false, action: 'teach_boss_rule', error: 'FORBIDDEN: Chỉ Sếp mới có quyền dạy quy tắc mới cho AI.' };
    }

    const { globalBossFeedback } = await import('../embodied/bossFeedbackLearner.js');
    const rule = globalBossFeedback.addRule({
      pattern: 'lời dạy của Sếp',
      instruction: args.instruction,
      category: (args.category as any) || 'behavior',
    });

    return {
      success: true,
      action: 'teach_boss_rule',
      payload: rule,
      message: `Dạ con đã ghi nhớ vĩnh viễn quy tắc Sếp vừa dạy: "${args.instruction}". Con sẽ tuân thủ nghiêm túc ạ!`,
    };
  },
});


// ============================================================================
// BOW CON V4.0 — PHASE 2: AUTONOMOUS DYNAMIC SKILLS & HYBRID BRAIN TOOLS
// ============================================================================

// 13. Create Dynamic Skill Tool
toolRegistry.register({
  name: 'create_dynamic_skill',
  description: 'Tự động tạo và đăng ký một kỹ năng mới (tool mới) bằng cách viết mã trong Sandbox.',
  parameters: {
    type: 'object',
    properties: {
      skillId: { type: 'string', description: 'Định danh duy nhất của kỹ năng (vd: skill_gold_price, skill_math_solver)' },
      name: { type: 'string', description: 'Tên hiển thị của kỹ năng' },
      description: { type: 'string', description: 'Mô tả tác dụng của kỹ năng' },
      code: { type: 'string', description: 'Mã JavaScript thực thi nhận (args, context) và trả về kết quả' },
      testArgs: { type: 'object', description: 'Dữ liệu mẫu để chạy thử trong Sandbox' },
      parametersSchema: { type: 'object', description: 'Schema các tham số đầu vào' },
    },
    required: ['skillId', 'name', 'description', 'code'],
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const isAuthorized = context?.role === 'owner' || context?.role === 'admin' || context?.channel === 'ROBOT' || context?.channel === 'DESKTOP';
    if (!isAuthorized) {
      return { success: false, action: 'create_dynamic_skill', error: 'FORBIDDEN: Chỉ Sếp mới có quyền tạo kỹ năng mới cho hệ thống.' };
    }

    const { globalSandboxRunner } = await import('../desktop/sandboxRunner.js');
    const result = await globalSandboxRunner.testAndSynthesizeSkill({
      id: args.skillId,
      name: args.name,
      description: args.description,
      code: args.code,
      testArgs: args.testArgs || {},
      parametersSchema: args.parametersSchema || {},
      author: 'bow_con_synthesized',
    });

    if (!result.success) {
      return {
        success: false,
        action: 'create_dynamic_skill',
        error: result.debugFeedback,
      };
    }

    return {
      success: true,
      action: 'create_dynamic_skill',
      payload: result.synthesizedSkill,
      message: result.debugFeedback,
    };
  },
});

// 14. Execute Dynamic Skill Tool
toolRegistry.register({
  name: 'execute_dynamic_skill',
  description: 'Thực thi một kỹ năng động đã được học và lưu trong kho kỹ năng.',
  parameters: {
    type: 'object',
    properties: {
      skillId: { type: 'string', description: 'ID của kỹ năng cần thực thi' },
      args: { type: 'object', description: 'Các tham số truyền vào kỹ năng' },
    },
    required: ['skillId'],
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const { globalSkillManager } = await import('../skills/dynamicSkillManager.js');
    const result = await globalSkillManager.executeSkill(args.skillId, args.args || {}, context);

    if (!result.success) {
      return {
        success: false,
        action: 'execute_dynamic_skill',
        error: result.error,
      };
    }

    return {
      success: true,
      action: 'execute_dynamic_skill',
      payload: result.result,
      message: `Kỹ năng "${args.skillId}" đã thực thi thành công trong ${result.executionTimeMs}ms.`,
    };
  },
});

// 15. List Dynamic Skills Tool
toolRegistry.register({
  name: 'list_dynamic_skills',
  description: 'Xem danh sách toàn bộ các kỹ năng động do AI tự tổng hợp hoặc Sếp dạy.',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const { globalSkillManager } = await import('../skills/dynamicSkillManager.js');
    const skills = globalSkillManager.listSkills();

    return {
      success: true,
      action: 'list_dynamic_skills',
      payload: skills,
      message: `Kho hiện có ${skills.length} kỹ năng động đang hoạt động.`,
    };
  },
});

// 16. Switch AI Brain Mode Tool
toolRegistry.register({
  name: 'switch_ai_brain_mode',
  description: 'Chuyển đổi hoặc xem trạng thái của Kiến Trúc Não Đôi (Cloud Gemini / Local Ollama).',
  parameters: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['auto', 'cloud_preferred', 'local_preferred', 'local_only', 'deterministic_only'],
        description: 'Chế độ hoạt động mong muốn',
      },
    },
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const { globalHybridRouter } = await import('../core/hybridModelRouter.js');
    if (args.mode) {
      globalHybridRouter.setMode(args.mode as any);
    }
    const status = globalHybridRouter.getStatus();

    return {
      success: true,
      action: 'switch_ai_brain_mode',
      payload: status,
      message: `Chế độ Não Đôi hiện tại: "${status.activeMode}". Quyết định gần nhất: "${status.lastRoutingDecision}".`,
    };
  },
});


// ============================================================================
// BOW CON V4.0 — PHASE 3: MULTI-AGENT MESH & PHYSICAL EMBODIED REFLEXES
// ============================================================================

// 17. Delegate Subagent Task Tool
toolRegistry.register({
  name: 'delegate_subagent_task',
  description: 'Ủy thác nhiệm vụ cho Agent con chuyên trách (tech_scout, coder_devops, shop_operations, hardware_vision).',
  parameters: {
    type: 'object',
    properties: {
      role: {
        type: 'string',
        enum: ['tech_scout', 'coder_devops', 'shop_operations', 'hardware_vision'],
        description: 'Vai trò của Agent con',
      },
      goal: { type: 'string', description: 'Mục tiêu cần hoàn thành' },
      payload: { type: 'object', description: 'Dữ liệu đầu vào bổ sung' },
    },
    required: ['role', 'goal'],
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const { globalMultiAgentMesh } = await import('../core/multiAgentMesh.js');
    const task = await globalMultiAgentMesh.delegateTask(args.role, args.goal, args.payload || {});

    return {
      success: task.status === 'completed',
      action: 'delegate_subagent_task',
      payload: task,
      message: `Agent con [${args.role}] đã hoàn thành nhiệm vụ: "${args.goal}" trong ${task.executionTimeMs}ms.`,
    };
  },
});

// 18. Robot Track Sound Source Tool
toolRegistry.register({
  name: 'robot_track_sound_source',
  description: 'Tự động tính toán góc âm thanh giọng nói và điều khiển servo quay đầu nhìn thẳng vào Sếp.',
  parameters: {
    type: 'object',
    properties: {
      micLeftEnergy: { type: 'number', description: 'Mức năng lượng mic trái' },
      micRightEnergy: { type: 'number', description: 'Mức năng lượng mic phải' },
    },
    required: ['micLeftEnergy', 'micRightEnergy'],
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const { globalSoundLocalization } = await import('../embodied/soundLocalization.js');
    const res = await globalSoundLocalization.trackAndAimHeadAtSound(args.micLeftEnergy, args.micRightEnergy);

    return {
      success: res.success,
      action: 'robot_track_sound_source',
      payload: res,
      message: `Robot đã xoay đầu ${res.targetAngle} độ về hướng ${res.direction} nhìn vào Sếp.`,
    };
  },
});

// 19. Send Telegram Briefing to Boss Tool
toolRegistry.register({
  name: 'send_telegram_briefing_to_boss',
  description: 'Gửi Bản Tin Sáng tự động hoặc thông báo khẩn vào điện thoại Telegram của Sếp.',
  parameters: {
    type: 'object',
    properties: {
      chatId: { type: 'string', description: 'Chat ID Telegram của Sếp (tùy chọn)' },
    },
  },
  execute: async (args, context): Promise<DesktopActionResult> => {
    const { globalTelegramGateway } = await import('../gateway/telegramGateway.js');
    const res = await globalTelegramGateway.pushMorningBriefingToPhone(args.chatId);

    return {
      success: res.delivered,
      action: 'send_telegram_briefing_to_boss',
      payload: res,
      message: 'Bản Tin Chào Buổi Sáng đã được gửi thành công vào điện thoại của Sếp qua Telegram!',
    };
  },
});
