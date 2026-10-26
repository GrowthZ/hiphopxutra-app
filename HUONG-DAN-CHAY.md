# Hướng dẫn chạy Localhost & Production

App là một **SPA tĩnh** (React + Vite): build ra thư mục `dist/` gồm HTML/JS/CSS, không cần server backend.
Đăng nhập Google và đồng bộ Google Sheets chạy qua Firebase Auth ngay trên trình duyệt (cấu hình trong `firebase-applet-config.json`).

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

| Màn hình | URL |
|---|---|
| Bàn điều hành (mặc định) | `http://localhost:3000` |
| Màn LED sân khấu | `http://localhost:3000/#stage` |
| Cổng giám khảo | `http://localhost:3000/#judge` |
| Khán giả xem Prelim | `http://localhost:3000/#guest` |
| Bảng kết quả Prelim | `http://localhost:3000/#prelim_results` |

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

### Bước 2 — Deploy thư mục `dist/`

Chọn **một** trong các cách sau.

#### Cách A — Firebase Hosting (khuyên dùng, cùng project Firebase với app)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
#   - Use an existing project → gen-lang-client-0810099059
#   - Public directory: dist
#   - Single-page app: Yes
#   - Overwrite dist/index.html: No
firebase deploy --only hosting
```

Lần sau chỉ cần: `bun run build && firebase deploy --only hosting`.
Domain mặc định: `https://gen-lang-client-0810099059.web.app` (Auth tự nhận domain này).

#### Cách B — Hosting tĩnh khác (Vercel, Netlify, Cloudflare Pages…)

- Install command: `bun install` (hoặc `npm install`)
- Build command: `bun run build` (hoặc `npm run build`)
- Output directory: `dist`

#### Cách C — Google AI Studio

App được tạo từ AI Studio; bấm **Deploy** trong AI Studio để đẩy lên Cloud Run. Không cần làm gì thêm.

### Bước 3 — Cho phép domain đăng nhập Google (bắt buộc với Cách B và domain riêng)

Firebase Console → **Authentication → Settings → Authorized domains** → **Add domain** → thêm domain production
(ví dụ `hiphopxutra.vercel.app`). Thiếu bước này, nút đăng nhập Google / đồng bộ Sheets sẽ báo lỗi `auth/unauthorized-domain`.
`localhost` đã được cho phép sẵn.

---

## Biến môi trường

Code hiện **không đọc** biến môi trường nào; `.env.example` (`GEMINI_API_KEY`, `APP_URL`) là mẫu của AI Studio,
chạy local không cần tạo `.env`. Nếu sau này thêm biến dùng ở trình duyệt, đặt tên bắt đầu bằng `VITE_`
và đọc qua `import.meta.env.VITE_...` — lưu ý mọi biến `VITE_` sẽ lộ ra trong bundle, **không** dùng cho khoá bí mật.

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `bun: command not found` | `npm install -g bun`, hoặc dùng `npx bun ...` || Cổng 3000 đang bị dùng | Tắt app đang chiếm cổng, hoặc `bunx vite --port=3001 --host=0.0.0.0` |
| Điện thoại không vào được link LAN | Cùng mạng chưa? Mở cổng 3000 trong Windows Firewall |
| `auth/unauthorized-domain` | Thêm domain vào Authorized domains (Bước 3) |
| Popup đăng nhập bị chặn | Cho phép popup cho domain trong trình duyệt |
| Deploy xong vẫn thấy bản cũ | Hard reload (`Ctrl+Shift+R`) |
