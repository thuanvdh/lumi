# Kế hoạch dự án — Game nối đường "Đom Đóm"

> Game giải đố vẽ đường một nét (cảm hứng từ thể loại Zip/Numberlink), theme **đom đóm trong rừng đêm**.
> Nền tảng: **iOS + Android** · Công nghệ: **Expo (React Native) + TypeScript**
> Tên tạm (codename): **Lumi** — sẽ đổi khi chốt tên chính thức.

Cập nhật lần cuối: 2026-10-18

---

## Quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Concept | Đom đóm — dẫn đom đóm qua khu rừng đêm, đi tới đâu ô sáng tới đó |
| Công nghệ | Expo (SDK 58), TypeScript, Expo Router |
| Đồ hoạ | `@shopify/react-native-skia` + `react-native-reanimated` + `react-native-gesture-handler` |
| Backend (sau MVP) | Firebase hoặc Supabase (daily + leaderboard) |
| Level campaign | Sinh sẵn offline bằng script (generator + solver kiểm tra nghiệm duy nhất), đóng gói JSON |

## Việc cần quyết định

- [ ] **Tên game chính thức** (xem danh sách gợi ý bên dưới), kiểm tra trùng trên App Store / Google Play / tên miền
- [ ] Bảng màu & phong cách art cuối cùng
- [ ] Mua tài khoản Apple Developer (99 USD/năm) và Google Play Console (25 USD)

### Gợi ý tên

| Tên | Ghi chú |
|---|---|
| **Lumi Trail** | Ngắn, dễ nhớ, "lumi" = ánh sáng |
| **Glowpath** | Một từ, gợi đúng gameplay (đường sáng) |
| **Firefly Trail** | Rõ theme, dễ tìm kiếm |
| **Lumora** | Tên thương hiệu riêng, dễ đăng ký |
| **Night Glow: Path Puzzle** | Tên + từ khoá cho ASO |
| **Đom Đóm – Nối Đường** | Bản địa hoá cho thị trường Việt Nam |

> Gợi ý: tên store nên có dạng `Tên thương hiệu: từ khoá`, ví dụ `Lumi Trail: Path Puzzle`, để tốt cho ASO.

---

## Pháp lý / định vị

- Không dùng tên "Zip", logo, màu sắc, bố cục hay chữ "LinkedIn" ở bất kỳ đâu (kể cả mô tả store).
- Luật chơi (đường Hamilton qua các điểm đánh số) không có bản quyền — khác biệt bằng theme, cơ chế mới, chế độ chơi.

---

## Lối chơi

### Luật cơ bản
- Lưới vuông, một số ô có số 1…K.
- Vẽ một đường liền từ 1 đến K, đi qua các số theo thứ tự, phủ **mọi ô đúng một lần**, đi 4 hướng.

### Cơ chế mới (mở khoá dần theo thế giới)
- [ ] 🧱 Tường
- [ ] 🌀 Cổng dịch chuyển
- [ ] ➡️ Ô một chiều
- [ ] 🎨 Ô màu (thứ tự theo màu)
- [ ] ❄️ Ô băng (trượt)
- [ ] ⭐ Ô sao tuỳ chọn (lấy 3 sao)
- [ ] 🔁 Ô ngã tư (đi qua 2 lần)

### Chế độ chơi
- [ ] Campaign — 500+ level theo thế giới
- [ ] Daily Puzzle — streak + bảng xếp hạng thời gian
- [ ] Time Attack — 60 giây
- [ ] Endless / Zen
- [ ] Sự kiện theo mùa
- [ ] PvP 1v1 (sau ra mắt)

### Meta / giữ chân
- [ ] Sao 1–3 mỗi màn (thời gian, undo, gợi ý)
- [ ] Coin → gợi ý, skin (đường, nền, hiệu ứng)
- [ ] Streak + đóng băng streak, nhiệm vụ ngày, quà đăng nhập
- [ ] Chia sẻ kết quả (ảnh / emoji)
- [ ] Haptic mỗi ô, âm thanh tăng cao độ, animation thắng

### Kiếm tiền
- [ ] Rewarded ads (gợi ý, x2 coin), interstitial thưa
- [ ] IAP: gỡ quảng cáo, gói gợi ý, skin
- [ ] (Tuỳ chọn) VIP subscription

---

## Lộ trình & tiến độ

### Giai đoạn 1 — Core (1–2 tuần)
- [x] Khởi tạo project Expo + TypeScript
- [x] Cài Skia, Reanimated, Gesture Handler, Haptics (Expo Router để Giai đoạn 2, khi có nhiều màn hình)
- [x] Engine: model lưới, số, tường
- [x] Engine: luật di chuyển (`canMove`, extend, truncate), kiểm tra thắng
- [x] Engine: solver (backtracking + cắt tỉa liên thông / ô cụt)
- [x] Engine: generator (đường Hamilton ngẫu nhiên → đặt số → kiểm tra nghiệm duy nhất → tối giản)
- [x] Unit test engine
- [x] Màn chơi: vẽ lưới + đường bằng Skia, kéo để vẽ, kéo lùi để xoá
- [x] Undo / Clear / Hint
- [ ] Chạy được trên simulator / điện thoại — bundle iOS + Android OK; **chưa chạy thật** (máy chưa có iOS Simulator runtime) → test bằng Expo Go trên điện thoại

### ⭐ Ưu tiên: Phát hành Google Play trước (chạy song song Giai đoạn 2)

> Tài khoản cá nhân mới: bắt buộc **closed testing ≥ 12 tester trong 14 ngày liên tục** trước khi được xin production → bắt đầu càng sớm càng tốt.

**Bạn làm (cần tài khoản / giấy tờ):**
- [ ] Tạo tài khoản Google Play Console (25 USD), xác minh danh tính + số điện thoại
- [x] Tạo tài khoản Expo (miễn phí), chạy `npx eas-cli@latest login` — tài khoản `vagabond2610`
- [ ] Chốt **tên** + **package name** (đang tạm `com.lumi.pathpuzzle` — không đổi được sau lần upload đầu)
- [ ] Host privacy policy (`store/privacy-policy.md`) lên URL public (GitHub Pages / Google Sites / Notion), điền email hỗ trợ
- [ ] Gom ≥ 12 tester (Gmail) cho closed testing

**Đã chuẩn bị trong project:**
- [x] `app.json`: package, adaptive icon, chặn quyền thừa
- [x] `eas.json`: profile `preview` (APK cài thử) + `production` (AAB, tự tăng versionCode) + submit lên track internal
- [x] Icon tạm + icon Play 512 + feature graphic 1024×500 (`scripts/make-icons.sh`)
- [x] Nội dung store VI + EN (`store/google-play/listing.md`)
- [x] Privacy policy VI + EN (`store/privacy-policy.md`)
- [ ] Screenshot điện thoại (2–8 ảnh) — cần chạy app trên máy thật / emulator

**Các bước build & nộp:**
- [x] `npx eas-cli@latest init` — project `@vagabond2610/lumi`, keystore Android lưu trên Expo
- [ ] `npx eas-cli@latest build -p android --profile preview` → cài APK lên điện thoại, test — *APK đầu tiên đã build xong, chờ test trên máy thật*
- [ ] `npx eas-cli@latest build -p android --profile production` → file `.aab`
- [ ] Play Console: tạo app, điền Store listing, Data safety ("không thu thập dữ liệu"), Content rating (IARC), Target audience 13+, Ads = Không
- [ ] Upload `.aab` **thủ công lần đầu** lên track Internal testing (Google yêu cầu)
- [ ] Tạo track Closed testing, mời ≥ 12 tester, chạy đủ 14 ngày
- [ ] Apply production access → phát hành
- [ ] (Sau) tạo service account key để `eas submit` tự động cho các bản cập nhật

### Giai đoạn 2 — MVP (2–3 tuần)
- [ ] Giao diện theme đom đóm (nền đêm, ô phát sáng, hạt sáng) — *đã có bản đầu ở Giai đoạn 1, cần polish*
- [x] Hệ thống màn chơi tăng dần độ khó: Màn 1–10 Dễ, 11–30 Trung bình, 31+ Khó; mỗi màn sinh ngẫu nhiên trong độ khó (kích thước, số gợi ý, dây leo) — `src/game/levels.ts`
- [ ] Cân chỉnh độ khó theo phản hồi người chơi (ngưỡng màn, tỉ lệ số gợi ý)
- [ ] 2–3 cơ chế mới (cổng, ô một chiều, …)
- [ ] Màn hình: Home, chọn level, chơi, thắng
- [ ] Daily puzzle (seed theo ngày)
- [x] Lưu dữ liệu trên thiết bị (`expo-sqlite/kv-store`): màn đang chơi (mở lại chơi tiếp), thống kê, kỷ lục theo kích thước, streak, kích thước lưới gần nhất
- [ ] Sao, coin
- [ ] Âm thanh + haptic

### Giai đoạn 3 — Kiếm tiền (1 tuần)
- [ ] AdMob (rewarded + interstitial)
- [ ] IAP (RevenueCat)
- [ ] Chia sẻ kết quả
- [ ] Analytics

### Giai đoạn 4 — Phát hành (1 tuần)
- [ ] Icon, splash, screenshot store
- [ ] Privacy policy
- [ ] EAS Build, TestFlight / Internal testing
- [ ] Nộp App Store + Google Play

### Giai đoạn 5 — Sau ra mắt
- [ ] Leaderboard online
- [ ] Sự kiện, cơ chế mới
- [ ] PvP

---

## Nhật ký

- **2026-10-18** — Phân tích game Zip, chốt concept đom đóm + Expo. Khởi tạo project Expo SDK 58 (blank-typescript).
- **2026-10-18** — Hoàn thành engine Giai đoạn 1 (`src/engine/`): luật chơi, solver, generator nghiệm duy nhất, 6 unit test pass (`npm test`). Benchmark (`npm run bench`): 6×6 ~3ms, 7×7 ~18ms, 8×8 ~250ms (Node, Mac). Màn chơi đầu tiên (`src/game/`): Skia board, đường đom đóm phát sáng, đom đóm nền, haptic, undo/xoá/gợi ý, đồng hồ, màn thắng. Typecheck + lint + expo-doctor sạch.
- **2026-10-18** — Chuẩn bị phát hành Google Play: `eas.json`, package `com.lumi.pathpuzzle` (tạm), icon + feature graphic tạm, nội dung store VI/EN, privacy policy VI/EN.
- **2026-10-18** — Git: repo private https://github.com/thuanvdh/lumi. EAS: build APK preview đầu tiên thành công (versionCode 1).
- **2026-10-18** — Lưu dữ liệu local (`src/progress/`): resume màn đang chơi + đồng hồ (tạm dừng khi app vào nền), thống kê / kỷ lục (chỉ tính màn không dùng gợi ý) / streak theo ngày. 4 test mới (tổng 10 pass).
- **2026-10-18** — Bỏ chọn kích thước lưới → màn chơi đánh số, độ khó Dễ/Trung bình/Khó tự random theo màn. Generator thêm bước bổ sung số gợi ý cho màn dễ. Kỷ lục tính theo độ khó. Màn tiếp theo được sinh sẵn trong lúc hiệu ứng thắng chạy. Storage lên v2. 13 test pass.
