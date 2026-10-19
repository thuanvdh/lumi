<p align="center">
  <img src="store/google-play/feature-graphic.png" alt="Lumi — Firefly path puzzle" width="640" />
</p>

# Lumi — Nối Đường Đom Đóm

Game giải đố vẽ đường một nét cho **Android** và **iOS**, làm bằng Expo (React Native).
Người chơi dẫn một chú đom đóm đi qua **mọi ô** trên lưới, qua các số **theo đúng thứ tự** 1 → K.
Đi tới đâu, ô sáng tới đó.

> "Lumi" là tên tạm (codename). Kế hoạch và tiến độ chi tiết: [PLAN.md](PLAN.md).

## Luật chơi

- Bắt đầu ở số **1**, kết thúc ở số lớn nhất.
- Vẽ **một đường liền**, đi 4 hướng (không đi chéo).
- Đường đi phải phủ **mọi ô**, mỗi ô **đúng một lần**, và qua các số theo thứ tự tăng dần.
- Không đi xuyên **dây leo** (tường) giữa hai ô.
- Mỗi màn được sinh ngẫu nhiên và **chỉ có một lời giải**.

## Tính năng hiện có

- **Màn chơi khó dần**: Màn 1–10 *Dễ*, 11–30 *Trung bình*, 31+ *Khó*. Mỗi màn random kích thước lưới, số gợi ý và dây leo theo độ khó ([`src/game/levels.ts`](src/game/levels.ts)).
- **Điều khiển**: kéo để vẽ, kéo ngược để xoá bớt, chạm vào ô đã đi để cắt đường; vuốt nhanh / vuốt chéo được tự nội suy.
- **Hoàn tác, Xoá, Gợi ý, Đổi màn**.
- **Lưu trên thiết bị**: mở lại app chơi tiếp đúng chỗ (kể cả thời gian), thống kê, kỷ lục theo độ khó (chỉ tính màn không dùng gợi ý), chuỗi ngày chơi (streak).
- **Hiệu ứng**: nền đêm có đom đóm bay, đường đi phát sáng, rung nhẹ mỗi ô, vệt sáng chạy dọc đường khi thắng.
- Chơi **offline**, không quảng cáo, không thu thập dữ liệu.

## Công nghệ

| | |
|---|---|
| Framework | Expo SDK 58, React Native 0.88, React 19, TypeScript |
| Đồ hoạ | `@shopify/react-native-skia` |
| Cử chỉ / animation | `react-native-gesture-handler` (v3 hooks), `react-native-reanimated` |
| Lưu trữ | `expo-sqlite/kv-store` |
| Rung | `expo-haptics` |
| Build & phát hành | EAS Build / EAS Submit |
| Test | `node:test` (Node ≥ 23 chạy TypeScript trực tiếp) |

## Cấu trúc thư mục

```
src/
├── engine/          # Logic thuần TypeScript, không phụ thuộc React Native
│   ├── types.ts     #   Model lưới, ô, tường
│   ├── rules.ts     #   Luật di chuyển, kéo/cắt đường, kiểm tra thắng, gợi ý
│   ├── solver.ts    #   Backtracking + cắt tỉa (liên thông, ô cụt)
│   ├── generator.ts #   Sinh puzzle có lời giải duy nhất
│   └── random.ts    #   PRNG có seed (mulberry32)
├── game/
│   ├── GameScreen.tsx  # Màn chơi, đồng hồ, điều khiển, màn thắng
│   ├── Board.tsx       # Bàn chơi vẽ bằng Skia + xử lý kéo
│   ├── Fireflies.tsx   # Nền trời đêm và đom đóm
│   └── levels.ts       # Cấu hình độ khó theo màn
├── progress/
│   ├── progress.ts  # Thống kê, streak, kỷ lục, kiểm tra dữ liệu lưu (thuần, có test)
│   └── storage.ts   # Đọc/ghi SQLite kv-store
└── theme.ts         # Bảng màu
scripts/
├── bench.ts         # Đo tốc độ sinh puzzle theo độ khó
└── make-icons.sh    # Sinh icon + đồ hoạ store bằng ImageMagick
store/               # Nội dung trang Google Play, privacy policy
```

## Cách sinh puzzle

1. Tạo một **đường Hamilton ngẫu nhiên** (đi qua mọi ô) bằng phép "backbite" trên đường zigzag. Đây là lời giải.
2. Thêm **dây leo** vào những cạnh lời giải không đi qua.
3. Đặt các **số** trên lời giải, rồi dùng solver tìm lời giải thứ hai. Nếu có, thêm một số ở vị trí chắc chắn loại được lời giải đó, lặp lại cho tới khi chỉ còn một lời giải.
4. **Bớt số** dần trong khi lời giải vẫn duy nhất (màn khó), hoặc **thêm số** vào các khoảng trống dài nhất (màn dễ).

Tốc độ sinh trên Mac (`npm run bench`): Dễ ~1 ms · Trung bình ~7 ms · Khó ~37 ms trung bình. Màn tiếp theo được sinh sẵn trong lúc hiệu ứng thắng chạy.

## Chạy dự án

Yêu cầu: Node.js ≥ 23.

```bash
npm install
npx expo start
```

- **Điện thoại**: cài **Expo Go** (bản hỗ trợ SDK 58), quét mã QR. Khác mạng WiFi thì dùng `npx expo start --tunnel`.
- **APK cài thử** (không cần Expo Go): `npx eas-cli@latest build -p android --profile preview`.
- Web chưa được hỗ trợ (chưa cấu hình Skia cho web).

## Lệnh thường dùng

| Lệnh | Việc |
|---|---|
| `npm start` | Chạy dev server |
| `npm test` | Unit test engine, độ khó, thống kê |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm run lint` | ESLint |
| `npm run bench` | Đo tốc độ sinh puzzle |
| `bash scripts/make-icons.sh` | Sinh lại icon và đồ hoạ store |

Trước khi commit: `npm run typecheck && npm run lint && npm test`.

## Build & phát hành

Cấu hình trong [`eas.json`](eas.json):

| Profile | Kết quả | Dùng để |
|---|---|---|
| `preview` | `.apk` | Cài thử trực tiếp lên điện thoại |
| `production` | `.aab`, tự tăng `versionCode` | Nộp Google Play |

```bash
npx eas-cli@latest build -p android --profile production
npx eas-cli@latest submit -p android   # cần Google Service Account key
```

Keystore Android được lưu trên EAS (project `@vagabond2610/lumi`). Lần upload đầu lên Google Play phải làm thủ công. Các bước phát hành và tài liệu store: [PLAN.md](PLAN.md), [`store/google-play/listing.md`](store/google-play/listing.md), [`store/privacy-policy.md`](store/privacy-policy.md).

## Lộ trình

Giai đoạn tiếp theo: Daily Puzzle, sao và coin, âm thanh, cơ chế mới (cổng dịch chuyển, ô một chiều…), quảng cáo và mua trong app, bảng xếp hạng. Xem [PLAN.md](PLAN.md).
