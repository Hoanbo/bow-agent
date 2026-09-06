# BOWCON V4.0 — Hardware Emergency Stop (E-Stop) Independent Evidence Record
**Tiêu chuẩn: IEC 62061 (Safety of machinery) & ISO 13849-1 (Safety-related parts of control systems — Category 3 / PL d)**

---

## 1. Tuyên Bố Về Tính Độc Lập Phần Cứng (Hardware Independence Assertion)

Cấp độ Tự chủ 4.0 đối với hệ thống vật lý (Embodied AI) đòi hỏi cơ chế Dừng Khẩn Cấp (**Emergency Stop**) phải:
1. **Độc lập hoàn toàn với tầng phần mềm AI (Node.js agent, LLM, Python)**.
2. **Độc lập hoàn toàn với vi điều khiển (ESP32-S3 Firmware, FreeRTOS)**.
3. **Hoạt động theo nguyên lý ngắt vật lý trực tiếp (Hardwired De-energize)**: Khi nút E-Stop bị tác động, nguồn điện nuôi cơ cấu chấp hành (Servo SG90/MG996R, động cơ bước) bị cắt đứt tức thì bằng rơ-le hoặc MOSFET công suất, không phụ thuộc vào bất kỳ tín hiệu số nào.

---

## 2. Sơ Đồ Thiết Kế Mạch Phần Cứng (Hardwired Schematic Architecture)

```text
[ NGUỒN PIN Li-ion / DC 7.4V - 12V ]
               │
               ▼
   ┌───────────────────────┐
   │  NÚT E-STOP VẬT LÝ     │  <--- Nút nấm màu đỏ (Normally Closed - NC)
   │  (Hardwired Switch)   │       Nhấn vào sẽ mở mạch cơ học vĩnh viễn
   └───────────┬───────────┘
               │ (Đường cấp nguồn chính)
               ▼
   ┌───────────────────────┐
   │  RƠ-LE / P-MOSFET     │  <--- Chốt ngắt nguồn công suất (Power Interlock)
   │  (Fail-Safe Circuit)  │
   └───────────┬───────────┘
               ├────────────────────────────────────────┐
               │ (Nguồn công suất Servo)                 │ (Cách ly quang Optocoupler)
               ▼                                        ▼
   ┌───────────────────────┐                ┌───────────────────────┐
   │  ĐỘNG CƠ / SERVO      │                │  ESP32-S3 GPIO SENSE  │
   │  Pan/Tilt Actuators   │                │  (Chỉ đọc trạng thái) │
   │  [MẤT ĐIỆN HOÀN TOÀN] │                │  Gửi Telemetry báo AI │
   └───────────────────────┘                └───────────────────────┘
```

---

## 3. Đặc Tính Kỹ Thuật An Toàn (Safety Specifications)

1. **Tiếp điểm Thường Đóng (Normally Closed - NC)**:
   - Nếu dây nối nút E-Stop bị đứt hoặc tuột mối hàn, hệ thống sẽ tự động rơi vào trạng thái ngắt nguồn an toàn (*Fail-Safe by Default*).
2. **Thời gian ngắt cơ học (Mechanical Cutoff Time)**:
   - `< 15 mili-giây` kể từ khi tiếp điểm cơ học mở ra.
3. **Miễn nhiễm với Software Freeze / LLM Runaway**:
   - Ngay cả khi vi điều khiển ESP32 bị treo (watchdog loop), FreeRTOS gặp kernel panic, hoặc LLM gửi tín hiệu xoay servo liên tục: **Động cơ vẫn không thể chuyển động vì nguồn điện 5V/12V cấp cho motor đã bị cắt hoàn toàn ở tầng vật lý.**
4. **Phản hồi trạng thái (Telemetry Feedback)**:
   - Một mạch cách ly quang (Optocoupler) nối song song với đường nguồn sau E-Stop truyền tín hiệu logic về chân `GPIO 4` của ESP32-S3 để robot biết nguồn servo đã bị cắt và thông báo lên tầng Node.js Agent: `RobotSafetyController.triggerEmergencyStop('HARDWARE_ESTOP_PIN_LOW')`.
5. **Cơ chế Mở lại (Reset Procedure)**:
   - Nút E-Stop cơ học có cơ cấu xoay để nhả (*Twist-to-Release*).
   - Sau khi nhả nút vật lý, kỹ sư / Ngài phải gửi lệnh xác nhận trên phần mềm để đóng lại mạch điều khiển:
     ```typescript
     globalRobotSafety.resetEmergencyStop();
     ```

---

## 4. Biên Bản Thử Nghiệm Thực Tế (Empirical Test Evidence)

- **Trạng thái kiểm nghiệm thực địa**: **PENDING PHYSICAL BENCH TEST WITNESS** (Đang chờ nghiệm thu thực địa với thiết bị đo dao động ký độc lập).
- **Quy trình thử nghiệm dự kiến (Test Protocol)**:
  1. **Bài kiểm tra 1 (Host Crash Scenario)**: Tắt đột ngột tiến trình Node.js khi servo đang quay -> Đo thời gian ngắt nguồn servo cơ học bằng máy hiện sóng (< 15ms target).
  2. **Bài kiểm tra 2 (Microcontroller Hang Scenario)**: Gây xung đột bộ nhớ hoặc kẹt WDT trên vi điều khiển ESP32 -> Xác nhận nút E-Stop cơ học cắt nguồn hoàn toàn.
  3. **Bài kiểm tra 3 (Over-temperature Thermal Cutoff)**: Khi cảm biến NTC trên pack pin báo nhiệt độ > 60°C -> Rơ-le bảo vệ nhiệt độ ngắt mạch đồng thời phát tín hiệu cảnh báo buzzer.

*Lưu ý: Mọi kết quả đo lường và chứng nhận L4 chính thức sẽ chỉ được công nhận sau khi có biên bản đo đạc thực tế có xác nhận độc lập.*

