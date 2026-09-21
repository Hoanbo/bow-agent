QUY TẮC CHO AGENT VIẾT/SỬA CODE - repo bow-agent

Bối cảnh: một agent trước từng bịa số liệu, tự gắn nhãn "VERIFIED"/"Grade A+"
không kèm output, và tự mở rộng phạm vi (được giao 1 lỗi nhỏ nhưng sửa 20 file
gồm cả TLS/bảo mật). Các quy tắc dưới đây chặn đúng các lỗi đó.

1. BẰNG CHỨNG THAY VÌ TÓM TẮT
   - Mọi con số và mọi khẳng định "pass/fail/hoạt động/hoàn tất" phải kèm lệnh
     thật đã chạy + output thô dán nguyên văn (không rút gọn, không "trích").
   - Với output dài: lưu ra file (Start-Transcript hoặc | Tee-Object), ghi trong
     báo cáo: đường dẫn file log, thời điểm chạy, exit code, SHA-256 của file log.
   - Bảng tổng hợp không phải bằng chứng. Không viết trước kết quả "dự kiến".

2. PHẠM VI
   - Trước khi code: liệt kê checklist từ yêu cầu và gửi cho người dùng.
   - Thấy việc khác đáng làm: dừng, ghi thành đề xuất riêng ở cuối báo cáo.
   - Không sửa khu vực nhạy cảm (bảo mật, xác thực, mã hóa, TLS, PDP, chính sách
     phê duyệt) nếu không được yêu cầu rõ ràng bằng tên file hoặc tên module.
   - Báo cáo cuối đối chiếu 1-1 với checklist ban đầu. Liệt kê chính xác
     danh sách file đã thay đổi (git diff --stat, dán nguyên văn).

3. TRẠNG THÁI TRƯỚC/SAU
   - Trước khi làm: chạy git status --short và ghi hash thư mục data/.
   - Sau khi làm/chạy test: chạy lại và dán cả hai kết quả.
   - Mọi thay đổi ngoài file code được giao (đặc biệt trong data/) phải nêu rõ.

4. CẤM NHÃN TỰ CHẤM ĐIỂM
   - Không dùng: "VERIFIED", "100%", "Grade A+", "hoàn hảo", banner ăn mừng.
   - Không tự xưng Auditor rồi chấm điểm việc mình vừa làm.
   - Không khẳng định "đạt chuẩn X" (ISO, OWASP...) nếu không có tài liệu đối
     chiếu từng điều khoản.

5. SỐ LIỆU TRÒN/ĐẸP LÀ CỜ ĐỎ
   - Số tròn, hoặc thời gian chính xác tới 2 chữ số thập phân mà không có log
     gốc: hỏi lại "tôi có đo bằng lệnh thật không?". Nếu là suy luận, không viết.

6. "CODE CHẠY ĐƯỢC" KHÁC "ĐÃ KIỂM CHỨNG THẬT"
   - Unit test tự viết tự chạy tự pass không chứng minh tính năng hoạt động thật.
   - Test dùng NODE_ENV=test, mock, stub hoặc hàm __testOnly_* phải ghi rõ:
     "không phải bằng chứng cho production".
   - Nhiệm vụ liên quan phần cứng/mạng thật (mic, loa, mở app, 2 máy): cần bằng
     chứng ở đúng cấp đó (process list trước/sau, buffer audio thật, log kết nối
     LAN thật). Không có thì ghi "chưa kiểm chứng ở cấp phần cứng".

7. ƯỚC LƯỢNG VÀ DỰ BÁO
   - Thời gian thực hiện, mức rủi ro, dự báo sự cố phải gắn nhãn "phỏng đoán"
     kèm cơ sở, hoặc bỏ đi. Không trình bày như sự thật.

8. KHI KHÔNG CHẮC, NÓI KHÔNG CHẮC
   - "Chưa kiểm chứng được" là câu được khuyến khích. Nhận nhầm mới là thất bại.

TỰ KIỂM TRA TRƯỚC KHI GỬI (agent tự tick chỉ là bước phụ; người dùng sẽ tự chạy
lại các lệnh chính để đối chiếu)
[ ] Mọi con số có lệnh + output thô (hoặc đường dẫn log + hash)?
[ ] Có làm ngoài checklist không? Đã tách thành đề xuất chưa?
[ ] Còn nhãn tự chấm điểm hoặc số quá đẹp nào không?
[ ] Có thay đổi ngoài file được giao (data/, config) chưa nêu?
[ ] Khẳng định nào dựa trên test/mock mà chưa ghi rõ?