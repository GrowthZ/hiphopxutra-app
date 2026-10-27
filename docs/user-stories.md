# Thiết kế ứng dụng — User Stories

HIPHOP XỨ TRÀ 2026 · Giải Breaking U16 · Bản thiết kế v1 (27/10/2026)

## 0. Hiện trạng & vấn đề cần giải quyết

| Hiện trạng | Hệ quả |
|---|---|
| State lưu ở `localStorage`, đồng bộ bằng `BroadcastChannel` | Chỉ đồng bộ **giữa các tab cùng trình duyệt, cùng máy**. Điện thoại giám khảo, máy LED, điện thoại khán giả **không nhận được dữ liệu**. |
| Chọn view bằng hash (`#stage`, `#judge`, `#guest`) + state `activeView` | URL không phản ánh màn đang xem, không chia sẻ link kết quả cụ thể được. |
| Giám khảo chọn tên trong dropdown, không đăng nhập | Ai mở link cũng chấm điểm thay giám khảo được. |
| Màn LED tự chọn trận theo `activeMatchId` và các sự kiện trong tab | Admin không có "bàn điều khiển" rõ ràng cho cái đang hiện trên LED. |

**Hướng giải quyết:** dùng **Cloud Firestore** (cùng project Firebase đang có) làm nguồn dữ liệu realtime duy nhất,
**Firebase Auth** để phân quyền, **URL thân thiện** theo path, và hook **`useStageState` / `useStageController`**
để Admin điều khiển màn LED từ xa.

---

## 1. Vai trò

| Vai trò | Thiết bị | Đăng nhập | Quyền |
|---|---|---|---|
| **Admin** (Ban tổ chức / MC kỹ thuật) | Laptop | Google (email trong danh sách admin) | Toàn quyền dữ liệu + điều khiển LED |
| **Màn LED** (Stage Display) | PC nối LED/máy chiếu | Không (link + mã màn hình) | Chỉ đọc |
| **Giám khảo** (9 người) | Điện thoại / tablet | Mã GK + PIN 6 số | Chỉ ghi điểm/phiếu của chính mình |
| **Khán giả vãng lai** | Điện thoại | Không | Chỉ đọc dữ liệu đã công bố |

---

## 2. URL thân thiện

Chuyển sang routing theo **path** (dùng `react-router` hoặc router tối giản tự viết). Hosting cấu hình rewrite mọi path về `index.html`.

| URL | Màn hình | Vai trò |
|---|---|---|
| `/` | Trang chủ giải: lịch, link kết quả | Khán giả |
| `/ket-qua/prelim/newbie` · `/ket-qua/prelim/pro` | Bảng xếp hạng Prelim | Khán giả |
| `/ket-qua/doi` | Danh sách đội 2vs2 sau bốc thăm | Khán giả |
| `/ket-qua/nhanh-dau/newbie` · `/ket-qua/nhanh-dau/pro` | Nhánh đấu | Khán giả |
| `/ket-qua/tran/:matchId` (vd `/ket-qua/tran/pro-top8-02`) | Chi tiết trận: từng hiệp, phiếu GK | Khán giả |
| `/giam-khao` | Đăng nhập giám khảo | Giám khảo |
| `/giam-khao/cham` | Cổng chấm điểm (Prelim hoặc Battle tuỳ phần thi đang chạy) | Giám khảo |
| `/admin` | Bảng điều khiển tổng | Admin |
| `/admin/prelim` · `/admin/thi-sinh` · `/admin/boc-tham` · `/admin/nhanh-dau` · `/admin/battle` | Các màn điều hành | Admin |
| `/admin/led` | **Bàn điều khiển màn LED** (xem trước + nút điều khiển) | Admin |
| `/admin/cai-dat` | Giám khảo, Google Sheets, lưu trữ ảnh | Admin |
| `/led` · `/led/:screenId` (vd `/led/san-khau-chinh`) | Màn hình LED, toàn màn hình | Màn LED |

Tương thích ngược: `#stage → /led`, `#judge → /giam-khao`, `#guest`/`#khach → /`, `#prelim_results → /ket-qua/prelim/pro`.

---

## 3. User Stories

Quy ước: **P0** = bắt buộc trước ngày thi · **P1** = nên có · **P2** = để sau.

### 3.1 Admin

| ID | User story | Ưu tiên |
|---|---|---|
| AD-01 | Là Admin, tôi muốn **đăng nhập bằng Google** và chỉ email trong danh sách admin mới vào được `/admin`, để người ngoài không sửa được dữ liệu. | P0 |
| AD-02 | Là Admin, tôi muốn **nhập/đồng bộ danh sách thí sinh** (thủ công hoặc Google Sheets) kèm ảnh, để có dữ liệu trước giờ thi. | P0 |
| AD-03 | Là Admin, tôi muốn **tạo tài khoản 9 giám khảo** (tên, ảnh, mã GK, PIN) và **thu hồi/đổi PIN**, để giám khảo đăng nhập trên máy riêng. | P0 |
| AD-04 | Là Admin, tôi muốn **gọi thí sinh Prelim tiếp theo** để giám khảo thấy đúng người cần chấm và LED hiện đúng người đang nhảy. | P0 |
| AD-05 | Là Admin, tôi muốn **thấy giám khảo nào đã chấm / chưa chấm / đang offline** theo thời gian thực, để nhắc kịp thời. | P0 |
| AD-06 | Là Admin, tôi muốn **sửa điểm sai** của một giám khảo (có ghi log ai sửa, lúc nào), để xử lý khiếu nại. | P1 |
| AD-07 | Là Admin, tôi muốn **chốt Top 32** (khoá điểm Prelim) và **công bố kết quả** ra trang khán giả, để kết quả không đổi sau khi công bố. | P0 |
| AD-08 | Là Admin, tôi muốn **bốc thăm ghép đội 2vs2 ngẫu nhiên** có hiệu ứng trên LED, và bốc lại nếu cần trước khi chốt. | P0 |
| AD-09 | Là Admin, tôi muốn **sinh nhánh đấu** tự động từ Top 32 / 16 đội. | P0 |
| AD-10 | Là Admin, tôi muốn **bắt đầu trận, mở hiệp, khoá phiếu, công bố kết quả hiệp**, để điều khiển nhịp battle. | P0 |
| AD-11 | Là Admin, tôi muốn trận **hoà thì tự mở hiệp phụ**, và người thắng **tự vào vòng sau** trong nhánh đấu. | P0 |
| AD-12 | Là Admin, tôi muốn **điều khiển màn LED** từ `/admin/led`: chọn cảnh, xem trước, bấm hiệu ứng (ra sân, lật phiếu, chiến thắng), để LED luôn khớp với sân khấu. | P0 |
| AD-13 | Là Admin, tôi muốn có nút **"Màn chờ / Blackout"** chuyển LED về màn logo ngay lập tức khi có sự cố. | P0 |
| AD-14 | Là Admin, tôi muốn **hoàn tác thao tác gần nhất** (lỡ công bố nhầm hiệp), để sửa sai không cần reload. | P1 |
| AD-15 | Là Admin, tôi muốn **xuất kết quả** ra Google Sheets / CSV sau giải. | P1 |
| AD-16 | Là Admin, tôi muốn **mở 2 máy admin cùng lúc** (1 máy Prelim, 1 máy LED) mà không ghi đè dữ liệu của nhau. | P1 |

**Tiêu chí chấp nhận chính**
- AD-04: bấm "Tiếp theo" → trong ≤ 1 giây cổng giám khảo và LED đổi sang thí sinh mới.
- AD-07: sau khi chốt, giám khảo không sửa được điểm Prelim; nút chốt yêu cầu xác nhận.
- AD-12: mọi thay đổi ở `/admin/led` hiện trên LED ≤ 1 giây; panel xem trước hiển thị giống hệt LED.
- AD-13: nút Blackout luôn hiện, không bị che bởi modal, 1 lần bấm là có hiệu lực.

### 3.2 Màn LED (Stage Display)

| ID | User story | Ưu tiên |
|---|---|---|
| LED-01 | Là kỹ thuật viên, tôi muốn **mở `/led` trên PC nối LED** và màn hình **tự chạy toàn màn hình, không có nút/thanh cuộn/con trỏ**. | P0 |
| LED-02 | Là khán giả tại sân, tôi muốn LED **hiển thị đúng cảnh Admin chọn**: màn chờ, thí sinh Prelim đang thi, BXH Prelim, bốc thăm đội, nhánh đấu, trận battle, chiến thắng. | P0 |
| LED-03 | Là khán giả, tôi muốn thấy **hiệu ứng ra sân, lật phiếu giám khảo, công bố người thắng** đúng lúc Admin bấm, kèm âm thanh. | P0 |
| LED-04 | Là kỹ thuật viên, tôi muốn LED **tự kết nối lại** khi rớt mạng và giữ nguyên cảnh cuối cùng thay vì màn trắng. | P0 |
| LED-05 | Là Admin, tôi muốn **biết LED đang online** (heartbeat) ngay trên `/admin/led`. | P1 |
| LED-06 | Là kỹ thuật viên, tôi muốn chọn **chế độ ban ngày (tương phản cao) / ban đêm** từ Admin, không phải chạm vào máy LED. | P1 |
| LED-07 | Là BTC, tôi muốn có **nhiều màn LED** (`/led/san-khau-chinh`, `/led/man-phu`) hiển thị cảnh khác nhau. | P2 |

**Tiêu chí chấp nhận chính**
- LED-01: bấm 1 lần (hoặc tham số `?kiosk=1`) để vào fullscreen; ẩn con trỏ sau 3 giây đứng yên.
- LED-03: mỗi hiệu ứng chạy **đúng 1 lần** cho mỗi lần Admin bấm, kể cả khi LED reload giữa chừng (không phát lại hiệu ứng cũ).
- LED-04: mất mạng → hiện chấm báo nhỏ ở góc; có mạng lại → tự đồng bộ, không cần F5.
- Chữ đọc được từ 20 m: tên ≥ 5% chiều cao màn, độ tương phản ≥ 7:1.

### 3.3 Giám khảo

| ID | User story | Ưu tiên |
|---|---|---|
| GK-01 | Là giám khảo, tôi muốn **đăng nhập tại `/giam-khao` bằng mã GK + PIN** do BTC cấp, để chỉ tôi chấm được phiếu của mình. | P0 |
| GK-02 | Là giám khảo, tôi muốn **giữ đăng nhập** suốt giải trên máy của mình, không phải nhập lại sau mỗi trận. | P0 |
| GK-03 | Là giám khảo, ở phần **Prelim**, tôi muốn thấy **thí sinh đang thi** (ảnh, SBD, tên) và **nhập điểm 0–100** bằng bàn phím số lớn, rồi bấm **Gửi**. | P0 |
| GK-04 | Là giám khảo, tôi muốn **sửa điểm của mình** khi Prelim chưa bị chốt, và thấy rõ điểm nào đã gửi. | P0 |
| GK-05 | Là giám khảo, ở phần **Battle**, tôi muốn thấy **trận và hiệp hiện tại**, chọn **ĐỎ / XANH** bằng 2 nút lớn, và xác nhận trước khi gửi. | P0 |
| GK-06 | Là giám khảo, tôi muốn **màn hình tự chuyển** sang thí sinh/hiệp mới khi Admin chuyển, không cần tải lại. | P0 |
| GK-07 | Là giám khảo, tôi muốn **không đổi được phiếu** sau khi Admin đã khoá/công bố hiệp. | P0 |
| GK-08 | Là giám khảo, tôi muốn **phiếu không bị mất khi mạng chập chờn**: phiếu được lưu tạm và tự gửi lại, có trạng thái "Đang gửi / Đã lưu". | P0 |
| GK-09 | Là giám khảo, tôi **không muốn thấy phiếu của giám khảo khác** trước khi công bố, để chấm độc lập. | P1 |

**Tiêu chí chấp nhận chính**
- GK-01: sai PIN 5 lần → khoá 1 phút. Một mã GK đăng nhập máy mới thì máy cũ bị đăng xuất.
- GK-05: nút bấm ≥ 44×44 px, đặt ở nửa dưới màn hình; sau khi gửi hiện trạng thái đã khoá phiếu.
- GK-08: phiếu được xác nhận là đã lưu trên server mới hiện "Đã lưu ✓".

### 3.4 Khán giả vãng lai

| ID | User story | Ưu tiên |
|---|---|---|
| KG-01 | Là khán giả, tôi muốn **quét QR tại sân** để mở trang kết quả trên điện thoại, không cần đăng nhập. | P0 |
| KG-02 | Là khán giả, tôi muốn xem **BXH Prelim** theo hạng mục (Newbie 1vs1 / Pro 2vs2), tìm theo **tên hoặc SBD**, thấy ai vào Top 32. | P0 |
| KG-03 | Là khán giả, tôi muốn xem **nhánh đấu** và **kết quả từng trận** (tỉ số hiệp, phiếu GK sau khi công bố). | P0 |
| KG-04 | Là khán giả, tôi muốn thấy **trận đang diễn ra** (LIVE) ở đầu trang, cập nhật tự động. | P1 |
| KG-05 | Là phụ huynh/thí sinh, tôi muốn **chia sẻ link** tới đúng trang kết quả của con/đội mình (`/ket-qua/tran/...`). | P1 |
| KG-06 | Là khán giả, tôi **chỉ thấy kết quả đã công bố**; điểm đang chấm dở không bị lộ. | P0 |

**Tiêu chí chấp nhận chính**
- KG-02/03: trang tải < 2 giây trên 4G, dùng tốt ở màn hình rộng 360 px.
- KG-06: dữ liệu chưa công bố bị chặn ở **Firestore Security Rules**, không chỉ ẩn trên giao diện.

---

## 4. Điều khiển màn LED bằng hook

### 4.1 Luồng dữ liệu

```
 /admin/led (Admin)                    Firestore                         /led (Màn LED)
 ┌──────────────────────┐   ghi   ┌──────────────────────────┐  onSnapshot  ┌─────────────────────┐
 │ useStageController() │ ──────► │ events/{eventId}/        │ ───────────► │ useStageState()     │
 │  setScene, trigger…  │         │   screens/{screenId}     │              │  → render scene     │
 │ preview <StageScene> │ ◄────── │   (StageState)           │ ◄─────────── │  → chạy hiệu ứng    │
 └──────────────────────┘ đọc     └──────────────────────────┘  heartbeat   └─────────────────────┘
```

- **Một document cho mỗi màn hình**: Admin ghi, LED chỉ đọc. Dữ liệu trận/thí sinh LED đọc trực tiếp từ các collection tương ứng, document này chỉ nói **"đang hiện gì"**.
- Panel xem trước trên `/admin/led` render **cùng component** `<StageScene>` với LED, nên xem trước giống hệt LED.
- Giữ `BroadcastChannel` làm **đường dự phòng** khi Admin và LED chạy cùng máy mà mất Internet.

> **Đã triển khai (giai đoạn 2), khác bản thiết kế ở 2 điểm:**
> - **Hiệu ứng không đi qua `effect` trong `StageState`.** Ra sân, lật phiếu và chiến thắng vốn đã gắn vào dữ liệu trận
>   (`entranceTriggerTimestamp`, `rounds[].isRevealed`, `victoryTriggerTimestamp`). Dữ liệu này đồng bộ qua Firestore từ
>   giai đoạn 1, nên LED trên máy khác vẫn chạy đúng 1 lần mỗi lần bấm. Thêm kênh `effect` riêng sẽ làm hiệu ứng chạy 2 lần.
> - **Cảnh hiện có:** `idle`, `battle`, `prelim_leaderboard`. Các cảnh `prelim_current`, `team_draw`, `bracket` cần bố cục
>   riêng cho LED (các màn admin hiện tại có nút bấm, nền sáng) nên để lại sau.
> - Trận trên LED dùng chung `activeMatchId` với Bàn điều hành Battle.

### 4.2 Kiểu dữ liệu

```ts
type StageSceneType =
  | 'idle'                // màn chờ / logo / nhà tài trợ
  | 'prelim_current'      // thí sinh Prelim đang thi
  | 'prelim_leaderboard'  // BXH Prelim
  | 'team_draw'           // bốc thăm 2vs2
  | 'bracket'             // nhánh đấu
  | 'battle';             // trận đấu (kèm hiệu ứng ra sân, lật phiếu, chiến thắng)

type StageEffect = 'team_entrance' | 'round_reveal' | 'victory';

interface StageState {
  scene: StageSceneType;
  category: CategoryType;
  matchId?: string;        // scene = 'battle'
  dancerId?: string;       // scene = 'prelim_current'
  roundNumber?: number;    // hiệp đang công bố
  effect?: {
    type: StageEffect;
    id: string;            // id duy nhất cho mỗi lần bấm → LED chỉ chạy hiệu ứng 1 lần
    at: number;            // thời điểm bấm; quá 15 giây thì LED bỏ qua (tránh phát lại khi reload)
  } | null;
  theme: 'daylight' | 'night';
  blackout: boolean;
  updatedAt: number;
  updatedBy: string;       // email admin
}
```

### 4.3 Hook phía LED — `useStageState`

```ts
// Chỉ đọc. Dùng trong /led/:screenId
function useStageState(screenId = 'san-khau-chinh'): {
  state: StageState | null;
  isOnline: boolean;          // false khi mất kết nối Firestore → hiện chấm báo ở góc
  pendingEffect: StageState['effect'];   // hiệu ứng chưa chạy
  markEffectDone: () => void; // gọi khi hiệu ứng chạy xong
};
```
- `onSnapshot` vào `events/{eventId}/screens/{screenId}`; bật cache offline của Firestore để giữ cảnh cuối khi mất mạng.
- Nhớ `effect.id` đã chạy (trong ref + `sessionStorage`) để mỗi hiệu ứng chỉ chạy một lần.
- Cứ 10 giây ghi heartbeat `screens/{screenId}/presence` → Admin biết LED còn sống.

### 4.4 Hook phía Admin — `useStageController`

```ts
function useStageController(screenId = 'san-khau-chinh'): {
  state: StageState | null;
  isScreenOnline: boolean;                 // từ heartbeat của LED
  setScene: (scene: StageSceneType, opts?: Partial<StageState>) => Promise<void>;
  showMatch: (matchId: string) => Promise<void>;
  showPrelimDancer: (dancerId: string) => Promise<void>;
  playEffect: (type: StageEffect, opts?: { roundNumber?: number }) => Promise<void>;
  setTheme: (theme: 'daylight' | 'night') => Promise<void>;
  setBlackout: (on: boolean) => Promise<void>;
};
```
- Mọi hàm ghi bằng `updateDoc` kèm `updatedAt`, `updatedBy`. Hiệu ứng tạo `effect.id = crypto.randomUUID()`.
- Các thao tác nghiệp vụ gọi luôn controller cho tiện: ví dụ "Công bố hiệp" = ghi kết quả hiệp + `playEffect('round_reveal', { roundNumber })`.

### 4.5 Bố cục `/admin/led`

```
┌──────────────────────────────────────────────────────────────────────┐
│ MÀN LED: Sân khấu chính   ● Online      [Ban ngày|Ban đêm]  [BLACKOUT] │
├───────────────────────────────────────┬──────────────────────────────┤
│                                       │ CẢNH                          │
│        XEM TRƯỚC (16:9, giống LED)     │ ( ) Màn chờ                   │
│                                       │ ( ) Prelim – thí sinh đang thi │
│                                       │ ( ) BXH Prelim                 │
│                                       │ ( ) Bốc thăm đội               │
│                                       │ ( ) Nhánh đấu                  │
│                                       │ (•) Battle: [Top 8 • Trận 02 ▾]│
├───────────────────────────────────────┤ HIỆU ỨNG                       │
│ Trận: ĐỘI 03 vs ĐỘI 11 · Hiệp 2/2      │ [Ra sân] [Lật phiếu H2]        │
│ Phiếu: ●●●●●○○○○ (5/9 đã vote)         │ [Công bố chiến thắng]          │
└───────────────────────────────────────┴──────────────────────────────┘
```

---

## 5. Dữ liệu & bảo mật (Firestore)

```
events/{eventId}                         thông tin giải, cấu hình luật
  admins/{email}                         danh sách admin
  judges/{judgeId}                       hồ sơ GK (không chứa PIN)
  dancers/{dancerId}                     thí sinh + điểm Prelim tổng hợp
  prelimScores/{dancerId_judgeId}        điểm từng GK (GK chỉ ghi doc của mình)
  teams/{teamId}                         đội 2vs2
  matches/{matchId}                      trận + hiệp + phiếu
  screens/{screenId}                     StageState (chỉ admin ghi)
  public/{doc}                           bản kết quả đã công bố cho khán giả
```

- **Đăng nhập giám khảo:** mỗi GK là một tài khoản Firebase Auth (`gk01@<domain-giai>`), PIN chính là mật khẩu, Admin tạo/đổi PIN tại `/admin/cai-dat`. Không cần server riêng.
- **Rules tối thiểu:**
  - Admin: đọc/ghi toàn bộ `events/{eventId}`.
  - Giám khảo: ghi `prelimScores/{dancerId_<uid của mình>}` khi Prelim chưa chốt; ghi phiếu của mình trong trận đang `ongoing` và hiệp chưa khoá.
  - Ai cũng đọc được `public/*` và `screens/*`; còn lại phải đăng nhập.
- Khán giả đọc `public/*`. Admin "công bố" là sao chép kết quả đã chốt sang đây. Cách này đảm bảo KG-06.

---

## 6. Lộ trình triển khai

| Giai đoạn | Nội dung | Stories |
|---|---|---|
| **1. Nền tảng** ✅ code xong (chờ bật Firestore để chạy thật) | Router path + redirect hash cũ; Firestore + rules; chuyển state từ `localStorage` sang Firestore | AD-01, KG-01 |
| **2. Màn LED** ✅ code xong (chờ bật Firestore để chạy thật) | `useStageState`, `useStageController`, trang `/admin/led`, heartbeat, blackout | AD-12, AD-13, LED-01…06 |
| **3. Giám khảo** ✅ code xong (rules chưa test trên emulator) | Đăng nhập mã GK + PIN, cổng chấm realtime, gửi lại khi mất mạng | AD-03, AD-05, GK-01…08 |
| **4. Khán giả** ✅ code xong (rules chưa test trên emulator) | Trang `/ket-qua/*`, công bố kết quả, mã QR | AD-07, KG-02…06 |
| **5. Hoàn thiện** | Undo, log sửa điểm, xuất kết quả, nhiều màn LED | AD-06, AD-14, AD-15, LED-07 |

**Diễn tập bắt buộc trước ngày thi:** 1 laptop admin + 1 PC LED + 9 điện thoại giám khảo trên mạng thật tại địa điểm,
chạy hết 1 lượt Prelim và 1 trận Battle, có cả tình huống rút cáp mạng.
