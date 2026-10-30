# Database dev (dữ liệu tập dượt)

Dữ liệu tập dượt nằm ở **`events/hiphopxutra-2026-dev`**, cạnh dữ liệu giải thật `events/hiphopxutra-2026`, trong
cùng Firestore của project `hiphopxutra2026`. Nhờ vậy có thể tập dượt **trên thiết bị thật** (điện thoại giám khảo,
máy LED, máy check-in) với mạng thật, mà không đụng tới dữ liệu giải.

| Chạy | Dữ liệu |
|---|---|
| `bun run dev` / web trên Vercel | **Giải thật** `events/hiphopxutra-2026` |
| `bun run dev:devdb` | **Dev** `events/hiphopxutra-2026-dev` (dải hồng **DỮ LIỆU DEV** luôn hiện ở đầu màn hình) |
| `bun run db <lệnh> --dev` | Dev |
| `TEST=true` trong `.env`, `bun run test:db` rồi `bun run dev` | **Dữ liệu mẫu trên emulator** của máy này (không cần mạng, không cần khoá, đủ tài khoản; xem mục 0) |

Cách chọn dữ liệu: biến `VITE_EVENT_ID` trong file `.env.devdb` (đã commit). Không đặt biến này trên Vercel Production.

## 0. Thử tính năng nhanh: TEST=true (emulator, không đụng giải thật)

```bash
# .env (không commit): TEST=true
bun run test:db              # cửa sổ 1: bật emulator + nạp dữ liệu mẫu (mặc định giai đoạn dang-ky)
bun run test:db battle       # ... hoặc nạp thẳng một giai đoạn khác (bảng ở mục 2)
bun run dev                  # cửa sổ 2: http://localhost:3000
```

Dữ liệu mất khi tắt emulator (Ctrl+C); chạy lại `test:db` là có lại từ đầu. `TEST` chỉ có tác dụng với `bun run dev`:
không vào bản build, không ảnh hưởng `test:e2e`. Chỉ mở được trên chính máy này (emulator nghe ở 127.0.0.1).

| Tài khoản (chỉ có trên emulator) | Đăng nhập |
|---|---|
| BTC quản trị | `admin` / `admin123` ở `/admin` |
| BTC check-in (2 bàn) | `checkin` / `checkin123`, `checkin2` / `checkin123` ở `/checkin` |
| Giám khảo | `/giam-khao`, chọn GK 01 … GK 09, PIN `111111` … `999999` |

### Ảnh thí sinh mẫu (thử màn LED)

Ảnh thật của thí sinh (trẻ vị thành niên) **không bao giờ lên git**: để ở `public/image/` (đã gitignore), chỉ dùng trên máy.

```bash
bun scripts/sample-photos.ts --female IMG_8850   # 1 lần, hoặc khi thêm ảnh: liệt kê ảnh BGIRL, còn lại là BBOY
bun run test:db battle                            # mọi thí sinh có ảnh nửa người + avatar theo đúng giới tính
```

Script đọc ảnh cắt nền 3:4 trong `public/image/*.png`, ghi ra `public/image/seed/` ảnh nửa người WebP và avatar vuông
cắt quanh mặt, kèm `manifest.json`. Mỗi lần `seed` thấy file này thì gán ảnh: theo thứ tự cặp đấu vòng đầu, nên hai
bên một trận và hai người một đội có ảnh khác nhau; người thi cả 2 hạng mục giữ một ảnh. Đội 2vs2 không có ảnh đội:
LED ghép ảnh 2 thành viên. Mở `/admin/battle` chọn trận, `/admin/led` → *Trận Battle*, rồi xem `/led` (`/led?khung=vom`
cho màn vòm).

## 1. Chuẩn bị (1 lần)

1. Có khoá service account ở `secrets/service-account.json` (xem [firebase-setup.md](firebase-setup.md) mục 3).
2. Trên **giải thật** đã có: admin (`bun run db admin:list`) và đủ 9 tài khoản giám khảo (`/admin/cai-dat/giam-khao`).
   Lệnh `seed` chép các tài khoản này sang dev.

## 2. Nạp dữ liệu mẫu

```bash
bun run db seed <giai-đoạn> --dev
bun run dev:devdb            # mở http://localhost:3000/admin, hoặc http://<IP-máy>:3000 từ điện thoại
```

Mỗi lần `seed` **xoá sạch** dữ liệu dev cũ (giữ tài khoản) rồi nạp lại từ đầu, nên có thể nhảy tới giai đoạn bất kỳ
để tập riêng phần đó. Cùng một bộ thí sinh (tên giả) đi xuyên suốt các giai đoạn:

| Giai đoạn | Trạng thái sau khi nạp | Dùng để tập |
|---|---|---|
| `dang-ky` | 60 Newbie + 60 Pro đã đăng ký (15 người thi cả 2 hạng mục), chưa ai có SBD | Check-in, đăng ký tại chỗ, tải ảnh |
| `check-in` | 56 Newbie (N001–N056) + 58 Pro (P001–P058) đã check-in, chia bảng A/B; 4 + 2 người vắng | Bắt đầu Prelim, giám khảo chấm |
| `prelim` | Prelim đang chạy: 70% đã chấm đủ 4 GK, 4 người mới có 2/4 điểm, còn lại chưa chấm | Nhắc GK chấm thiếu, admin sửa điểm, BXH chiếu |
| `chot-top32` | Chấm đủ hết; **đồng điểm ở hạng 32** (Newbie 3 người, Pro 4 người) | Tie-break, chốt Top 32, bốc thăm 2vs2 |
| `battle` | Tie-break đã chấm, đã chốt Top 32 cả 2 hạng mục, đã bốc thăm 16 đội Pro, nhánh Top 32 Newbie / Top 16 Pro sẵn sàng | Điều hành battle, LED, giám khảo bỏ phiếu |

Sau khi nạp, **mở `/admin` trên máy admin một lần**: máy admin mới là nơi xuất bản bản công khai (BXH khách, phiếu GK),
nên trang `/ket-qua/*` và `/led` chỉ có dữ liệu khi có một máy admin đang mở.

Các lệnh khác cũng chạy được với `--dev`, không hỏi xác nhận: `stats`, `backup`, `restore`, `reset`, `dancer:*`.

```bash
bun run db stats --dev
bun run db backup --dev                     # chụp lại giữa buổi tập để quay về đúng chỗ
bun run db restore backups/hiphopxutra2026-dev-....json --dev
```

## 3. Giới hạn: những thứ dev dùng chung với giải thật

| Dùng chung | Hệ quả | App đã chặn |
|---|---|---|
| **Firebase Auth** (tài khoản GK, BTC, Google) | PIN giám khảo và mật khẩu BTC ở dev **chính là** của giải thật | Ở dev, nút *Tạo tài khoản / Đổi PIN / Tạo người dùng / Đặt lại mật khẩu* báo lỗi; *Xoá người dùng* chỉ gỡ quyền ở dev, không xoá đăng nhập. Muốn đổi: làm ở bản thật rồi `seed` lại |
| **`firestore.rules`** | Rules áp dụng cho mọi event | Không cần làm gì |
| **Kho ảnh R2** | Ảnh tải lên ở dev nằm chung kho; quyền tải ảnh xét theo admin của giải thật | Tên file theo nội dung ảnh, không ghi đè ảnh giải thật |
| **Google Sheets** | Link bảng tính lưu theo trình duyệt, nên dev và thật trên cùng `localhost:3000` dùng **chung một bảng** | Không chặn: **đừng bấm đồng bộ Sheets khi đang ở dev** |
| **Cổng 3000** | `bun run dev` và `bun run dev:devdb` cùng địa chỉ | Nhìn dải hồng **DỮ LIỆU DEV** trước khi bấm bất cứ gì |

Muốn cô lập hoàn toàn (kể cả Auth), dùng emulator: xem mục 0 (`TEST=true`).

## 4. Xoá dữ liệu dev

`bun run db reset --dev` xoá dữ liệu giải ở dev (giữ tài khoản). Dữ liệu dev chiếm rất ít dung lượng
(khoảng 170 document), để lại cũng không sao.
