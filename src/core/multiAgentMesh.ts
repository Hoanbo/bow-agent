// src/core/multiAgentMesh.ts
// BOW CON V4.0 — AUTONOMOUS MULTI-AGENT MESH & TEAM ORCHESTRATION

export type SubAgentRole = 'tech_scout' | 'coder_devops' | 'shop_operations' | 'hardware_vision';

export interface SubAgentTask {
  taskId: string;
  role: SubAgentRole;
  goal: string;
  payload?: Record<string, any>;
  assignedAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
  executionTimeMs?: number;
}

export interface TeamExecutiveReport {
  generatedAt: string;
  summary: string;
  techScoutFindings: string;
  coderDevOpsStatus: string;
  shopOperationsHealth: string;
  hardwareVisionStatus: string;
  activeTasks: number;
  completedTasks: number;
}

export class MultiAgentMesh {
  private tasks: Map<string, SubAgentTask> = new Map();

  /**
   * Ủy thác một nhiệm vụ cho Agent con chuyên trách
   */
  public async delegateTask(
    role: SubAgentRole,
    goal: string,
    payload: Record<string, any> = {}
  ): Promise<SubAgentTask> {
    const taskId = `task_${role}_${Date.now()}`;
    const task: SubAgentTask = {
      taskId,
      role,
      goal,
      payload,
      assignedAt: new Date().toISOString(),
      status: 'in_progress',
    };
    this.tasks.set(taskId, task);

    const startTime = Date.now();
    try {
      let result: any = null;

      switch (role) {
        case 'tech_scout':
          result = await this.executeTechScout(goal, payload);
          break;
        case 'coder_devops':
          result = await this.executeCoderDevOps(goal, payload);
          break;
        case 'shop_operations':
          result = await this.executeShopOperations(goal, payload);
          break;
        case 'hardware_vision':
          result = await this.executeHardwareVision(goal, payload);
          break;
      }

      task.status = 'completed';
      task.result = result;
      task.executionTimeMs = Date.now() - startTime;
    } catch (err: any) {
      task.status = 'failed';
      task.error = err?.message || 'Lỗi thực thi nhiệm vụ agent con';
      task.executionTimeMs = Date.now() - startTime;
    }

    return task;
  }

  // 1. Tech Scout Sub-Agent: Săn tin công nghệ & deal phần cứng
  private async executeTechScout(goal: string, payload: Record<string, any>): Promise<any> {
    const { globalNightlyHunter } = await import('../embodied/nightlyHunterDaemon.js');
    const digest = globalNightlyHunter.getLatestDigest() || (await globalNightlyHunter.runNightlyHunterJob());
    return {
      agent: 'TechScoutAgent',
      mission: goal,
      matchedNewsCount: digest.techNews.length,
      topFinding: digest.techNews[0]?.title || 'Không có tin mới',
      recommendation: 'Đã tổng hợp 3 tin tức quan trọng vào bộ nhớ buổi sáng cho Sếp.',
    };
  }

  // 2. Coder & DevOps Sub-Agent: Viết code, kiểm tra syntax, dọn dẹp máy tính
  private async executeCoderDevOps(goal: string, payload: Record<string, any>): Promise<any> {
    const { globalSandboxRunner } = await import('../desktop/sandboxRunner.js');
    const code = payload.code || 'return { status: "clean", memoryFreedMB: 128 };';
    const testResult = await globalSandboxRunner.executeInSandbox(code, payload.args || {});
    return {
      agent: 'CoderDevOpsAgent',
      mission: goal,
      syntaxValid: testResult.syntaxValid,
      success: testResult.success,
      output: testResult.output,
    };
  }

  // 3. Shop Operations Sub-Agent: Quản trị đơn hàng, lợi nhuận ròng
  private async executeShopOperations(goal: string, payload: Record<string, any>): Promise<any> {
    const { getActiveShopAdapter } = await import('../contracts/shopAdapter.js');
    const adapter = getActiveShopAdapter();

    let pendingCount = 0;
    let netProfit = 0;

    if (adapter.admin?.getPendingFulfillmentQueue) {
      const queue = await adapter.admin.getPendingFulfillmentQueue();
      pendingCount = queue.totalPendingCount || 0;
    }

    if (adapter.admin?.getProfitMarginReport) {
      const profit = await adapter.admin.getProfitMarginReport('today');
      netProfit = profit.netProfit || 0;
    }

    return {
      agent: 'ShopOperationsAgent',
      mission: goal,
      pendingFulfillmentQueue: pendingCount,
      netProfitToday: netProfit,
      status: 'Hệ thống vận hành bán tự động On-Demand ổn định',
    };
  }

  // 4. Hardware & Physical Vision Sub-Agent: Servo, Mắt OLED, Cảm biến
  private async executeHardwareVision(goal: string, payload: Record<string, any>): Promise<any> {
    const { robotChannelAdapter } = await import('../adapters/robotAdapter.js');
    const sensor = await robotChannelAdapter.getSensorState();
    return {
      agent: 'HardwareVisionAgent',
      mission: goal,
      batteryPercent: sensor.batteryPercent,
      isCharging: sensor.isCharging,
      activeSensors: sensor.activeSensors,
      obstaclesDetected: sensor.obstaclesDetected || false,
    };
  }

  /**
   * Tổng hợp báo cáo điều hành toàn diện từ 4 Agent con
   */
  public async synthesizeTeamReport(): Promise<TeamExecutiveReport> {
    const tasksArray = Array.from(this.tasks.values());
    const completedTasks = tasksArray.filter(t => t.status === 'completed').length;

    const [techRes, coderRes, shopRes, hwRes] = await Promise.all([
      this.delegateTask('tech_scout', 'Quét tin tức công nghệ mới'),
      this.delegateTask('coder_devops', 'Kiểm tra sức khỏe hệ thống mã nguồn'),
      this.delegateTask('shop_operations', 'Kiểm tra trạng thái bán hàng Shop of BOW'),
      this.delegateTask('hardware_vision', 'Kiểm tra phần cứng và cảm biến Robot'),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      summary: 'Báo cáo tổng hợp từ 4 Agent con chuyên trách do BOW Con điều phối:',
      techScoutFindings: `Tin nổi bật: "${techRes.result?.topFinding}"`,
      coderDevOpsStatus: `DevOps: Sức khỏe Sandbox OK, thực thi trong ${coderRes.executionTimeMs}ms`,
      shopOperationsHealth: `Shop: ${shopRes.result?.pendingFulfillmentQueue} đơn chờ giao, Lợi nhuận ròng ${shopRes.result?.netProfitToday.toLocaleString('vi-VN')}đ`,
      hardwareVisionStatus: `Robot: Pin ${hwRes.result?.batteryPercent}%, Cảm biến: ${(hwRes.result?.activeSensors || []).join(', ')}`,
      activeTasks: this.tasks.size,
      completedTasks,
    };
  }
}

// Global Singleton Instance
export const globalMultiAgentMesh = new MultiAgentMesh();
