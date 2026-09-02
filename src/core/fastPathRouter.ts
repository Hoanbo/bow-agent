// src/core/fastPathRouter.ts
// BOW AGENT V3.5 — V2 DETERMINISTIC FAST-PATH ROUTER (0ms LOCAL CPU ENGINE)
//
// Re-activates the author's original V2 deterministic rule matching engine.
// Executes common OS commands, app launches, and utility queries locally in < 5ms
// without consuming any LLM tokens or relying on external cloud APIs.

export interface FastPathMatchResult {
  matched: boolean;
  intent: 'OPEN_APP' | 'DESKTOP_ACTION' | 'UTILITY_TIME' | 'GREETING_FAST' | 'NONE';
  action?: string;
  target?: string;
  textResponse?: string;
  payload?: Record<string, any>;
  executionDurationMs?: number;
}

export class FastPathRouter {
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[?!.,;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Evaluate if a user query can be fulfilled deterministically via V2 local engine
   */
  public evaluate(rawText: string): FastPathMatchResult {
    const startTime = Date.now();
    const query = this.normalize(rawText);

    // 1. GREETINGS (0ms)
    if (/^(?:chao em|chao bow|hello em|hi em|chao buoi sang|chao sep|hello bow|hi bow)(?:\s+a|\s+oi)?$/.test(query)) {
      return {
        matched: true,
        intent: 'GREETING_FAST',
        textResponse: 'Dạ em chào Sếp! Em đang sẵn sàng hỗ trợ Sếp đây ạ.',
        executionDurationMs: Date.now() - startTime,
      };
    }

    // 2. TIME & DATE (0ms)
    if (/^(?:may gio|may gio roi|bay gio la may gio|hom nay ngay may|ngay may|gio gi roi)(?:\s+em|\s+roi|\s+nhi|\s+a|\s+the em|\s+ha em)?$/.test(query)) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
      return {
        matched: true,
        intent: 'UTILITY_TIME',
        textResponse: `Dạ thưa Sếp, bây giờ là ${timeStr}, ${dateStr} ạ.`,
        executionDurationMs: Date.now() - startTime,
      };
    }


    // 3. SCREENSHOT (0ms local dispatch)
    if (/^(chup man hinh|screenshot|chup lai man hinh|chup desktop)$/.test(query)) {
      return {
        matched: true,
        intent: 'DESKTOP_ACTION',
        action: 'desktop_capture_screenshot',
        target: 'desktop',
        textResponse: 'Dạ em đang chụp lại màn hình desktop cho Sếp đây ạ.',
        payload: { screenIndex: 0 },
        executionDurationMs: Date.now() - startTime,
      };
    }

    // 4. LAUNCH APPS (0ms local dispatch)
    const appMatch = query.match(/^(?:mo|bat|khoi dong|chay)\s+(chrome|google chrome|notepad|calc|calculator|may tinh|vscode|vs code|excel|word|spotify)$/);
    if (appMatch) {
      const appKey = appMatch[1];
      const appMapping: Record<string, { name: string; exec: string }> = {
        'chrome': { name: 'Google Chrome', exec: 'chrome' },
        'google chrome': { name: 'Google Chrome', exec: 'chrome' },
        'notepad': { name: 'Notepad', exec: 'notepad' },
        'calc': { name: 'Calculator', exec: 'calc' },
        'calculator': { name: 'Calculator', exec: 'calc' },
        'may tinh': { name: 'Calculator', exec: 'calc' },
        'vscode': { name: 'Visual Studio Code', exec: 'code' },
        'vs code': { name: 'Visual Studio Code', exec: 'code' },
        'excel': { name: 'Microsoft Excel', exec: 'excel' },
        'word': { name: 'Microsoft Word', exec: 'winword' },
        'spotify': { name: 'Spotify', exec: 'spotify' },
      };

      const mapped = appMapping[appKey] || { name: appKey, exec: appKey };
      return {
        matched: true,
        intent: 'OPEN_APP',
        action: 'desktop_launch_app',
        target: mapped.exec,
        textResponse: `Dạ em đang mở ${mapped.name} cho Sếp ngay đây ạ.`,
        payload: { appName: mapped.exec },
        executionDurationMs: Date.now() - startTime,
      };
    }

    // Not a simple deterministic rule -> Hand over to Gemini LLM for deep reasoning
    return {
      matched: false,
      intent: 'NONE',
      executionDurationMs: Date.now() - startTime,
    };
  }
}

export const fastPathRouter = new FastPathRouter();
