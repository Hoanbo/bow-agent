# BOWCON V4.0 — GLOSSARY: ENGLISH ↔ VIETNAMESE
# Bảng Thuật Ngữ: Tiếng Anh ↔ Tiếng Việt

This glossary defines every key technical term used in the BOWCON V4.0 architecture.
Each term includes its English definition and a Vietnamese explanation.

Bảng thuật ngữ này định nghĩa mọi thuật ngữ kỹ thuật quan trọng được sử dụng trong kiến trúc BOWCON V4.0.
Mỗi thuật ngữ bao gồm định nghĩa tiếng Anh và giải thích tiếng Việt.

---

## Core Terms / Thuật Ngữ Cốt Lõi

| English Term | Vietnamese | Definition / Định nghĩa |
|---|---|---|
| **Agent** | Tác nhân AI | A software system that perceives its environment, makes decisions, and takes actions to achieve goals. / Hệ thống phần mềm nhận thức môi trường, ra quyết định, và thực hiện hành động để đạt mục tiêu. |
| **AgentLoop** | Vòng lặp tác nhân | The central 7-stage lifecycle that processes every user request in BOWCON V4.0. / Chu trình 7 giai đoạn trung tâm xử lý mọi yêu cầu người dùng trong BOWCON V4.0. |
| **Context** | Ngữ cảnh | Information from previous turns that helps the agent understand the current request. / Thông tin từ các lượt trước giúp agent hiểu yêu cầu hiện tại. |
| **Conversation Context** | Ngữ cảnh hội thoại | The structured, session-scoped memory of recent conversation turns, topics, and references. / Bộ nhớ có cấu trúc, phạm vi theo session, của các lượt hội thoại gần đây, chủ đề, và tham chiếu. |
| **Working Memory** | Bộ nhớ làm việc | Short-term, in-process memory for the current session. Lost when the process restarts. / Bộ nhớ ngắn hạn trong process cho session hiện tại. Mất khi process khởi động lại. |
| **Durable Memory** | Bộ nhớ bền vững | Long-term memory persisted to disk (JSON files). Survives process restarts. / Bộ nhớ dài hạn được lưu trữ trên đĩa (file JSON). Tồn tại qua các lần khởi động lại. |
| **Persistence** | Tính lưu trữ bền vững | The ability of data to survive process restarts and system crashes. / Khả năng dữ liệu tồn tại qua các lần khởi động lại process và sự cố hệ thống. |
| **Isolation** | Tính cô lập | The guarantee that one user/session cannot read or affect another's data. / Đảm bảo rằng một người dùng/session không thể đọc hoặc ảnh hưởng đến dữ liệu của người khác. |
| **Multi-Tenant** | Đa người thuê / Đa người dùng | Architecture that serves multiple isolated users within a single system instance. / Kiến trúc phục vụ nhiều người dùng cô lập trong một phiên bản hệ thống. |
| **Idempotency** | Tính bất biến khi lặp lại | The property that executing the same operation multiple times produces the same result as executing it once. / Tính chất mà việc thực hiện cùng một thao tác nhiều lần tạo ra kết quả giống như thực hiện một lần. |
| **Race Condition** | Điều kiện tranh chấp | A bug where the outcome depends on the unpredictable timing of concurrent operations. / Lỗi mà kết quả phụ thuộc vào thời điểm không thể đoán trước của các thao tác đồng thời. |
| **Reservation** | Đặt trước (khóa tài nguyên) | Locking an idempotency slot as IN_PROGRESS to prevent concurrent duplicate execution. / Khóa một slot idempotency ở trạng thái IN_PROGRESS để ngăn thực thi trùng lặp đồng thời. |
| **Token** | Token (mã thông báo) | A cryptographically generated, single-use authorization credential. / Thông tin xác thực được tạo bằng mật mã, sử dụng một lần. |
| **Approval** | Phê duyệt | The human authorization act required before a HIGH_IMPACT action can execute. / Hành động ủy quyền của con người cần thiết trước khi một hành động HIGH_IMPACT có thể thực thi. |
| **Governance** | Quản trị và kiểm soát | The system of rules, policies, and checkpoints that control agent behavior. / Hệ thống các quy tắc, chính sách và điểm kiểm tra kiểm soát hành vi của agent. |
| **PDP** | Điểm quyết định chính sách | PolicyDecisionPoint — the mandatory gate before every tool execution. / PolicyDecisionPoint — cổng bắt buộc trước mỗi lần thực thi công cụ. |
| **Policy** | Chính sách | A rule that determines whether an action is permitted, and under what conditions. / Một quy tắc xác định xem một hành động có được phép không và trong điều kiện nào. |
| **Provider** | Nhà cung cấp / Bộ triển khai dịch vụ | An interchangeable implementation of a service interface (e.g., a TTS Provider). / Một triển khai có thể thay thế của một giao diện dịch vụ (ví dụ: TTS Provider). |
| **TTS** | Chuyển văn bản thành giọng nói | Text-to-Speech — converts text into spoken audio. / Text-to-Speech — chuyển đổi văn bản thành âm thanh giọng nói. |
| **Prosody** | Ngữ điệu và nhịp nói | The rhythm, stress, and intonation patterns of spoken language. / Nhịp điệu, nhấn âm và mẫu ngữ điệu của ngôn ngữ nói. |
| **Streaming** | Truyền trực tiếp (phát trực tiếp) | Delivering data incrementally as it is generated, rather than waiting for the full result. / Cung cấp dữ liệu tăng dần khi nó được tạo ra, thay vì đợi kết quả đầy đủ. |
| **Fallback** | Cơ chế chuyển sang phương án dự phòng | Automatically switching to an alternative when the primary option fails. / Tự động chuyển sang phương án thay thế khi phương án chính gặp sự cố. |
| **Fail-Closed** | Từ chối an toàn khi có lỗi | Denying an operation when an error occurs, rather than allowing it through. Safer default. / Từ chối một thao tác khi xảy ra lỗi, thay vì cho phép nó tiếp tục. Mặc định an toàn hơn. |
| **Sandbox** | Môi trường cô lập thực thi | An isolated execution environment that restricts what code can do. / Môi trường thực thi cô lập hạn chế những gì code có thể làm. |
| **Path Traversal** | Tấn công duyệt đường dẫn | An attack that uses `../` sequences to escape a restricted directory. / Tấn công sử dụng chuỗi `../` để thoát khỏi thư mục bị hạn chế. |
| **Prototype Pollution** | Ô nhiễm prototype | A JavaScript attack where `__proto__` or `constructor` keys modify shared object behavior. / Tấn công JavaScript nơi các khóa `__proto__` hoặc `constructor` sửa đổi hành vi đối tượng dùng chung. |
| **Secret Scrubbing** | Xóa bí mật khỏi log | Automatically removing API keys, tokens, and passwords from error messages and logs. / Tự động xóa API keys, token, và mật khẩu khỏi thông báo lỗi và log. |
| **Immutability** | Tính bất biến | A guarantee that a value or object cannot be changed after it is created. / Đảm bảo rằng một giá trị hoặc đối tượng không thể thay đổi sau khi được tạo. |
| **State Commit** | Cam kết trạng thái | Writing a confirmed result to persistent storage only after successful verification. / Ghi một kết quả đã được xác nhận vào lưu trữ bền vững chỉ sau khi xác minh thành công. |
| **Capability Negotiation** | Đàm phán năng lực | The process of checking what a provider supports before making a request. / Quá trình kiểm tra những gì một provider hỗ trợ trước khi thực hiện yêu cầu. |
| **Audio Assembly** | Lắp ráp âm thanh | Combining multiple audio chunks from sentence-level synthesis into one final audio buffer. / Kết hợp nhiều đoạn âm thanh từ tổng hợp cấp câu thành một buffer âm thanh cuối cùng. |
| **Speech Normalization** | Chuẩn hóa văn bản cho giọng nói | Transforming written text (with markdown, symbols, numbers) into natural spoken form. / Chuyển đổi văn bản viết (với markdown, ký hiệu, số) thành dạng nói tự nhiên. |
| **Atomic Write** | Ghi nguyên tử | Writing to a temp file then renaming, so the file is either fully written or unchanged. / Ghi vào file tạm rồi đổi tên, để file hoặc được ghi đầy đủ hoặc không thay đổi. |
| **Quarantine** | Cách ly | Moving a corrupted file aside for forensic inspection without deleting it. / Di chuyển một file bị hỏng sang một chỗ để kiểm tra pháp y mà không xóa nó. |
| **Partition** | Phân vùng | A logically isolated storage unit for a specific user's data. / Đơn vị lưu trữ được cô lập về mặt logic cho dữ liệu của một người dùng cụ thể. |
| **REAL** | Thực | Component operates with genuine external APIs, hardware, or OS primitives. / Thành phần hoạt động với API bên ngoài thực sự, phần cứng hoặc nguyên hàm OS. |
| **PARTIAL** | Một phần | Real architecture but uses in-memory stubs or unisolated aspects. / Kiến trúc thực nhưng sử dụng stub trong bộ nhớ hoặc các khía cạnh chưa được cô lập. |
| **MOCK** | Giả lập | Simulated implementation without real external invocation. / Triển khai mô phỏng không có lời gọi bên ngoài thực sự. |
