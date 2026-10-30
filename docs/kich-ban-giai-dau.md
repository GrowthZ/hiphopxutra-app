# Kịch bản chạy giải: thao tác admin và các sự cố cần lưu ý

HIPHOP XỨ TRÀ 2026. Dùng cho **buổi tập dượt** (trên dữ liệu dev, xem [dev-database.md](dev-database.md)) và cho
**ngày thi**. Mỗi phần ghi rõ giai đoạn `seed` tương ứng, để tập lại riêng phần đó:
`bun run db seed <giai-đoạn> --dev`.

## 0. Người và máy

| Vị trí | Thiết bị | Mở | Đăng nhập |
|---|---|---|---|
| Admin điều hành (Prelim, Battle) | Laptop, sạc cắm sẵn | `/admin/prelim`, `/admin/battle` | Google hoặc tài khoản BTC (Quản trị) |
| Admin LED (có thể là máy trên) | Laptop | `/admin/led` | Như trên |
| Máy LED | PC nối HDMI | `/led` (vòm bậc thang: `/led?khung=vom`), bấm 1 lần để toàn màn hình | Không (tự đăng nhập ẩn danh) |
| Màn chiếu phụ / TV | PC hoặc TV box | `/ket-qua/trinh-chieu` (TV) hoặc `/ket-qua/trinh-chieu-led` | Không |
| Bàn check-in (1–2 bàn) | Laptop / tablet | `/admin/check-in` | Tài khoản BTC vai trò **Check-in** |
| 9 giám khảo | Điện thoại riêng, sạc đầy | `/giam-khao` (cài thành app: "Thêm vào màn hình chính") | Mã GK + PIN 6 số |
| Khán giả | Điện thoại | Quét QR → `/ket-qua/prelim` | Không |

Link rút gọn để gửi các bộ phận (tự chuyển sang trang đầy đủ): `/gk` giám khảo, `/checkin` bàn check-in,
`/mc` và `/xem` theo dõi Prelim, `/bxh` bảng xếp hạng, `/nhanh` nhánh đấu, `/tv` màn chiếu phụ, `/led` máy LED.

Bảng chấm Prelim: GK 01–04 là **bảng A** (mặc định SBD lẻ), GK 05–08 là **bảng B** (SBD chẵn). GK 09 chỉ chấm Battle.
Mỗi thí sinh do 4 GK của bảng mình chấm, tổng tối đa 400.

## 1. Trước ngày thi (T-3 đến T-1)

- [ ] `bun run test:e2e` qua hết; đã push `main` (Vercel deploy xong) và `bun run deploy:rules`.
- [ ] `bun run db admin:list` đủ người điều hành. Tạo tài khoản bàn check-in ở `/admin/cai-dat/nguoi-dung`.
- [ ] 9 GK có PIN (`/admin/cai-dat/giam-khao`), đã đăng nhập thử **trên đúng điện thoại sẽ dùng**.
- [ ] Nhập danh sách thí sinh: `bun run db dancer:import thi-sinh.tsv`, kiểm tra `bun run db dancer:list`.
- [ ] Tải ảnh thí sinh (`/admin/thi-sinh`) và ảnh/tên giám khảo (**Cấu hình 2 ảnh (9 GK)**).
- [ ] **Tập dượt toàn bộ trên dữ liệu dev** (mục 7), có cả tình huống rút cáp mạng.
- [ ] Hỏi bên LED sơ đồ module thật; chỉnh tham số `cot`, `module` của `/led?khung=vom` (HUONG-DAN-CHAY.md mục 0c).
- [ ] `bun run db backup` rồi cất file sao lưu ra ngoài máy.

## 2. Sáng ngày thi: mở máy (60 phút trước giờ check-in)

1. Laptop admin mở `/admin`. **Không thấy dải hồng "DỮ LIỆU DEV"** (đang ở giải thật). Kiểm tra số thí sinh đúng.
2. Máy LED mở `/led`, bấm vào màn hình để toàn màn hình. Trên `/admin/led` phải thấy **"LED đang online"**.
   Chọn cảnh **Màn chờ (logo)**, chế độ **Ban ngày** (sân sáng) hoặc **Ban đêm**.
3. 9 GK mở app, đăng nhập. `/admin/cai-dat/giam-khao` thấy đủ 9 **Online**.
4. Bật **chống khoá màn hình** trên điện thoại GK (hoặc cắm sạc), tắt chế độ tiết kiệm pin.
5. `bun run db backup`.

## 3. Check-in (seed: `dang-ky`)

Bàn check-in mở `/admin/check-in`:

1. Tìm thí sinh theo tên, tên thật, SBD hoặc lọc theo CLB → bấm check-in. App cấp **SBD** (`N001…` Newbie,
   `P001…` Pro) theo thứ tự đến và **bảng chấm** A/B theo SBD chẵn/lẻ. Ghi SBD lên số đeo.
2. Thí sinh chưa có trong danh sách: **Đăng ký thí sinh tại chỗ** (tên thi đấu bắt buộc), rồi check-in.
3. Đến lại lần 2: giữ nguyên SBD cũ. Bấm nhầm: hoàn tác check-in (SBD vẫn được giữ cho lần sau).
4. Hai bàn check-in cùng lúc không bị trùng SBD (bộ đếm chung).

Lưu ý: **chỉ người đã check-in mới chấm được** (rules chặn điểm cho người chưa có SBD).

## 4. Prelim (seed: `check-in`, rồi `prelim`)

1. Admin mở `/admin/prelim` (**Bàn chấm Prelim (8 GK)**). Kiểm tra phân bảng: 8 GK đã gán A/B đúng,
   **Bảng A chấm: SBD lẻ**. Đổi phân bảng chỉ làm **trước khi** check-in người đầu tiên.
2. LED: `/admin/led` → cảnh **Bảng xếp hạng Prelim**, chọn hạng mục đang thi. Màn TV: `/ket-qua/trinh-chieu`.
3. MC gọi thí sinh theo SBD. Giám khảo tự lướt **Thí sinh tiếp theo** trên máy, nhập điểm 0–100, gửi.
   Chờ chữ "Đã chấm" (đã lưu trên server) chứ không chỉ "Đang gửi…".
4. Admin theo dõi cột điểm từng GK: ô trống = GK đó chưa chấm → nhắc qua bộ đàm.
   Sửa điểm sai: bấm vào ô điểm → bàn phím số → nhập lại (ghi lại vào sổ: ai yêu cầu, lúc nào).
5. Điểm của một thí sinh chỉ hiện cho khán giả **khi đủ 4 GK** của bảng đã chấm.
6. Hết mỗi hạng mục: `bun run db backup`.

## 5. Chốt Top 32 (seed: `chot-top32`)

1. Kiểm tra khung **Quy trình chốt danh sách**: đủ phiếu 2 bảng, 100% phiếu hợp lệ.
2. Nếu báo **Đồng điểm tại ngưỡng hạng 32 & 33**: bấm **Mở tie-break cho N thí sinh**. Cả 8 GK chấm thêm 1 lượt
   cho các thí sinh này (tối đa 800). Tie-break chỉ xếp thứ tự giữa những người đồng điểm, không đổi điểm Prelim.
3. Bấm **Chốt Top 32 & Chuyển Vòng** (có hỏi xác nhận). Sau khi chốt, GK không sửa điểm Prelim được nữa.
   - **Newbie**: tạo luôn 16 trận Top 32 (hạng 1 gặp 32, 2 gặp 31…).
   - **Pro**: bốc thăm ngẫu nhiên 32 người thành **16 đội** và tạo 8 trận Top 16.
4. Pro: `/admin/boc-tham` để xem 16 đội, tải ảnh đội. **Bốc Thăm Lại Ngẫu Nhiên** chỉ dùng **trước khi trận đầu
   tiên bắt đầu** (bốc lại xoá toàn bộ phiếu của các trận Pro).
5. `bun run db backup`. LED về **Màn chờ** trong lúc nghỉ.

## 6. Battle (seed: `battle`)

Mỗi trận gồm 2 round; 9 GK bỏ phiếu ĐỎ / XANH cho từng round.

1. `/admin/nhanh-dau` → chọn trận → **Điều Hành Trận** (hoặc **Hiện lên Màn LED Sân Khấu**).
   Trận được chọn là trận GK thấy trên máy và LED hiện. `/admin/led` → cảnh **Trận Battle**.
2. Bấm hiệu ứng **ra sân** (2 bên chạy vào trên LED). MC giới thiệu.
3. Round 1 nhảy xong → GK bỏ phiếu round 1. Admin thấy ô xanh lá ✓ (đã phiếu, chưa lộ màu).
   Bấm **Chuyển Sang Round Tiếp Theo**.
4. Round 2 xong → GK bỏ phiếu round 2. Khi hiện **CẢ 2 ROUND ĐÃ ĐỦ 9/9 PHIẾU BẦU · SẴN SÀNG CÔNG BỐ**:
   bấm **ADMIN CÔNG BỐ KẾT QUẢ CẢ 2 ROUNDS LÊN MÀN LED** → LED lật phiếu, báo RED WIN / BLUE WIN.
5. Hoà 1–1: app tự thêm **Hiệp phụ Tie-Break**. Nhảy thêm 1 lượt, GK bỏ phiếu, bấm
   **ADMIN CÔNG BỐ KẾT QUẢ TIE-BREAK LÊN MÀN LED**.
6. Trường hợp đặc biệt (GK vắng, máy hỏng, BTC quyết): **CHỌN THẮNG → ĐỎ THẮNG / XANH THẮNG**.
   Chiếu lại hiệu ứng chiến thắng: **Kích hoạt lại hoạt ảnh chiến thắng**. Làm lại trận từ đầu: **Đặt lại trận đấu về 0-0**
   (xoá phiếu của trận).
7. Chọn trận kế tiếp. Sau mỗi vòng: `bun run db backup`.

> ⚠️ **Vòng sau Top 32 (Newbie) / Top 16 (Pro) chưa được app tạo tự động** — xem sự cố B1 ở mục 8.

## 7. Kịch bản tập dượt trên dữ liệu dev (khoảng 2 giờ)

Chuẩn bị: `bun run dev:devdb` trên laptop admin; điện thoại và máy LED mở `http://<IP-laptop>:3000/...` cùng Wi-Fi
(hoặc chạy bản Vercel Preview có đặt `VITE_EVENT_ID`). Mọi màn hình phải hiện dải hồng **DỮ LIỆU DEV**.

| # | Giai đoạn seed | Bài tập | Đạt khi |
|---|---|---|---|
| 1 | `dang-ky` | 2 bàn check-in cùng lúc 10 người; 1 người đăng ký tại chỗ; 1 người check-in nhầm rồi hoàn tác | SBD liên tục, không trùng; bảng A/B đúng chẵn/lẻ |
| 2 | `check-in` | 8 GK chấm 10 thí sinh đầu, mỗi bảng 5; LED chiếu BXH | Điểm hiện trên BXH khách sau khi đủ 4 GK, ≤ 2 giây |
| 3 | `prelim` | Tìm 4 thí sinh đang thiếu điểm, nhắc GK; admin sửa 1 điểm sai | Admin nhận ra ô trống trong 1 phút |
| 4 | `prelim` | **Rút Wi-Fi** 1 điện thoại GK, chấm 2 người, cắm lại | Điểm tự gửi khi có mạng, hiện "Đã chấm" |
| 5 | `chot-top32` | Mở tie-break, 8 GK chấm, chốt Top 32 cả 2 hạng mục | Nhánh Newbie 16 trận, Pro 16 đội / 8 trận |
| 6 | `battle` | Chạy trọn 3 trận: 1 trận 2–0, 1 trận 1–1 có hiệp phụ, 1 trận chọn thắng thủ công | LED lật phiếu đúng 1 lần mỗi lần bấm |
| 7 | `battle` | **Rút HDMI / tắt máy LED** giữa trận, bật lại | LED tự về đúng cảnh, không phát lại hiệu ứng cũ |
| 8 | `battle` | GK đăng nhập mã của mình trên máy thứ 2 | Máy cũ bị đăng xuất |
| 9 | bất kỳ | Bấm **Blackout** giữa chừng, rồi **Bật lại LED** | 1 lần bấm có hiệu lực ngay |
| 10 | bất kỳ | `bun run db backup --dev`, phá dữ liệu, `restore --dev` | Quay về đúng trạng thái |

Sau buổi tập: không cần dọn dữ liệu dev. Ghi lại mọi chỗ vướng vào mục 8.

## 8. Sự cố có thể xảy ra và cách xử lý

### A. Mạng, thiết bị

| # | Dấu hiệu | Xử lý |
|---|---|---|
| A1 | Banner đỏ **"Lỗi đồng bộ dữ liệu"** trên máy admin | Kiểm tra mạng. Thao tác vẫn lưu tạm trên máy (kể cả khi tải lại trang) và tự gửi khi có mạng; **đừng đổi sang máy khác** khi máy này còn thao tác chưa gửi. Chuẩn bị 4G dự phòng (phát từ điện thoại) cho laptop admin và máy LED |
| A2 | GK báo "Đang gửi…" mãi | Mạng điện thoại yếu: đổi Wi-Fi ↔ 4G. Điểm/phiếu được giữ và gửi lại. Nếu quá lâu, admin nhập hộ điểm ở `/admin/prelim` (ghi sổ) |
| A3 | GK bị đăng xuất giữa chừng | Mã GK đó vừa đăng nhập ở máy khác, hoặc vừa đổi PIN. Đăng nhập lại; đừng cho mượn mã GK |
| A4 | GK nhập sai PIN 5 lần | Khoá 1 phút trên máy đó. Admin xem PIN ở `/admin/cai-dat/giam-khao` (bấm 👁) |
| A5 | Điện thoại GK hết pin / hỏng | Dùng máy dự phòng, đăng nhập cùng mã GK (máy cũ tự đăng xuất). Phiếu đã gửi không mất |
| A6 | `/admin/led` báo **LED offline** | Máy LED mở lại `/led`; bật Anonymous trong Firebase nếu `/led` báo lỗi 400 |
| A7 | LED hiện sai / đứng hình giữa lúc quan trọng | Bấm **Blackout** (LED về logo ngay), xử lý, rồi **Bật lại LED** |
| A8 | Máy LED hiện thanh trình duyệt, con trỏ chuột | Bấm vào màn hình để vào toàn màn hình; F11 nếu cần |
| A9 | Trang khách / LED không có điểm, không có phiếu | Phải có **ít nhất 1 máy admin đang mở** `/admin/...` (máy admin xuất bản bản công khai). Giữ laptop admin luôn mở, không cho ngủ |

### B. Nghiệp vụ

| # | Dấu hiệu | Xử lý |
|---|---|---|
| B1 | **Hết vòng đầu battle, không có trận vòng sau** | App hiện chỉ tạo Top 32 Newbie và Top 16 Pro, mỗi trận cố định 2 round (+ hiệp phụ). Cần **bổ sung tính năng tạo trận vòng sau trước ngày thi**; nếu chưa kịp thì BTC ghi kết quả vòng sau trên giấy / Google Sheet và chỉ dùng LED cho cảnh Màn chờ |
| B2 | GK báo không gửi được điểm (`permission-denied`) | Thí sinh chưa check-in, thí sinh không thuộc bảng của GK đó, hoặc đã chốt Top 32. Nếu tất cả GK đều bị: rules trên prod là bản cũ → `bun run deploy:rules` |
| B3 | Thí sinh đến muộn sau khi đã chốt Top 32 | Không chấm được nữa (đúng luật). Muốn chấm phải khôi phục bản sao lưu trước khi chốt: quyết định của trưởng BTC |
| B4 | Chốt Top 32 nhầm (trước khi đủ điểm / chưa tie-break) | Dừng ngay, **chưa cho bắt đầu battle**. `bun run db restore <bản backup trước khi chốt>` (vì vậy phải backup ngay trước khi chốt) |
| B5 | Bấm **Bốc Thăm Lại** sau khi trận Pro đã bắt đầu | Phiếu các trận Pro bị xoá. Khôi phục từ bản backup gần nhất |
| B6 | Một GK bấm nhầm phiếu | Trước khi công bố: GK chọn lại và **Gửi lại**. Sau khi công bố: không sửa được; BTC quyết định, dùng **CHỌN THẮNG** nếu cần |
| B7 | Thiếu phiếu 1 GK (8/9) mà phải công bố | Nhắc GK đó; nếu GK không thể bỏ phiếu, trưởng BTC quyết, dùng **CHỌN THẮNG** |
| B8 | Đổi phân bảng A/B khi đã có người check-in | Bảng của người đã check-in **không đổi theo**; chỉ đổi phân bảng trước khi check-in |
| B9 | Trùng tên thi đấu (2 người cùng tên) | Phân biệt bằng SBD; sửa tên bằng `bun run db dancer:set <id> name="..."` |

### C. Dữ liệu, vận hành

| # | Dấu hiệu | Xử lý |
|---|---|---|
| C1 | **Thao tác nhầm trên dữ liệu thật trong lúc tập** | Luôn nhìn dải hồng **DỮ LIỆU DEV**. `bun run dev` = thật, `bun run dev:devdb` = dev. Không có dải hồng thì đang ở giải thật |
| C2 | Bấm đồng bộ Google Sheets khi đang ở dev | Bảng tính thật bị ghi dữ liệu dev. Đồng bộ lại từ bản thật để ghi đè |
| C3 | Ở dev bấm *Đổi PIN / Tạo tài khoản* báo lỗi | Đúng thiết kế (tài khoản dùng chung với giải thật). Làm ở bản thật, rồi `bun run db seed ... --dev` để chép lại |
| C4 | Sau `bun run db reset` (prod), nhánh đấu hiện cặp đấu lạ | App tự nạp nhánh mẫu khi collection trống. Nhánh thật được tạo lại khi **Chốt Top 32**; không công bố trang nhánh đấu trước lúc đó |
| C5 | Trình duyệt hỏi đăng nhập Google bị chặn popup | Cho phép popup cho trang. Trên Vercel: domain phải có trong Authorized domains |
| C6 | Mất laptop admin / hỏng giữa giải | Mở `/admin` trên máy khác, đăng nhập: dữ liệu nằm trên Firestore, không nằm trên máy. Vì vậy cần **ít nhất 2 người có quyền admin** |
| C7 | Cần quay lại một thời điểm trước | `bun run db restore <file>`. Restore **ghi đè** document cùng id nhưng **không xoá** document mới hơn: với trận/đội đã tạo lại, chạy `reset` trước rồi `restore` |

## 9. Sau giải

1. `bun run db backup`, cất file ở nơi an toàn (có tên trẻ vị thành niên: không chia sẻ công khai).
2. Xuất kết quả: **Tải CSV** ở `/admin/prelim`, **Tải CSV 16 Đội** ở `/admin/boc-tham`, hoặc đồng bộ Google Sheets.
3. Đổi PIN giám khảo, gỡ quyền tài khoản BTC tạm thời ở `/admin/cai-dat/nguoi-dung`.
