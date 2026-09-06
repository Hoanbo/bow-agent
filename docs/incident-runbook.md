# BOWCON V4.0 — Incident Response & Emergency Runbook
**Tiêu chuẩn: ISO/IEC 23894:2023 & NIST AI RMF Playbook**

---

## 1. Phân Loại Mức Độ Sự Cố (Severity Levels)

| Mức Độ | Tên Gọi | Tiêu Chí Nhận Diện | Thời Gian Phản Ứng (MTTA) | Thời Gian Khắc Phục (MTTR) |
|:---:|---|---|:---:|:---:|
| **SEV-1** | **Thảm Họa / Cực Kỳ Nghiêm Trọng** | Robot mất kiểm soát vật lý, nhiệt độ pin > 60°C không tự ngắt, rò rỉ dữ liệu tài chính của Shop, tấn công xâm nhập hệ thống host. | Lập tức (< 30 giây) | < 15 phút |
| **SEV-2** | **Nghiêm Trọng** | Cloud Gemini sập đồng thời Local SLM lỗi; Webhook giả mạo liên tục; Sổ cái kiểm toán Audit Ledger bị sai lệch mã băm. | < 2 phút | < 1 giờ |
| **SEV-3** | **Trung Bình** | Mất tín hiệu nhận diện giọng nói (STT/TTS timeout); Màn hình phụ nhận diện sai cửa sổ chat; Kỹ năng động bị cách ly. | < 15 phút | < 4 giờ |
| **SEV-4** | **Nhẹ** | Sai lệch nhỏ trong định dạng bản tin sáng; Độ trễ Fast-Path tăng nhẹ (> 50ms). | < 1 giờ | < 24 giờ |

---

## 2. Quy Trình Kích Hoạt Khóa Ngắt Khẩn Cấp (Kill-Switch Procedures)

### 2.1. Dừng Khẩn Cấp Phần Cứng Robot (Hardware E-Stop)
1. **Thao tác thủ công**: Nhấn nút E-Stop cơ học màu đỏ trên lưng/đế Robot.
2. **Tác động vật lý**: Ngắt tiếp điểm rơ-le / MOSFET phần cứng, cắt toàn bộ nguồn 5V/12V cấp cho Servo xoay và động cơ ngay lập tức. Độc lập 100% với vi điều khiển ESP32 và phần mềm Node.js.
3. **Thao tác phần mềm dự phòng**:
   ```typescript
   import { globalRobotSafety } from './src/embodied/robotSafetyController.js';
   globalRobotSafety.triggerEmergencyStop('MANUAL_OPERATOR_ABORT');
   ```

### 2.2. Kích Hoạt Global Kill Switch (Toàn Hệ Thống)
Khi phát hiện hành vi bất thường của mô hình AI hoặc nghi ngờ bị tấn công Prompt Injection diện rộng:
```typescript
import { globalPDP } from './src/core/policyDecisionPoint.js';
// Khóa toàn bộ các hành động gây biến đổi trạng thái (chỉ cho phép OBSERVE)
globalPDP.setGlobalKillSwitch(true);
```
- **Tác động**: Mọi hành động `REVERSIBLE` và `HIGH_IMPACT` trên tất cả các domain (`shop`, `desktop`, `robot`, `dynamic_code`) lập tức bị từ chối với lý do `EMERGENCY_STOP_ACTIVE`.

### 2.3. Kích Hoạt Domain Kill Switch (Từng Miền Riêng Biệt)
- **Khi bảo trì Shop of BOW**: `globalPDP.setDomainKillSwitch('shop', true);`
- **Khi bảo trì Desktop Remote Control**: `globalPDP.setDomainKillSwitch('desktop', true);`
- **Khi bảo trì Robot Phần Cứng**: `globalPDP.setDomainKillSwitch('robot', true);`
- **Khi tắt Kỹ Năng Động**: `globalPDP.setDomainKillSwitch('dynamic_code', true);`

---

## 3. Quy Trình Khôi Phục Hệ Thống (Recovery Protocol)

1. **Bước 1: Cách ly & Kiểm tra**: Xác định nguyên nhân gốc (Root Cause) qua nhật ký Append-only Audit Ledger:
   ```typescript
   const auditTrail = globalPDP.getAuditTrail();
   const isIntact = globalPDP.verifyAuditLedgerIntegrity();
   ```
2. **Bước 2: Sửa lỗi & Khắc phục**: Nếu phần cứng quá nhiệt, đợi nhiệt độ pin hạ xuống dưới 40°C. Nếu do lỗi mạng, kiểm tra fallback engine.
3. **Bước 3: Mở khóa có thẩm quyền**: Chỉ Ngài (Boss Hoàn Bo) mới có quyền mở lại hệ thống:
   ```typescript
   globalRobotSafety.resetEmergencyStop();
   globalPDP.setGlobalKillSwitch(false);
   ```
4. **Bước 4: Lập Báo Cáo Sự Cố (Post-Mortem)**: Ghi lại mốc thời gian, nguyên nhân, biện pháp khắc phục vào tài liệu lưu trữ.

