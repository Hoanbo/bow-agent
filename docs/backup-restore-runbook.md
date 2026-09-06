# BOWCON V4.0 — Backup, Disaster Recovery & State Restore Runbook
**Tiêu chuẩn: ISO/IEC 23894:2023 & BSI IT-Grundschutz**

---

## 1. Mục Tiêu Khôi Phục (Recovery Objectives)

- **RPO (Recovery Point Objective)**: **< 1 Giờ** (Mức thất thoát dữ liệu tối đa chấp nhận được là 1 giờ tương tác gần nhất).
- **RTO (Recovery Time Objective)**: **< 15 Phút** (Thời gian phục hồi toàn bộ hệ thống từ bản sao lưu về trạng thái vận hành bình thường).

---

## 2. Danh Mục Dữ Liệu Cần Sao Lưu (State Inventory)

| Danh mục | Đường dẫn tập tin | Loại dữ liệu | Tần suất sao lưu |
|---|---|---|:---:|
| **Hồ sơ & Thói quen của Ngài** | `data/bossProfile.json` | Trí nhớ cá nhân, thói quen sinh hoạt, dự án | Mỗi 6 giờ + sau khi cập nhật |
| **Quy tắc & Lời dạy của Ngài** | `data/bossRules.json` | Các quy chuẩn xưng hô và quy tắc hành vi | Ngay sau khi học quy tắc mới |
| **Bản tin Sáng** | `data/morningDigest.json` | Tin công nghệ và số liệu kinh doanh hôm qua | Hàng ngày lúc 02:05 AM |
| **Sổ cái Kiểm toán Bất biến** | `data/audit_ledger.jsonl` | Chuỗi mã băm SHA-256 ghi nhận mọi hành động | Theo thời gian thực (Append-Only) |
| **Kho Kỹ Năng Động** | `data/dynamicSkills/*.json` | Mã nguồn kỹ năng tự tổng hợp của AI | Mỗi khi lưu kỹ năng mới |

---

## 3. Quy Trình Tạo Bản Sao Lưu (Backup Procedure)

### 3.1. Sao Lưu Thủ Công Qua Lệnh Hệ Thống
```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups\snapshot_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force

Copy-Item -Path "data\*" -Destination $backupDir -Recurse -Force
Write-Host "[BACKUP] Snapshot created at: $backupDir"
```

### 3.2. Mã Hóa Bản Sao Lưu
Bản sao lưu lưu trữ trên máy chủ hoặc cloud drive phải được mã hóa bằng AES-256-GCM với khóa bí mật do Ngài nắm giữ.

---

## 4. Quy Trình Khôi Phục Sau Thảm Họa (Disaster Recovery Drill)

1. **Bước 1: Dừng tiến trình Agent**:
   ```powershell
   Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
   ```
2. **Bước 2: Triển khai bản Snapshot mới nhất**:
   ```powershell
   $latestSnapshot = Get-ChildItem -Path "backups\snapshot_*" | Sort-Object CreationTime -Descending | Select-Object -First 1
   Copy-Item -Path "$($latestSnapshot.FullName)\*" -Destination "data\" -Recurse -Force
   Write-Host "[RESTORE] Restored from snapshot: $($latestSnapshot.FullName)"
   ```
3. **Bước 3: Kiểm tra Tính Toàn Vẹn Chuỗi Mật Mã (Hash-Chain Integrity)**:
   ```powershell
   npm run test:l4
   ```
   *Yêu cầu bắt buộc*: Assertions `Cryptographic hash-chain of audit log is intact` phải đạt PASS 100%.
4. **Bước 4: Khởi động lại BOWCON**:
   ```powershell
   npm start
   ```
5. **Bước 5: Xác nhận Sức Khỏe Hệ Thống**:
   Truy cập `http://127.0.0.1:4000/health` và xác nhận trạng thái `"status": "ok"`.

