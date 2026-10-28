# Hướng dẫn chạy Localhost & Production

App là một **SPA tĩnh** (React + Vite): build ra thư mục `dist/` gồm HTML/JS/CSS, không cần server backend.
Dữ liệu giải (thí sinh, điểm, đội, trận, phiếu) lưu trên **Cloud Firestore** và đồng bộ realtime giữa mọi thiết bị.
Đăng nhập chạy qua **Firebase Auth** (cấu hình trong `src/services/firebase.config.json`, project `hiphopxutra2026`).

## 0. Cài đặt Firebase (làm 1 lần, bắt buộc)

Hướng dẫn đầy đủ (database dùng chung dev/prod, khoá service account, script `bun run db`, emulator, test e2e,
checklist ngày thi): **[docs/firebase-setup.md](docs/firebase-setup.md)**. Tóm tắt:

Chưa làm bước này thì app vẫn mở được nhưng hiện banner đỏ **"Lỗi đồng bộ dữ liệu"** và không vào được `/admin`.

1. **Bật Firestore:** [Firebase Console](https://console.firebase.google.com/project/hiphopxutra2026/firestore)
   → **Create database** → chọn vị trí `asia-southeast1` (Singapore) → chế độ **Production**.
2. **Bật đăng nhập:** Authentication → **Sign-in method** → bật **Google** (admin), **Email/Password** (giám khảo)
   và **Anonymous** (máy LED báo online).
3. **Đẩy rules bảo mật** (file `firestore.rules`):
   ```bash
   bunx firebase login
   bun run deploy:rules
   ```
4. **Thêm admin đầu tiên:** `bun run db admin:add <email>` (cần khoá service account, xem docs/firebase-setup.md),
   hoặc thủ công: Firestore → **Start collection** theo đường dẫn
   `events` / `hiphopxutra-2026` / `admins` / `<email-google-viết-thường>` (document để trống hoặc thêm field `name`).
   Admin sau có thể thêm admin khác theo cùng cách.
5. Mở `/admin`, đăng nhập Google bằng email vừa thêm. Lần đầu admin vào, dữ liệu đang có trên trình duyệt đó
   (dữ liệu cũ trong localStorage, hoặc dữ liệu mẫu) sẽ được **tự động đẩy lên Firestore**.
6. **Tạo tài khoản giám khảo:** `/admin/cai-dat/giam-khao` → **Tạo 9 tài khoản còn thiếu**. Mỗi GK nhận một PIN 6 số
   (bấm 👁 để xem). Giám khảo mở `/giam-khao`, chọn mã GK, nhập PIN. Lộ PIN thì bấm **Đổi PIN**.

> Muốn **làm lại từ đầu**: `bun run db backup` rồi `bun run db reset` (giữ lại admin và PIN giám khảo), rồi admin tải lại trang.

## 0b. Kho ảnh Cloudflare R2 (làm 1 lần, bắt buộc trước khi tải ảnh)

Ảnh thí sinh, đội, giám khảo **không lưu trong Firestore**: máy admin thu nhỏ và nén WebP rồi tải lên R2
qua một Cloudflare Worker (thư mục `worker/`). Worker chỉ nhận ảnh từ admin (kiểm tra bằng đăng nhập Firebase)
và trả ảnh cho mọi người với cache 1 năm (trình duyệt + CDN Cloudflare). R2 không tính phí băng thông tải ra.

1. Cloudflare Dashboard → **R2** → **Create bucket** tên `hiphopxutra` (đã tạo; giữ private, không cần bật public). Tên bucket nằm trong `worker/wrangler.toml`.
   Lưu ý: link `https://<account>.r2.cloudflarestorage.com/...` là API S3 cần chữ ký, **không** dùng làm `VITE_MEDIA_URL`.
2. Deploy Worker:
   ```bash
   cd worker
   npx wrangler login
   npx wrangler deploy
   ```
   Wrangler in ra link dạng `https://hiphopxutra-media.<tên>.workers.dev` (hiện tại: `https://hiphopxutra-media.hoangdu-tpg.workers.dev`).
   Trang được phép tải ảnh lên: `ALLOWED_ORIGINS` trong `worker/wrangler.toml` (localhost luôn được phép).
3. **Nên** gắn tên miền riêng (Workers → `hiphopxutra-media` → Settings → Domains & Routes → Custom domain,
   vd `anh.hiphopxutra.vn`): cache CDN của Worker chỉ chạy trên tên miền riêng, không chạy trên `workers.dev`.
4. Đặt `VITE_MEDIA_URL` = link Worker: trên **Vercel** (Project → Settings → Environment Variables, rồi Redeploy)
   và trong file `.env.local` ở thư mục gốc (cho `bun run dev`):
   ```
   VITE_MEDIA_URL=https://anh.hiphopxutra.vn
   ```
   Build lại và deploy lại app sau khi đổi biến này.
5. Có ảnh cũ (tải lên trước khi có R2): `/admin/cai-dat/luu-tru` → **Chuyển N ảnh lên R2**.

Tải ảnh thí sinh: chỉ cần **1 ảnh nửa người**; kéo/phóng vòng tròn để chọn khuôn mặt làm avatar
(nửa người tối đa 1080×1440, avatar 320×320). Bấm vào ảnh thí sinh lần sau để cắt lại avatar, không cần tải lại.

## 0c. Màn LED vòm bậc thang (sân khấu chính)

Màn LED 10 m × 5,5 m dạng vòm bậc thang dùng bố cục riêng cho cảnh **Trận Battle**: mở `/led?khung=vom`
trên máy nối LED qua HDMI (xuất 1920×1080), bấm vào màn hình để vào toàn màn hình. Hình được vẽ ở góc trên trái,
chỉ trong phần có LED; tên + tỉ số nằm ở độ cao 2–3,1 m (trên đầu người đứng trên sàn), phần dưới 1,3 m chỉ có
tên sự kiện vì thường bị che. Admin xem trước ở `/admin/led` → **Xem trước khung vòm**.

Đang dùng số **ước lượng** từ bản vẽ: 20 cột × 11 hàng module 500 mm, chiều cao từng cột (từ ngoài vào giữa)
5, 7, 8, 8, 9, 10, 10, 11, 11, 11 module, 96 px mỗi module. Khi bên LED gửi sơ đồ thật, chỉ cần sửa link:

| Tham số | Ý nghĩa | Ví dụ |
|---|---|---|
| `cot` | Số module mỗi cột: nửa trái (tự lấy đối xứng) hoặc đủ 20 cột | `cot=5,7,8,8,9,10,10,11,11,11` |
| `module` | Số pixel mỗi module trong khung HDMI | `module=96` |
| `luoi=1` | Vẽ lưới module và vùng bị cắt, để căn với màn thật | `luoi=1` |

Ví dụ: `/led?khung=vom&cot=6,7,8,9,9,10,10,11,11,11&module=96&luoi=1`. Cảnh **Màn chờ** và **Bảng xếp hạng Prelim**
vẫn là bố cục 16:9.

## Yêu cầu

- **Node.js 20+** (đã test với Node 24)
- **bun** (khuyên dùng, repo có `bun.lock`) — cài: `npm install -g bun`, hoặc chạy không cần cài: `npx bun install`, `npx bun run dev`…
  Không có bun thì dùng `npm` thay cho `bun` trong mọi lệnh bên dưới.

---

## 1. Chạy Localhost (môi trường dev)

```bash
bun install        # cài thư viện (lần đầu hoặc khi package.json thay đổi)
bun run dev        # chạy dev server
```

Mở **http://localhost:3000**. Sửa code là trình duyệt tự cập nhật (HMR).

Dev server lắng nghe `0.0.0.0`, nên máy khác **cùng mạng Wi-Fi/LAN** (điện thoại giám khảo, máy chiếu LED)
có thể truy cập qua IP của máy chạy: `http://<IP-máy>:3000` (xem IP bằng `ipconfig`).
Nếu không vào được, mở cổng 3000 trong Windows Firewall.

### Link nhanh cho từng màn hình

| Màn hình | URL | Đăng nhập |
|---|---|---|
| Khán giả xem Prelim (trang chủ) | `http://localhost:3000/` hoặc `/ket-qua/prelim` | Không |
| Bảng xếp hạng Prelim | `/ket-qua/bang-xep-hang` | Không |
| Nhánh đấu + trận đang diễn ra | `/ket-qua/nhanh-dau` | Không |
| Chi tiết 1 trận (link chia sẻ được) | `/ket-qua/tran/pro-top16-01`, `/ket-qua/tran/newbie-final-01`… | Không |
| Màn LED sân khấu (kiosk, bấm 1 lần để toàn màn hình) | `/led` | Tự động (ẩn danh, để báo online) |
| Điều khiển màn LED | `/admin/led` | Google (admin) |
| Cổng giám khảo | `/giam-khao` | Mã GK + PIN 6 số (1 máy / 1 GK) |
| Tài khoản giám khảo (tạo / xem / đổi PIN) | `/admin/cai-dat/giam-khao` | Google (admin) |
| Bàn điều hành | `/admin` → `/admin/prelim`, `/admin/thi-sinh`, `/admin/boc-tham`, `/admin/nhanh-dau`, `/admin/battle` | Google (admin) |
| Check-in thí sinh (cấp SBD N001… / P001…) | `/admin/check-in` | Google (admin) |
| Cài đặt | `/admin/cai-dat/google-sheets`, `/admin/cai-dat/luu-tru` | Google (admin) |

Trang `/ket-qua/*` và `/led` chỉ đọc **bản công bố** (khán giả không xem được điểm đang chấm dở, kể cả khi rành kỹ thuật).

Link cũ (`#stage`, `#judge`, `#guest`, `#khach`, `#prelim_results`, `?view=...`) vẫn dùng được, tự chuyển sang URL mới.
Với production, thay `http://localhost:3000` bằng domain thật.

### Kiểm tra trước khi commit

```bash
bash scripts/check.sh    # type check + build
```

---

## 2. Production

### Bước 1 — Build

```bash
bun install
bun run build      # tạo thư mục dist/
bun run preview    # (tuỳ chọn) xem thử bản build tại http://localhost:4173
```

### Bước 2 — Deploy: Vercel (tự động từ GitHub)

Repo `GrowthZ/hiphopxutra-app` đã nối với Vercel: **push lên `main` là Vercel tự build và deploy**;
mỗi pull request có một bản preview riêng. Cấu hình build nằm trong `vercel.json` (`bun install`, `bun run build`,
thư mục `dist`, rewrite mọi URL về `index.html` để mở thẳng `/led`, `/admin` không bị 404).

Lần đầu trên Vercel → Project → **Settings → Environment Variables**: thêm `VITE_MEDIA_URL` (link Worker ảnh R2,
mục 0b) cho Production và Preview, rồi Redeploy.

`firestore.rules` **không** đi theo Vercel: mỗi khi sửa rules, chạy `bun run deploy:rules`.

### Bước 3 — Cho phép domain đăng nhập Google (bắt buộc)

Firebase Console → **Authentication → Settings → Authorized domains** → **Add domain** → thêm domain Vercel
(ví dụ `hiphopxutra-app.vercel.app`, và domain riêng nếu có). Thiếu bước này, nút đăng nhập Google / đồng bộ Sheets
báo lỗi `auth/unauthorized-domain`. `localhost` đã được cho phép sẵn. Bản preview của pull request có domain khác,
nên đăng nhập admin trên preview sẽ bị chặn trừ khi thêm domain đó.

---

## Biến môi trường

Biến duy nhất app đọc: **`VITE_MEDIA_URL`** (link Worker ảnh R2, mục 0b).
Nếu sau này thêm biến dùng ở trình duyệt, đặt tên bắt đầu bằng `VITE_`
và đọc qua `import.meta.env.VITE_...` — lưu ý mọi biến `VITE_` sẽ lộ ra trong bundle, **không** dùng cho khoá bí mật.

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `bun: command not found` | `npm install -g bun`, hoặc dùng `npx bun ...` |
| Banner đỏ "Cloud Firestore API has not been used… or it is disabled" | Chưa bật Firestore — làm mục 0, bước 1 |
| Banner đỏ `Missing or insufficient permissions` | Chưa deploy `firestore.rules`, hoặc email chưa có trong `admins` |
| `/admin` báo "chưa có quyền admin" | Thêm email (viết thường) vào `events/hiphopxutra-2026/admins` |
| Máy LED báo "Không đăng nhập ẩn danh được" | Bật **Anonymous** trong Authentication → Sign-in method |
| Giám khảo báo "BTC chưa bật đăng nhập Email/Password" | Bật **Email/Password** trong Authentication → Sign-in method |
| Giám khảo báo "Sai mã PIN" dù nhập đúng | Kiểm tra đã bấm **Tạo tài khoản** cho GK đó ở `/admin/cai-dat/giam-khao` |
| Giám khảo bị đăng xuất giữa chừng | Mã GK đó vừa đăng nhập trên máy khác (mỗi GK chỉ 1 máy), hoặc admin vừa đổi PIN |
| Giám khảo không gửi được điểm/phiếu (`permission-denied`) | Chưa deploy `firestore.rules` mới, Prelim đã chốt, hoặc hiệp đã công bố |
| Trang `/ket-qua` không có điểm / phiếu, hoặc giám khảo tải lại trang không thấy phiếu mình đã gửi | Bình thường: điểm Prelim chỉ hiện khi thí sinh đã đủ 4 GK chấm (hoặc đã chốt Top 32), phiếu battle chỉ hiện sau khi lật/công bố hiệp. Kết quả do máy admin đẩy lên, nên phải có ít nhất 1 máy admin đang mở `/admin/...` |
| Mở `/led` hay `/admin` trên host bị 404 | Thiếu rewrite về `index.html` (xem Cách B) |
| Tải ảnh báo "Chưa cấu hình VITE_MEDIA_URL" | Làm mục 0b, rồi chạy lại `bun run dev` / build lại |
| Tải ảnh báo "Chỉ admin được tải ảnh lên" | Đăng nhập bằng email có trong `admins`; email Google phải đã xác minh |
| Ảnh không hiện, console báo CORS | Kiểm tra `VITE_MEDIA_URL` đúng link Worker (không có `/` ở cuối cũng được) |
| Cổng 3000 đang bị dùng | Tắt app đang chiếm cổng, hoặc `bunx vite --port=3001 --host=0.0.0.0` |
| Điện thoại không vào được link LAN | Cùng mạng chưa? Mở cổng 3000 trong Windows Firewall |
| `auth/unauthorized-domain` | Thêm domain vào Authorized domains (Bước 3) |
| Popup đăng nhập bị chặn | Cho phép popup cho domain trong trình duyệt |
| Deploy xong vẫn thấy bản cũ | Hard reload (`Ctrl+Shift+R`) |
