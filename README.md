# Bé Đọc Vần

Trang luyện đọc âm/vần tiếng Việt lớp 1: bé nghe mẫu, bấm mic đọc, máy báo đúng / gần đúng (sai dấu thanh) / chưa đúng theo từng tiếng.

- Nhận giọng: Web Speech API (`vi-VN`) — miễn phí, chạy trên trình duyệt, không cần server.
- Giọng mẫu: giọng đọc tiếng Việt có sẵn trên máy (nếu máy không có, nút "Nghe mẫu" bị tắt).
- Tiến độ lưu trong trình duyệt (localStorage).

## Chạy trên máy

```bash
npm install
npm run dev
```

Mở http://localhost:5173 bằng **Chrome** hoặc **Edge** (Firefox không hỗ trợ nhận giọng).

## Deploy lên Vercel

1. Đẩy thư mục này lên một repo GitHub.
2. Vào https://vercel.com/new → Import repo → Vercel tự nhận Vite → Deploy.

Hoặc dùng CLI: `npx vercel` (lần đầu sẽ hỏi đăng nhập).

## Thêm / sửa vần

Sửa `src/data.ts`. Mỗi dòng: `['vần', 'từ ví dụ', 'emoji (tuỳ chọn)']`.
Nên dùng từ 2 tiếng quen thuộc — máy nhận từ có nghĩa tốt hơn vần đứng riêng.

## Giới hạn

- Máy chỉ so chữ nghe được với đáp án, không chấm từng âm vị.
- Giọng trẻ nhỏ, giọng vùng miền có thể bị nhận sai.
- Âm thanh được trình duyệt gửi lên dịch vụ nhận giọng của Google/Apple; cần Internet.
