// src/embodied/oledEmpathyEngine.ts
// BOW CON V4.0 — ADAPTIVE OLED EMPATHY & MICRO-EXPRESSION ENGINE
export class OledEmpathyEngine {
    currentExpression = {
        emotion: 'happy',
        intensity: 'normal',
        blinkRatePerMinute: 18,
        reason: 'Trạng thái chào đón mặc định',
    };
    /**
     * Tự động tính toán biểu cảm mắt phù hợp theo ngữ cảnh cuộc trò chuyện
     */
    deduceExpressionFromContext(userText, agentReply, isBossChannel = true) {
        const lowerUser = userText.toLowerCase();
        const lowerReply = agentReply.toLowerCase();
        // 1. Khi Sếp mệt mỏi hoặc nhắc sức khỏe -> Biểu cảm lo lắng, dịu dàng
        if (lowerUser.includes('mệt') || lowerUser.includes('đau lưng') || lowerUser.includes('nghỉ') || lowerReply.includes('đứng dậy')) {
            this.currentExpression = {
                emotion: 'thinking',
                intensity: 'subtle',
                blinkRatePerMinute: 12,
                reason: 'Lo lắng và nhắc nhở Sếp bảo vệ sức khỏe',
            };
            return this.currentExpression;
        }
        // 2. Khi Sếp khen ngợi hoặc chào buổi sáng -> Biểu cảm hào hứng, vui vẻ
        if (lowerUser.includes('chào') || lowerUser.includes('giỏi') || lowerUser.includes('tốt') || lowerReply.includes('buổi sáng')) {
            this.currentExpression = {
                emotion: 'happy',
                intensity: 'vibrant',
                blinkRatePerMinute: 24,
                reason: 'Hào hứng và vui mừng khi gặp Sếp',
            };
            return this.currentExpression;
        }
        // 3. Khi đang suy luận, viết code hoặc xử lý nghiệp vụ phức tạp -> Biểu cảm suy nghĩ
        if (lowerUser.includes('viết code') || lowerUser.includes('tính') || lowerUser.includes('lập trình') || lowerUser.includes('phân tích')) {
            this.currentExpression = {
                emotion: 'thinking',
                intensity: 'normal',
                blinkRatePerMinute: 10,
                reason: 'Tập trung tính toán và lập trình',
            };
            return this.currentExpression;
        }
        // 4. Mặc định: Lắng nghe thân thiện
        this.currentExpression = {
            emotion: 'listening',
            intensity: 'normal',
            blinkRatePerMinute: 18,
            reason: 'Lắng nghe tương tác với Sếp',
        };
        return this.currentExpression;
    }
    getCurrentExpression() {
        return this.currentExpression;
    }
}
// Global Singleton Instance
export const globalOledEmpathy = new OledEmpathyEngine();
