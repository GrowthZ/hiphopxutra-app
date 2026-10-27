# Cấu hình Firebase & quản trị dữ liệu

Project Firebase: **`gen-lang-client-0810099059`** · Dữ liệu giải: `events/hiphopxutra-2026/…` trên Cloud Firestore.

## 1. Một database chung cho cả dev và production

App chỉ có **một** database Firestore. Bản chạy ở máy (`bun run dev`, `http://localhost:3000`) và bản đã deploy
dùng **chung** dữ liệu và tài khoản đó.

| Bạn chạy | Đọc/ghi vào | Dùng khi |
|---|---|---|
| `bun run dev` | **Database thật (prod)** | Chuẩn bị giải, nhập thí sinh, chạy thật |
| `bun run deploy` (web đã deploy) | **Database thật (prod)** | Ngày thi |
| `bun run db <lệnh>` | **Database thật (prod)**, có hỏi xác nhận trước khi ghi/xoá | Quản trị admin, sao lưu, khôi phục, xoá dữ liệu |
| `bun run emulators` + `VITE_FIREBASE_EMULATORS=true bun run dev` | Emulator trên máy (project `demo-hiphopxutra`) | Thử nghiệm thoải mái, dữ liệu mất khi tắt |
| `bun run test:e2e` | Emulator (tự bật, tự tắt) | Kiểm tra trước khi deploy |

> ⚠️ Vì dev dùng chung database thật, **mọi thao tác ở localhost đều thay đổi dữ liệu giải thật**: bấm
> "Khôi phục dữ liệu ban đầu", bốc thăm lại hay khoá Top 32 sẽ có hiệu lực ngay trên LED và điện thoại giám khảo.
> Muốn thử thì dùng emulator (mục 5). Trước các thao tác lớn, luôn chạy `bun run db backup`.

## 2. Cấu hình project lần đầu (Firebase Console)

Mở [Firebase Console](https://console.firebase.google.com/project/gen-lang-client-0810099059).

1. **Firestore** → *Create database* → vị trí `asia-southeast1` (Singapore) → chế độ **Production**.
2. **Authentication → Sign-in method**, bật cả 3:
   - **Google**: admin đăng nhập `/admin`.
   - **Email/Password**: tài khoản giám khảo `gk-N@giamkhao.hiphopxutra.vn` (PIN = mật khẩu).
   - **Anonymous**: máy chiếu LED (`/led`) dùng để báo "LED đang online". Thiếu cái này, `/led` báo lỗi 400 khi mở.
3. **Authentication → Settings → Authorized domains**: `localhost` có sẵn; thêm domain production nếu không
   dùng `*.web.app` / `*.firebaseapp.com`.
4. Đăng nhập Firebase CLI một lần (CLI đã có trong devDependencies, không cần cài global):
   ```bash
   bunx firebase login
   ```
5. Đẩy rules bảo mật (`firestore.rules`). **Phải chạy lại mỗi khi file này thay đổi**:
   ```bash
   bun run deploy:rules
   ```
6. Thêm admin đầu tiên: dùng `bun run db admin:add <email>` (mục 4), hoặc thủ công trong Firestore:
   `events` → `hiphopxutra-2026` → collection `admins` → document id = email Google viết thường, field `name`.
7. Mở `/admin`, đăng nhập Google bằng email đó. Lần đầu vào, dữ liệu mẫu tự được đẩy lên Firestore.
8. `/admin/cai-dat/giam-khao` → **Tạo 9 tài khoản còn thiếu** để cấp PIN cho giám khảo.

## 3. Khoá service account (cho script `db`)

Script `db` chạy với quyền quản trị (Admin SDK), bỏ qua `firestore.rules`, nên cần khoá riêng:

1. Console → ⚙️ **Project settings → Service accounts** → **Generate new private key**.
2. Lưu file tải về thành **`secrets/service-account.json`** trong thư mục dự án.
   Thư mục `secrets/` đã nằm trong `.gitignore`, nên file này không bao giờ bị commit.

> 🔐 Khoá này có **toàn quyền** với project. Không gửi qua chat/email, không đưa lên Drive, không commit.
> Lộ khoá thì vào cùng trang đó xoá khoá cũ rồi tạo khoá mới. Máy không cần quản trị thì đừng giữ khoá.

Nếu đã cài `gcloud`, có thể dùng `gcloud auth application-default login` thay cho file khoá.

## 4. Script quản trị dữ liệu: `bun run db`

| Lệnh | Việc làm |
|---|---|
| `bun run db stats` | Đếm số document trong từng collection |
| `bun run db admin:list` | Danh sách admin |
| `bun run db admin:add <email> [tên]` | Thêm admin (email tự chuyển về chữ thường) |
| `bun run db admin:remove <email>` | Xoá admin (không cho xoá admin cuối cùng) |
| `bun run db backup [file]` | Sao lưu toàn bộ dữ liệu giải ra `backups/<project>-<thời gian>.json` |
| `bun run db restore <file>` | Ghi lại dữ liệu từ file sao lưu (ghi đè document cùng id) |
| `bun run db reset` | Xoá dữ liệu giải, **giữ lại** `admins` và `judgeSecrets` (PIN giám khảo) |

Thêm `--emulator` vào cuối để chạy trên emulator thay vì prod.

Với prod, các lệnh ghi/xoá (`admin:remove`, `restore`, `reset`) **bắt gõ lại tên project** để xác nhận.
`--yes` bỏ qua bước xác nhận; chỉ dùng khi bạn chắc chắn.

Ví dụ:

```bash
bun run db admin:add hoangdu.tpg@gmail.com "Hoàng"
bun run db backup                                  # trước ngày thi, sau mỗi vòng
bun run db reset                                   # sau buổi tập dượt, trước khi chạy thật
bun run db restore backups/gen-lang-client-0810099059-2026-11-01T08-00-00.json
```

Sau `reset`, admin mở `/admin` để app nạp lại dữ liệu mẫu (hoặc `restore` một bản sao lưu).
Thư mục `backups/` không được commit (có tên thí sinh); hãy tự cất giữ các bản sao lưu quan trọng.

## 5. Emulator (thử nghiệm không đụng dữ liệu thật)

Cần **Java 21+**. Script tự tìm theo thứ tự: biến `JAVA_HOME`, JDK mới nhất trong `~/.jdks/`, rồi `java` trên PATH.
Máy chưa có thì tải Temurin 21 (bản zip) từ <https://adoptium.net> và giải nén vào `~/.jdks/`.

```bash
bun run emulators                                   # cửa sổ 1: Auth :9099 + Firestore :8080
VITE_FIREBASE_EMULATORS=true bun run dev            # cửa sổ 2: app nối vào emulator
bun run db admin:add ban@gmail.com --emulator       # cửa sổ 3: cấp quyền admin trên emulator
```

Khi đăng nhập Google trên emulator, popup giả lập hiện ra: bấm **Add new account** rồi nhập đúng email vừa thêm.
Emulator dùng project `demo-hiphopxutra` nên **không thể** gửi dữ liệu nhầm sang prod. Tắt emulator là dữ liệu mất.
Emulator đọc thẳng `firestore.rules`, nên mỗi lần sửa rules hãy thử trên emulator trước khi `deploy:rules`.

## 6. Test end-to-end: `bun run test:e2e`

Lệnh này tự bật emulator và dev server ở cổng 3200, chạy Playwright (`e2e/`), rồi tắt tất cả. Có 4 kịch bản:

1. Admin đăng nhập, app nạp dữ liệu và xuất bản bản công khai.
2. Giám khảo đăng nhập bằng mã GK + PIN, chấm Prelim 70 điểm và bỏ phiếu battle (đi qua đúng `firestore.rules`).
3. Admin công bố Round 1: trận được chốt, phiếu công khai hiện ra cho khách.
4. Màn `/led` đổi cảnh theo lệnh ở `/admin/led` (màn chờ, bảng xếp hạng, blackout).

Lần đầu chạy cần `bunx playwright install chromium`. Khi test hỏng, xem `test-results/` (có trace).

## 7. Deploy

```bash
bun run test:e2e        # nên chạy trước
bun run deploy          # build + đẩy hosting và firestore.rules
```

`bun run deploy:rules` chỉ đẩy rules (nhanh, không đụng tới web).

## 8. Checklist trước ngày thi

- [ ] `bun run test:e2e` qua hết.
- [ ] `bun run deploy` (web và rules mới nhất).
- [ ] Đã bật đủ Google, Email/Password và Anonymous (mục 2).
- [ ] `bun run db admin:list` có đủ người điều hành.
- [ ] 9 giám khảo đã có PIN (`/admin/cai-dat/giam-khao`) và đã đăng nhập thử trên đúng điện thoại sẽ dùng.
- [ ] Sau buổi tập dượt: `bun run db backup`, rồi `bun run db reset`.
- [ ] `/admin/led` hiện "LED đang online" khi máy chiếu mở `/led`.
- [ ] Trong ngày: `bun run db backup` sau mỗi vòng.

## 9. Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| Giám khảo bấm gửi điểm/phiếu báo `PERMISSION_DENIED` | Rules trên prod là bản cũ: `bun run deploy:rules` |
| `/admin` báo "chưa có quyền admin" | `bun run db admin:add <email>`, rồi đăng xuất và đăng nhập lại |
| `/led` lỗi 400, LED luôn "offline" | Bật **Anonymous** trong Authentication → Sign-in method |
| `bun run db` báo thiếu khoá service account | Làm mục 3 |
| `bun run emulators` báo lỗi Java | Cài JDK 21 (mục 5) |
| `Error compiling rules` khi chạy emulator | Lỗi cú pháp trong `firestore.rules`, đọc số dòng trong thông báo |
