# Design — ICTU Dormitory Management System

Hệ thống thiết kế khóa cho dự án. Mọi lần chỉnh sửa giao diện sau này đọc file này
trước khi viết code. Không tự tạo hệ thống riêng cho từng trang — mở rộng/sửa file
này khi hệ thống cần thay đổi.

## Genre
`modern-minimal` — ứng dụng quản trị nội bộ cho một trường đại học, cần nghiêm túc,
đáng tin cậy, dễ quét thông tin nhanh. Không dùng phong cách editorial (tạp chí),
atmospheric (mờ ảo, nhiều lớp gradient) hay playful (vui nhộn).

## Macrostructure family
- **Auth pages** (Login.jsx): giữ "Split Panel" hiện có — ảnh tòa nhà KTX bên trái
  (2/3), form bên phải (1/3). Ẩn hoàn toàn panel ảnh dưới `lg`. Đã đạt chuẩn, không
  cần đổi cấu trúc, chỉ đồng bộ token màu/font với hệ thống này.
- **App pages** (Dashboard/Rooms/Issues/Students/Fees): family mới —
  **"Workbench — Responsive Rail"**. Sidebar là dải điều hướng dọc bên trái:
  - Từ `lg` trở lên: cố định, 3 chế độ (mở rộng/thu gọn/hover-mở), như bản gốc.
  - Dưới `lg`: **off-canvas drawer** — ẩn mặc định, mở qua nút hamburger trên
    header, phủ overlay tối phía sau, đóng khi bấm overlay hoặc phím `Escape`.
  - Nội dung mỗi trang KHÔNG bắt buộc theo khuôn "4 thẻ số liệu đều nhau + 2 cột
    bento" — đây là khuôn AI-mặc-định cần tránh. Ưu tiên phân cấp bất đối xứng:
    một số liệu/nội dung được nhấn mạnh rõ hơn phần còn lại, không phải mọi khối
    đều cùng kích thước.

## Theme

Giữ nguyên màu thương hiệu `#004b87` (xanh dương đậm ICTU) làm accent — đây là màu
đã có sẵn trong Login.jsx và toàn bộ App.jsx, không tự ý đổi.

- `--color-paper`     oklch(98% 0.003 250)   /* light bg, gần trắng thay vì trắng thuần */
- `--color-paper-2`   oklch(95% 0.006 250)   /* light surface phụ (card nền, hover) */
- `--color-paper-dark`   oklch(21% 0.02 255)  /* dark bg — tương đương slate-900 hiện tại */
- `--color-paper-2-dark` oklch(27% 0.02 255)  /* dark surface phụ — slate-800 */
- `--color-ink`       oklch(27% 0.03 255)   /* light text chính — slate-800 */
- `--color-ink-dark`  oklch(93% 0.01 255)   /* dark text chính — slate-100 */
- `--color-ink-2`     oklch(52% 0.02 255)   /* text phụ, cả 2 mode dùng biến thể độ sáng khác nhau */
- `--color-rule`      oklch(90% 0.006 250)  /* viền light */
- `--color-rule-dark` oklch(33% 0.015 255)  /* viền dark */
- `--color-accent`    oklch(35% 0.09 250)   /* #004b87 — giữ nguyên, KHÔNG đổi */
- `--color-accent-ink` oklch(99% 0 0)       /* chữ trên nền accent — trắng */
- `--color-focus`     oklch(78% 0.16 85)    /* vàng hổ phách — tách biệt hẳn khỏi
                                                accent xanh, dùng RIÊNG cho focus-visible,
                                                không dùng cho trạng thái khác */

Bắt buộc: mọi `outline-none` phải đi kèm `focus-visible:ring-2` dùng `--color-focus`.
Đây là điểm sửa trực tiếp cho lỗ hổng accessibility đã phát hiện trong audit.

## Typography

Dự án hiện dùng `font-sans` mặc định của Tailwind ở mọi nơi — đây là một trong các
dấu hiệu "AI-generated" rõ nhất (không có phân cấp kiểu chữ). Hệ thống mới:

- Display (H1/H2, số liệu lớn): **Manrope**, weight 700/800 — có nét hình học rõ,
  khác biệt với phần thân, tạo điểm nhấn thị giác thật sự.
- Body: **Inter**, weight 400/500/600 — giữ độ dễ đọc cho bảng dữ liệu dày đặc.
- Display tracking: -0.01em (hơi khít lại, tạo cảm giác chắc chắn, không "AI-rỗng").
- Số liệu thống kê lớn (StatCard...): dùng Display face, cỡ lớn hơn hẳn hiện tại
  để tạo tương phản kích thước thật (không phải chỉ đổi độ đậm).

**Giới hạn kỹ thuật cần lưu ý:** đây là dự án React thuần (không phải Next.js với
`next/font`), nên Manrope/Inter cần được nạp qua thẻ `<link>` Google Fonts trong
`index.html` (hoặc `@import` trong CSS gốc) — tôi không có quyền truy cập file đó
trong phiên làm việc này. Cho tới khi font được nạp, trình duyệt sẽ tự rơi về
fallback `sans-serif` — giao diện vẫn đúng cấu trúc/token nhưng chưa đúng font.
Tôi sẽ ghi rõ đoạn cần thêm vào `index.html` khi bàn giao.

## Spacing
Giữ nguyên thang 4pt của Tailwind hiện có — không đổi giá trị, chỉ dùng nhất quán.

## Motion
- `motion-cut` — không dùng thư viện animation (đúng hiện trạng, không có
  framer-motion/gsap trong import).
- Giữ `transition-colors duration-500` cho đổi theme sáng/tối như bản gốc.
- Drawer sidebar mobile: `transition-transform duration-300 ease-out`, kèm overlay
  `transition-opacity duration-300`.
- Tôn trọng `prefers-reduced-motion`: drawer/overlay chuyển thẳng (0ms) nếu người
  dùng bật giảm chuyển động — sẽ thêm ở bản mở rộng sau nếu cần.

## Microinteractions
- Focus-visible bắt buộc trên MỌI phần tử tương tác — không có ngoại lệ.
- Dropdown/modal đóng được bằng `Escape`, không chỉ bằng click-outside.
- Không dùng hiệu ứng "celebratory" (confetti, bounce quá đà) — im lặng, chuyên nghiệp.

## CTA voice
- Primary: nền `--color-accent`, chữ trắng, `rounded-lg`, `py-2.5`, `font-semibold`
  — giữ nguyên như nút "Đăng nhập" hiện tại của Login.jsx.
- Secondary: viền `--color-rule`, nền trong suốt, chữ `--color-ink`.

## Per-page allowances
- Trang Auth (Login): được dùng ảnh minh họa lớn — đã có, giữ nguyên.
- Trang App (Dashboard...): KHÔNG dùng trang trí thị giác (không minh họa, không
  gradient trang trí thuần thẩm mỹ) — mọi yếu tố thị giác phải phục vụ chức năng
  hoặc phân cấp thông tin.

## What pages MUST share
- Logo + màu accent `#004b87` ở vị trí cố định (header).
- Font Display + Body như trên.
- Voice của CTA chính (hình dạng nút, bo góc, nhịp padding).
- `--color-focus` cho mọi focus-visible.

## What pages MAY differ on
- Bố cục nội dung bên trong từng view (Dashboard vs Rooms vs Fees) — miễn dùng
  chung token màu/font/spacing, không bắt buộc cùng một khuôn lưới.

---

*Phiên bản: v1 · Áp dụng lần đầu cho: App.jsx (shell + Dashboard) · Login.jsx (đối chiếu, không cần sửa cấu trúc).*
